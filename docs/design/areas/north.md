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
- Yodobashi 外圈回廊只由公共高架板块绘制，建筑绘制内层裙楼；不能让外壳封住回廊或重画桥面。
- 阪急三线各收束为独立双线北行，横向东京都、西神户。公共接口与 JR／Yodobashi 连桥分别核对，不能直接连通付费区。
- Inogate—Grand Green 与 LUCUA 1100—Green Place 是两条独立公共连桥。Green Place 地上体量按既有公共落台和桥面留出净空，与梅北地下付费站台分开。[建筑白模校对](../buildings/model-calibration.md)
- Gate Lantern 样板从梅北地下口 B1 闸外接向 Grand Green 南馆，在地面圆形开口旁以螺旋楼梯接公园 2F 步道的南端。日建设计的剖面用于确认层间接口，约 20 米对应楼梯外径。通路按现役站体包络绕开 B1 付费厅，平面控制点、斜段位置、屋面与标高为示意拟合；公开几何复用授权待核对。样板范围包括入口扶梯，电梯各层门位待核对。[Gate Lantern 剖面](https://www.nikken.jp/ja/dbook/nj202503/pageindices/index16.html) · [南馆 B1 图](https://umekita.com/floor/south/?floor=B1F)
- 2026 年 11 月 20 日开放的「梅北之森」由地面公园模块表达。北侧 2F 跨 Step Plaza 后经北端平台及楼梯落到园路。桥轴和楼梯走向来自 OSM，开园现场记录确认可以下楼进园，桥端高差按展示层拟合。设计说明与现场图支持外围隆起、池畔局部下凹；点位、边缘坡线和相对街道的深度为示意，均留在 1F 探索。未开放地块和西向外接桥待核对；未添加寻路边。[运营方地图](https://umekita.com/midori/map/) · [大阪市开放范围](https://www.city.osaka.lg.jp/hodoshiryo/osakatokei/0000688839.html) · [日建设计地形剖面](https://www.nikken.jp/ja/dbook/nj202503/pageindices/index11.html) · [开园现场下楼记录](https://www.youtube.com/watch?v=VhSKsOq0Fws&t=133s)

- 阶梯广场（Step Plaza）在大阪站北 1 号线两侧分别接人行道。现场与 OSM 核对两侧各有多段浅阶和园路接点。模型分别以一处含中段平台的 1F 局部高差表达，阶宽、阶数及高程为示意。[UR 开园平面](https://www.ur-net.go.jp/west/press/bn5k4400000037c7-att/20260409_ur_umekita_prerelease.pdf#page=2) · [运营方道路设计](https://umekita.com/midori/features/fon_20221121_12/)
- Grand Green 南馆 B1 下沉花园位于 1F 的 S10 和 S11 之间。运营方两张楼层图标出露天台阶，现场照片确认下方花园与 Time Out Market 外门相邻。模型以 B1 露天庭院、两翼步阶和 1F 实际开口表达，庭院位置、尺寸和两翼几何为拟合。南馆 B1 公共面接向既有 Gate Lantern 南馆端，馆内接入线位为示意。梅北之森的市街入口与这条南馆层间接驳分开，北公园直下 B1 的接驳仍待确认。[运营方 B1 图](https://umekita.com/assets/S-B1.webp) · [运营方 1F 图](https://umekita.com/assets/S-1F_1.png) · [开放现场照片](https://www.rbayakyu.jp/rbay-kodawari/item/8033-3-21)

## 所有者与待核对

站内见 [JR／梅北](../stations/jr-osaka.md)、[阪急](../stations/hankyu-umeda.md)、[M16](../stations/metro-umeda.md)。地下由 `north-atrium/`、`metro-interchange/`、`whity/` 管理；二层由 `north-decks/` 和 `west-decks/inogate.ts` 管理，均位于 `src/infrastructure/public-areas/`。

构内图确认层级及拓扑，道路配准、门洞、桥宽、曲率、设备落点和局部高差仍含拟合。检查入口见[地下装配](../public-areas/underground.md)和[二层装配](../public-areas/elevated.md)。
