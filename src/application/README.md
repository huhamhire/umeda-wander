# 应用层

协调地图组装、空间约束和探索规则，不依赖 Three.js、DOM 或基础设施数据。每站专属布局仍由 `infrastructure/stations/<id>/` 提供，应用层处理传入的领域对象。

```text
application/
├── map-session.ts      # 状态、聚焦、复位及本站路线用例
├── stations/           # 站模组装、包络、公共接口和建筑裁口
├── public-areas/       # 地下／高架、占位、边界及净空
├── connections/        # 设备校准、朝向、开口、闸机边界和完整井道
├── exploration/        # 楼层、标高、筛选、灰化和标签显示规则
└── i18n/               # 与具体词库无关的消息格式化
```

共享算法按其操作的空间对象归组，不为每站复制，也不全部放入 utils。公共接口接触不自动生成跨站路线，显示层可见性和真实通行规则保持独立。

直接导入具体文件，不建立旧路径转发或总 barrel。增加模块前检查现有能力，领域层不能反向依赖应用层。详见[架构说明](../../docs/development/architecture.md)。
