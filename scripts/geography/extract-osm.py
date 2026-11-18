"""Extract complete ways and assembled building multipolygons, retaining holes."""
import json
import xml.etree.ElementTree as ET
from pathlib import Path

root = ET.parse('references/district/osm/umeda-2026-11-16.xml').getroot()
nodes = {n.attrib['id']: [float(n.attrib['lon']), float(n.attrib['lat'])]
         for n in root.findall('node')}
features = []
ways = {w.attrib['id']: w for w in root.findall('way')}
relations = []
consumed = set()
issues = []

def assemble(parts):
    rings = []
    while parts:
        chain = parts.pop(0)[:]
        while chain[0] != chain[-1]:
            for i, part in enumerate(parts):
                if chain[-1] in (part[0], part[-1]):
                    if chain[-1] == part[-1]:
                        part = part[::-1]
                    chain.extend(part[1:])
                    parts.pop(i)
                    break
            else:
                raise ValueError('incomplete ring')
        rings.append([nodes[n] for n in chain])
    return rings

for relation in root.findall('relation'):
    tags = {t.attrib['k']: t.attrib['v'] for t in relation.findall('tag')}
    if tags.get('type') not in ('multipolygon', 'building') or 'building' not in tags:
        continue
    try:
        members = [m for m in relation.findall('member') if m.attrib['type'] == 'way' and m.attrib.get('role') != 'part']
        rings = {}
        for role in ('outer', 'inner'):
            parts = [[n.attrib['ref'] for n in ways[m.attrib['ref']].findall('nd')]
                     for m in members if (m.attrib.get('role') or 'outer').replace('outline', 'outer') == role]
            rings[role] = assemble(parts)
        if not rings['outer']:
            raise ValueError('missing outer ring')
        def contains(ring, point):
            x, y = point
            inside = False
            for a, b in zip(ring, ring[1:]):
                if (a[1] > y) != (b[1] > y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
                    inside = not inside
            return inside
        polygons = [[outer] for outer in rings['outer']]
        for hole in rings['inner']:
            owners = [p for p in polygons if contains(p[0], hole[0])]
            if len(owners) != 1:
                raise ValueError('ambiguous hole ownership')
            owners[0].append(hole)
        relations.append(dict(id=relation.attrib['id'], kind='relation', version=relation.attrib.get('version'),
                              tags=tags, coordinates=rings['outer'][0], outerRings=rings['outer'], holes=rings['inner'], polygons=polygons))
        consumed.update(m.attrib['ref'] for m in members)
    except (KeyError, ValueError) as error:
        issues.append(dict(id=relation.attrib['id'], issue=str(error)))
for way in root.findall('way'):
    tags = {t.attrib['k']: t.attrib['v'] for t in way.findall('tag')}
    refs = [n.attrib['ref'] for n in way.findall('nd')]
    if way.attrib['id'] not in consumed and any(k in tags for k in ('building', 'highway', 'area:highway')) and all(n in nodes for n in refs):
        features.append(dict(id=way.attrib['id'], version=way.attrib.get('version'),
                             tags=tags, coordinates=[nodes[n] for n in refs]))
features.extend(relations)
Path('build/geography').mkdir(parents=True, exist_ok=True)
Path('build/geography/osm-extraction-report.json').write_text(json.dumps(dict(relations=len(relations), issues=issues), ensure_ascii=False, indent=2), encoding='utf-8')
Path('data/geography/features.json').write_text(json.dumps(features, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'{len(features)} ways extracted')
