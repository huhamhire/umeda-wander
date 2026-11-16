# 车站模块与地区组装

本文优先描述阶段二后的地理入口。各站已迁入独立目录；商业建筑和公共区域按独立板块交付，公共区域允许覆盖地下、地面及 2F。后续装配顺序见 [空间重构 Roadmap](./spatial-refactor-roadmap.md)。

## 当前地理入口

| 部分 | 入口 | 职责 |
| --- | --- | --- |
| 最终站模 | `district/geographic-stations.ts` 的 `createGeographicStation(id)` | 按稳定站点 ID 独立创建、校准设备并恢复本站轨道；全图采用相同工厂 |
| JR 内部组装 | `stations/jr-osaka/geographic-station.ts` | 地面、梅北两个框架，西口付费通道、Crost 及南门入口 |
| 其余各站 | `stations/<id>/geographic.ts` 与 `index.ts` | 地理轴、本站布局、设施及来源；不读取其他车站完整数据 |
| 公共接口 | `application/station-public-interfaces.ts` | 从本站付费边界生成稳定门户，包含方向、宽度、标高、来源，不推断跨站寻路 |
| 公共前庭 | `public-areas/station-frontages/index.ts` | 选取构内图已有前庭、出入口短臂与设备落台，捐入公共所有者；不恢复旧地区长矩形 |
| 地下公共组装 | `application/shared-underground.ts` | 合并已有地区网与前庭、扣除付费和服务空间，保留局部高差，几何只画一次 |
| 接缝绑定 | `application/public-interface-bindings.ts` | 拒绝缺少同标高公共落脚面的 B1 改札；绑定不是路线 |
| H5 入口 | `district/geographic-map.ts` | 纯组装、补齐设施目录；保留接口和绑定导出供阶段三使用 |

局部复核：`node scripts/geography/review-stage-two.ts --station=nishi-umeda`。省略参数输出七站；生成图放在 `build/geography/`，原始资料不改写。参数记录见 `createRuntimeCalibrations()`，其端点、尺寸为当前示意拟合，测量残差未取得。

设备坡度修正在 `application/calibrate-equipment.ts`；不能默认把下端当作站台端，夹层向上到站台时应保留夹层端。更新设备端点后同时更新对应路线节点和原有设施锚点。共享 B1 的实际楼板开口由全图设备规划，不能按 JR 归属过滤其他站点。

公共前庭与地区网之间仍有阶段三工作：目前 M16 中北东／西前庭没有地区连续连接。完整 2F 连桥属于阶段四；Yodobashi 外环现在是外壳特征，迁入公共高架板块时不能保留重复副本。

## 旧坐标入口与兼容约定

下列旧入口继续用于迁移对照及回归；不再是 `main.ts` 使用的数据入口。

每座车站独立维护布局、来源和设备，最后组装为地区地图。各站沿用同一套 Three.js 设备与楼板渲染器，不复制七份渲染实现。

## 三层边界

| 部分 | 入口 | 职责 |
| --- | --- | --- |
| 车站 | `infrastructure/station-maps.ts` | 七站统一清单，各站只登记一次 |
| 地区 | `infrastructure/district-map-parts.ts` | 商业区域、站间公共通路、外部连廊 |
| 组装 | `application/compose-station-maps.ts` | 合并站点与地区数据，拒绝重复站点和楼层 |
| 网页数据 | `infrastructure/umeda-map.ts` | 调用组装、补齐设施菜单，保留原有导出接口 |

领域层的 `StationMap` 定义每站交付的数据：身份、楼层、设施、路线节点、本站路线和 `StationLayout`。它不依赖 DOM、Three.js 或资料读取方式。

JR 原始资料包含夹层、南门大楼特殊层名，`jr-osaka-station.ts` 将这些数据适配为独立车站模块；原始 `jr-osaka-map.ts` 不因组装被改写。其余车站继续使用各自的 `*-map.ts`，`station-draft.ts` 只提供共用数据构造方法。

## 轨道的独立维护

`jr-osaka-rail-approaches.ts`、`hankyu-rail-approaches.ts`、`hanshin-rail-approaches.ts`、`midosuji-rail-approaches.ts` 分别维护各站出站轨道；西梅田和北新地的普通岛式站台延伸共用 `island-rail-approaches.ts`，站点身份、方向、楼层和来源仍独立。`rail-approach-draft.ts` 只提供节点与曲线段构造，不包含站点布局。

`rail-approaches.ts` 根据传入站台调用对应生成器；站点清单给每站补上自己的 `layout.railApproaches`，总图不再以全体站台重新生成一次。轨道延伸和步行路线保持独立。

## 修改流程

1. 修改本站 `*-map.ts` 的平面、设备和资料来源；同站上层复杂结构可继续抽为局部模块，如 JR 夹层与中庭。
2. 修改本站轨道模块，轨道端点仍由 `platformRail` 推导；设备、开口和设施编号沿用共用规则。
3. 出口变化时检查地区连接模块。地区层从站体公共接口推导端点，不把外部商场或跨站寻路塞入本站付费区。
4. 新站登记到 `station-maps.ts`；楼层、设施、路线和站台会自动加入组装，不再逐个修改总图数组。

`district-placement.ts` 统一维护地理锚点和展示拟合，各站内部仍使用局部坐标。跨站避让是地区关系检查，不能在渲染器里偷偷移动单个楼梯或站台。

`station-composition.test.ts` 验证每站不带地区数据时可独立组装、路线不引用外站节点、轨道只引用本站站台，以及组装不修改输入数据。此次重构另与 `150173d` 的完整导出数据逐项比较，地图实体、坐标及路线一致。
