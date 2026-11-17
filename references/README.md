# 参考资料与事实索引

原有上传资料已分类并统一文件名，文件内容不改写；已用于核对的官方缓存也归到这里。新旧名称、SHA-256、来源链接、核对用途与待确认事项集中在 [catalog.json](./catalog.json)，目前共 22 份原始资料。

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
│   └── station-area-orientation.webp
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
- **许可边界**：本地保存和事实核对不表示取得改编／再发布授权。运行时使用的来源与许可仍由 `src/infrastructure/source-credits.ts` 单独展示，待核实项见 `docs/source-credits-audit.md`。

OSM 与 PLATEAU 的原始／派生数据及许可记录仍归 `data/geography/`，避免再复制一份。CityGML 大体积下载缓存留在忽略的 `build/`；生成的 PNG 截页、模型预览和日志也不混入本目录。

移动或替换资料时同步更新代码、提取脚本、测试及派生数据中的本地路径；保留稳定资料 ID。检查原文件完整性：

```powershell
node scripts/geography/audit-references.ts
```

该命令检查本地文件与登记的哈希，不自动更新哈希，也不代替链接可用性、资料版本或授权审核。
