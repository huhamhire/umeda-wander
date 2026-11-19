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
- Inogate—Grand Green 与 LUCUA—Green Place 是独立连桥，不接梅北付费站台；尚未建模的目标只保留有依据的公共落台或占位。

## 所有者与待核对

站内见 [JR／梅北](../stations/jr-osaka.md)、[阪急](../stations/hankyu-umeda.md)、[M16](../stations/metro-umeda.md)。地下由 `north-atrium/`、`metro-interchange/`、`whity/` 管理；二层由 `north-decks/` 和 `west-decks/inogate.ts` 管理，均位于 `src/infrastructure/public-areas/`。

构内图确认层级及拓扑；道路配准、门洞、桥宽、曲率、设备落点和局部高差仍含拟合。阪急西侧公共前沿、桥门口及局部净空按 [Roadmap](../../roadmap.md) 继续核对。检查入口见[地下装配](../public-areas/underground.md)和[二层装配](../public-areas/elevated.md)。
