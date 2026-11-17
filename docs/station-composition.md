# 车站模块与地区组装

H5 使用地理米制总图，车站、商业建筑及公共区域按独立板块维护。当前目录 tree、状态与剩余任务见[空间重构 Roadmap](./spatial-refactor-roadmap.md)。

## 现役入口

| 部分 | 入口（相对 src/） | 职责 |
| --- | --- | --- |
| 最终站模 | `infrastructure/district/geographic-stations.ts` | `createGeographicStation(id)` 独立创建站模；与全图共用设备校准与轨道恢复 |
| JR 子区 | `infrastructure/stations/jr-osaka/geographic-station.ts` | 组装地面、梅北独立框架及西口、Crost、南门连接 |
| 各站 | `infrastructure/stations/<id>/index.ts`、`geographic.ts` | 本站原始布局、设施、证据及地理校准；不引用其他站内部数据 |
| 公共接口 | `application/station-public-interfaces.ts` | 从付费边界生成稳定门户及标高、宽度、朝向和依据 |
| 公共前庭 | `infrastructure/public-areas/station-frontages/index.ts` | 提取已有前庭与局部落台，捐入公共网，避免车站重复绘制 |
| 地下装配 | `application/shared-underground.ts` | 合并地区公共面及前庭，扣除付费／服务空间，保留孔洞 |
| 2F 装配 | `application/public-deck-assembly.ts` | 分支并集、重复所有权裁剪及板块接缝 |
| 纯组装 | `application/compose-station-maps.ts` | 汇总领域实体并拒绝重复身份，不耦合 Three.js |
| H5 数据 | `infrastructure/district/geographic-map.ts` | 组装站体与公共板块、补齐设施目录，导出公共接口及绑定 |

公共地下与高架所有者见 [公共板块说明](../src/infrastructure/public-areas/README.md)。M16 前庭已接入共享地下公共面；Yodobashi 外环由公共 2F 板块持有，不属于建筑外壳副本。

## 共享规则

- 每站交付同一套领域 `StationMap`，不复制类型、渲染器或服务。原始局部布局仍被地理站模复用，不能因采用新坐标就删除。
- 设备坡度在 `application/calibrate-equipment.ts` 校准；保留站厅／夹层端，更新实际站台端、路线节点及设施锚点。开口按实际承载楼板处理。
- 门户在 `application/public-interface-bindings.ts` 校验同标高公共落脚面；几何绑定不自动生成跨站寻路边。
- 当前轨道由 `infrastructure/geography/runtime-rails.ts` 从校准站台端点生成；JR 走廊约束在 `stations/jr-osaka/rail-corridors.ts`。OSM 只提供宽泛方向，共切向并线及公共尾段保持独立 RailApproach。
- 共享空间、设备模型和 DOM 控件遵循根级 DDD 分层；无地图语义的通用方法才进入 utils。

## 维护和验证

1. 修改具体站点、建筑或公共板块，保留稳定 ID 与来源。
2. 修改空间时检查包络、设备端点、孔洞、围栏、公共接口、轨道与设施候选。
3. 用 `node scripts/geography/review-stage-two.ts --station=nishi-umeda` 独立复核；省略站点参数输出七站。阶段三、四分别使用同目录下的 review 脚本。
4. 按改动运行类型检查、回归、构建及离线图检查。几何相邻不解释为已核验门位或现场导航。

## 旧坐标对照

旧总图、商业轮廓和连接生成器已完成设施迁移校对并删除，空的 `deprecated/` 目录也已移除。需要历史对照时查 Git 版本 `b2a3da6`，处理清单见 [旧坐标总图退役](./legacy-retirement.md)。

原十个兼容转发入口已删除，直接导入 `stations/<id>/` 中的实际模块。历史文档中的 `umeda-map.ts`、`station-maps.ts`、`district-map-parts.ts` 等路径不再是页面数据入口。测试与脚本已改用现役地理站模，旧设施清单冻结为独立 JSON 夹具，避免删除旧实现后失去逐项校对依据。
