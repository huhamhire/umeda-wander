"""Extract the Umeda Sky Building (梅田スカイビル) LOD2 shell from the local PLATEAU mesh."""

import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

SOURCE = Path("references/district/plateau-2025/52350349_bldg_6697_op.gml")
OUTPUT = Path("data/geography/buildings/umeda-sky-building.json")
GML_ID = "bldg_9dcffdb5-9431-4650-951e-7f7c715e28a9"
NS = {"b": "http://www.opengis.net/citygml/building/2.0", "g": "http://www.opengis.net/gml"}
ID = "{" + NS["g"] + "}id"
ESCALATORS = {GML_ID[:-2] + "bb", GML_ID[:-2] + "bc"}


def polygon_rings(polygon):
    """Project 3D rings to district east/south metres and preserve interior openings."""
    rings = []
    for boundary in polygon.findall("./g:exterior//g:posList", NS) + polygon.findall("./g:interior//g:posList", NS):
        values = list(map(float, boundary.text.split()))
        ring = [[round((lon - 135.491) * 111320 * math.cos(math.radians(34.708)), 2),
                 round((34.708 - lat) * 111320, 2), round(y, 2)]
                for lat, lon, y in zip(values[0::3], values[1::3], values[2::3])]
        if ring[0] == ring[-1]:
            ring.pop()
        if len(ring) >= 3:
            rings.append(ring)
    return rings


def polygons(element, path):
    """Keep inline CityGML polygons, including the faces of installed elements."""
    return [rings for polygon in element.findall(path, NS) if (rings := polygon_rings(polygon))]


root = ET.parse(SOURCE).getroot()
building = next(b for b in root.findall(".//b:Building", NS) if b.attrib[ID] == GML_ID)
details, glazing = [], []
for installation in building.findall("./b:outerBuildingInstallation/b:BuildingInstallation", NS):
    destination = glazing if installation.attrib[ID] in ESCALATORS else details
    destination.extend(polygons(installation, ".//b:lod2Geometry//g:Polygon"))
shell = {
    "roof": polygons(building, "./b:boundedBy/b:RoofSurface//g:Polygon"),
    "wall": polygons(building, "./b:boundedBy/b:WallSurface//g:Polygon"),
    "soffit": polygons(building, "./b:boundedBy/b:OuterCeilingSurface//g:Polygon"),
    "detail": details,
    "glazing": glazing,
}
site = polygons(building, "./b:lod0RoofEdge//g:Polygon")[0]
survey_year = next(e.text for e in building.iter() if e.tag.endswith("}surveyYear"))
result = {
    "source": "https://www.geospatial.jp/ckan/dataset/plateau-27100-osaka-shi-2025",
    "mesh": SOURCE.name,
    "gmlId": GML_ID,
    "surveyYear": survey_year,
    "lod": "2.2",
    "top": max(y for faces in shell.values() for face in faces for ring in face for _, _, y in ring),
    "scopeOutline": [[x, z] for x, z, _ in site[0]],
    "surfaces": shell,
}
if len(glazing) != 21 or len(shell["roof"]) == 0 or len(shell["wall"]) == 0:
    raise ValueError("Missing exterior or escalator geometry")
OUTPUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(OUTPUT)
