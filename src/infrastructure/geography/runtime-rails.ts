import { jrRailCorridors } from '../stations/jr-osaka/rail-corridors.ts';
import subway from '../../../data/geography/railways/subways.json' with { type: 'json' };
import raw from '../../../data/geography/railways/features.json' with { type: 'json' };
import type { StationMap, RailApproach, Point2, LevelId } from '../../domain/map/model.ts';
import { platformRail } from '../../domain/map/rail-geometry.ts';
import { platformTangent } from '../../domain/map/geometry.ts';
import { toGeographicPlan } from '../../domain/map/spatial-block.ts';
import { geographicFrame } from './frame.ts';
export const osmRunningLines = [...raw, ...subway];

/** Source lines constrain the broad corridor only; calibrated platform endpoints own the geometry. */
export function restoreMapRails(stations: StationMap[]): void {
  for (const station of stations) {
    const approaches: RailApproach[] = [];
    for (const level of new Set(station.layout.platforms.map(p => p.level))) {
      const platforms = station.layout.platforms.filter(p => p.level === level && p.tracks.length);
      if (!platforms.length)
        continue;
      const origin = platforms.reduce((s, p) => ({ x: s.x + p.x / platforms.length, z: s.z + p.z / platforms.length }), { x: 0, z: 0 });
      const group = (track: number) => railGroup(level, track);
      const tracks = platforms.flatMap(p => p.tracks.map((track, index) => ({ p, track, index, group: group(track) })));
      for (const key of new Set(tracks.map(t => t.group)))
        for (const side of [-1, 1]) {

          // Extend bowed platforms on their actual end tangent, without steering back to the chord.
          const endAngle = platforms.reduce((s, p) => s + platformTangent(p, side * p.length / 2) / platforms.length, 0);
          const axis = { x: Math.cos(endAngle), z: Math.sin(endAngle) }, normal = { x: -axis.z, z: axis.x };
          const project = (p: Point2) => ({ u: (p.x - origin.x) * axis.x + (p.z - origin.z) * axis.z, v: (p.x - origin.x) * normal.x + (p.z - origin.z) * normal.z });
          const point = (u: number, v: number) => ({ x: origin.x + u * axis.x + v * normal.x, z: origin.z + u * axis.z + v * normal.z });
          const roots = tracks.filter(t => t.group === key && !(t.p.terminal && (t.p.terminalEnd === 'end' ? side === 1 : side === -1))).map(t => {
            const rail = platformRail(t.p, t.index), root = side === 1 ? rail.end : rail.start;
            return { ...t, root, ...project(root) };
          }).sort((a, b) => a.v - b.v);
          if (!roots.length)
            continue;
          const across = roots.reduce((s, r) => s + r.v / roots.length, 0), distance = level === 'platform' ? 150 : 100;
          const desired = Math.max(...roots.map(r => side * r.u)) + distance;
          const id = `map-rail-${station.id}-${level}-${key}-${side}`;
          const approach: RailApproach = { id, station: station.id, level, name: approachName(key),
            color: 0x87958d, labelPoint: point(side * desired, across), nodes: [], segments: [],
            evidence: { source: 'district', pages: [], urls: [], detail: 'Illustrative running corridor fitted from calibrated platform ends; OSM is a broad direction reference only. Grouped schematic merges share junctions and tails; exact switch positions are not surveyed.' } };
          const addNode = (id: string, p: Point2, kind: RailApproach['nodes'][number]['kind']) => {
            const n = { id, point: p, kind };
            approach.nodes.push(n);
            return n;
          };
          const reference = osmRunningLines.filter(f => matchesRailSource(
            level,
            key,
            f.tags as unknown as Record<string, string>,
          ));
          const candidates = reference.flatMap(f => f.coordinates.map((p, index) => ({ f, index, q: project(toGeographicPlan({ lon: p[0]!, lat: p[1]! }, geographicFrame)) })))
            .filter(c => side * c.q.u > desired - 100 && side * c.q.u < desired + 100)
            .sort((a, b) => Math.abs(side * a.q.u - desired) + Math.abs(a.q.v - across) - Math.abs(side * b.q.u - desired) - Math.abs(b.q.v - across));
          if (candidates[0])
            approach.evidence.urls = ['https://www.openstreetmap.org/way/' + candidates[0].f.id];
          let turn = 0;
          if (level === 'platform' && candidates[0]) {
            const { f, index } = candidates[0], before = f.coordinates[Math.max(0, index - 1)]!, after = f.coordinates[Math.min(f.coordinates.length - 1, index + 1)]!;
            const a = toGeographicPlan({ lon: before[0]!, lat: before[1]! }, geographicFrame), b = toGeographicPlan({ lon: after[0]!, lat: after[1]! }, geographicFrame);
            let dx = b.x - a.x, dz = b.z - a.z;
            if ((dx * axis.x + dz * axis.z) * side < 0) {
              dx = -dx;
              dz = -dz;
            }
            turn = Math.max(-25 * Math.PI / 180, Math.min(25 * Math.PI / 180, Math.atan2(side * (axis.x * dz - axis.z * dx), side * (axis.x * dx + axis.z * dz))));
          }
          if (level === 'platform' && key === 'main')
            turn = -side * jrRailCorridors.mainNorthTurn;
          if (level === 'platform' && key === 'loop' && side === 1)
            turn = jrRailCorridors.eastLoopTurn;
          if (level === 'platform')
            approach.name = key === 'main' ? (side === 1 ? 'JR 本线 · 新大阪 / 京都方向' : 'JR 本线 · 尼崎 / 神户方向') : (side === 1 ? 'JR 环状线 · 京桥方向' : 'JR 环状线 · 福岛 / 西九条方向');
          if (level === 'underground-platform')
            approach.name = side === 1 ? '梅北 · 新大阪 / 京都方向' : '梅北 · 关西机场 / 和歌山方向';

          // Shared throats follow the old layout's grouped topology, in the new metre frame.
          const outletCount = key === 'main' ? 4 : 2;
          let outletAcross = Array.from({ length: outletCount }, (_, i) => {
            const subset = roots.filter((_, j) => Math.min(outletCount - 1, Math.floor(j * outletCount / roots.length)) === i);
            if (level === 'platform' && key === 'main')
              return across + (i - (outletCount - 1) / 2) * 4.4;
            if (level === 'platform' && key === 'loop' && side === -1) {
              const mainRoots = tracks.filter(t => t.group === 'main').map(t => project(platformRail(t.p, t.index).start));
              const mainAcross = mainRoots.reduce((sum, r) => sum + r.v / mainRoots.length, 0);
              return mainAcross + jrRailCorridors.westLoopAcrossMain + (i - .5) * 4.4;
            }
            if (level === 'platform')
              return subset.length ? subset.reduce((s, r) => s + r.v / subset.length, 0) : across;
            return across + (i - (outletCount - 1) / 2) * 4.4;
          });
          const targetFor = (i: number) => Math.min(outletCount - 1, Math.floor(i * outletCount / roots.length));
          const spread = Math.max(...roots.map((r, i) => Math.abs(r.v - outletAcross[targetFor(i)]!)));
          const mergeRun = Math.max(level === 'platform' ? 90 : 65, spread * 5);
          let mergeU = Math.max(...roots.map(r => side * r.u)) + mergeRun;
          if (level === 'platform' && key === 'loop' && side === 1) {
            const guide = project(jrRailCorridors.eastLoopThroat), span = roots.at(-1)!.v - roots[0]!.v;
            mergeU = guide.u;
            outletAcross = outletAcross.map((_, i) => guide.v + (i - .5) * Math.min(4.4, span));
          }
          if (level === 'platform' && key === 'loop' && side === -1)
            turn = jrRailCorridors.mainNorthTurn;
          const outlets = outletAcross.map((v, i) => addNode(id + '-merge-' + i, point(side * mergeU, v), 'junction'));
          roots.forEach((r, i) => {
            const root = addNode(id + '-track-' + r.p.id + '-' + r.track, r.root, 'platform-end'), out = outlets[targetFor(i)]!;
            const heading = platformTangent(r.p, side * r.p.length / 2), handle = (mergeU - side * r.u) / 3;
            approach.segments.push({ id: root.id + '-merge', from: root.id, to: out.id, platformId: r.p.id, track: r.track,
              control1: { x: r.root.x + side * Math.cos(heading) * handle, z: r.root.z + side * Math.sin(heading) * handle },
              control2: { x: out.point.x - side * axis.x * handle, z: out.point.z - side * axis.z * handle } });
          });

          // Common-radius turns keep paired running roads parallel and avoid an S-shaped offset.
          const axisOut = { x: axis.x * side, z: axis.z * side }, left = { x: -axisOut.z, z: axisOut.x };
          const sign = Math.sign(turn) || 1, radius = 220;
          const tailAcross = outletAcross.reduce((sum, v) => sum + v / outletAcross.length, 0);
          const center = point(side * mergeU, tailAcross);
          const arcCenter = { x: center.x + left.x * radius * sign, z: center.z + left.z * radius * sign };
          const rotate = (v: Point2, a: number) => ({ x: v.x * Math.cos(a) - v.z * Math.sin(a), z: v.x * Math.sin(a) + v.z * Math.cos(a) });
          const road = rotate(axisOut, turn);
          for (const [i, out] of outlets.entries()) {
            let start = out;
            if (Math.abs(turn) > .01) {
              const vector = { x: out.point.x - arcCenter.x, z: out.point.z - arcCenter.z }, delta = rotate(vector, turn), r = Math.hypot(vector.x, vector.z), handle = 4 / 3 * Math.tan(Math.abs(turn) / 4) * r;
              const bend = addNode(out.id + '-bend', { x: arcCenter.x + delta.x, z: arcCenter.z + delta.z }, 'outlet');
              approach.segments.push({ id: out.id + '-curve', from: out.id, to: bend.id, control1: { x: out.point.x + axisOut.x * handle, z: out.point.z + axisOut.z * handle }, control2: { x: bend.point.x - road.x * handle, z: bend.point.z - road.z * handle } });
              start = bend;
            }
            const tail = 70, end = addNode(out.id + '-end', { x: start.point.x + road.x * tail, z: start.point.z + road.z * tail }, 'end');
            approach.segments.push({ id: out.id + '-tail', from: start.id, to: end.id,
              control1: { x: start.point.x + road.x * tail / 3, z: start.point.z + road.z * tail / 3 },
              control2: { x: end.point.x - road.x * tail / 3, z: end.point.z - road.z * tail / 3 } });
          }
          const ends = approach.nodes.filter(n => n.kind === 'end');
          approach.labelPoint = ends.reduce((sum, n) => ({ x: sum.x + n.point.x / ends.length, z: sum.z + n.point.z / ends.length }), { x: 0, z: 0 });
          approaches.push(approach);
        }
    }
    station.layout.railApproaches = approaches;
  }
}

type RailGroup = 'loop' | 'main' | 'kyoto' | 'takarazuka' | 'kobe' | 'pair';

function railGroup(level: LevelId, track: number): RailGroup {
  if (level === 'platform') {
    return track <= 2 ? 'loop' : 'main';
  }
  if (level === 'hankyu-platform') {
    if (track <= 3) {
      return 'kyoto';
    }
    return track <= 6 ? 'takarazuka' : 'kobe';
  }
  return 'pair';
}

function approachName(group: RailGroup): string {
  const names: Record<RailGroup, string> = {
    loop: 'JR 环状线',
    main: 'JR 本线',
    kobe: '神户线',
    kyoto: '京都线',
    takarazuka: '宝塚线',
    pair: '轨道延伸',
  };
  return names[group];
}

function matchesRailSource(level: LevelId, group: RailGroup, tags: Record<string, string>): boolean {
  const name = tags.name ?? '';
  switch (level) {
    case 'platform':
      return group === 'loop' ? /大阪環状/.test(name) : /東海道/.test(name);
    case 'underground-platform':
      return /梅田貨物/.test(name);
    case 'hankyu-platform': {
      const sourceNames = { kobe: '神戸', kyoto: '京都', takarazuka: '宝塚' };
      if (group === 'kobe' || group === 'kyoto' || group === 'takarazuka') {
        return name.includes(sourceNames[group]);
      }
      return false;
    }
    case 'hanshin-platform':
      return /阪神/.test(name + (tags.operator ?? ''));
    case 'kitashinchi-platform':
      return /東西/.test(name);
    case 'metro-platform':
      return /御堂筋/.test(name);
    case 't20-platform':
      return /谷町/.test(name);
    case 'y11-platform':
      return /四つ橋/.test(name);
    default:
      return false;
  }
}
