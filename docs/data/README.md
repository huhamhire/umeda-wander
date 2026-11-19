# 数据来源与核查

| 入口 | 职责 |
| --- | --- |
| [来源与版权审计](./source-credits-audit.md) | 实际发布素材、开放许可、混合几何及待授权事项 |
| [参考资料与模型来源评估](./reference-evaluation.md) | 已有调查、来源适用范围及未采用方案；具体采用结果以区域设计和来源配置为准 |
| [原始资料索引](../../references/README.md) | 分类文件、catalog、SHA-256、直接核对事实 |
| [地理数据说明](../../data/geography/README.md) | OSM、源图投影及各类可重建资源 |

来源正文集中在 `src/content/source-credits.<locale>.html`，构建时作为整份内容嵌入弹窗；未确认的授权和原发布地址只在内部审计中维护。源码许可证、程序依赖许可证、OSM／PLATEAU 许可和参考图改编授权分别维护，不能相互覆盖。
