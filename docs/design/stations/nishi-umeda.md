# 西梅田站 Y11

## 参考事实

主要依据 `references/stations/nishi-umeda/station-guide.pdf` 第 1 页，对应 [Osaka Metro 构内图](https://subway.osakametro.co.jp/station_guide/station/Y11_%E8%A5%BF%E6%A2%85%E7%94%B0_%E6%A7%8B%E5%86%85%E5%9B%B3.pdf)。区域公共连接辅以[地区地下图](../../../references/district/underground-walkway-map.pdf)（2024 年 2 月）。

- B2 是北端尽头的 1/2 番线岛式站台，两条轨道朝南延续，方向为本町、难波、住之江公园。
- B1 为北、中、南三组改札及公共通路。北改札仅出站，中改札仅进站；此方向约束同时保留在站内示意路线中。
- 图示站台电梯先接南改札；另有通往地面的公共电梯及吉本大楼方向油压式升降平台。后者采用同一 B1 的局部高差示意，不增加完整楼层。
- 北侧公共通路指向阪神改札、JR 大阪站樱桥口方向；南侧接北新地及堂岛地下街。Hilton、Herbis 等只保留图上明确的地下接口，不展开商业内部。

[Osaka Metro 公告](https://subway.osakametro.co.jp/news/news_release/20231011_R3_R4_homesaku_setti.php)已将西梅田列为装有可动式站台门的车站，模型用半高屏蔽门表达。

## 实现与拟合

B1 构内图在北改札一侧、中改札一侧、Metro Opus 旁和南改札往 7-A 出口方向标出寄存柜。四个位置按现役公共站厅通路示意定位。

本站使用独立楼层 `y11-platform/hall/ground` 和来源 `yotsubashi`，设施编号以 Y11 开头。站台长 86、宽 7，北侧车挡与轨道共用 `terminalEnd: end`，不沿用阪急／阪神南东端尽头的默认方向。改札、扶梯、楼梯、电梯、街面出口及局部升降平台进入现有设施菜单；只表达选取的主要设备，不声称已逐一还原全部楼梯编号。

地理锚点取缓存 [OSM 7893338340](https://www.openstreetmap.org/node/7893338340) 的 `(34.6994819,135.4956500)`；轨道 [711991070](https://www.openstreetmap.org/way/711991070)、[846054375](https://www.openstreetmap.org/way/846054375) 的站内北向切向约 3.2–3.6°，采用 3.4°。西梅田、东梅田和北新地以用户补充地下步行图共用相对定位，保留阪神既有锚点；取消原来的独立南移 65 单位。原始地理锚点与图面拟合分别保存，不能解释为实测位置。

北侧经 `public-areas/south-diamor/` 的公共面接阪神南侧及西口外，南侧接北新地方向；必要前庭由 `public-areas/station-frontages/` 汇入。公共接驳不穿付费区、不自动添加跨运营者寻路边。JR 樱桥口方向虽有拓扑依据，缺少准确升层落点时不能补成直接到 JR 1F 的捷径。

验证覆盖北端车挡方向、三组改札及单向过闸、设备落点、分层开口、站台侧向净空、B1 聚焦、菜单编号及闸外连接避让。未操作浏览器。

南端补上往肥后桥的短段运行双线，由岛式站台两外侧平滑收束；北端是终点，不补北行延伸。交叉处 JR 东西线低于四桥线；上下标高为示意，探索时两者均属 B2。

## 街面梯口和 4-A 电梯

[Osaka Metro 出入口图](https://subway.osakametro.co.jp/station_guide/y/y11/map.php/map.php)提供乘客出口与目的地，构内图第 1 页对应 6/C30、9/C57 和 10/C49。地面位置取自仓库 2026-11-16 OSM 快照，按地区米制坐标直接投影。

| 出口 | 地面来源与模型表达 |
| --- | --- |
| 1 | [出口编号表](https://ekitan.com/sta-info/station/5737/exit)对应 C12，上端采用 [OSM 梯口](https://www.openstreetmap.org/node/12183322171)，梯向参考[入口占地](https://www.openstreetmap.org/way/1316299648)。 |
| 3 | 官方构内图标示北侧站厅向大阪花园城的地下接驳，方向标记放在 B1 西侧公共面。 |
| 4-A | 在 Herbis ENT 一侧沿 [OSM 电梯节点](https://www.openstreetmap.org/node/2299297072)对齐井道，北侧站厅、B1 和地面三站共轴。两侧门前落台分别按[地下足道](https://www.openstreetmap.org/way/1322885747)与[地面足道](https://www.openstreetmap.org/way/1316049306)的方向拟合。两个地下停靠都归 B1 探索，标高差使用 2.4 米的模型值。 |
| 4-B | Hilton Plaza West 外侧新增街面梯口，采用 [OSM 入口](https://www.openstreetmap.org/node/5024365394)和[独立顶棚轮廓](https://www.openstreetmap.org/way/618802435)。 |
| 5 | [出口编号表](https://ekitan.com/sta-info/station/5737/exit)对应 C7，上端采用 [OSM 梯口](https://www.openstreetmap.org/node/5340837790)，梯向参考[入口占地](https://www.openstreetmap.org/way/992368846)。 |
| 6 | 楼梯移至吉本大楼旁的 [C30 节点](https://www.openstreetmap.org/node/2299299144)，原油压升降平台继续表达地下局部高差。 |
| 9 | 楼梯上端对齐关电不动产西梅田大楼边缘的 [C57 节点](https://www.openstreetmap.org/node/5024365386)。 |
| 10 | 楼梯上端对齐樱桥交叉口西北侧的 [C49 节点](https://www.openstreetmap.org/node/2293280516)，按 [OSM 屋盖轮廓](https://www.openstreetmap.org/way/618802434)拟合顶棚。 |

各梯的中间平台、B1 端点、门向、宽度和棚高属于展示拟合。1、5 号的 OSM 入口占地用于判断梯向。按构内图第 1 页，两处楼梯的 B1 落台从两侧接入通往 JR 大阪站的闸外通道，现役地下公共面和寻路同时使用这两条拟合支路。4-B、9、10 号按局部落台表达。2 号 C18 的既有位置保留为示意，7-A／7-B 和 8 号堂岛地下街方向由地下公区表达。堂岛地下街有多个街面梯口，8 号指向该地下通道。
