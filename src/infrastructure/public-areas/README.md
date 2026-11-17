# 公共地下板块维护

运行入口为 `district/geographic-map.ts`；各站只提供本站内部和改札接口，不导入其他站布局。

| 入口 | 职责 |
| --- | --- |
| `underground-blocks.ts` | 登记公共板块及有资料依据的局部接驳面 |
| `north-atrium/` | LUCUA—梅北—Yodobashi 地下公共区、75/76/B 和梅北闸外地面设施 |
| `metro-interchange/` | M16 中北东西前庭及北口外绕行的局部衔接面 |
| `whity/` | 阪急三番街、Whity—东梅田公共区 |
| `south-diamor/` | Crost、阪神—西梅田、第一生命、DIAMOR、北新地／曾根地下道及外围延伸 |
| `station-frontages/` | 选取构内图的必要前庭和设备落台，交给公共层；剔除旧版长距离公共矩形 |
| `basement-buildings.ts` | 有地下关系依据的建筑宿主轮廓清单；不是店铺或可通行地下室 |

## 几何流程

1. 保留 `data/geography/runtime-plan.json` 的原 PDF 异形投影；通过原提取和道路校准脚本重建，不用等宽线段重画。
2. 合并车站捐出的必要前庭、公共设备落台和明确编写的接驳面，扣除车站付费／服务等占用。
3. `application/public-area-blocks.ts` 按有序管理窗口分割成九个不重叠所有者。窗口只划分维护责任，不是地下开挖边界；末项必须接收剩余几何。
4. 所有板块共用 `district-underground`，标高 -8、stackIndex -1。西梅田短升降平台保留局部 offset，显式指定所有者。
5. 建筑宿主轮廓减去公共面及站体占用，再按先后去重。保留不同填色、平面文字；文字不挤出自身区块。`geometric-contact` 只表示几何接触，不确认门洞。

修改局部接驳时记录来源、关系、估计参数；禁止把最近点自动连线当作资料依据。原图的平面连通不证明同标高、无障碍或现场通行，不能自动添加 RouteEdge。

## 校验入口

- `node scripts/geography/review-stage-three.ts`：核心区总图、北／南局部图、接口与建筑接触报告，输出在 `build/geography/`。
- `node --test tests/stage-three-underground.test.ts`：分区保形、孔洞、付费区避让、改札接缝、设备开口和内部编号。
- 详细状态、来源和未确认部位见 [阶段三记录](../../../docs/stage-three-underground.md)。

纯 OSM 数据下载与 PDF 派生几何分开。原图的改编／公开使用授权仍待核实；没有因拆分板块而变更许可。

## 公共高架板块

`elevated-blocks.ts` 登记 `north-decks/`、`south-decks/`、`west-decks/`，`deck-access.ts` 维护公共上下设备。北侧与南侧分别使用 `district-north-deck`（8）和 `district-south-deck`（4），均归 2F 探索。`assemblePublicDecks` 合并路口并避让既有站厅／付费区／天井；`deck-boundaries.ts` 控制外缘栏杆留口；`deck-interface-bindings.ts` 仅处理已指定的建筑接入对象。`deck-buildings.ts` 声明二层目的建筑占位，复用 `application/building-occupancy.ts` 并避让公共桥面；不增加商场内部可通行区。不要恢复建筑外壳中的 Yodobashi 回廊副本。

运行 `node scripts/geography/review-stage-four.ts` 或 `node --test tests/stage-four-decks.test.ts` 检查。来源、设备及未定位新桥见 [阶段四记录](../../../docs/stage-four-decks.md)。
