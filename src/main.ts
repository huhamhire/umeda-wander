import {facilities,levels,nodes,edges,layout,stations} from './infrastructure/umeda-map.ts';
import type {Facility,FacilityKind,LevelId,StationId} from './domain/map/model.ts';
import {MapSession} from './application/map-session.ts';
import {MapScene} from './presentation/map-scene.ts';
import {element} from './utils/dom.ts';
import {bindSidebarTabs} from './presentation/sidebar-tabs.ts';
import {stationPalettes} from './presentation/station-palette.ts';
import {districtFrame} from './infrastructure/district-placement.ts';
import {screenDirection} from './presentation/view-orientation.ts';
import {floorOptions} from './presentation/floor-options.ts';
import {filterFacilities,facilityCategory} from './application/facility-filter.ts';
import {facilityCodes} from './infrastructure/facility-codes.ts';

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
const facilityStation=element<HTMLSelectElement>('#facility-station'),facilityFloor=element<HTMLSelectElement>('#facility-floor');
const facilityFilter:{station:StationId|null;level:LevelId|'all';kind:FacilityKind|'all'}={station:null,level:'all',kind:'all'};
const floorList=element('#floor-list');
const floors=floorOptions(levels);
for(const level of [{id:'all',label:'总览',name:'全部楼层'},...floors]){
  const button=document.createElement('button');button.type='button';button.className='floor';button.dataset.level=level.id;
  button.setAttribute('aria-label',`${level.label} · ${level.name}`);button.title=level.name;
  const number=document.createElement('span');number.className='floor-number';number.textContent=level.label;
  const name=document.createElement('span');name.textContent=level.name;
  button.append(number,name);floorList.append(button);
}
const floorButtons=[...floorList.querySelectorAll<HTMLButtonElement>('button')];
const showSidebarTab=bindSidebarTabs([element<HTMLButtonElement>('#tab-layers'),element<HTMLButtonElement>('#tab-facilities')],
  [element('#panel-layers'),element('#panel-facilities')]);
// Keep floating controls clear of every tab's actual height.
const sidebar=element('.sidebar'),atlas=element('.atlas');
new ResizeObserver(()=>{
  atlas.style.setProperty('--navigation-height',`${sidebar.getBoundingClientRect().height}px`);
  scene?.refreshViewport();
}).observe(sidebar);

function refreshFacilities():void {
  const {station,level,kind:facilityKind}=facilityFilter,previous=facilityPicker.value;
  facilityStation.replaceChildren(new Option('全部车站','all'),...stations.map(s=>new Option(s.name,s.id)));
  facilityStation.value=station??'all';
  const options=floors;
  const current=floors.find(f=>f.members.some(l=>l.id===level));
  facilityFloor.replaceChildren(new Option('全部楼层','all'),...options.map(f=>new Option(f.label,f.id)));
  facilityFloor.value=options.find(f=>f.y===current?.y)?.id??'all';
  const filter=facilityFilter;
  const available=filterFacilities(facilities,levels,{...filter,kind:'all'});
  const visible=filterFacilities(facilities,levels,{...filter,kind:facilityKind});
  facilityPicker.replaceChildren(new Option(visible.length?'选择设施…':'当前条件下暂无设施',''));
  facilityPicker.disabled=visible.length===0;
  for(const f of visible){
    const location=f.kind==='convenience-store'?(f.level==='bridge'?'桥上改札内':'中央口外'):'';
    const option=new Option(`${f.name}${location?' · '+location:''}`,f.id);
    option.dataset.code=facilityCodes[f.id];facilityPicker.append(option);
  }
  facilityPicker.value=visible.some(f=>f.id===previous)?previous:'';
  element('#poi-list').replaceChildren();
  const icons={all:'▦',entrance:'↪',platform:'▰',gate:'▥',ticket:'▤','ticket-machine':'▣',escalator:'↗',elevator:'↕',stairs:'▱',information:'ⓘ','convenience-store':'▧'};
  const labels={all:'全部',entrance:'出入口',platform:'站台',gate:'改札口',ticket:'售票',escalator:'扶梯',elevator:'直梯',stairs:'楼梯',information:'咨询','convenience-store':'便利店'};
  for(const kind of ['all','entrance','platform','gate','ticket','escalator','elevator','stairs','information','convenience-store'] as const){
    if(kind!=='all'&&kind!==facilityKind&&!available.some(f=>facilityCategory(f.kind)===kind))continue;
    const button=document.createElement('button');button.type='button';button.dataset.kind=kind;
    button.classList.toggle('selected',facilityKind===kind);button.setAttribute('aria-pressed',String(facilityKind===kind));
    button.innerHTML=`<span aria-hidden="true">${icons[kind]}</span>${labels[kind]}`;
    button.addEventListener('click',()=>{facilityFilter.kind=kind;refreshFacilities();});element('#poi-list').append(button);
  }
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
  slider.value=String(Math.round(session.state.explode*100));element('#explode-value').textContent=`${slider.value}%`;
  roof.checked=session.state.roof;
}
function select(f:Facility):void {
  const owner=levels.find(l=>l.id===f.level)!.station!;
  if(session.state.focusStation!==owner)scene?.reset();
  session.state.focusStation=owner;session.state.level=f.level;session.state.route=null;
  facilityPicker.value=f.id;
  showSidebarTab(1);sync();scene?.select(f);
}
for(const b of floorButtons)b.addEventListener('click',()=>{
  session.state.level=b.dataset.level as LevelId|'all';facilityFilter.level=session.state.level;
  session.state.route=null;refreshFacilities();sync();
});
facilityStation.addEventListener('change',()=>{
  facilityFilter.station=facilityStation.value==='all'?null:facilityStation.value as StationId;
  session.focusStation(facilityFilter.station);
  if(facilityFilter.level!=='all')session.state.level=facilityFilter.level;
  scene?.reset();refreshFacilities();sync();
});
facilityFloor.addEventListener('change',()=>{
  facilityFilter.level=facilityFloor.value as LevelId|'all';session.state.level=facilityFilter.level;
  session.state.route=null;refreshFacilities();sync();
});
slider.addEventListener('input',()=>{
  session.state.explode=Number(slider.value)/100;element('#explode-value').textContent=`${slider.value}%`;
  scene?.update(session.state,{immediateExplode:true});
});
roof.addEventListener('change',()=>{session.state.roof=roof.checked;sync();});
facilityPicker.addEventListener('change',()=>{const f=facilities.find(f=>f.id===facilityPicker.value);if(f)select(f);});
function reset():void {
  session.reset();scene?.reset();Object.assign(facilityFilter,{station:null,level:'all',kind:'all'});
  refreshFacilities();showSidebarTab(0);sync();
}
element('#zoom-in').addEventListener('click',()=>scene?.zoom(1.18));
element('#zoom-out').addEventListener('click',()=>scene?.zoom(1/1.18));
element('#reset').addEventListener('click',reset);
element('.brand').addEventListener('click',e=>{e.preventDefault();reset();});
try{scene=new MapScene(element('#viewport'),element('#labels'),levels,facilities,nodes,layout,session.state,select);}
catch(error){console.error('Map renderer unavailable',error);element('#fallback').hidden=false;}
refreshFacilities();sync();
