# 梅田地面基底快照

2026-11-16 从 OSM 官方 API 获取：
https://api.openstreetmap.org/api/0.6/map?bbox=135.491,34.697,135.502,34.708

范围：西 135.491，南 34.697，东 135.502，北 34.708。原始 WGS84 坐标和对象版本保存在 `umeda-osm.xml`；`features.json` 是完整 way 的派生数据。

数据 © OpenStreetMap contributors，ODbL 1.0：
https://www.openstreetmap.org/copyright
https://opendatacommons.org/licenses/odbl/1-0/

运行 `python scripts/geography/extract-osm.py`，然后 `node scripts/geography/render-plan.ts`。输出在 `build/geography/`：SVG 平面图、WGS84 GeoJSON 与数量报告。SVG 局部坐标 x 向东、y 向南，原点为范围西北角；111320 m/纬度度，横向乘原点纬度余弦，仅用于本地区近似平面。所有位置直接投影，不含旧地图展示偏移。GeoJSON 保留经纬度，便于后续 GIS 工具复用。

当前矩形仅为取数与预览窗口。最终使用范围后续按实际需要沿外围道路或建筑边界裁剪；原始快照不裁剪覆盖。最终裁剪边界应独立维护，预览的 SVG 裁切不改变导出几何。暂不把矩形边缘封成公共通路或区域围墙。

当前为第一阶段首版校对稿，尚未验收：

- 已组装 6 个建筑 multipolygon/building 关系，拼接外环、保留内庭孔洞，移除重复成员；多个外环导出为 MultiPolygon。缺失成员或无法确定孔洞归属的关系进入 `extraction-report.json`，本次未发现这些错误。
- 地下、显式高架、室内道路和台阶不进入地面图。未标注层级的道路可能仍需人工复核。
- 优先使用道路面和 width 属性；线状道路其次按该条 OSM way 的 lanes 估计铺装宽度，最后按道路分类回退。分向道路分别计算，不能把整条道路总宽度重复应用到两侧。不能视为路缘实测位置。
- 道路展示只需大致体现柏油铺装轮廓，不还原车道线、停止线、方向箭头等路面标线。宽度策略集中在 `scripts/geography/road-width.ts`，结合用户卫星图的主次道路宽窄关系作示意估计，不作影像测量或修改 OSM 原始坐标。御堂筋 7 车道段约 22.7 m，普通分向 2 车道段约 7 m；修复 trunk 干道曾回退至 4 m 的问题。车道数仅用于计算宽度。Grand Front—Yodobashi 间道路按自身分段属性处理，不套用主干道全幅宽度。
- 每次生成输出 `build/geography/road-width-audit.json`，记录各线段 ID、名称、车道数、展示宽度及依据（OSM width / 车道数估计 / 分类估计 / 步行空间估计）。GeoJSON 保留原始中心线及属性，展示宽度另见该审计文件。路口包络与缺少车道数的局部道路仍可继续人工校对。
- 已补 JR 大阪站、阪急站、第一生命、Hilton 及站前四栋大楼标注，主要道路每个名称选择一段较长路段标记，标签进行边界与相互避让。LUCUA 等建筑部件的完整命名及道路面细节仍待核对。
- 用户在会话提供 Google Maps 地图及卫星图，供方位、裙楼和街区关系视觉核对；当前坐标全部来自 OSM，没有描摹或发布这些截图。
- SVG 保留可见署名，派生数据随原始快照和重建脚本一起提供。尚未接入现有 H5，运行时来源列表未改变。
