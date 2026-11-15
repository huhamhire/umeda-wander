import {facilities,levels,nodes,edges,layout,stations} from './infrastructure/umeda-map.ts';
import type {Facility,LevelId,StationId} from './domain/map/model.ts';
import {MapSession} from './application/map-session.ts';
import {MapScene} from './presentation/map-scene.ts';
import {element} from './utils/dom.ts';
import {bindSidebarTabs} from './presentation/sidebar-tabs.ts';
import {stationPalettes} from './presentation/station-palette.ts';
import {districtFrame} from './infrastructure/district-placement.ts';
import {screenDirection} from './presentation/view-orientation.ts';
import {floorOptions} from './presentation/floor-options.ts';

const session=new MapSession(edges);
let scene:MapScene|undefined;
const north=screenDirection(-districtFrame.bearingDeg*Math.PI/180);
element('#compass-needle').setAttribute('transform',`rotate(${Math.atan2(north.x,-north.y)*180/Math.PI} 30 30)`);
for(const [id,sign]of [['compass-north',1],['compass-south',-1]] as const){
  element(`#${id}`).setAttribute('x',String(30+north.x*25*sign));
  element(`#${id}`).setAttribute('y',String(30+north.y*25*sign));
}
const slider=element<HTMLInputElement>('#explode'),roof=element<HTMLInputElement>('#roof');
const facilityPicker=element<HTMLSelectElement>('#facility-picker');
const floorList=element('#floor-list');
const floors=floorOptions(levels);
for(const level of [{id:'all',label:'▱',name:'全部楼层'},...floors]){
  const button=document.createElement('button');button.type='button';button.className='floor';button.dataset.level=level.id;
  const number=document.createElement('span');number.className='floor-number';number.textContent=level.label;
  const name=document.createElement('span');name.textContent=level.name;
  button.append(number,name);floorList.append(button);
}
const floorButtons=[...floorList.querySelectorAll<HTMLButtonElement>('button')];
const showSidebarTab=bindSidebarTabs([element<HTMLButtonElement>('#tab-layers'),element<HTMLButtonElement>('#tab-facilities'),element<HTMLButtonElement>('#tab-stations')],
  [element('#panel-layers'),element('#panel-facilities'),element('#panel-stations')]);

function refreshFacilities():void {
  const visible=facilities.filter(f=>!session.state.focusStation||levels.find(l=>l.id===f.level)!.station===session.state.focusStation);
  facilityPicker.replaceChildren(new Option('选择闸口、设施或站台…',''));
  for(const f of visible){
    const location=f.kind==='convenience-store'?(f.level==='bridge'?'桥上改札内':'中央口外'):'';
    facilityPicker.append(new Option(`${levels.find(l=>l.id===f.level)!.label} · ${f.name}${location?' · '+location:''}`,f.id));
  }
  element('#poi-list').replaceChildren();
  const icons={gate:'▥',ticket:'▤','ticket-machine':'▣',escalator:'↗',elevator:'↕','convenience-store':'▧'};
  const labels={gate:'改札口',ticket:'售票处','ticket-machine':'售票机',escalator:'扶梯',elevator:'直梯','convenience-store':'便利店'};
  for(const kind of ['gate','ticket','ticket-machine','escalator','elevator','convenience-store'] as const){
    const f=visible.find(f=>f.kind===kind);if(!f)continue;
    const button=document.createElement('button');button.type='button';button.dataset.poi=f.id;
    button.innerHTML=`<span aria-hidden="true">${icons[kind]}</span>${labels[kind]}`;
    button.addEventListener('click',()=>select(f));element('#poi-list').append(button);
  }
}
function clearInspector():void {
  element('.inspector').classList.remove('has-selection');element('#detail-tag').textContent='UMEDA / DISTRICT STUDY';
  element('#detail-title').textContent='在同一张图中探索三站';
  element('#detail-note').textContent='在“车站”页聚焦位置，或在地图上选择设施。';
}
function sync():void {
  scene?.update(session.state);
  const focus=session.state.focusStation;
  const palette=stationPalettes[focus??'jr-osaka'];
  element('.atlas').style.setProperty('--paid-color',`#${palette.paid.toString(16).padStart(6,'0')}`);
  for(const button of floorButtons){
    const option=floors.find(l=>l.id===button.dataset.level);
    const active=option?option.members.some(l=>l.id===session.state.level):session.state.level==='all';
    button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
  }
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-focus]'))
    button.setAttribute('aria-pressed',String((button.dataset.focus==='all'?null:button.dataset.focus)===(focus??null)));
  const station=stations.find(s=>s.id===focus);
  element('#focus-title').textContent=station?.name??'总览';
  slider.value=String(Math.round(session.state.explode*100));element('#explode-value').textContent=`${slider.value}%`;
  roof.checked=session.state.roof;
}
function focusStation(station:StationId|null):void {
  session.focusStation(station);scene?.reset();refreshFacilities();clearInspector();sync();
}
function select(f:Facility):void {
  const owner=levels.find(l=>l.id===f.level)!.station!;
  if(session.state.focusStation!==owner)scene?.reset();
  session.state.focusStation=owner;session.state.level=f.level;session.state.route=null;refreshFacilities();
  element('#detail-title').textContent=f.name;element('#detail-note').textContent=f.note;
  const source={jr:'JR 参考图',hankyu:'阪急 SVG',metro:'Metro 参考图',district:'周边连接资料'}[f.evidence.source??'jr'];
  element('#detail-tag').textContent=`${levels.find(l=>l.id===f.level)!.label} / ${source} ${f.evidence.source==='hankyu'?'':'P'+f.evidence.pages.join('、')}`;
  facilityPicker.value=f.id;element('.inspector').classList.add('has-selection');
  for(const b of document.querySelectorAll<HTMLButtonElement>('[data-poi]'))b.classList.toggle('selected',b.dataset.poi===f.id);
  scene?.select(f);showSidebarTab(1);sync();
}
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-focus]'))
  b.addEventListener('click',()=>focusStation(b.dataset.focus==='all'?null:b.dataset.focus as StationId));
for(const b of floorButtons)b.addEventListener('click',()=>{
  session.state.level=b.dataset.level as LevelId|'all';session.state.route=null;sync();
});
slider.addEventListener('input',()=>{
  session.state.explode=Number(slider.value)/100;element('#explode-value').textContent=`${slider.value}%`;
  scene?.update(session.state,{immediateExplode:true});
});
roof.addEventListener('change',()=>{session.state.roof=roof.checked;sync();});
facilityPicker.addEventListener('change',()=>{const f=facilities.find(f=>f.id===facilityPicker.value);if(f)select(f);});
function reset():void {session.reset();scene?.reset();refreshFacilities();clearInspector();showSidebarTab(0);sync();}
element('#zoom-in').addEventListener('click',()=>scene?.zoom(1.18));
element('#zoom-out').addEventListener('click',()=>scene?.zoom(1/1.18));
element('#reset').addEventListener('click',reset);
element('.brand').addEventListener('click',e=>{e.preventDefault();reset();});
try{scene=new MapScene(element('#viewport'),element('#labels'),levels,facilities,nodes,layout,session.state,select);}
catch(error){console.error('Map renderer unavailable',error);element('#fallback').hidden=false;}
refreshFacilities();clearInspector();sync();
