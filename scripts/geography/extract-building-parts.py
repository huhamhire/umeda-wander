"""Extract selected building parts from the repository OSM snapshot; no network."""
import json
from pathlib import Path
import xml.etree.ElementTree as E
root=E.parse('references/district/osm/umeda-2026-11-16.xml').getroot()
nodes={n.attrib['id']:[float(n.attrib['lon']),float(n.attrib['lat'])] for n in root.findall('node')}
ids={'469076711','469076709','469076710','776542349','494976863','175942074','1313244350','1313244351'}
# Preserve the separate Green Place (うめきたグリーンプレイス) wings and raised middle section.
ids.update({'1314389104', '1371178366', '1371178367'})
parts=[dict(id=w.attrib['id'],version=w.attrib.get('version'),tags={t.attrib['k']:t.attrib['v'] for t in w.findall('tag')},coordinates=[nodes[n.attrib['ref']] for n in w.findall('nd')]) for w in root.findall('way') if w.attrib['id'] in ids]
assert len(parts)==len(ids)
Path('data/geography/building-parts.json').write_text(json.dumps(parts,ensure_ascii=False),encoding='utf8')
