import { facilities, levels, nodes, edges } from './infrastructure/sample-map.ts';
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
  element('#route-caption').textContent = routing ? '示意路径 · 入闸 → 上行扶梯 → 站台' : '经过闸机，沿扶梯上至 2F';
}
function select(facility: Facility): void {
  if (session.state.level !== 'all' && session.state.level !== facility.level) session.state.level = facility.level;
  element('#detail-title').textContent = facility.name;
  element('#detail-note').textContent = facility.note;
  element('#detail-tag').textContent = `${levels.find(l => l.id === facility.level)!.label} / 示意设施`;
  element('.inspector').classList.add('has-selection');
  document.querySelectorAll<HTMLButtonElement>('[data-poi]').forEach(b => b.classList.toggle('selected', b.dataset.poi === facility.id));
  scene?.select(facility); sync();
}
const icons: Record<string, string> = { gate: '▥', ticket: '▤', escalator: '↗', elevator: '↕' };
for (const id of ['gate', 'ticket', 'escalator', 'lift']) {
  const facility = facilities.find(f => f.id === id)!;
  const button = document.createElement('button'); button.type = 'button'; button.dataset.poi = id;
  button.innerHTML = `<span aria-hidden="true">${icons[facility.kind]}</span>${{ gate: '闸机', ticket: '售票处', escalator: '扶梯', elevator: '直梯' }[facility.kind]}`;
  button.addEventListener('click', () => select(facility)); element('#poi-list').append(button);
}
try { scene = new MapScene(element('#viewport'), element('#labels'), levels, facilities, nodes, session.state, select); }
catch (error) {
  console.error('Map renderer unavailable', error); element('#fallback').hidden = false;
  element('#route-caption').textContent = '立体地图不可用，可查看设施信息'; routeButton.disabled = true;
}
floorButtons.forEach(button => button.addEventListener('click', () => {
  session.state.level = button.dataset.level as LevelId | 'all';
  if (session.state.level !== 'all') session.state.route = null;
  sync();
}));
slider.addEventListener('input', () => { session.state.explode = Number(slider.value) / 100; sync(); });
roof.addEventListener('change', () => { session.state.roof = roof.checked; sync(); });
routeButton.addEventListener('click', () => {
  if (session.state.route) session.state.route = null; else session.showRoute();
  sync();
});
function reset(): void {
  session.reset(); scene?.reset(); element('.inspector').classList.remove('has-selection');
  document.querySelectorAll('[data-poi]').forEach(b => b.classList.remove('selected'));
  element('#detail-tag').textContent = 'JR OSAKA / STUDY';
  element('#detail-title').textContent = '一座车站，三个层次';
  element('#detail-note').textContent = '点选设施，查看它在楼层中的位置。也可以先试走一段从站厅到站台的路线。'; sync();
}
element('#zoom-in').addEventListener('click', () => scene?.zoom(1.18));
element('#zoom-out').addEventListener('click', () => scene?.zoom(1 / 1.18));
element('#reset').addEventListener('click', reset);
element('.brand').addEventListener('click', e => { e.preventDefault(); reset(); });
sync();
