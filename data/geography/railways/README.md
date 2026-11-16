# 地理轨道校准参考

运行 `python scripts/geography/extract-railways.py` 从同目录上一级的 `umeda-osm.xml` 提取 railway=rail 和 landuse=railway 对象，保留对象 ID、版本、标签、原始经纬度。当前 194 条记录，无缺失节点。原始快照和地面建筑道路数据不改变。

来源及日期同 [地理快照说明](../README.md)：2026-11-16 OSM 官方 API。© OpenStreetMap contributors，ODbL 1.0：https://www.openstreetmap.org/copyright 。这些对象是 OSM 数据，不是从 Google 卫星影像提取的几何。

`src/infrastructure/geography/railway-plan.ts` 将地面/高架轨道投影为米制参照线；地下轨道另保留在原始记录中。本轮只用地面轨道检查阪急南端避让。每线 4.2 m 道床宽度是展示估计，非铁路用地或工程净距。`build/geography/surface-railways.json` 为生成结果，不提交。

运行 `node scripts/geography/render-station-interiors.ts` 将轨道与校准车站叠加。当前未替换 H5 旧场景中的 RailApproach，也不生成任何步行导航边。
