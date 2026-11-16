# 车站模块与地区组装

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
