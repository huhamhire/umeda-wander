# 大阪梅田立体交互地图：方案文档

地理版本已接入七站样板、地下公共区域和主要二层连廊。运行方式见根目录 [README](../README.md)。早期方案文档保留设计背景，当前范围与待核对事项以 Roadmap 为准。

已确定使用 TypeScript 编写应用代码，`src/` 存放源码，`dist/` 存放构建产物，最终入口为 `dist/index.html`。

- [空间重构 Roadmap](./spatial-refactor-roadmap.md)：四阶段已接入的成果、剩余细节，以及独立板块与公共能力的维护边界。
- [阶段二校准记录](./stage-two-calibration.md)：独立车站目录、米制包络对照、迁移范围及建筑高度重建要求。
- [可行性与实现方案](./feasibility.md)：产品范围、视觉与交互、渲染路线、地图数据、HTML 入口与资源交付、阶段验收。
- [参考资料与社区项目评估](./references-and-community.md)：本地素材检查、外部资料、建模项目对比与验证清单。
- [JR 大阪站布局整理记录](./jr-osaka-layout.md)：中央改札/夹层的楼层归属、六组地面站台、梅北地下站台与西口连接关系，以及数据简化边界。
- [地下网络投影核对](./underground-projection-audit.md)：基于地面坐标的地下公共包络、车站留位及已确认／待核实楼层；[数据维护说明](../data/geography/underground/README.md)。
- [2F 连廊投影核对](./elevated-projection-audit.md)：北侧、南侧、西侧公共连廊与地面路网的首轮对照；[数据维护说明](../data/geography/elevated/README.md)。

## 开发与维护规范

- [代码风格与样式目录](./code-style.md)
- [国际化文案维护](./i18n.md)
