import type {PublicPassage} from '../domain/map/model.ts';
import {higashiStation} from './higashi-umeda-map.ts';
import {metroStation} from './metro-umeda-map.ts';

const metroFloor=metroStation.layout.areas.find(a=>a.id==='metro-umeda-south-public')!.outline;
const [a,,c,d]=metroFloor;
// Leave through the eastern public side, rather than the north-facing gate.
const metro={x:d!.x+(c!.x-d!.x)*0.3+(a!.x-d!.x)*0.08,z:d!.z+(c!.z-d!.z)*0.3+(a!.z-d!.z)*0.08};
const west=higashiStation.layout.areas.find(a=>a.id==='higashi-umeda-whity-public')!.outline;
const portal={x:(west[0]!.x+west[1]!.x)/2,z:(west[0]!.z+west[1]!.z)/2};
export const higashiDistrictPassages:PublicPassage[]=[{
  id:'whity-metro-t20-public',name:'Whity 梅田 · 御堂筋线—东梅田公共通路',kind:'underground',width:5,
  points:[{...metro,level:'metro-hall',station:metroStation.id},{...portal,level:'t20-hall',station:higashiStation.id}],
  evidence:{source:'tanimachi',pages:[1],urls:[
    'https://subway.osakametro.co.jp/station_guide/T/t20/index.php',
    'https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda01-5-2%28202109%29.pdf'],
    detail:'T20 map and Osaka City route D confirm the public Whity connection from M16 south concourse to Higashi-Umeda. Width and short line fitted to district sketch; no inter-operator routing edge.'},
}];
