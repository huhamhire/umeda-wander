/** First-pass public-space envelopes in the ground baseline's metre frame.
 * x east, y south; origin 135.491 E / 34.708 N. Coordinates and widths are
 * manually fitted planning estimates, not surveyed excavation boundaries.
 * Station envelopes reserve interfaces only, and contain no interior layout.
 */
export type Point = [number, number];
export type LevelEvidence = 'explicit-b1' | 'underground-level-unresolved' | 'station-reservation';
export interface NetworkPart {
  id:string; name:string; block:string; evidence:LevelEvidence;
  source:string; page:number; note:string;
  /** Variable-width sections: east, south, full width in metres. */
  sections:[number,number,number][];
  /** Explicit reference-derived boundaries override section buffering. */
  outline?:Point[];
  /** Compound source geometry, including interior building islands. */
  polygons?:Point[][][];
  label:Point;
}
const district='references/梅田周边地区通道.pdf';
const jr='references/station_osaka.pdf';
const publicPart=(id:string,name:string,block:string,sections:NetworkPart['sections'],label:Point,note:string):NetworkPart=>({
  id,name,block,sections,label,note,source:district,page:1,evidence:'underground-level-unresolved',
});
export const publicSpaces:NetworkPart[]=[
  publicPart('garden','Garden Avenue','west',[[220,945,13],[305,889,15],[365,850,18],[415,829,26],[435,847,24]],[265,905],'JP/KITTE 方向至西梅田北侧；只整理涉及区域，图外西段不展开。'),
  publicPart('hilton-arc','Hilton／第一生命弧形互通','south',[[435,847,24],[462,837,15],[503,816,15],[531,815,20],[554,831,22],[573,851,25]],[498,800],'由西梅田北侧接阪神南侧，再转 DIAMOR；不接到阪神北侧。'),
  publicPart('hanshin-south','阪神南侧公共通路','south',[[462,837,15],[509,801,16],[570,770,17],[642,726,19],[687,691,24]],[582,748],'通路与阪神站留位边缘对接；付费区域由本站后续提供。'),
  publicPart('diamor-diagonal','DIAMOR 斜街','south',[[573,851,25],[624,819,20],[687,785,18],[729,762,20]],[645,802],'沿第一生命／E-ma 间的街区边缘，几何作示意拟合。'),
  publicPart('diamor-central','DIAMOR 中央街','south',[[573,851,25],[573,921,16],[573,971,25],[573,1022,16],[568,1073,22]],[548,922],'沿第一生命与 DT 之间、站前第一与第二大楼之间布置。'),
  publicPart('diamor-dt','DT／第4大楼斜街','south',[[573,851,25],[626,892,18],[654,944,17],[666,971,22],[689,1021,17],[711,1076,20]],[650,921],'继续经过站前第二与第三大楼之间。'),
  publicPart('diamor-cross','DIAMOR 东西街','south',[[573,971,25],[666,971,22],[739,971,18],[765,967,20]],[650,988],'西端止于中央街，不自动向西横穿第一生命接西梅田。'),
  publicPart('ema-link','E-ma 南侧连接','south',[[626,892,18],[698,873,15],[797,844,16]],[699,864],'地区图确认街区北侧通路；不绘制建筑内部店铺。'),
  publicPart('tanimachi-side','东梅田南侧公共网络','east',[[797,844,16],[817,904,16],[843,984,16],[870,1078,19]],[867,981],'沿道路东侧街区边界；与本站接口、局部台阶标高待下一阶段细化。'),
  publicPart('sonechika','曾根地下道','south',[[425,1068,21],[568,1073,22],[711,1076,20],[800,1078,20],[870,1078,19]],[733,1106],'北新地北侧公共带，不等同于站台或闸内通道。'),
  publicPart('whity-south','Whity／阪神东端接驳','east',[[687,691,24],[719,709,24],[749,733,24],[768,768,24]],[728,701],'阪神东口至此含跨层连接，不能由平面重叠解释为同标高。'),
  publicPart('whity-east','Whity 东向主通路','east',[[687,691,24],[772,681,20],[868,674,18],[932,669,16]],[852,660],'沿扇町通方向；在研究区边界截断，不补图外建筑。'),
  publicPart('hankyu-front','阪急百货西侧地下通路','east',[[687,691,24],[655,639,17],[626,573,17],[596,500,20]],[665,585],'沿道路与百货边界；不以穿越商场实体的直线替代。'),
  publicPart('hankyu-north','阪急／M16 北侧接口','north',[[596,500,20],[575,446,22],[562,407,20],[605,390,17],[630,389,18]],[624,417],'本站公共区域仅留位；具体 B1/B2 接口由构内图补证。'),
  publicPart('yodobashi','Yodobashi 地下接入','north',[[575,446,22],[545,449,17],[518,463,16]],[518,434],'保留 M16 北侧与 Yodobashi 的地下联系；不展开商场内通路。'),
  publicPart('jr-north-external','LUCUA 东侧外部接驳','north',[[460,504,15],[505,478,18],[545,449,17]],[469,468],'JR B1 图确认去向；地区图用于外部位置拟合，具体边界未测量。'),
  {id:'jr-north-b1',name:'JR 北门 B1 公共区',block:'jr-north',evidence:'explicit-b1',source:jr,page:6,note:'图内 5/7，北门大楼 B1；不向南穿中央通路。',sections:[[278,573,18],[322,547,18],[373,518,24],[405,534,22],[460,504,15]],label:[370,555]},
  {id:'jr-umekita-public',name:'梅北闸外 B1 接驳',block:'jr-north',evidence:'explicit-b1',source:jr,page:6,note:'沿 LUCUA 1100 北侧折转，终点接梅北闸外，不接 B2 付费连接通道。',sections:[[278,573,18],[268,555,18],[235,548,20]],label:[240,523]},
  {id:'jr-south-b1',name:'Crost／南门 B1 公共区',block:'jr-south',evidence:'explicit-b1',source:jr,page:6,note:'独立于北侧 B1；上方中央通路属于 1F。',sections:[[388,768,18],[417,789,22],[476,751,22],[551,706,22],[589,683,18]],label:[475,778]},
  publicPart('crost-west','Crost 西侧地下接驳','jr-south',[[417,789,22],[435,813,18],[435,847,24]],[393,817],'南门 B1 去阪神／四桥线方向；跨层或坡道细节暂不展开。'),
  publicPart('crost-east','Crost 东侧地下接驳','jr-south',[[589,683,18],[625,711,18],[657,707,19],[687,691,24]],[621,733],'连接南侧地区公共网络；不跨入本站付费区域。'),
];
const reserve=(id:string,name:string,sections:NetworkPart['sections'],label:Point,source:string):NetworkPart=>({id,name,sections,label,source,page:1,block:id,evidence:'station-reservation',note:'仅为地理基底上的近似接口包络，不表示实际站体开挖范围、可通行面积或统一 B1 楼层。'});
export const stationReservations:NetworkPart[]=[
 reserve('umekita','梅北 · 车站留位',[[228,590,45],[242,480,45]],[190,575],jr),
 reserve('m16','M16 · 车站留位',[[575,446,32],[625,585,32],[674,677,32]],[595,611],'references/M16_梅田_構内図_1.pdf'),
 reserve('hankyu','阪急 · 地下接口留位',[[656,225,54],[674,335,58],[696,419,66]],[652,315],'references/umeda.svg'),
 reserve('hanshin','阪神 · 车站留位',[[450,813,34],[648,697,34]],[546,746],'references/hanshin-umeda.pdf'),
 reserve('y11','西梅田 · 车站留位',[[435,847,30],[425,1068,30]],[400,978],'references/Y11_西梅田_構内図.pdf'),
 reserve('t20','东梅田 · 车站留位',[[768,768,30],[797,844,30],[828,940,30]],[831,815],'references/T20_東梅田_構内図.pdf'),
 reserve('kitashinchi','北新地 · 车站留位',[[425,1091,32],[568,1096,32],[711,1099,32],[800,1101,32]],[590,1135],'references/北新地.pdf'),
];
export const excludedConnections=[
 {id:'jr-central-north-south',reason:'中央通路是 1F；没有资料证明沿其下方存在贯穿 JR 的地下公共直通。'},
 {id:'umekita-paid-west',reason:'梅北—西口 B2 闸内连接不属于本次 B1 公共网络。'},
 {id:'all-road-underground',reason:'地面道路仅作拟合参照，不能自动推导其下存在地下公共通路。'},
];
