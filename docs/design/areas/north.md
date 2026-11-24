# 北侧区域：梅北、北中庭与阪急

## 参考资料

| 资料 | 用途 |
| --- | --- |
| [JR 构内图](../../../references/stations/jr-osaka/station-guide.pdf) p6／8 | LUCUA 北绕、梅北 B1/B2 与西口闸内接入 |
| [地下地区图](../../../references/district/underground-walkway-map.pdf) | 北中庭、阪急地下街及 M16 周边公共面 |
| [高架步行图](../../../references/district/elevated-walkways-2026.pdf)、[站城图](../../../references/connections/osaka-station-city/) | 北侧连廊、开放中庭与建筑落口 |
| [Grand Green 连接资料](../../../references/connections/grand-green-osaka/) | Inogate 新桥与 LUCUA 西向桥的不同目标 |
| [Grand Front 广场资料](../../../references/commercial/grand-front/) | JR 侧下沉广场扶梯、楼梯及 B1／1F 关系 |

各站构内图及 OSM／PLATEAU 数据分别用于本站关系和建筑体量；版本及授权见 [catalog](../../../references/catalog.json)和[来源审计](../../data/source-credits-audit.md)。

## 连接与边界

- 梅北 B1 闸外公共通路沿 LUCUA 北侧绕行后转至站台上方；西口另经 B2 闸内联络通道接入，不能混画成公共捷径。
- 梅北与 JR 地面斜交并保留缓弧；轨道北端向 Grand Front 西侧道路地下收转，不穿入南北馆。
- JR 北中庭分别接 LUCUA、梅北公共侧和 M16 北改札外，不新增到南侧 Crost 的未核验 B1 直线。
- Grand Front 与 Yodobashi 隔道路相邻。JR 北侧二层公共分支分别接两者；南北馆之间保持横跨道路的连桥关系。
- Grand Green 北馆与 Grand Front 北馆另有一座东西向 2F 北接续桥。梅北之森与南馆之间的高架步道走公园，北端落向园路；园侧直接进入北馆 2F 的门位尚待核对。[JAM BASE 官方路线](https://umekita.com/jambase/access/) · [UR 公园动线图](https://www.ur-net.go.jp/west/press/bn5k4400000037c7-att/20260409_ur_umekita_prerelease.pdf#page=2)
- Yodobashi 外圈回廊只由公共高架板块绘制，建筑绘制内层裙楼；不能让外壳封住回廊或重画桥面。
- 阪急三线各收束为独立双线北行，横向东京都、西神户。公共接口与 JR／Yodobashi 连桥分别核对，不能直接连通付费区。
- Inogate—Grand Green 与 LUCUA 1100—Green Place 是两条独立公共连桥。Green Place 地上体量按既有公共落台和桥面留出净空，与梅北地下付费站台分开。[建筑白模校对](../buildings/model-calibration.md)
- Gate Lantern 样板从梅北地下口 B1 闸外接向 Grand Green 南馆，在地面圆形开口旁以螺旋楼梯接公园 2F 步道的南端。日建设计的剖面用于确认层间接口，约 20 米对应楼梯外径。通路按现役站体包络绕开 B1 付费厅，平面控制点、斜段位置、屋面与标高为示意拟合；公开几何复用授权待核对。样板范围包括入口扶梯，电梯各层门位待核对。[Gate Lantern 剖面](https://www.nikken.jp/ja/dbook/nj202503/pageindices/index16.html) · [南馆 B1 图](https://umekita.com/floor/south/?floor=B1F)
- 2026 年 11 月 20 日开放的「梅北之森」由地面公园模块表达。北侧 2F 跨 Step Plaza 后经北端平台及楼梯落到园路。桥轴和楼梯走向来自 OSM，开园现场记录确认可以下楼进园，桥端高差按展示层拟合。设计说明与现场图支持外围隆起、池畔局部下凹；点位、边缘坡线和相对街道的深度为示意，均留在 1F 探索。未开放地块和西向外接桥待核对；未添加寻路边。[运营方地图](https://umekita.com/midori/map/) · [大阪市开放范围](https://www.city.osaka.lg.jp/hodoshiryo/osakatokei/0000688839.html) · [日建设计地形剖面](https://www.nikken.jp/ja/dbook/nj202503/pageindices/index11.html) · [开园现场下楼记录](https://www.youtube.com/watch?v=VhSKsOq0Fws&t=133s)

- 阶梯广场（Step Plaza）在大阪站北 1 号线两侧分别接人行道。现场与 OSM 核对两侧各有多段浅阶和园路接点。模型分别以一处含中段平台的 1F 局部高差表达，阶宽、阶数及高程为示意。[UR 开园平面](https://www.ur-net.go.jp/west/press/bn5k4400000037c7-att/20260409_ur_umekita_prerelease.pdf#page=2) · [运营方道路设计](https://umekita.com/midori/features/fon_20221121_12/)
- Grand Green 南馆 B1 下沉花园位于 Park Tower 与 Gate Tower 之间、1F 的 S10 和 S11 之间，楼梯下方邻接 Time Out Market Osaka。1F 开口按照片所示三角形拟合，位于 Gate Lantern 2F 支桥门槛以西。开口、周边铺装和两组楼梯都落在两栋裙楼之间，建筑保留自身轮廓。B1 庭院接向既有 Gate Lantern 南馆端，馆内接入线位、台阶及开口尺寸为示意。梅北之森的市街入口和北公园直下 B1 的待核实接驳单列。[运营方 B1 图](https://umekita.com/assets/S-B1.webp) · [运营方 1F 图](https://umekita.com/assets/S-1F_1.png) · [开放现场照片](https://www.rbayakyu.jp/rbay-kodawari/item/8033-3-21)
- 南公园 1F 包含草坪广场、水盘、南丘、色彩花园、银杏步道和靠南馆的南广场。地形根据日建设计说明拟合，水盘与路面实际分层；园路沿 OSM 地面轴线接 Step Plaza、南公园天桥楼梯和 Gate Lantern 方向的园侧路。道路、B1 和 2F 保留现有归属。种植位置、分区边界和局部高程为示意。[运营方公园图](https://umekita.com/midori/map/) · [日建设计地形说明](https://www.nikken.co.jp/ja/news/press_release/2024_09_06.html)
- SANAA 大屋顶与公园西侧低层建筑沿用 PLATEAU LOD2 屋面和墙面。大屋顶保留曲面及下方开敞区域，跟随 1F 和建筑开关。南馆三塔只在总览显示，Inogate 2F 桥口及下沉花园按已有落台和开口裁空。[运营方公园楼层图](https://umekita.com/floor/park/) · [建筑白模校对](../buildings/model-calibration.md)
- 梅田蓝天大厦向西延伸总览范围。1F 表达双塔间的 Wonder Square，并标出往东塔的地面入口区域。运营方指引从地下道回到地面、过街后到大厦，常规观景台入口在东塔 3F。地下道两端及标高待单独校准，旧 OSM `306860236` 保留在原始数据，当前地面图不采用该旧线位。[运营方现行路线](https://www.skybldg.co.jp/access/) · [地面广场说明](https://www.skybldg.co.jp/convention/room/wonder/)

## 所有者与待核对

站内见 [JR／梅北](../stations/jr-osaka.md)、[阪急](../stations/hankyu-umeda.md)、[M16](../stations/metro-umeda.md)。地下由 `north-atrium/`、`metro-interchange/`、`whity/` 管理；二层由 `north-decks/` 和 `west-decks/inogate.ts` 管理，均位于 `src/infrastructure/public-areas/`。

构内图确认层级及拓扑，道路配准、门洞、桥宽、曲率、设备落点和局部高差仍含拟合。检查入口见[地下装配](../public-areas/underground.md)和[二层装配](../public-areas/elevated.md)。
