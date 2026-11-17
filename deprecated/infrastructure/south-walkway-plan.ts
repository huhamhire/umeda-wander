import type {PlanRegion} from '../../src/domain/map/model.ts';
import {projectWalkwayReference} from '../../src/infrastructure/district-placement.ts';

/** Simplified yellow public-space boundaries from the UMEDA CONNECT map crop.
 * These faces are authored independently of the old station-to-station chords. */
export const southWalkwayFaces:[number,number][][]=[
  // Hanshin frontage: a broad diagonal public hall, not an east/west skybridge.
  [[112,431],[122,404],[264,318],[297,295],[478,193],[495,210],[306,321],[300,342],[169,419],[137,442]],
  // Hilton East / Dai-ichi Life northern curved interchange.
  [[128,464],[137,435],[254,366],[285,365],[310,386],[353,426],[390,451],[389,477],[345,451],[295,413],[272,395],[261,391],[154,452],[147,475]],
  // Diagonal retail street between Hanshin, Life and E-ma.
  [[385,450],[395,425],[687,269],[706,291],[408,472]],
  // Life/DT central street; the western road beside Life is not an extra mall corridor.
  [[378,463],[404,470],[401,646],[416,660],[405,701],[399,831],[399,850],[385,877],[367,874],[368,704],[373,685],[372,652]],
  // DT / Ekimae 4 diagonal arm, southwards between Ekimae 2 and 3.
  [[399,458],[515,539],[653,857],[640,880],[616,871],[493,551],[387,478]],
  // DIAMOR east/west street terminates at the central street, not at Y11.
  [[390,661],[565,660],[588,651],[654,652],[666,641],[679,647],[674,687],[661,708],[632,702],[616,697],[416,701],[390,709]],
  // Tanimachi-side street follows the road, including its indented corners.
  [[750,446],[777,435],[790,467],[769,478],[796,592],[832,734],[864,847],[886,881],[906,930],[891,934],[867,894],[844,867],[820,805],[788,701],[767,615],[737,506],[721,476]],
  // E-ma south / Ekimae 4 north connection.
  [[514,521],[510,500],[733,438],[748,453],[529,538]],
  // Sonechika / Kitashinchi frontage, with the western Y11 junction.
  [[112,836],[370,849],[390,844],[628,855],[646,847],[844,847],[863,865],[888,890],[889,911],[877,914],[850,887],[638,885],[620,884],[385,876],[154,864],[151,889],[115,892]],
  // Y11 public spine and its northern Hilton landing.
  [[106,450],[133,450],[130,785],[140,805],[133,839],[120,885],[106,1000],[84,1000],[94,883],[95,828],[82,817],[97,785],[99,530],[107,515]],
  [[0,410],[74,426],[82,385],[107,368],[125,405],[143,436],[137,486],[81,494],[0,493]],
  // Whity central hall north of T20, opening towards M16 and Hankyu department store.
  [[478,193],[497,174],[520,171],[520,127],[546,115],[557,138],[651,132],[657,82],[679,84],[677,134],[1000,120],[1000,139],[753,160],[763,185],[748,203],[736,237],[735,267],[767,288],[784,428],[786,452],[753,459],[729,470],[717,445],[702,349],[682,313],[699,293],[686,270],[548,198],[520,202],[495,210]],
  // Short department-store frontage and the road-side Grand Building arm.
  // The northern edge is fitted to its independently maintained OSM footprint.
  [[648,60],[674,60],[678,151],[649,151]],
  [[628,84],[648,80],[675,136],[674,151],[649,151],[636,111]],
  [[690,68],[711,78],[676,151],[649,145]],
  [[520,-10],[552,-10],[557,145],[541,173],[520,171]],
  [[735,142],[790,140],[790,-95],[810,-95],[810,162],[748,178]],
  [[740,-100],[810,-100],[810,-78],[740,-78]],
];
export const southWalkwayRegions:PlanRegion[]=southWalkwayFaces.map(points=>({outline:points.map(([x,z])=>projectWalkwayReference(x,z))}));
export const southBlockPlans:[string,string,[number,number][]][]=[
  ['osaka-ekimae-1','大阪站前第 1 大楼',[[139,699],[363,706],[360,834],[134,821]]],
  ['osaka-ekimae-2','大阪站前第 2 大楼',[[408,708],[561,705],[613,845],[403,831]]],
  ['osaka-ekimae-3','大阪站前第 3 大楼',[[597,708],[774,711],[824,839],[654,844]]],
  ['osaka-ekimae-4','大阪站前第 4 大楼',[[539,545],[709,487],[741,608],[573,618]]],
  ['umeda-dt','梅田 DT Tower',[[411,493],[479,551],[511,621],[410,621]]],
  ['osaka-maru','大阪第一生命大楼\nMARU／第一酒店',[[168,458],[257,407],[278,423],[322,460],[360,485],[361,631],[159,631]]],
  ['e-ma','E-ma',[[548,382],[666,317],[714,430],[614,456],[602,402],[570,408]]],
];
