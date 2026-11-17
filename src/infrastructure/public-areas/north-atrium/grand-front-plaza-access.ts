import type { Evidence, FloorArea, Point2, VerticalConnection } from '../../../domain/map/model.ts';
export const grandFrontPlazaEvidence: Evidence = {
  source: 'district', pages: [],
  urls: [
    'https://www.gfo-sc.jp/information/floor/umekita/1f/',
    'https://www.gfo-sc.jp/information/floor/umekita/b1f/',
  ],
  detail: 'Official Umekita Plaza 1F/B1 diagrams show the JR-facing escalators and southeast sunken stair beside the Osaka Station connecting passage. Local copies: references/commercial/grand-front/umekita-plaza-1f.jpg and umekita-plaza-b1.jpg. North points right in those diagrams. Positions fitted to the South Building outline, widths and 8 m display rise estimated; no shop layout or routing edges inferred.',
};
/** JR-facing plaza equipment, separate from the station atrium banks 75/76. */
export function createGrandFrontPlazaAccess() {
  const blockId = 'north-atrium-b1';
  const connections: VerticalConnection[] = [];
  const areas: FloorArea[] = [];
  const pad = (p: Point2, width: number): Point2[] => [
    { x: p.x - width / 2, z: p.z - width / 2 }, { x: p.x + width / 2, z: p.z - width / 2 },
    { x: p.x + width / 2, z: p.z + width / 2 }, { x: p.x - width / 2, z: p.z + width / 2 },
  ];
  const add = (id: string, kind: VerticalConnection['kind'], low: Point2, high: Point2, width: number) => {
    const c: VerticalConnection = {
      id: 'grand-front-plaza-' + id, kind, width, blockId,
      evidence: grandFrontPlazaEvidence,
      from: { id: 'grand-front-plaza-' + id + '-b1', level: 'district-underground', ...low },
      to: { id: 'grand-front-plaza-' + id + '-ground', level: 'district-ground', ...high },
      ...(kind === 'stairs' ? { stairLandingLength: 2 } : {}),
    };
    connections.push(c);
    areas.push(...[c.from, c.to].map(n => ({
      id: n.id + ':landing', name: 'Grand Front 南侧广场公共落台', kind: 'public' as const,
      level: n.level, blockId, outline: pad(n, Math.max(6, width + 2)),
      height: .55, label: false, evidence: grandFrontPlazaEvidence,
    })));
  };
  // The 1F diagram's JR-facing banks sit southwest of the South Building.
  // These anchors preserve that arrangement in the shared east/south metre frame.
  add('jr-west-escalator', 'escalator', { x: 372, z: 510 }, { x: 363, z: 496 }, 2.3);
  add('jr-east-escalator', 'escalator', { x: 380, z: 515 }, { x: 372, z: 501 }, 2.3);
  add('sunken-stairs', 'stairs', { x: 383, z: 508 }, { x: 397, z: 489 }, 6);
  return { connections, areas };
}
