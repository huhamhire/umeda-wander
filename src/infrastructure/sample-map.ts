import type { Facility, Level, RouteNode, RouteEdge } from '../domain/map/model.ts';
export const levels: Level[] = [
  { id: 'concourse', label: '1F', name: '中央站厅', y: 0 },
  { id: 'platform', label: '2F', name: '站台区域', y: 8 },
  { id: 'bridge', label: '3F', name: '南北连络桥', y: 16 },
];
export const facilities: Facility[] = [
  { id: 'entry', name: '中央口 · 公共入口', kind: 'gate', level: 'concourse', x: 0, z: 24, note: '局部样板入口，路线由此开始。' },
  { id: 'ticket', name: '售票处', kind: 'ticket', level: 'concourse', x: -21, z: 19, note: '以柜台和售票机组合表达服务区域。位置为示意。' },
  { id: 'gate', name: '中央改札 · 闸机', kind: 'gate', level: 'concourse', x: 0, z: 13, note: '路线在此进入付费区域；闸机数量与位置为示意。' },
  { id: 'escalator', name: '站台扶梯', kind: 'escalator', level: 'concourse', x: 8, z: -3, note: '连接 1F 站厅与 2F 站台。样板展示上行路径。' },
  { id: 'lift', name: '直梯', kind: 'elevator', level: 'concourse', x: -16, z: -3, note: '连接站厅与站台的示意直梯，尚未核对真实停靠层。' },
  { id: 'platform', name: '6 · 7 号站台区域', kind: 'escalator', level: 'platform', x: 8, z: -3, note: '站台号仅作为图形样式示例，未完成现场对应核验。' },
  { id: 'bridge', name: '桥上改札 · 连络桥', kind: 'gate', level: 'bridge', x: 0, z: 13, note: '3F 连络桥局部；本轮导航不覆盖此处。' },
];
export const nodes: RouteNode[] = [
  { id: 'entry', level: 'concourse', x: 0, z: 24 },
  { id: 'gate-out', level: 'concourse', x: 0, z: 16 },
  { id: 'gate-in', level: 'concourse', x: 0, z: 10 },
  { id: 'turn', level: 'concourse', x: 8, z: 10 },
  { id: 'lower', level: 'concourse', x: 8, z: 2 },
  { id: 'upper', level: 'platform', x: 8, z: -8 },
  { id: 'destination', level: 'platform', x: 24, z: -8 },
];
export const edges: RouteEdge[] = [
  { from: 'entry', to: 'gate-out', cost: 8, kind: 'walk' },
  { from: 'gate-out', to: 'gate-in', cost: 6, kind: 'gate' },
  { from: 'gate-in', to: 'turn', cost: 8, kind: 'walk' },
  { from: 'turn', to: 'lower', cost: 8, kind: 'walk' },
  { from: 'lower', to: 'upper', cost: 14, kind: 'escalator', directed: true },
  { from: 'upper', to: 'destination', cost: 16, kind: 'walk' },
];
