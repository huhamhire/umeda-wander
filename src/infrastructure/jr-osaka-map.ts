import { passageOutline, platformLocalPoint, rotatePoint } from '../domain/map/geometry.ts';
import { undergroundRotationRad, undergroundSketchCorrectionRad } from './station-orientation.ts';
import type { Evidence, Facility, FloorArea, Level, Platform, RouteNode, RouteEdge, StationLayout, VerticalConnection } from '../domain/map/model.ts';

// Source: references/station_osaka.pdf, current as of 2026-01-14.
// Level/name/diagram references are checked; all X/Z and heights remain schematic.
const source = (pages: number[], detail: string): Evidence => ({ pages, detail });
export const levels: Level[] = [
  { id: 'underground-platform', label: 'B2F', name: '梅北 21–24 番线', y: -16, description: '梅北地下站台位于 B2F，两组站台为 21/22 与 23/24 番线。HARUKA 等列车在此区域停靠，乘车以当天站内信息为准。' },
  { id: 'underground-hall', label: 'B1F', name: '梅北地下口', y: -8, description: 'B1F 梅北地下口与闸内站厅，向下连接 B2F 站台；它与 1F 中央改札口是不同区域。' },
  { id: 'concourse', label: '1F', name: '中央改札与站厅', y: 0, description: '中央改札口在地上 1F。公共中央通路与闸内区域分别显示。' },
  { id: 'mezzanine', label: 'M2F', name: '夹层通道', y: 4, description: '1F 与 2F 之间的夹层，包含中央口与樱桥口内通道；不是地下层。' },
  { id: 'platform', label: '2F', name: '1–11 番线', y: 8, description: '六组地面站台：1/2、3/4、5/6、7/8、9/10 与 11 番线。' },
  { id: 'bridge', label: '3F', name: '南北连络桥', y: 16, description: '公共南北连络桥与桥上改札内区域并行，北接 LUCUA，南接南门大楼。' },
];
const rectangle = (x: number, z: number, w: number, d: number) => [
  { x: x - w / 2, z: z - d / 2 }, { x: x + w / 2, z: z - d / 2 },
  { x: x + w / 2, z: z + d / 2 }, { x: x - w / 2, z: z + d / 2 },
];
const p1 = source([5], '1F plan: public concourses, named gates and service areas');
const pm = source([4], 'Walkways inside Central/Sakurabashi gates on Mezzanine 2F');
const pp = source([3], '2F platforms numbered 1–11; north at track 11 side');
const pb = source([2], '3F North-South Bridge, Bridge Gate and paid platform access');
export const areas: FloorArea[] = [
  { id: 'north-b1-public', level: 'underground-hall', name: '北门大楼 B1F · 闸外通路', kind: 'public', outline: rectangle(-15, -52, 40, 8), label: true, evidence: source([6], 'B1F North Gate building, public route toward Umekita Underground Gate') },
  { id: 'north-b1-portal', level: 'underground-hall', name: '北侧地下区域方向 · 边界', kind: 'public', outline: rectangle(-4, -61, 8, 10), label: true, evidence: source([6, 8], 'Northern underground public-area boundary; surrounding buildings not fully modeled') },
  { id: 'west-public', level: 'concourse', name: '西口 · 闸外', kind: 'public', outline: rectangle(-81, 0, 10, 73), label: true, evidence: source([7], '1F West Gate exterior passage') },
  { id: 'west-paid', level: 'concourse', name: '西口内通道', kind: 'paid', outline: rectangle(-67, 0, 16, 68), evidence: source([7], '1F West Gate paid passage') },
  { id: 'west-south-link', level: 'concourse', name: '西口—樱桥方向', kind: 'public', outline: rectangle(-68, 41, 36, 9), evidence: source([5, 7], 'West Gate / Sakurabashi public side') },
  { id: 'umekita-public', level: 'underground-hall', name: '梅北地下口 · 闸外', kind: 'public', outline: [{x:-104,z:-106},{x:-104,z:-119},{x:-99,z:-119},{x:-99,z:-127},{x:-91,z:-127},{x:-91,z:-119},{x:-79,z:-119},{x:-79,z:-124},{x:-74,z:-124},{x:-74,z:-106}], label: true, evidence: source([8], 'B1F Umekita Underground Gate public side') },
  { id: 'umekita-paid', level: 'underground-hall', name: '梅北地下口 · 闸内', kind: 'paid', outline: [{x:-110.5,z:-106},{x:-75.5,z:-106},{x:-75.5,z:-89},{x:-79,z:-80},{x:-87,z:-80},{x:-92,z:-84},{x:-101,z:-80},{x:-110.5,z:-83}], label: true, evidence: source([8], 'B1F paid concourse above platforms') },
  { id: 'umekita-east-link', level: 'underground-hall', name: '往中央口方向 · 闸外', kind: 'public', outline: rectangle(-58, -112, 32, 7), evidence: source([6, 8], 'Public route toward Central Gate; only boundary stub modeled') },
  { id: 'central-public', level: 'concourse', name: '中央通路 · 闸外', kind: 'public', outline: [{x:-8.5,z:-36},{x:8.5,z:-36},{x:8.5,z:25},{x:20,z:29},{x:20,z:36},{x:-8.5,z:36}], label: true, evidence: p1 },
  { id: 'central-paid', level: 'concourse', name: '中央改札内', kind: 'paid', outline: [{x:-37.5,z:-34},{x:-8.5,z:-34},{x:-8.5,z:34},{x:-50.5,z:34},{x:-50.5,z:24},{x:-37.5,z:24}], evidence: p1 },
  { id: 'north-public', level: 'concourse', name: '北侧公共通路', kind: 'public', outline: rectangle(0, -41, 116, 10), evidence: p1 },
  { id: 'south-public', level: 'concourse', name: '南侧公共通路', kind: 'public', outline: rectangle(0, 41, 116, 10), evidence: p1 },
  { id: 'midosuji-public', level: 'concourse', name: '御堂筋通路 · 闸外', kind: 'public', outline: rectangle(53, 0, 10, 72), label: true, evidence: p1 },
  { id: 'midosuji-paid', level: 'concourse', name: '御堂筋改札内', kind: 'paid', outline: rectangle(38, 0, 18, 68), evidence: p1 },
  { id: 'eki-marche', level: 'concourse', name: 'Eki Marché Osaka', kind: 'commercial', outline: rectangle(-47, -2, 17, 57), height: 1.8, label: true, evidence: p1 },
  { id: 'ticket-office', level: 'concourse', name: '售票处', kind: 'service', outline: rectangle(18, -7, 17, 12), height: 2.2, evidence: p1 },
  { id: 'central-court-shop', level: 'concourse', name: '中央通路东侧 · 土产与便利店', kind: 'commercial', outline: rectangle(18, 18, 17, 15), height: 1.6, label: true, evidence: p1 },
  { id: 'information', level: 'concourse', name: '旅客咨询', kind: 'service', outline: rectangle(17, -21, 16, 11), height: 1.7, evidence: p1 },
  { id: 'north-lucua1100', level: 'concourse', name: 'LUCUA 1100', kind: 'commercial', outline: rectangle(-33, -52, 41, 13), height: 2.8, label: true, evidence: p1 },
  { id: 'north-lucua', level: 'concourse', name: 'LUCUA', kind: 'commercial', outline: rectangle(32, -52, 38, 13), height: 2.8, label: true, evidence: p1 },
  { id: 'south-daimaru', level: 'concourse', name: '大丸梅田店', kind: 'commercial', outline: rectangle(20,55,22,16), elevationOffset:1.3, height:2.2, label:true, evidence:p1 },
  { id:'south-granvia',level:'concourse',name:'Hotel Granvia / 大丸西侧',kind:'commercial',outline:rectangle(-16,55,14,16),elevationOffset:1.3,height:2.2,label:true,evidence:p1 },
  { id:'south-central-raised',level:'concourse',name:'南中央口 · 往大丸',kind:'public',outline:rectangle(0,55,12,12),elevationOffset:1.3,label:true,evidence:source([5],'Small stair transition toward South Central Gate / Daimaru, user-identified detail; height schematic') },
  { id:'south-raised-plinth',level:'concourse',name:'南侧入口局部抬高基座',kind:'service',outline:rectangle(4,55,54,16),height:1.3,evidence:source([5],'Support volume for schematic local raised entrance, not an extra floor') },
  { id:'crost-public',level:'underground-hall',name:'Crost · 南侧地下通路',kind:'public',outline:rectangle(0,27,28,12),label:true,evidence:source([5,6],'Crost B1F access from Central Court') },
  // Separate fingers show the mezzanine is a passage, not another full floor slab.
  { id: 'central-mezz', level: 'mezzanine', name: '中央口内夹层通道', kind: 'paid', outline: rectangle(-25, 0, 6, 68), label: true, evidence: pm },
  { id: 'sakurabashi-mezz', level: 'mezzanine', name: '樱桥口内夹层通道', kind: 'paid', outline: rectangle(-40, -3, 5, 56), label: true, evidence: pm },
  { id: 'mezz-link', level: 'mezzanine', name: '夹层联络段', kind: 'paid', outline: rectangle(-32.5, 21, 20, 6), evidence: pm },
  { id: 'midosuji-mezz-north', level: 'mezzanine', name: '11 番线连接段', kind: 'paid', outline: rectangle(42, -30, 15, 6), evidence: pm },
  { id: 'midosuji-mezz-south', level: 'mezzanine', name: '1/2 番线连接段', kind: 'paid', outline: rectangle(42, 30, 23, 6), evidence: pm },
  { id: 'bridge-public', level: 'bridge', name: '南北连络桥 · 闸外', kind: 'public', outline: rectangle(-8, 0, 8, 76), label: true, evidence: pb },
  { id: 'bridge-paid', level: 'bridge', name: '桥上改札内', kind: 'paid', outline: rectangle(2.5, 0, 13, 70), label: true, evidence: pb },
  { id: 'bridge-north', level: 'bridge', name: '北门大楼 3F', kind: 'public', outline: rectangle(0, -43.5, 61, 11), evidence: pb },
  { id: 'bridge-south', level: 'bridge', name: '南门大楼 3F', kind: 'public', outline: rectangle(-3, 44, 25, 12), evidence: pb },
];
export const platforms: Platform[] = [
  { id: 'p11', level: 'platform', tracks: [11], x: 0, z: -30, length: 119, width: 6, rotationRad: 0, evidence: pp },
  { id: 'p9-10', level: 'platform', tracks: [9, 10], x: 0, z: -18, length: 120, width: 7, rotationRad: 0, evidence: pp },
  { id: 'p7-8', level: 'platform', tracks: [7, 8], x: 0, z: -6, length: 120, width: 7, rotationRad: 0, evidence: pp },
  { id: 'p5-6', level: 'platform', tracks: [5, 6], x: 0, z: 6, length: 120, width: 7, rotationRad: 0, evidence: pp },
  { id: 'p3-4', level: 'platform', tracks: [3, 4], x: 0, z: 18, length: 120, width: 7, rotationRad: 0, evidence: pp },
  { id: 'p1-2', level: 'platform', tracks: [1, 2], x: 0, z: 30, length: 120, width: 7, rotationRad: 0, evidence: pp },
  { id: 'p21-22', level: 'underground-platform', tracks: [21, 22], x: -88, z: -109, length: 70, width: 7, rotationRad: undergroundRotationRad, evidence: source([8], 'B2F platform for tracks 21 and 22') },
  { id: 'p23-24', level: 'underground-platform', tracks: [23, 24], x: -104, z: -109, length: 70, width: 7, rotationRad: undergroundRotationRad, evidence: source([8], 'B2F platform for tracks 23 and 24') },
];
export const facilities: Facility[] = [
  { id: 'west-gate', name: '西改札口 · West Gate', kind: 'gate', level: 'concourse', x: -75, z: 20, axis: 'z', note: '地上 1F 西口。图示通过 92 号扶梯及 B2F 连接通道通往梅北地下口；连接通道不是直达所有地面站台的捷径。', evidence: source([7, 8], 'West Gate and connecting walkway') },
  { id: 'umekita-gate', name: '梅北地下改札口', kind: 'gate', level: 'underground-hall', x: -88, z: -105, axis: 'x', note: '位于 B1F，向下前往 B2F 的 21–24 番线。与地上 1F 中央改札口不同。', evidence: source([8], 'Umekita Underground Gate at B1F') },
  { id: 'umekita-platform', name: '梅北地下站台 · 21/22 番线', kind: 'entrance', level: 'underground-platform', x: -88, z: -112, note: 'B2F 两组地下站台之一；HARUKA、黑潮等列车使用梅北区域。具体班次、方向和番线以当天站内信息为准。', evidence: source([8], 'B2F underground platforms 21–24') },
  { id: 'umekita-link', name: 'B2F 西口连接通道', kind: 'entrance', level: 'underground-platform', x: -76, z: -55, note: '参考图注明此闸内通道用于西口与梅北地下口之间通行。几何长度及走向已简化，不显示步行时间。', evidence: source([7, 8], 'Connecting walkway restriction note') },
  { id: 'entry', name: '中央通路 · 南侧入口', kind: 'entrance', level: 'concourse', x: 0, z: 41, note: '1F 公共中央通路的南侧，北侧通往 LUCUA 一侧。入口坐标为简化布置。', evidence: p1 },
  { id: 'gate-central-north', name: '中央改札口 · 北侧闸机组', kind: 'gate', level: 'concourse', x: -9, z: -15, axis: 'z', note: '按 1F 图在中央通路西侧补上北侧闸机组，与南侧组共用付费区边界。机柜数量与尺寸为示意。', evidence: p1 },
  { id: 'gate', name: '中央改札口', kind: 'gate', level: 'concourse', x: -9, z: 4, axis: 'z', note: '位于地上 1F，西侧为闸内区域，东侧为公共中央通路；不是地下闸口。', evidence: source([5], 'Central Gate, 1F') },
  { id: 'sakurabashi-gate', name: '樱桥改札口', kind: 'gate', level: 'concourse', x: -42, z: 32, axis: 'x', note: '参考图位于车站西南侧 1F。本轮仅表现位置关系，不提供该闸口完整导航。', evidence: p1 },
  { id: 'eki-gate', name: 'Eki Marché 大阪改札口', kind: 'gate', level: 'concourse', x: -37, z: 12, axis: 'z', note: 'Eki Marché 一侧的闸口，与中央改札分别建模。', evidence: p1 },
  { id: 'midosuji-gate', name: '御堂筋改札口', kind: 'gate', level: 'concourse', x: 47, z: 0, axis: 'z', note: '1F 车站东侧，邻接御堂筋公共通路；路线尚未录入。', evidence: p1 },
  { id: 'south-gate', name: '南改札口', kind: 'gate', level: 'concourse', x: 38, z: 35, axis: 'x', note: '东南侧 1F 闸口；与南门大楼的名称不同。', evidence: p1 },
  { id: 'machines-central', name: '中央口 · 自动售票机', kind: 'ticket-machine', level: 'concourse', x: 6, z: -5, rotationRad: Math.PI/2, note: '中央公共通路内、JR 售票处西侧的自动售票机位置。柜台与售票机分开标注，机型和数量以现场为准。', evidence: p1 },
  { id: 'machines-sakura', name: '樱桥口 · 自动售票机', kind: 'ticket-machine', level: 'concourse', x: -46, z: 39, rotationRad: 0, note: '樱桥改札附近的闸外售票机组，依据 1F 图整理。', evidence: p1 },
  { id: 'machines-west', name: '西口 · 自动售票机', kind: 'ticket-machine', level: 'concourse', x: -83, z: 29, rotationRad: -Math.PI/2, note: '西口闸外通路内的售票机组，位置关系据西口平面图整理。', evidence: source([7], 'West Gate outside-ticket-gate ticket machines') },
  { id: 'machines-midosuji', name: '御堂筋口 · 自动售票机', kind: 'ticket-machine', level: 'concourse', x: 51, z: -20, rotationRad: -Math.PI/2, note: '御堂筋公共通路侧的售票机位置，位于闸外。', evidence: p1 },
  { id: 'machines-bridge', name: '桥上口 · 自动售票机', kind: 'ticket-machine', level: 'bridge', x: -9, z: -11, rotationRad: Math.PI/2, note: '3F 公共南北连络桥、桥上改札外侧的售票机组。', evidence: pb },
  { id: 'machines-umekita', name: '梅北地下口 · 自动售票机', kind: 'ticket-machine', level: 'underground-hall', x: -79, z: -114, rotationRad: 0, note: 'B1F 梅北地下改札闸外，售票机随地下区域朝向布置。', evidence: source([8], 'Umekita B1F outside-ticket-gate ticket machines') },
  {id:'daimaru-steps',name:'中央口—大丸 · 小半层台阶',kind:'stairs',level:'concourse',x:0,z:44,note:'南端往大丸／南中央口的小段台阶，与 1F 公共通路之间有局部高差；不作为独立完整楼层。高差与步数为示意。',evidence:source([5],'User-marked Central Court / South Central Gate transition')},
  {id:'daimaru-entry',name:'南中央口 · 大丸入口方向',kind:'entrance',level:'concourse',x:0,z:55,elevationOffset:1.3,note:'经小半层台阶衔接的 1F 南侧公共通道，两侧为大丸与 Hotel Granvia 一带。',evidence:p1},
  { id: 'ticket', name: 'JR 售票处', kind: 'ticket', level: 'concourse', x: 18, z: -7, note: '位于中央公共通路东侧；服务区位置关系据 1F 图整理，柜台尺寸与机柜数量为图形简化。', evidence: p1 },
  { id: 'information', name: '列车与旅游咨询', kind: 'information', level: 'concourse', x: 17, z: -21, note: '中央通路东侧的 Train and Tourist Information，位于售票处北侧。', evidence: p1 },
  { id: 'escalator', name: '中央口内扶梯 · 5/6 番线', kind: 'escalator', level: 'concourse', x: -20, z: 6, note: '按图示编号 34 对照 1F 与 2F 的同一设施，简化为中央改札内至 5/6 番线的连接；上下行与几何仍为演示设定。', evidence: source([3, 5], 'Diagram escalator 34; diagram identifiers are not on-site signs') },
  { id: 'lift', name: '直梯 · 7/8 番线', kind: 'elevator', level: 'concourse', x: 43, z: -6, note: '依据图示 M 关联 1F 与 7/8 番线。M 仅为参考图内部编号，不是现场指示牌。', evidence: source([3, 5], 'Diagram elevator M') },
  { id: 'mezz-central', name: '中央口内夹层通道', kind: 'stairs', level: 'mezzanine', x: -25, z: 0, note: '位于 1F 和 2F 站台之间，非地下层。用窄通道与楼梯表示，不做完整封闭楼板。', evidence: pm },
  { id: 'mezz-sakura', name: '樱桥口内夹层通道', kind: 'stairs', level: 'mezzanine', x: -40, z: 0, note: '西侧窄通道，与中央口内通道在局部联络。这里只表现选取的楼梯与联络段。', evidence: pm },
  { id: 'platform', name: '5/6 番线站台', kind: 'entrance', level: 'platform', x: 22, z: 6, note: '地上 2F，5 与 6 番线共享一组岛式站台；纠正首版将 6/7 配成一组的示意编号。', evidence: pp },
  { id: 'bridge', name: '桥上改札口', kind: 'gate', level: 'bridge', x: -3, z: 4, axis: 'z', note: '位于 3F。西侧是公共南北连络桥，东侧是通往各站台的闸内区域；与 1F 中央改札不同。', evidence: pb },
];
const landing = (id: string, level: RouteNode['level'], x: number, z: number): RouteNode => ({ id, level, x, z });
export const connections: VerticalConnection[] = [
  { id: 'central-34', kind: 'escalator', from: landing('lower', 'concourse', -20, 6), to: landing('upper', 'platform', -10, 6), evidence: facilities.find(f => f.id === 'escalator')!.evidence },
  { id: 'lift-m', kind: 'elevator', from: landing('lift-m-1', 'concourse', 43, -6), to: landing('lift-m-2', 'platform', 43, -6), evidence: facilities.find(f => f.id === 'lift')!.evidence },
  { id: 'central-53', kind: 'stairs', from: landing('stair53-1', 'concourse', -20, 0), to: landing('stair53-m', 'mezzanine', -25, 0), evidence: source([4, 5], 'Staircase 53, selected mezzanine access') },
  ...platforms.filter(platform => platform.level === 'platform').map((platform, index): VerticalConnection => ({
    id: `bridge-${platform.id}`, kind: 'escalator',
    from: landing(`bridge-${index}`, 'bridge', 6, platform.z),
    to: landing(`platform-${index}`, 'platform', 17, platform.z),
    evidence: source([2, 3], `Selected eastern 3F–2F escalator: diagram ${[4, 6, 8, 10, 12, 14][index]}`),
  })),
  ...platforms.filter(platform => platform.level === 'platform').map((platform, index): VerticalConnection => ({
    id: `mezz-${platform.id}`, kind: 'stairs',
    from: landing(`mezz-${index}`, 'mezzanine', -25, platform.z),
    to: landing(`mezz-platform-${index}`, 'platform', -33, platform.z),
    evidence: source([3, 4], 'Selected Central Gate mezzanine/platform stair bank; simplified endpoints'),
  })),
  ...platforms.filter(platform => platform.level === 'platform').map((platform, index): VerticalConnection => ({
    id: `west-${platform.id}`, kind: 'escalator',
    from: landing(`west-floor-${index}`, 'concourse', -67, platform.z),
    to: landing(`west-platform-${index}`, 'platform', -52, platform.z),
    evidence: source([3, 7], `Selected West Gate/platform access, diagram ${[91, 90, 88, 86, 84, 82][index]}`),
  })),
  { id: 'west-92', kind: 'escalator', from: landing('west-lower', 'concourse', -67, -31), to: landing('walkway-start', 'underground-platform', -76, -39), evidence: source([7, 8], 'Diagram escalator 92, West Gate / B2F walkway') },
  { id: 'umekita-93', kind: 'escalator', from: landing('walkway-end', 'underground-platform', -76, -71), to: landing('umekita-arrival', 'underground-hall', -81, -80), evidence: source([7, 8], 'Diagram escalator 93, B2F walkway / B1F concourse') },
  { id: 'umekita-95', kind: 'escalator', from: landing('underground-lower', 'underground-hall', -88, -86), to: landing('underground-upper', 'underground-platform', -88, -96), evidence: source([8], 'Diagram escalator 95, B1F / 21–22 platform') },
  { id: 'umekita-97', kind: 'escalator', from: landing('b1-97', 'underground-hall', -104, -86), to: landing('b2-97', 'underground-platform', -104, -96), evidence: source([8], 'Diagram escalator 97, B1F / 23–24 platform') },
  { id: 'umekita-ad', kind: 'elevator', from: landing('ad-1', 'underground-hall', -88, -101), to: landing('ad-2', 'underground-platform', -88, -101), evidence: source([8], 'Diagram elevator AD') },
  { id: 'umekita-ae', kind: 'elevator', from: landing('ae-1', 'underground-hall', -104, -101), to: landing('ae-2', 'underground-platform', -104, -101), evidence: source([8], 'Diagram elevator AE') },
];
export const layout: StationLayout = { areas, platforms, connections };
export const nodes: RouteNode[] = [
  landing('entry', 'concourse', 0, 41), landing('hall-bypass','concourse',14,36), landing('hall-turn','concourse',14,30), landing('hall-rejoin','concourse',7,24), landing('hall', 'concourse', 0, 4),
  landing('gate-out', 'concourse', -6, 4), landing('gate-in', 'concourse', -13, 4),
  landing('turn', 'concourse', -20, 4), connections[0]!.from, connections[0]!.to,
  landing('destination', 'platform', 22, 6),
  landing('public-b1-entry', 'underground-hall', 0, -52), landing('public-b1-turn', 'underground-hall', -31, -52),
  landing('public-join', 'underground-hall', -42, -112), landing('umekita-gate-out', 'underground-hall', -88, -110), landing('umekita-gate-in', 'underground-hall', -88, -101),
  landing('west-entry', 'concourse', -81, 20), landing('west-inside', 'concourse', -67, 20),
  ...connections.filter(connection => ['west-92', 'umekita-93', 'umekita-95'].includes(connection.id)).flatMap(connection => [connection.from, connection.to]),
  landing('underground-destination', 'underground-platform', -88, -112),
];
export const edges: RouteEdge[] = [
  { from: 'public-b1-entry', to: 'public-b1-turn', cost: 31, kind: 'walk' },
  { from: 'public-b1-turn', to: 'public-join', cost: 30, kind: 'walk' },
  { from: 'public-join', to: 'umekita-gate-out', cost: 46, kind: 'walk' },
  { from: 'umekita-gate-out', to: 'umekita-gate-in', cost: 9, kind: 'gate' },
  { from: 'umekita-gate-in', to: 'underground-lower', cost: 15, kind: 'walk' },
  {from:'entry',to:'hall-bypass',cost:15,kind:'walk'},
  {from:'hall-bypass',to:'hall-turn',cost:6,kind:'walk'},
  {from:'hall-turn',to:'hall-rejoin',cost:9,kind:'walk'},
  {from:'hall-rejoin',to:'hall',cost:21,kind:'walk'},
  { from: 'hall', to: 'gate-out', cost: 6, kind: 'walk' },
  { from: 'gate-out', to: 'gate-in', cost: 7, kind: 'gate' },
  { from: 'gate-in', to: 'turn', cost: 7, kind: 'walk' },
  { from: 'turn', to: 'lower', cost: 2, kind: 'walk' },
  { from: 'lower', to: 'upper', cost: 14, kind: 'escalator', directed: true },
  { from: 'upper', to: 'destination', cost: 32, kind: 'walk' },
  { from: 'west-entry', to: 'west-inside', cost: 14, kind: 'gate' },
  { from: 'west-inside', to: 'west-lower', cost: 51, kind: 'walk' },
  { from: 'west-lower', to: 'walkway-start', cost: 20, kind: 'escalator', directed: true },
  { from: 'walkway-start', to: 'walkway-end', cost: 32, kind: 'walk' },
  { from: 'walkway-end', to: 'umekita-arrival', cost: 14, kind: 'escalator', directed: true },
  { from: 'umekita-arrival', to: 'underground-lower', cost: 13, kind: 'walk' },
  { from: 'underground-lower', to: 'underground-upper', cost: 14, kind: 'escalator', directed: true },
  { from: 'underground-upper', to: 'underground-destination', cost: 16, kind: 'walk' },
];


// Correct the whole underground station sketch, not just its visible platform slabs.
// Keep the West Gate landing and North Gate B1F fixed; rebuild the paid passage
// between that landing and the corrected Umekita landing after the transform.
const undergroundSketchOrigin = { x: -96, z: -102 };
// Keep the West Gate–Umekita spine roughly perpendicular to the surface tracks.
// Location/scale follow the supplied layout sketch; they are not surveyed coordinates.
const undergroundAnchor = { x: -60, z: -110 };
const corrected = new Set<object>();
const keepPosition = new Set(['walkway-start', 'public-b1-entry', 'public-b1-turn']);
function correctPosition(point: { x: number; z: number }, level: RouteNode['level'], id = ''): void {
  if (!['underground-hall','underground-platform'].includes(level) || keepPosition.has(id) || corrected.has(point)) return;
  const rotated = rotatePoint(point, undergroundSketchOrigin, undergroundSketchCorrectionRad);
  Object.assign(point, {x:undergroundAnchor.x+rotated.x-undergroundSketchOrigin.x,z:undergroundAnchor.z+rotated.z-undergroundSketchOrigin.z}); corrected.add(point);
}
for (const area of areas) {
  if (['north-b1-public','north-b1-portal','crost-public'].includes(area.id)) continue;
  for (const point of area.outline) correctPosition(point, area.level);
}
for (const platform of platforms) correctPosition(platform, platform.level);
for (const facility of facilities) {
  if (facility.id === 'umekita-link') continue;
  correctPosition(facility, facility.level);
  if (facility.level === 'underground-hall' && facility.rotationRad !== undefined) facility.rotationRad += undergroundSketchCorrectionRad;
  else if (facility.level === 'underground-hall' && facility.kind === 'gate') facility.rotationRad = undergroundSketchCorrectionRad;
}
for (const connection of connections) {
  correctPosition(connection.from, connection.from.level, connection.from.id);
  correctPosition(connection.to, connection.to.level, connection.to.id);
}
for (const node of nodes) correctPosition(node, node.level, node.id);
const passageStart = nodes.find(node => node.id === 'walkway-start')!;
const passageEnd = nodes.find(node => node.id === 'walkway-end')!;
areas.push({ id: 'underground-walkway', level: 'underground-platform', name: '西口—梅北连接通道', kind: 'paid',
  outline: passageOutline(passageStart, passageEnd, 7), label: true,
  evidence: source([7, 8], 'B2F connecting walkway; rebuilt from the West Gate landing to the rotated Umekita landing, geometry remains schematic') });
const passageFacility = facilities.find(facility => facility.id === 'umekita-link')!;
passageFacility.x = (passageStart.x + passageEnd.x) / 2;
passageFacility.z = (passageStart.z + passageEnd.z) / 2;
const join = nodes.find(node => node.id === 'public-join')!;
// Join the North Gate B1F public corridor to the rotated station's public approach.
areas.push({ id: 'public-b1-connector', level: 'underground-hall', name: '梅北—北侧 B1F 闸外联络通路', kind: 'public',
  outline: [{ x: -35, z: -56 }, { x: -31, z: -48 }, { x: join.x + 3, z: join.z + 4 }, { x: join.x - 3, z: join.z - 4 }],
  evidence: source([6, 8], 'B1F outside-ticket-gate underground connection; geometry simplified') });

// Additional banks read from the floor plans. Directions are geometric only;
// operational up/down direction is not inferred or inserted into the route graph.
function addEscalator(id:string,from:RouteNode,to:RouteNode,pages:number[],detail:string):void {
  connections.push({id,kind:'escalator',from,to,evidence:source(pages,detail)});
}
for(const [diagram,platformId] of [[32,'p9-10'],[33,'p7-8'],[35,'p3-4']] as const){
  const platform=platforms.find(p=>p.id===platformId)!;
  addEscalator(`central-${diagram}`,landing(`central-${diagram}-1`,'concourse',-20,platform.z),landing(`central-${diagram}-2`,'platform',-10,platform.z),[3,5],`Central Gate bank, diagram ${diagram}`);
}
for(const [i,platformId] of ['p9-10','p7-8','p5-6','p3-4'].entries()){
  const platform=platforms.find(p=>p.id===platformId)!;
  for(let side=0;side<2;side++){
    const diagram=36+i*2+side,x=31+side*8;
    addEscalator(`midosuji-${diagram}`,landing(`midosuji-${diagram}-1`,'concourse',x,platform.z),landing(`midosuji-${diagram}-2`,'platform',x+6,platform.z),[3,5],`Midosuji Gate paired bank, diagram ${diagram}`);
  }
}
for(const [i,platformId] of ['p9-10','p7-8','p5-6','p3-4','p1-2'].entries()){
  const platform=platforms.find(p=>p.id===platformId)!;
  addEscalator(`bridge-west-${5+i*2}`,landing(`bridge-west-${i}-3`,'bridge',1.5,platform.z),landing(`bridge-west-${i}-2`,'platform',-8.5,platform.z),[2,3],`Western Bridge Gate bank, diagram ${5+i*2}`);
}
areas.push({id:'mezz-south-finger',level:'mezzanine',name:'夹层南端支路',kind:'paid',outline:rectangle(-35,26,5,10),evidence:source([4],'Selected southern mezzanine branch')});
for(const [id,fromX,toX,z] of [[18,-40,-32,-30],[19,-25,-17,-30],[30,-35,-27,30],[31,-25,-17,30]]){
  addEscalator(`mezz-escalator-${id}`,landing(`mezz-${id}-m`,'mezzanine',fromX!,z!),landing(`mezz-${id}-2`,'platform',toX!,z!),[3,4],`Mezzanine/platform escalator, diagram ${id}`);
}
areas.push({id:'north-2f-public',level:'platform',name:'2F 北门大楼 · 中庭与连廊',kind:'public',outline:rectangle(0,-44,122,12),label:true,evidence:source([3],'North Gate building 2F public concourse and Carillon Plaza approach')});
for(const [id,x] of [[47,-3],[48,3]])addEscalator(`north-${id}`,landing(`north-${id}-1`,'concourse',x!,-41),landing(`north-${id}-2`,'platform',x!,-46),[3,5],`North public bank, diagram ${id}`);
for(const [id,x] of [[2,-3],[3,3]])addEscalator(`north-${id}`,landing(`north-${id}-2`,'platform',x!,-46),landing(`north-${id}-3`,'bridge',x!,-42),[2,3],`North Gate 2F/3F bank, diagram ${id}`);
addEscalator('carillon-49',landing('carillon-49-1','concourse',53,-40),landing('carillon-49-2','platform',53,-45),[3,5],'Carillon Plaza public escalator, diagram 49');

connections.push({id:'central-daimaru-steps',kind:'stairs',width:10,
  from:landing('daimaru-step-lower','concourse',0,44),to:{...landing('daimaru-step-upper','concourse',0,49),elevationOffset:1.3},
  evidence:source([5],'Small Central Court / South Central Gate stair transition; user-provided crop')});
for(const [id,z]of [[52,-15],[54,15]])connections.push({id:`central-stairs-${id}`,kind:'stairs',
  from:landing(`central-stairs-${id}-1`,'concourse',-33,z!),to:landing(`central-stairs-${id}-m`,'mezzanine',-25,z!),evidence:source([4,5],`Central Gate mezzanine staircase ${id}`)});
connections.push({id:'sakura-stairs-51',kind:'stairs',from:landing('sakura51-1','concourse',-43,28),to:landing('sakura51-m','mezzanine',-40,22),evidence:source([4,5],'Sakurabashi mezzanine staircase 51')});
addEscalator('central-55',landing('central55-1','concourse',-31,25),landing('central55-m','mezzanine',-25,22),[4,5],'Central Gate mezzanine escalator 55');
addEscalator('crost-67',landing('crost67-1','concourse',0,35),landing('crost67-b1','underground-hall',0,25),[5,6],'Central Court / Crost B1F escalator 67');
for(const [id,x]of [[68,-8],[69,8]])connections.push({id:`crost-stairs-${id}`,kind:'stairs',from:landing(`crost${id}-1`,'concourse',x!,32),to:landing(`crost${id}-b1`,'underground-hall',x!,25),evidence:source([5,6],`Crost B1F staircase ${id}`)});

// Ownership supplies one shared frame for equipment, landing doors and shaft cuts.
for (const connection of connections) {
  const landing = [connection.from,connection.to].find(point=>point.level==='platform'||point.level==='underground-platform');
  if(!landing)continue;
  connection.platformId=platforms.find(platform=>{
    if(platform.level!==landing.level)return false;
    const local=platformLocalPoint(platform,landing);
    return Math.abs(local.x)<=platform.length/2+1e-6&&Math.abs(local.z)<=platform.width/2+1e-6;
  })?.id;
}
