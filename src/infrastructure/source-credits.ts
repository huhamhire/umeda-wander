/** Public credits only. Do not infer a licence from an accessible PDF or screenshot. */
export interface CreditLink {label:string;url:string}
export interface SourceCredit {
  name:string;use:string;links:CreditLink[];attribution:string;
  licence?:CreditLink;status?:string;download?:'osm';
}
export interface SourceCredits {
  description:string;
  project:{repository?:CreditLink;licence?:CreditLink;feedback?:CreditLink};
  data:SourceCredit[];references:SourceCredit[];
}
const link=(label:string,url:string):CreditLink=>({label,url});
const jr=link('JR 西日本大阪站构内图','https://www.westjr.co.jp/global/en/timetable/pdf/station_osaka.pdf');
const hankyu=link('阪急大阪梅田站官方导览图','https://www.hankyu.co.jp/global/common/pdf/station_guide/umeda.pdf');
const hanshin=link('阪神大阪梅田站构内图','https://www.hanshin.co.jp/uploads/guidemap/umeda.pdf');
const metro=['M16_梅田','T20_東梅田','Y11_西梅田'].map(name=>link(name.split('_')[1]+'站构内图',`https://subway.osakametro.co.jp/station_guide/station/${encodeURIComponent(name+'_構内図')}.pdf`));
const kitashinchi=link('JR 西日本北新地站构内图','https://eki.jr-odekake.net/premises?id=0612303');
const city=link('大阪市梅田地区无障碍地图','https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda02-3%28202404%29.pdf');
const cityRoute=link('大阪市地下换乘路线 D／E／F','https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda01-5-2%28202109%29.pdf');
const jp=link('日本邮便：JP Tower 连桥说明','https://www.post.japanpost.jp/notification/productinformation/2023/1027_01_01.pdf');
const umedaMap=link('UMEDA CONNECT 周边地图（同系列繁体版）','https://umeda-sc.jp/wp2/wp-content/uploads/2020/03/map_tw.pdf');
const umekita=link('JR 西日本梅北步行者 Deck 发布页','https://www.westjr.co.jp/press/article/2025/02/page_27332.html');
const pending='未查到适用于本项目几何整理、改编及公开使用的明确许可或授权；待核实。';
export const sourceCredits:SourceCredits={
  description:'本项目是面向大阪梅田地区的非官方交互式步行地图，展示车站、楼层、连廊与地下通道的连接关系。部分位置和路径为示意，现场通行情况以实际标识为准。',
  // No public remote, project LICENSE or verified feedback channel in this repository.
  project:{},
  data:[
    {name:'OpenStreetMap 数据',use:'建筑及塔楼平面轮廓、车站地理锚点、站台轴向和站外轨道延伸方向；经投影、简化及示意比例调整。',
      links:[link('OpenStreetMap 版权与许可','https://www.openstreetmap.org/copyright')],
      licence:link('Open Database License 1.0（ODbL）','https://opendatacommons.org/licenses/odbl/1-0/'),attribution:'© OpenStreetMap contributors',download:'osm'},
    {name:'JR 大阪站与北新地站布局整理',use:'楼板、站台、闸机、扶梯、楼梯、直梯及南北门大楼连接几何；原 PDF 和图标未嵌入页面。',links:[jr,kitashinchi],attribution:'资料发布者：西日本旅客鉄道株式会社',status:pending},
    {name:'阪急大阪梅田站布局整理',use:'站台、收费区、站厅、竖向连接几何；本地 SVG 为主要参考，在线 PDF 用于补充核对，版本不同。',links:[hankyu],attribution:'资料发布者：阪急電鉄株式会社；本地 SVG 的原始发布地址待确认',status:pending},
    {name:'阪神大阪梅田站布局整理',use:'B1／B2 平面、东西出口、两段式主阶梯及南出口竖向连接几何。',links:[hanshin],attribution:'资料发布者：阪神電気鉄道株式会社',status:pending},
    {name:'Osaka Metro 三站布局整理',use:'御堂筋线梅田、谷町线东梅田、四桥线西梅田的站厅、站台及出入口几何。',links:metro,attribution:'资料发布者：大阪市高速電気軌道株式会社（Osaka Metro）',status:pending},
    {name:'地区步行图与连廊资料整理',use:'DIAMOR 异形地下公共面、第一生命互通、建筑占位、2F 连廊和 JP Tower 下沉广场连接几何。',links:[city,cityRoute,umedaMap,jp],attribution:'资料发布者包括大阪市、日本邮便、UMEDA CONNECT；周边图注明以大阪地下街 Whity 导览数据为基础，原图及派生用途授权待核实',status:pending},
    {name:'程序化建筑外观与设施模型',use:'屋顶、裙楼、塔楼、扶梯、电梯井、围栏，以及 Canvas 生成的标牌纹理；没有引入第三方模型、照片贴图或图标文件。',links:[],attribution:'项目内以 Three.js 几何、Canvas 和内联 SVG 生成',status:'未设置独立资产许可证；外景照片与截图参与造型观察，其来源及可用于改编的授权待补充。'},
  ],
  references:[
    {name:'铁路与地铁构内图',use:'核对七站楼层、出入口、番线与竖向设施连接；本地文件与线上版本可能不同。',links:[jr,kitashinchi,hankyu,hanshin,...metro],attribution:'JR 西日本、阪急电铁、阪神电铁、Osaka Metro'},
    {name:'大阪市步行与无障碍资料',use:'核对站外地下路径、建筑接入及楼层转换。',links:[city,cityRoute],attribution:'大阪市'},
    {name:'JP Tower 与阪急公共通廊资料',use:'核对 JP Tower 的 2F 连桥、B1 Garden Avenue 及阪急百货 1F 公共通廊。',links:[jp,link('阪急公共通廊说明','https://www.hankyu.co.jp/company/news/pdf/ER201209194N1.pdf')],attribution:'日本邮便等联合发布者、阪急电铁'},
    {name:'商业设施与建筑介绍',use:'核对大丸、LUCUA、Grand Front 的外部接入，以及阪神大楼和 RESPIRE 酒店外部形态。',links:[
      link('大丸梅田店交通','https://www.daimaru.co.jp/umedamise/access.html'),link('LUCUA 交通','https://www.lucua.jp/access/'),link('Grand Front 交通','https://www.gfo-ad.jp/access.html'),
      link('日本设计：大阪梅田 Twin Towers South','https://www.nihonsekkei.co.jp/projects/18825/'),link('阪急 RESPIRE 大阪','https://www.hankyu-hotel.com/hotel/respire/osaka/info/')],attribution:'各设施运营方及日本设计；仅列发布者，不代表获得使用授权'},
    {name:'用户补充地区图、步行图与外景截图',use:'核对建筑相对位置、南侧弧形退避、北中庭、第一生命互通和外围连廊；部分已用于几何整理，亦列入上述数据条目。同系列在线地图不替代本地版本。',links:[umedaMap,umekita],attribution:'含 Umeda Walkway Maps、梅田周边地区通道.pdf、Umeda-Area-Map.webp 及会话图片；其余原始发布页、作者和授权待确认'},
  ],
};
