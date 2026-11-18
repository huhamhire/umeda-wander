# 地理轨道校准参考

运行 `python scripts/geography/extract-railways.py` 从 `references/district/osm/umeda-2026-11-16.xml` 提取 railway=rail 和 landuse=railway 对象，保留对象 ID、版本、标签、原始经纬度。当前 194 条记录，无缺失节点。原始快照和地面建筑道路数据不改变。

来源及日期同 [地理快照说明](../README.md)：2026-11-16 OSM 官方 API。© OpenStreetMap contributors，ODbL 1.0：https://www.openstreetmap.org/copyright 。这些对象是 OSM 数据，不是从 Google 卫星影像提取的几何。

`scripts/geography/railway-plan.ts` 将地面/高架轨道投影为米制参照线；地下轨道另保留在原始记录中。本轮只用地面轨道检查阪急南端避让。每线 4.2 m 道床宽度是展示估计，非铁路用地或工程净距。`build/geography/surface-railways.json` 为生成结果，不提交。

运行 `node scripts/geography/render-station-interiors.ts` 将轨道与校准车站叠加。当前未替换 H5 旧场景中的 RailApproach，也不生成任何步行导航边。

## 地理 H5 运行时

`subways.json` 由 `python scripts/geography/extract-subway-rails.py` 从同一 OSM 快照提取 8 条 subway way。铁路与地铁缓存由 `src/infrastructure/geography/runtime-rails.ts` 按站点及层级筛选，裁去站台内部重复轨道，保留附近行车区域的原中心线，再与站台轨端衔接。站台接入短段是人工展示拟合，源图线不代表已核实的道岔进路。各站标高仍使用示意层级，不能用作工程净空。缓存继续适用 OSM／ODbL，页面下载同时包含该铁路与地铁子集。

当前呈现已替换上述逐线坐标对接方式：站台端点为权威起点，按线路分组汇入共享尾段；OSM 仅提供 JR 地面本线／环线的大致区段切线，不强行匹配经纬度。梅北接用弧形站台端切线。数据快照仍保留用于离线校对和 OSM 下载。
