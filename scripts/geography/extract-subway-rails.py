"""Extract subway running centrelines from the existing OSM snapshot."""
import json
from pathlib import Path
import xml.etree.ElementTree as E
r=E.parse('data/geography/umeda-osm.xml').getroot()
nodes={n.attrib['id']:[float(n.attrib['lon']),float(n.attrib['lat'])] for n in r.findall('node')}
features=[]
for w in r.findall('way'):
 tags={t.attrib['k']:t.attrib['v'] for t in w.findall('tag')}
 if tags.get('railway')=='subway':features.append(dict(id=w.attrib['id'],version=w.attrib.get('version'),tags=tags,coordinates=[nodes[n.attrib['ref']] for n in w.findall('nd')]))
Path('data/geography/railways/subways.json').write_text(json.dumps(features,ensure_ascii=False),encoding='utf8')
