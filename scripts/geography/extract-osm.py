"""Extract complete building/highway ways; multipolygon assembly is pending."""
import json
import xml.etree.ElementTree as ET
from pathlib import Path

root = ET.parse('data/geography/umeda-osm.xml').getroot()
nodes = {n.attrib['id']: [float(n.attrib['lon']), float(n.attrib['lat'])]
         for n in root.findall('node')}
features = []
for way in root.findall('way'):
    tags = {t.attrib['k']: t.attrib['v'] for t in way.findall('tag')}
    refs = [n.attrib['ref'] for n in way.findall('nd')]
    if any(k in tags for k in ('building', 'highway', 'area:highway')) and all(n in nodes for n in refs):
        features.append(dict(id=way.attrib['id'], version=way.attrib.get('version'),
                             tags=tags, coordinates=[nodes[n] for n in refs]))
Path('data/geography/features.json').write_text(json.dumps(features, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'{len(features)} ways extracted')
