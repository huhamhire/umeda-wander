"""Extract only LOD2 roof geometry, not unreliable LOD1 measuredHeight tags.

The 2025 Osaka City (大阪市) package still has 2017 survey geometry in these buildings.
Hanshin South (大阪梅田ツインタワーズ・サウス) and JP Tower are excluded after redevelopment.
"""
import json
import math
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"b": "http://www.opengis.net/citygml/building/2.0", "g": "http://www.opengis.net/gml"}
SELECTED = {
    "bldg_1f884dc6-96e4-47c5-8a9e-79a355b3ec42": "hankyu-retail",
    "bldg_765a3b67-2a33-4a5b-a1d4-0a07feee45d6": "hankyu-office",
    "bldg_8e4695fb-0c30-41d2-bd5e-37f2b10c467e": "sanbangai-station",
}
root = ET.parse("references/district/plateau-2025/52350349_bldg_6697_op.gml").getroot()
result = []
for building in root.findall(".//b:Building", NS):
    identifier = building.attrib["{" + NS["g"] + "}id"]
    if identifier not in SELECTED:
        continue
    roofs = []
    for polygon in building.findall(".//b:RoofSurface//g:Polygon", NS):
        rings = []
        elevations = []
        for tag in ["exterior", "interior"]:
            for ring in polygon.findall("g:" + tag + "//g:posList", NS):
                values = list(map(float, ring.text.split()))
                points = [values[i:i + 3] for i in range(0, len(values), 3)]
                elevations.extend(p[2] for p in points)
                rings.append([[round((p[1] - 135.491) * 111320 * math.cos(math.radians(34.708)), 2),
                    round((34.708 - p[0]) * 111320, 2)] for p in points])
        if not rings:
            continue
        roofs.append({"height": round(max(elevations), 2), "slope": round(max(elevations) - min(elevations), 2), "rings": rings})
    survey = next((e.text for e in building.iter() if e.tag.endswith("}surveyYear")), None)
    result.append({"id": SELECTED[identifier], "gmlId": identifier, "surveyYear": survey, "roofs": roofs})
if len(result) != len(SELECTED):
    raise ValueError("Missing source buildings")
Path("build/geography").mkdir(parents=True, exist_ok=True)
Path("build/geography/plateau-roofs.json").write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
print([(r["id"], len(r["roofs"]), r["surveyYear"]) for r in result])

# The station has LOD0/1 only: use its plan envelope, never claim a LOD2 sloped roof.
station = next(b for b in root.findall(".//b:Building", NS)
    if b.attrib["{" + NS["g"] + "}id"] == "bldg_9c2c736c-68d2-42b8-837a-dbdf9d7ca1a1")
values = list(map(float, station.find(".//b:lod0FootPrint//g:posList", NS).text.split()))
outline = [[round((values[i + 1] - 135.491) * 111320 * math.cos(math.radians(34.708)), 2),
    round((34.708 - values[i]) * 111320, 2)] for i in range(0, len(values), 3)]
angle = math.radians(-31.65)
along = [x * math.cos(angle) + z * math.sin(angle) for x, z in outline]
across = [-x * math.sin(angle) + z * math.cos(angle) for x, z in outline]
u = (min(along) + max(along)) / 2
v = (min(across) + max(across)) / 2
roof = {
    "source": "https://www.geospatial.jp/ckan/dataset/plateau-27100-osaka-shi-2025",
    "gmlId": station.attrib["{" + NS["g"] + "}id"],
    "lod": 1,
    "outline": outline,
    "center": {"x": round(u * math.cos(angle) - v * math.sin(angle), 2),
        "z": round(u * math.sin(angle) + v * math.cos(angle), 2)},
    "angle": angle,
    "width": 180,
    "depth": 100,
    "northHeight": 49.3,
    "southHeight": 34,
    "dimensionsSource": "https://www.city.osaka.lg.jp/toshiseibi/page/0000647324.html",
    "note": "Plan centre fitted to the PLATEAU LOD0/1 station envelope (about 184 by 100 m); 180 by 100 m from Osaka City. North height about 50 m is consistent with LOD1 49.31 m. South height, slope and skylight spacing remain reference fits, not surveyed roof geometry.",
}
directory = Path("data/geography/buildings")
directory.mkdir(parents=True, exist_ok=True)
(directory / "jr-roof.json").write_text(json.dumps(roof, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
