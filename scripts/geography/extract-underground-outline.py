"""Extract source yellow vector fills, never raster labels or route buffers.
Run with PyMuPDF available (e.g. PYTHONPATH=build/pdf-tools).
"""
import hashlib
import json
from pathlib import Path
import pymupdf

source = Path('references/梅田周边地区通道.pdf')
page = pymupdf.open(source)[0]
paths = []
for index, drawing in enumerate(page.get_drawings()):
    color = drawing['fill']
    # Main map's public-space yellow, distinct from building/label backgrounds.
    if not color or max(abs(a-b) for a,b in zip(color, (1, .97, .38))) > .015:
        continue
    if drawing['rect'].y0 > 810:  # Exclude bottom legend, outside main map.
        continue
    rings, ring = [], []
    def flush():
        global ring
        if len(ring) > 2:
            if ring[-1] != ring[0]:
                ring.append(ring[0])
            rings.append(ring)
        ring = []
    for item in drawing['items']:
        kind, *points = item
        if kind not in ('l', 'c'):
            raise ValueError(f'Unsupported path command: {kind}')
        points = [(float(p.x), float(p.y)) for p in points]
        if ring and sum((a-b)**2 for a,b in zip(ring[-1], points[0])) > 1e-8:
            flush()
        if not ring:
            ring.append(points[0])
        if kind == 'l':
            ring.append(points[-1])
        else:
            # Fine sampling preserves the source curve, without rounding corners.
            for step in range(1, 25):
                t = step / 24
                s = 1-t
                ring.append(tuple(s**3*points[0][a]+3*s*s*t*points[1][a]+3*s*t*t*points[2][a]+t**3*points[3][a] for a in (0,1)))
    flush()
    paths.append({'drawingIndex': index, 'fill': color, 'evenOdd': drawing['even_odd'], 'commandCount': len(drawing['items']), 'rings': rings})

result = {'source': source.as_posix(), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'page': 1, 'pageSize': [page.rect.width, page.rect.height], 'coordinateFrame': 'PDF points, top-left origin, x right / y down', 'curveSamples': 24, 'paths': paths}
Path('data/geography/underground/pdf-outline.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
out = Path('build/geography')
out.mkdir(parents=True, exist_ok=True)
page.get_pixmap(matrix=pymupdf.Matrix(1,1)).save(out / 'source-page.png')
svgpaths = ''.join('<path fill="#fff761" stroke="#ae5483" stroke-width="0.5" fill-rule="nonzero" d="'+''.join('M'+'L'.join(f'{x},{y}' for x,y in ring)+'Z' for ring in p['rings'])+'"/>' for p in paths)
(out/'source-outline.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="842" height="1191" viewBox="0 0 {page.rect.width} {page.rect.height}"><rect width="100%" height="100%" fill="white"/>{svgpaths}</svg>', encoding='utf-8')
print(f'Extracted {len(paths)} fill paths, {sum(len(p["rings"]) for p in paths)} rings; original corners retained.')
