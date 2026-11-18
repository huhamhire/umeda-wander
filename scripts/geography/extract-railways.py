"""Separate railway snapshot for calibration; never alter the ground dataset."""
import json
from pathlib import Path
import xml.etree.ElementTree as ET

root = ET.parse('references/district/osm/umeda-2026-11-16.xml').getroot()
nodes = {n.attrib['id']: [float(n.attrib['lon']), float(n.attrib['lat'])]
         for n in root.findall('node')}
features, missing = [], []
for way in root.findall('way'):
    tags = {t.attrib['k']: t.attrib['v'] for t in way.findall('tag')}
    if tags.get('railway') != 'rail' and tags.get('landuse') != 'railway':
        continue
    refs = [n.attrib['ref'] for n in way.findall('nd')]
    if not all(r in nodes for r in refs):
        missing.append(way.attrib['id'])
        continue
    features.append({'id': way.attrib['id'], 'version': way.attrib['version'],
                     'tags': tags, 'coordinates': [nodes[r] for r in refs]})
target = Path('data/geography/railways')
target.mkdir(parents=True, exist_ok=True)
(target / 'features.json').write_text(json.dumps(features, ensure_ascii=False, indent=2), encoding='utf-8')
Path('build/geography').mkdir(parents=True, exist_ok=True)
Path('build/geography/railway-extraction-report.json').write_text(json.dumps({'features': len(features), 'missingNodeWays': missing}, indent=2), encoding='utf-8')
print({'features': len(features), 'missingNodeWays': missing})
