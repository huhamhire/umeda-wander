# 文档索引

七站地理样板、地下公共网和主要二层连廊已接入。模型及连接包含人工拟合，不能用于现场导航。运行方式见[项目 README](../README.md)，待办与待验收项见 [Roadmap](./spatial-refactor-roadmap.md)。

| 要处理的内容 | 入口 |
| --- | --- |
| JR 中央区、北侧、南侧的跨板块关系 | [区域设计与参考](./design/README.md) |
| 车站构内布局、设备、改札与本站证据 | [七站设计](./design/stations/README.md) |
| 地面遮盖、地下开挖网络、2F 连廊 | [公共空间](./design/public-areas/README.md) |
| 裙楼、塔楼、建筑造型及公共接入 | [建筑设计](./design/buildings/README.md) |
| 架构、代码风格、国际化、验证和文档维护 | [开发文档](./development/README.md) |
| 资料版本、授权、来源评估与设施迁移核对 | [数据与来源](./data/README.md) |

```text
docs/
├── README.md
├── spatial-refactor-roadmap.md   # 剩余任务与待验收项
├── design/
│   ├── areas/                   # JR 中央区、北侧、南侧
│   ├── stations/                # 七站构内依据与简化边界
│   ├── public-areas/            # 地面、地下及二层公共网
│   └── buildings/               # 商业体量、外观与接入
├── development/                 # 架构、编码、国际化、验证与文档规范
└── data/                        # 来源评估、版权和迁移审计
```

原始参考资料保留在 [references](../references/README.md)，版本、来源和事实集中于 [catalog.json](../references/catalog.json)。旧方案、旧坐标参数和已结束的迁移流水不再单独归档，需要时查 Git 历史。现行文档区分资料事实、实现拟合及待确认事项，维护方式见[文档规范](./development/documentation.md)。
