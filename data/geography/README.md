# 梅田地面基底快照

2026-11-16 从 OSM 官方 API 获取：
https://api.openstreetmap.org/api/0.6/map?bbox=135.491,34.697,135.502,34.708

范围：西 135.491，南 34.697，东 135.502，北 34.708。原始 WGS84 坐标和对象版本保存在 `umeda-osm.xml`；`features.json` 是完整 way 的派生数据。

数据 © OpenStreetMap contributors，ODbL 1.0：
https://www.openstreetmap.org/copyright
https://opendatacommons.org/licenses/odbl/1-0/

运行 `python scripts/geography/extract-osm.py`，然后 `node scripts/geography/render-plan.ts`。输出在 `build/geography/`：SVG 平面图、局部米制几何与数量报告。局部坐标 x 向东、y 向南，原点为范围西北角；111320 m/纬度度，横向乘原点纬度余弦，仅用于本地区近似平面。所有位置直接投影，不含旧地图展示偏移。

当前为第一阶段首版校对稿，尚未验收：

- 只提取完整 way，尚未组装 multipolygon relation；建筑缺失与内庭需要后续核对。
- 地下、显式高架、室内道路和台阶不进入地面图。未标注层级的道路可能仍需人工复核。
- 优先使用道路面和 width 属性；其他按道路分类估计宽度，不能视为路缘实测位置。双向分离道路需后续检查包络重叠。
- 主要商业轮廓按已有 OSM ID 标记。车站主体、其他主要建筑和街道名称标注尚需补齐。
- 用户在会话提供 Google Maps 地图及卫星图，供方位、裙楼和街区关系视觉核对；当前坐标全部来自 OSM，没有描摹或发布这些截图。
- SVG 保留可见署名，派生数据随原始快照和重建脚本一起提供。尚未接入现有 H5，运行时来源列表未改变。
