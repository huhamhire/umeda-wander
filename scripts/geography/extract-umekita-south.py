"""Extract the South Park (サウスパーク) LOD2 shells and selected South Building roof tiers."""

import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

SOURCE = Path("references/district/plateau-2025/52350349_bldg_6697_op.gml")
OUTPUT = Path("data/geography/buildings/umekita-south.json")
NS = {"b": "http://www.opengis.net/citygml/building/2.0", "g": "http://www.opengis.net/gml"}
PAVILIONS = {
    "great-roof": "bldg_060497ae-221e-4759-bd44-9eb87191514c",
    "northwest-pavilions": "bldg_e823e6e5-24b1-47a3-9bf5-f4ceba4b43af",
    "west-pavilion": "bldg_de0f1087-3c1d-4d7d-b79c-37f7c804bb88",
}
PARK = "bldg_f0c33738-1391-43d3-b6d2-c95809ae0a27"
EAST = "bldg_2ed9445d-bb97-48b4-8d1c-6ef2f9a5d746"


def source_rings(polygon):
    """Convert CityGML latitude/longitude/height rings to the district metre frame."""
    rings = []
    for position in polygon.findall("./g:exterior//g:posList", NS) + polygon.findall("./g:interior//g:posList", NS):
        values = list(map(float, position.text.split()))
        points = [[round((lon - 135.491) * 111320 * math.cos(math.radians(34.708)), 2),
                   round((34.708 - lat) * 111320, 2), round(y, 2)]
                  for lat, lon, y in zip(values[0::3], values[1::3], values[2::3])]
        if points[0] == points[-1]:
            points.pop()
        if len(points) >= 3:
            rings.append(points)
    return rings


def surfaces(building, kind):
    """Read boundary polygons with their original holes and sloping elevations."""
    return [rings for polygon in building.findall(f".//b:{kind}//g:Polygon", NS)
            if (rings := source_rings(polygon))]


def plan_area(ring):
    """Rank overlapping horizontal roof layers by projected area."""
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:] + ring[:1]))) / 2


def roof_tier(building, lower, upper, z_min=0, z_max=1000):
    """Select the dominant horizontal roof in a documented height and district window."""
    candidates = []
    for polygon in surfaces(building, "RoofSurface"):
        exterior = polygon[0]
        height = max(p[2] for p in exterior)
        z = sum(p[1] for p in exterior) / len(exterior)
        if lower <= height <= upper and z_min <= z <= z_max and height - min(p[2] for p in exterior) < .1:
            candidates.append(polygon)
    rings = max(candidates, key=lambda polygon: plan_area(polygon[0]))
    return {"top": max(p[2] for p in rings[0]), "rings": [[[x, z] for x, z, _ in ring] for ring in rings]}


root = ET.parse(SOURCE).getroot()
buildings = {b.attrib["{" + NS["g"] + "}id"]: b for b in root.findall(".//b:Building", NS)}
result = {
    "source": "https://www.geospatial.jp/ckan/dataset/plateau-27100-osaka-shi-2025",
    "mesh": SOURCE.name,
    "pavilions": {
        key: {"gmlId": identifier, "roofs": surfaces(buildings[identifier], "RoofSurface"),
              "walls": surfaces(buildings[identifier], "WallSurface")}
        for key, identifier in PAVILIONS.items()
    },
    "towers": {
        "park": {"gmlId": PARK, "body": roof_tier(buildings[PARK], 174, 177),
                 "wing": roof_tier(buildings[PARK], 133, 134.4, 545, 600),
                 "crown": roof_tier(buildings[PARK], 180, 183)},
        "gate": {"gmlId": EAST, "body": roof_tier(buildings[EAST], 85.9, 86.5, 580, 670),
                 "crown": roof_tier(buildings[EAST], 89, 90, 580, 670)},
        "south": {"gmlId": EAST, "body": roof_tier(buildings[EAST], 122, 124, 670),
                  "crown": None},
    },
}
OUTPUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(OUTPUT)
