import { facilities, levels, nodes, edges, layout } from './infrastructure/jr-osaka-map.ts';
import type { Facility, LevelId } from './domain/map/model.ts';
import { MapSession } from './application/map-session.ts';
import { MapScene } from './presentation/map-scene.ts';
import { element } from './utils/dom.ts';

const session = new MapSession(edges);
let scene: MapScene | undefined;
const floorButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-level]')];
const slider = element<HTMLInputElement>('#explode');
const roof = element<HTMLInputElement>('#roof');
const routeButton = element<HTMLButtonElement>('#route-button');
const routeScenarios = {
  surface: { start: 'entry', end: 'destination', title: '中央改札 → 5/6 番线',
    caption: '1F 入闸 → 上行扶梯 → 2F', steps: ['1F 中央通路出发', '通过中央改札 · 进入付费区', '扶梯上至 2F', '抵达 5/6 番线站台'] },
  umekita: { start: 'west-entry', end: 'underground-destination', title: '西口 → 梅北 21/22 番线',
    caption: '1F 西口 → B2F 连接通道 → B1F → B2F 站台',
    steps: ['1F 西改札入闸', '下至 B2F 连接通道', '上至 B1F 梅北闸内站厅', '再下至 B2F 的 21/22 番线'] },
  public: { start: 'public-b1-entry', end: 'underground-destination', title: '北侧 B1F → 梅北地下口',
    caption: 'B1F 闸外通路 → 梅北入闸 → B2F 站台',
    steps: ['北门大楼 B1F 公共通路出发', '沿闸外地下联络通路前往梅北', '通过 B1F 梅北地下改札', '下至 B2F 的 21/22 番线'] },
};
let routeChoice: keyof typeof routeScenarios = 'surface';

function sync(): void {
  scene?.update(session.state);
  slider.value = String(Math.round(session.state.explode * 100));
  element('#explode-value').textContent = `${slider.value}%`;
  roof.checked = session.state.roof;
  for (const button of floorButtons) {
    const active = button.dataset.level === session.state.level;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  }
  const routing = !!session.state.route;
  element('.atlas').classList.toggle('routing', routing);
  element('#route-steps').hidden = !routing;
  routeButton.innerHTML = routing ? '结束预览 <span>×</span>' : '查看路线 <span>↗</span>';
  routeButton.setAttribute('aria-expanded', String(routing));
  const scenario = routeScenarios[routeChoice];
  element('#route-title').textContent = scenario.title;
  element('#route-caption').textContent = scenario.caption;
  element('#route-steps').innerHTML = scenario.steps.map((step, i) => `<li><b>0${i + 1}</b>${step}</li>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-route]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.route === routeChoice)));
  const level = levels.find(item => item.id === session.state.level);
  element('#level-description').textContent = level ? `${level.description} 当前层高亮，下层灰化保留。` : '地上 1F–3F 与梅北地下 B1F–B2F 分层查看；夹层不是地下层。';
}
function select(facility: Facility): void {
  session.state.level = facility.level; session.state.route = null;
  element('#detail-title').textContent = facility.name;
  element('#detail-note').textContent = facility.note;
  element('#detail-tag').textContent = `${levels.find(l => l.id === facility.level)!.label} / 参考图 P${facility.evidence.pages.join('、')}`;
  element<HTMLSelectElement>('#facility-picker').value = facility.id;
  element('.inspector').classList.add('has-selection');
  document.querySelectorAll<HTMLButtonElement>('[data-poi]').forEach(b => b.classList.toggle('selected', b.dataset.poi === facility.id));
  scene?.select(facility); sync();
}
const icons: Partial<Record<Facility['kind'], string>> = { gate: '▥', ticket: '▤', escalator: '↗', elevator: '↕', 'ticket-machine': '▣' };
for (const id of ['gate', 'ticket', 'machines-central', 'escalator', 'lift']) {
  const facility = facilities.find(f => f.id === id)!;
  const button = document.createElement('button'); button.type = 'button'; button.dataset.poi = id;
  button.innerHTML = `<span aria-hidden="true">${icons[facility.kind]}</span>${({ gate: '中央改札', ticket: '售票处', escalator: '扶梯', elevator: '直梯', 'ticket-machine': '售票机' } as Partial<Record<Facility['kind'], string>>)[facility.kind]}`;
  button.addEventListener('click', () => select(facility)); element('#poi-list').append(button);
}
const facilityPicker = element<HTMLSelectElement>('#facility-picker');
for (const facility of facilities) {
  const option = document.createElement('option'); option.value = facility.id;
  option.textContent = `${levels.find(l => l.id === facility.level)!.label} · ${facility.name}`;
  facilityPicker.append(option);
}
facilityPicker.addEventListener('change', () => { const facility = facilities.find(item => item.id === facilityPicker.value); if (facility) select(facility); });
try { scene = new MapScene(element('#viewport'), element('#labels'), levels, facilities, nodes, layout, session.state, select); }
catch (error) {
  console.error('Map renderer unavailable', error); element('#fallback').hidden = false;
  element('#route-caption').textContent = '立体地图不可用，可查看设施信息'; routeButton.disabled = true;
}
floorButtons.forEach(button => button.addEventListener('click', () => {
  session.state.level = button.dataset.level as LevelId | 'all';
  if (session.state.level !== 'all') session.state.route = null;
  sync();
}));
slider.addEventListener('input', () => {
  session.state.explode = Number(slider.value) / 100;
  element('#explode-value').textContent = `${slider.value}%`;
  scene?.update(session.state, { immediateExplode: true });
});
roof.addEventListener('change', () => { session.state.roof = roof.checked; sync(); });
routeButton.addEventListener('click', () => {
  if (session.state.route) session.state.route = null;
  else { const scenario = routeScenarios[routeChoice]; session.showRoute(scenario.start, scenario.end); }
  sync();
});
document.querySelectorAll<HTMLButtonElement>('[data-route]').forEach(button => button.addEventListener('click', () => {
  routeChoice = button.dataset.route as keyof typeof routeScenarios;
  if (session.state.route) { const scenario = routeScenarios[routeChoice]; session.showRoute(scenario.start, scenario.end); }
  sync();
}));
function reset(): void {
  routeChoice = 'surface';
  session.reset(); scene?.reset(); element('.inspector').classList.remove('has-selection');
  document.querySelectorAll('[data-poi]').forEach(b => b.classList.remove('selected'));
  element('#detail-tag').textContent = 'JR OSAKA / STUDY';
  facilityPicker.value = '';
  element('#detail-title').textContent = '中央改札，在地上 1F';
  element('#detail-note').textContent = '中央改札与梅北地下口分属不同楼层。选择楼层或设施，查看布局与参考图依据。'; sync();
}
element('#zoom-in').addEventListener('click', () => scene?.zoom(1.18));
element('#zoom-out').addEventListener('click', () => scene?.zoom(1 / 1.18));
element('#reset').addEventListener('click', reset);
element('.brand').addEventListener('click', e => { e.preventDefault(); reset(); });
sync();
