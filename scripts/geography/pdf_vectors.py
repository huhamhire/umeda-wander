"""Sample the source's closed line/Bezier paths without smoothing corners."""


def closed_drawing_rings(drawing, curve_samples=24):
    rings = []
    ring = []

    def flush():
        nonlocal ring
        if len(ring) > 2:
            if ring[-1] != ring[0]:
                ring.append(ring[0])
            rings.append(ring)
        ring = []

    for kind, *raw_points in drawing['items']:
        if kind not in ('l', 'c'):
            raise ValueError(f'Unsupported path command: {kind}')
        points = [(float(p.x), float(p.y)) for p in raw_points]
        if ring and sum((a-b)**2 for a, b in zip(ring[-1], points[0])) > 1e-8:
            flush()
        if not ring:
            ring.append(points[0])
        if kind == 'l':
            ring.append(points[-1])
        else:
            for step in range(1, curve_samples + 1):
                t = step / curve_samples
                s = 1-t
                ring.append(tuple(
                    s**3*points[0][a] + 3*s*s*t*points[1][a]
                    + 3*s*t*t*points[2][a] + t**3*points[3][a]
                    for a in (0, 1)
                ))
    flush()
    return rings
