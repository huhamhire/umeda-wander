"""Extract explicitly reviewed B1 occupancy boundaries, not inferred doorways."""
import hashlib
import json
from pathlib import Path
import pymupdf
from pdf_vectors import closed_drawing_rings

source = Path('references/district/underground-walkway-map.pdf')
sha256 = hashlib.sha256(source.read_bytes()).hexdigest()
yellow = json.loads(Path('data/geography/underground/pdf-outline.json').read_text('utf-8'))
if sha256 != yellow['sha256']:
    raise ValueError('Reference PDF changed: re-review selected drawing indices before extracting.')

# The white MARU island has its own closed curved stroke. Do not use the
# combined hotel/street/No.1-building stroke (drawing 63) as a hotel footprint.
selections = [
    ('e-ma', 'E-ma', 405, 'green block fill'),
    ('hilton-west', 'Hilton Plaza West', 436, 'green block fill'),
    ('osaka-maru', '大阪 MARU 大厦', 243, 'closed curved outer boundary stroke'),
]
page = pymupdf.open(source)[0]
drawings = page.get_drawings()
buildings = []
for identifier, name, index, kind in selections:
    drawing = drawings[index]
    rings = closed_drawing_rings(drawing)
    if len(rings) != 1:
        raise ValueError(f'{identifier}: expected one reviewed closed boundary')
    buildings.append({
        'id': identifier,
        'name': name,
        'drawingIndex': index,
        'boundaryKind': kind,
        'commandCount': len(drawing['items']),
        'rings': rings,
    })

result = {
    'source': source.as_posix(),
    'sha256': sha256,
    'page': 1,
    'coordinateFrame': 'PDF points, top-left origin, x right / y down',
    'curveSamples': 24,
    'note': 'B1 block occupancy only. Green fills and named outer strokes do not confirm basement extents, entrances, levels or public access. Reference derivative permission pending.',
    'buildings': buildings,
}
Path('data/geography/underground/basement-source.json').write_text(
    json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8',
)
print(f'Extracted {len(buildings)} reviewed basement boundaries; no public network changes.')
