# 参考资料与事实索引

优先采用本目录已登记的资料。补充新资料前核对发布方、版本和 SHA-256，同一份文件只保留一份。来源链接、核对用途和授权边界集中在 [catalog.json](./catalog.json)。

```text
references/
├── catalog.json
├── stations/                         # 七站构内图
│   ├── jr-osaka/station-guide.pdf
│   ├── kitashinchi/station-guide.pdf
│   ├── hankyu-umeda/station-guide.svg
│   ├── hanshin-umeda/station-guide.pdf
│   ├── metro-umeda/station-guide.pdf
│   ├── higashi-umeda/station-guide.pdf
│   └── nishi-umeda/station-guide.pdf
├── district/                         # 地区方位及地下／高架公共网
│   ├── underground-walkway-map.pdf
│   ├── elevated-walkways-2026.pdf
│   ├── station-area-orientation.webp
│   ├── osaka-station-accessibility-2024-04.pdf
│   ├── osm/                        # OSM 地面与轨道提取的原始快照
│   └── plateau-2025/               # 官方 CityGML 网格及包内 README
├── connections/                      # 具体连廊和楼层接驳
│   ├── osaka-station-city/            # 2F、3F 及图例
│   └── grand-green-osaka/             # JR 发布图及各端点图
└── commercial/                       # 商业体外观／剖面／公共设备
    ├── grand-front/                  # 梅北广场 1F／B1 官方图
    ├── jp-tower/                     # 连桥与下沉广场官方说明
    ├── hanshin-twin-towers/           # 配置、道路上空利用及剖面
    └── hankyu-dept/                   # 1F 公共通廊发布说明
```

## 如何使用

- **资料直接事实**：以明确的图例、楼层名称、设备符号及发布文字为据。例如 JP 说明第 2 页直接列出 B1–1F 阶梯和 B1–2F 电梯；Grand Front 两张图用于核对 JR 侧设备及相对位置。
- **实现拟合**：米制坐标、宽度、层高、曲率和外观简化继续记在对应板块的源码及 `docs/`。原图的相邻关系不自动证明闸内互通、精确门位或完整无障碍路线。
- **来源边界**：用户上传截图、同系列在线图或文件名上的年份，不足以确认原始版本。目录已明确标注未知来源或版本；不要把来源页链接当成与本地文件逐字节相同的证明。
- **许可边界**：本地保存和事实核对不表示取得改编／再发布授权。页面使用的来源与许可由 `src/content/source-credits.zh-CN.html` 展示，待核实项见 `docs/data/source-credits-audit.md`。

OSM 和 PLATEAU 原始字节在此归档，派生数据及重建配置归 `data/geography/`。PDF 截页、模型预览和生成日志按需重建。历史抓取副本如有待核实的版本或用途，先保留在本地缓存。

移动或替换资料时同步更新代码、提取脚本、测试及派生数据中的本地路径；保留稳定资料 ID。检查原文件完整性：

```powershell
node scripts/geography/audit-references.ts
```

该命令检查本地文件、登记的哈希及重复内容。链接可用性、资料版本及授权需要分别核对。
