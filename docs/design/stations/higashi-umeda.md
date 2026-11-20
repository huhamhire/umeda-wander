# 谷町线东梅田站 T20

## 来源与确认范围

主要依据用户新增的 `references/stations/higashi-umeda/station-guide.pdf`，共 1 页；对应 [Osaka Metro 官方构内图](https://subway.osakametro.co.jp/station_guide/station/T20_%E6%9D%B1%E6%A2%85%E7%94%B0_%E6%A7%8B%E5%86%85%E5%9B%B3.pdf)及[站点页](https://subway.osakametro.co.jp/station_guide/T/t20/index.php)。新实体统一使用 `Evidence.source: tanimachi`，不能记作 M16 或 JR 参考图。

参考图明确：两座侧式站台，中央为两条轨道；1 番线往天满桥、天王寺、八尾南，2 番线往都岛、大日。四组改札为北东、北西、中西、南；1 番线的电梯接南改札，2 番线电梯接中西改札。按用户此前约定，6/7 号口及相关电梯的临时关闭信息不应用到静态模型。参考图展示的出口为 1、2、3、4、6、7、8、9，不补不存在于图中的 5 号口。

## 建模

B1 公共通路按北改札区、中改札区和南改札外分组标注寄存柜。中西、中东改札外的「寄存柜服务中心」归入自助寄存柜，集中柜组共用示意标记。见 [Osaka Metro 服务中心公告](https://www.osakametro.co.jp/news/news/notice/20240913_coinlocker_service_center.php)及[南改札外柜组公告](https://subway.osakametro.co.jp/news/news/other/20261118_30station_locker.php)。

- 模型使用独立 B2 站台、B1 改札／公共通路和 1F 地面落台。两个站台分别保留 `platformId`，轨道画在内侧；不画成岛式站台。
- 四组付费区各有独立改札围栏。公共 B1 通路串联各出口和改札外，不添加两个站台间的闸内捷径。
- 表达北侧楼梯、中西与南侧的楼梯／扶梯、两组站台电梯，以及街面出口的楼梯和公共电梯。斜段位置与长度按图上关系简化，不声称已逐个核对 A–J 楼梯编号；所有设备与楼板开口共享落点。
- 出入口、售票机、售票处、咨询和跨层设施进入现有菜单，内部编号追加 `T20-001` 起，旧站编号保持。图上“店舗”只作店铺体块，不推断便利店品牌。
- 地面仅有出入口小型落台，不展开其接入大楼。使用浅紫色提示谷町线主题，公共区域继续用统一米色。

## 地区定位与公共连接

缓存 OSM 站点 [5411378288](https://www.openstreetmap.org/node/5411378288) 为 `(34.7005946, 135.4998176)`；附近两条谷町线轨道 [858071978](https://www.openstreetmap.org/way/858071978)、[888075489](https://www.openstreetmap.org/way/888075489) 在站点附近的切向约 -16.5° / -16.9°。因此采用北向主轴 -16.7°，沿用地区投影，向地理东 30 场景单位适配周边已放大的示意体量。原始地理锚点和展示偏移分别保留。

站台显示长度 86、宽度 6.4，间距及 8 单位层高都是示意尺寸，不是实测比例。T20 处于 M16 东南方向，独立于阪急百货、Grand Building 与阪神站主体，不将其置于同一站内空间。

[大阪市换乘资料 D](https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda01-5-2%28202109%29.pdf)确认从御堂筋线南改札附近经 Whity 梅田前往东梅田 B1 改札。现役 `public-areas/whity/` 与站点公共接口据此表达接驳，从 M16 南改札外的东侧离开，避开付费区，接 T20 北侧公共接口。它代表已知公共连接拓扑，具体宽度、拐点、坡道与商业入口仍需更细平面资料，暂不建立跨运营者 `RouteEdge`。

## 南侧 8／9 号口

- **8 号**是往大阪站前第 4 大楼的地下接入。大阪市道案内明确上行后仍可进该楼 B1，另有从同一地下区域下到 B2 的通路。地理模型使用同一 B1 探索层内的局部高差，画楼梯、相邻扶梯和闸外落台。OSM F54 用于平面位置参照，梯向与 2.2 米高差是拟合。[大阪市第 4 大楼 B1 路线](https://www.city.osaka.lg.jp/zaisei/page/0000419949.html) · [第 4 大楼 B2 路线](https://www.city.osaka.lg.jp/shimin/page/0000600984.html) · [OSM F54](https://www.openstreetmap.org/node/5024365377)
- **9 号**通往街面。地面锚点采用标成 9 号的节点 5024365378（34.700314° N，135.4992444° E），两段折返楼梯及横向平台采用同节点相连的 OSM way 1329514174，独立顶棚参照 way 619026238。构内图标记 F51，OSM 另有同名工程号节点，两个来源点相隔约 21 米。地面口以带顶棚和楼梯线位的一组为准，梯宽和中间标高为模型估计。[9 号地面路线照片](https://mcs-webcontents.s3.ap-northeast-1.amazonaws.com/contents/access_umeda_tanimachi_line.pdf) · [折返轴线](https://www.openstreetmap.org/way/1329514174) · [顶棚轮廓](https://www.openstreetmap.org/way/619026238)

两处都保留原出入口设施记录。局部模型只表达接入层级和梯口，原站内及跨站步行边保留现有范围。

## Whity 侧 1／3 号口

- **1 号**从北东、北西改札外直通 Whity 地下街。站模保留 B1 出入口及公共通路，已移除原示意地面梯段。富国生命大楼电梯属于独立楼内接入。[Whity 官方交通图](https://whity.osaka-chikagai.jp/index.php/access)
- **3 号**经短楼梯接 Whity／DIAMOR 方向的地下通路，按 B1 同一探索层内的局部高差表达。拟合值为 1.6 米，保留原设施编号。[带照片路线](https://mcs-webcontents.s3.ap-northeast-1.amazonaws.com/contents/access_umeda_tanimachi_line.pdf)

## 东侧 2／4 号楼宇入口

- **2 号**在清和梅田大楼一侧独立表达楼梯、扶梯和 B1–1F 电梯。井道依 OSM 电梯及接入足道拟合，梯组依据构内图的排列与楼宇临街面拟合。[Osaka Metro 无障碍出入口](https://subway.osakametro.co.jp/station_guide/T/t20/index.php) · [OSM 电梯](https://www.openstreetmap.org/node/10959644129)
- **4 号**在中东改札外接 Cofre 梅田。楼梯上端取该建筑的 OSM 入口节点，电梯按公开照片显示的相邻关系拟合，沿用原地面电梯的设施编号。真实井道中心、门向、梯宽和中间平台尺寸未由资料确定。[OSM 建筑入口](https://www.openstreetmap.org/node/10959644128) · [4 号照片及动线](https://route.tsunagood.net/accea-cafe-umeda/)

两座电梯各自保留 B1 和 1F 的门前承接与开口。楼宇接入只画公共梯口、井道和落台，步行图沿用现况。

## 验证

检查两侧站台和轨道内侧关系、四组改札边界、各层落点支撑、站台电梯归属、真实楼板开口、菜单编号、默认聚焦 B1、站内示意路线以及 Whity 接驳的付费区避让。沿用移动端浮动菜单、分层与镜头取景，无新增 UI 流程；不操作浏览器。
