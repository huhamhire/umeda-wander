import { facilities, levels, nodes, edges, layout, stations } from './infrastructure/umeda-map.ts';
import type { Facility, LevelId, StationId } from './domain/map/model.ts';
import { MapSession } from './application/map-session.ts';
import { MapScene } from './presentation/map-scene.ts';
import { element } from './utils/dom.ts';
import {bindSidebarTabs} from './presentation/sidebar-tabs.ts';
import {stationPalettes} from './presentation/station-palette.ts';

const session = new MapSession(edges);
let scene: MapScene | undefined;
const floorList=element('#floor-list');
for(const level of [{id:'all',label:'▱',name:'建筑总览'},...levels.slice().sort((a,b)=>b.y-a.y)]){
  const button=document.createElement('button');button.className='floor';button.dataset.level=level.id;button.type='button';
  const number=document.createElement('span');number.className='floor-number';number.textContent=level.label;
  const name=document.createElement('span');name.textContent=level.name;
  button.append(number,name);floorList.append(button);
}
const floorButtons=[...floorList.querySelectorAll<HTMLButtonElement>('button')];
const stationPicker=element<HTMLSelectElement>('#station-picker');
for(const station of [...stations,{id:'all',name:'地区总览 · 三站'}]){
  const option=document.createElement('option');option.value=station.id;option.textContent=station.name;stationPicker.append(option);
}
session.state.station='jr-osaka';
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
  hankyu: {start:'hankyu-umeda-route-entry',end:'hankyu-umeda-destination',title:'阪急入口 → 京都线 1 番线',caption:'1F → 2F 中央改札 → 3F 站台',steps:['阪急 1F 入口出发','上至 2F 中央口','经中央改札进入付费区','扶梯至 3F 京都线站台']},
  metro: {start:'metro-umeda-route-entry',end:'metro-umeda-destination',title:'M16 北改札 → 1 番线',caption:'站厅 → 中间层 → 御堂筋线站台',steps:['北改札闸外出发','通过 Metro 改札','经中间层落台','抵达 1 番线站台']},
};
let routeChoice: keyof typeof routeScenarios = 'surface';

function sync(): void {
  scene?.update(session.state);
  stationPicker.value=session.state.station??'jr-osaka';
  const palette=stationPalettes[session.state.station==='all'?'jr-osaka':session.state.station??'jr-osaka'];
  element('.atlas').style.setProperty('--paid-color',`#${palette.paid.toString(16).padStart(6,'0')}`);
  for(const button of floorButtons){
    const level=levels.find(l=>l.id===button.dataset.level);
    button.hidden=!!level&&session.state.station!=='all'&&level.station!==(session.state.station??'jr-osaka');
  }
  slider.value = String(Math.round(session.state.explode * 100));
  element('#explode-value').textContent = `${slider.value}%`;
  roof.checked = session.state.roof; roof.disabled=session.state.station!=='jr-osaka'&&session.state.station!=='all';
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
  element('#level-description').textContent = level ? `${level.description} 当前层高亮，下层灰化保留。` : '按站点查看楼层，或选择地区总览。各站楼层独立命名；站间位置与层高为示意，跨站导航尚未接通。';
}
function select(facility: Facility): void {
  session.state.level = facility.level; session.state.station=levels.find(l=>l.id===facility.level)!.station; session.state.route = null; refreshFacilities();
  element('#detail-title').textContent = facility.name;
  element('#detail-note').textContent = facility.note;
  element('#detail-tag').textContent = `${levels.find(l => l.id === facility.level)!.label} / ${({jr:'JR 参考图',hankyu:'阪急 SVG',metro:'Metro 参考图'})[facility.evidence.source??'jr']} ${facility.evidence.source==='hankyu'?'':'P'+facility.evidence.pages.join('、')}`;
  element<HTMLSelectElement>('#facility-picker').value = facility.id;
  element('.inspector').classList.add('has-selection');
  document.querySelectorAll<HTMLButtonElement>('[data-poi]').forEach(b => b.classList.toggle('selected', b.dataset.poi === facility.id));
  scene?.select(facility); showSidebarTab(1); sync();
}
const icons: Partial<Record<Facility['kind'], string>> = { gate: '▥', ticket: '▤', escalator: '↗', elevator: '↕', 'ticket-machine': '▣' };
const facilityPicker = element<HTMLSelectElement>('#facility-picker');
function refreshFacilities():void {
  const visible=facilities.filter(f=>session.state.station==='all'||levels.find(l=>l.id===f.level)!.station===(session.state.station??'jr-osaka'));
  facilityPicker.replaceChildren(new Option('选择闸口、设施或站台…',''));
  for(const facility of visible){
    const option=new Option(`${levels.find(l=>l.id===facility.level)!.label} · ${facility.name}`,facility.id);facilityPicker.append(option);
  }
  element('#poi-list').replaceChildren();
  for(const kind of ['gate','ticket','ticket-machine','escalator','elevator'] as const){
    const facility=visible.find(f=>f.kind===kind);if(!facility)continue;
    const button=document.createElement('button');button.type='button';button.dataset.poi=facility.id;
    const labels={gate:'改札口',ticket:'售票处','ticket-machine':'售票机',escalator:'扶梯',elevator:'直梯'};
    button.innerHTML=`<span aria-hidden="true">${icons[kind]}</span>${labels[kind]}`;
    button.addEventListener('click',()=>select(facility));element('#poi-list').append(button);
  }
}
const showSidebarTab=bindSidebarTabs(
  [element<HTMLButtonElement>('#tab-layers'),element<HTMLButtonElement>('#tab-facilities')],
  [element('#panel-layers'),element('#panel-facilities')]);
refreshFacilities();
function clearInspector():void {
  element('.inspector').classList.remove('has-selection');
  element('#detail-tag').textContent='UMEDA / STATION STUDY';
  element('#detail-title').textContent='选择站内设施';
  element('#detail-note').textContent='按名称定位，查看设施、独立楼层和参考资料来源。';
}
stationPicker.addEventListener('change',()=>{
  session.state.station=stationPicker.value as StationId|'all';session.state.level='all';session.state.route=null;
  routeChoice=session.state.station==='hankyu-umeda'?'hankyu':session.state.station==='metro-umeda'?'metro':'surface';
  scene?.reset();refreshFacilities();clearInspector();sync();
});
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
  else {
    const scenario=routeScenarios[routeChoice]; session.state.station=routeChoice==='hankyu'?'hankyu-umeda':routeChoice==='metro'?'metro-umeda':'jr-osaka';
    session.showRoute(scenario.start,scenario.end);refreshFacilities();
  }
  sync();
});
document.querySelectorAll<HTMLButtonElement>('[data-route]').forEach(button => button.addEventListener('click', () => {
  routeChoice = button.dataset.route as keyof typeof routeScenarios;
  session.state.station=routeChoice==='hankyu'?'hankyu-umeda':routeChoice==='metro'?'metro-umeda':'jr-osaka';
  session.state.level='all';scene?.reset();refreshFacilities();
  clearInspector();
  if (session.state.route) { const scenario = routeScenarios[routeChoice]; session.showRoute(scenario.start, scenario.end); }
  sync();
}));
function reset(): void {
  routeChoice = 'surface';
  session.reset(); session.state.station='jr-osaka';refreshFacilities();showSidebarTab(0); scene?.reset(); element('.inspector').classList.remove('has-selection');
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
