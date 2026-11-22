# 车站模块与地区组装

项目使用 TypeScript 和 Three.js。H5 使用地理米制总图，车站、商业建筑及公共区域按独立板块维护。

## 项目结构

```text
umeda-h5/
├── src/
│   ├── domain/            # 地图实体、几何与通行规则
│   ├── application/       # 站点与公共网装配、导航和探索用例
│   ├── infrastructure/    # 站点、建筑、地理来源与浏览器偏好
│   ├── presentation/      # 场景、镜头、标签、模型、控件和音效
│   ├── content/           # 各语言的来源与版权正文
│   ├── styles/            # 基础主题和领域组件样式
│   ├── utils/             # 无地图领域语义的共用工具
│   ├── main.ts            # 应用与 DOM 事件绑定
│   └── index.html         # 单入口模板
├── data/geography/        # 派生资源与可复现的地理配置
├── references/           # 原始资料与来源索引
├── scripts/              # 构建、开发服务和离线核查
├── tests/                # 按领域组织的回归测试
├── docs/                 # 设计、开发、来源与维护待办
├── build/                # 本地中间产物和审查结果
└── dist/                 # 静态部署产物
```

细分目录见[应用层](../../src/application/README.md)、[呈现层](../../src/presentation/README.md)、[样式](../../src/styles/README.md)和[测试](../../tests/README.md)。楼层展开使用的视觉高度只影响渲染，不参与步行路线代价计算。

## 组装入口

| 部分 | 入口（相对 src/） | 职责 |
| --- | --- | --- |
| 最终站模 | `infrastructure/district/geographic-stations.ts` | `createGeographicStation(id)` 独立创建站模；与全图共用设备校准与轨道恢复 |
| 各站 | `infrastructure/stations/<id>/index.ts`、`geographic.ts` | 本站原始布局、设施、证据及地理校准；不引用其他站内部数据 |
| 公共接口 | `application/stations/station-public-interfaces.ts` | 从付费边界生成稳定门户及标高、宽度、朝向和依据 |
| 公共前庭 | `infrastructure/public-areas/station-frontages/index.ts` | 提取已有前庭与局部落台，捐入公共网，避免车站重复绘制 |
| 地下装配 | `application/public-areas/shared-underground.ts` | 合并地区公共面及前庭，扣除付费／服务空间，保留孔洞 |
| 2F 装配 | `application/public-areas/public-deck-assembly.ts` | 分支并集、重复所有权裁剪及板块接缝 |
| 纯组装 | `application/stations/compose-station-maps.ts` | 汇总领域实体并拒绝重复身份，不耦合 Three.js |
| H5 数据 | `infrastructure/district/geographic-map.ts` | 组装站体与公共板块、补齐设施目录，导出公共接口及绑定 |

各站设计与源码目录集中在[七站索引](../design/stations/README.md)，公共地下与高架所有者见[公共板块说明](../../src/infrastructure/public-areas/README.md)。M16 前庭已接入共享地下公共面；Yodobashi 外环由公共 2F 板块持有，不属于建筑外壳副本。

网页源码从 `data/geography/` 读取准备好的模型资源。原始快照和构内图由 `references/` 归档，提取、离线校准报告及核查脚本集中在 `scripts/geography/`。站体在场景中的组装和设备位置校准仍属运行时逻辑。

## 共享规则

应用层按 stations、public-areas、connections、exploration、i18n 归组，保留 map-session 状态入口，见[应用层说明](../../src/application/README.md)。呈现层按 camera、labels、appearance、components 和模型对象归组，见[呈现层说明](../../src/presentation/README.md)。不添加旧路径转发或聚合所有导出的 barrel。

MapScene 协调镜头、状态和生命周期；MapModels 构造网格并输出设备组及标签锚点；SceneLabels 管理 DOM 投影、遮挡和碰撞；MapGestures 管理指针及手势；RouteModel 渲染既有路线。通过明确参数及回调协作，不能将整个 MapScene 私有状态传给子模块。离线脚本直接使用 MapModels，不再伪造 MapScene 并反射调用私有方法。

步行路线由 `application/navigation` 逐段计算，地点从显式接入的步行图节点装配。地区组装将经来源核对的 B1 公共步行边附加到各站图上。端点、地图选点和公开范围见[步行路线设计](../design/walking-routes.md)。

- 每站交付同一套领域 `StationMap`，不复制类型、渲染器或服务。原始局部布局仍被地理站模复用，不能因采用新坐标就删除。
- 设备坡度在 `application/connections/calibrate-equipment.ts` 校准；保留站厅／夹层端，更新实际站台端、路线节点及设施锚点。开口按实际承载楼板处理。
- 门户在 `application/stations/public-interface-bindings.ts` 校验同标高公共落脚面；几何绑定不自动生成跨站寻路边。
- 当前轨道由 `infrastructure/geography/runtime-rails.ts` 从校准站台端点生成；JR 走廊约束在 `stations/jr-osaka/rail-corridors.ts`。OSM 只提供宽泛方向，共切向并线及公共尾段保持独立 RailApproach。
- 共享空间、设备模型和 DOM 控件遵循根级 DDD 分层；无地图语义的通用方法才进入 utils。

## 维护和验证

1. 修改具体站点、建筑或公共板块，保留稳定 ID 与来源。
2. 修改空间时检查包络、设备端点、孔洞、围栏、公共接口、轨道与设施候选。
3. 用 `node scripts/geography/review-stations.ts --station=nishi-umeda` 独立复核；省略站点参数输出七站。公共网使用[对应的离线核查命令](./validation.md#数据与模型改动)。
4. 按改动运行类型检查、回归、构建及离线图检查。几何相邻不解释为已核验门位或现场导航。

## 旧坐标对照


原十个兼容转发入口已删除，直接导入 `stations/<id>/` 中的实际模块。历史文档中的 `umeda-map.ts`、`station-maps.ts`、`district-map-parts.ts` 等路径不再是页面数据入口。测试与脚本已改用现役地理站模，旧设施清单冻结为独立 JSON 夹具，避免删除旧实现后失去逐项校对依据。
