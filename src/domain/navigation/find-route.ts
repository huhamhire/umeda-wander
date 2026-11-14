import type { RouteEdge } from '../map/model.ts';

export function findRoute(edges: RouteEdge[], start: string, end: string, allowPaid: boolean): string[] | null {
  const distances = new Map<string, number>([[start, 0]]);
  const previous = new Map<string, string>();
  const visited = new Set<string>();
  while (true) {
    const next = [...distances].filter(([id]) => !visited.has(id)).sort((a, b) => a[1] - b[1])[0];
    if (!next) return null;
    const [id, distance] = next;
    if (id === end) {
      const route = [end];
      while (route[0] !== start) { const parent = previous.get(route[0]!); if (!parent) return null; route.unshift(parent); }
      return route;
    }
    visited.add(id);
    for (const edge of edges) {
      if (!allowPaid && edge.kind === 'gate') continue;
      const target = edge.from === id ? edge.to : (!edge.directed && edge.to === id ? edge.from : null);
      if (target && distance + edge.cost < (distances.get(target) ?? Infinity)) {
        distances.set(target, distance + edge.cost); previous.set(target, id);
      }
    }
  }
}
