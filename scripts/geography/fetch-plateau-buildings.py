"""Fetch selected CityGML meshes by ZIP byte ranges, without city-wide imagery.

Original downloads stay in ignored build/. The extracted runtime resource is
created separately by extract-plateau-buildings.py.
"""
import argparse
import json
import struct
import urllib.request
import zlib
from pathlib import Path


def read_range(url, start, end):
    request = urllib.request.Request(url, headers={"Range": f"bytes={start}-{end}"})
    with urllib.request.urlopen(request, timeout=60) as response:
        data = response.read()
        if response.status != 206:
            raise ValueError("Expected range response; refusing city-wide download")
        return data


def fetch(year, meshes):
    catalog = f"https://www.geospatial.jp/ckan/api/3/action/package_show?id=plateau-27100-osaka-shi-{year}"
    with urllib.request.urlopen(catalog, timeout=45) as response:
        package = json.load(response)["result"]
    url = next(r["url"] for r in package["resources"] if r["name"].startswith("CityGML"))
    directory = Path(f"build/geography/plateau-{year}")
    directory.mkdir(parents=True, exist_ok=True)
    tail = read_range(url, "", 65536)
    end = struct.unpack_from("<4s4H2LH", tail, tail.rfind(b"PK\x05\x06"))
    central = read_range(url, end[6], end[6] + end[5] - 1)
    entries = []
    offset = 0
    while central[offset:offset + 4] == b"PK\x01\x02":
        fields = struct.unpack_from("<4s6H3L5H2L", central, offset)
        name_length, extra_length, comment_length = fields[10:13]
        name = central[offset + 46:offset + 46 + name_length].decode("utf-8")
        entries.append({"name": name, "compressed": fields[8], "offset": fields[16], "method": fields[4]})
        offset += 46 + name_length + extra_length + comment_length
    targets = ["README.md", *[f"udx/bldg/{mesh}_bldg_6697_op.gml" for mesh in meshes]]
    for entry in entries:
        if entry["name"] not in targets:
            continue
        target = directory / Path(entry["name"]).name
        if target.exists():
            continue
        start = entry["offset"]
        raw = read_range(url, start, start + 30 + len(entry["name"].encode()) + 4096 + entry["compressed"])
        header = struct.unpack_from("<4s5H3L2H", raw)
        content_offset = 30 + header[9] + header[10]
        compressed = raw[content_offset:content_offset + entry["compressed"]]
        data = zlib.decompress(compressed, -15) if entry["method"] == 8 else compressed
        target.write_bytes(data)
        print(target, len(data), flush=True)
    (directory / "catalog.json").write_text(json.dumps({"catalog": catalog, "archive": url,
        "license": package.get("license_url"), "entries": entries}, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, default=2025)
    parser.add_argument("--meshes", nargs="+", default=["52350349", "52350359"])
    args = parser.parse_args()
    fetch(args.year, args.meshes)
