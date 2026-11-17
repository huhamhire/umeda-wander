# 数据来源与版权核查

核查日期：2026-11-17。展示配置集中在 `src/infrastructure/source-credits.ts`；旧总图和连接模块已于本轮移入 `deprecated/infrastructure/`，原站点转发路径改为 `src/infrastructure/stations/<id>/`；本记录列出交付边界，不是对所有现有材料的授权确认。

## 实际发布资源

`scripts/build.ts` 只输出 `index.html`、`app.js`、`styles.css`。入口为 `src/main.ts`；静态数据来自 `src/infrastructure/`。没有构建时复制或运行时加载 `references/` 中的 PDF、SVG、位图，也没有外部底图、在线瓦片、外部 3D 模型、照片贴图或下载字体。标牌使用 `CanvasTexture`，标识使用内联 SVG，模型使用程序化几何。Three.js 等程序库的原许可证仍保留在构建 HTML 注释中，不能当作本项目源码许可或地图数据许可。

仓库没有配置 remote，`package.json` 为 private，根目录未发现项目级 LICENSE；无法确认公开源码或反馈入口。因此“项目源码”整节省略，没有推测仓库地址或自行设置源码许可。以后可通过统一配置增加真实公开地址、对应 LICENSE 与反馈入口。

## 已核实的开放数据

- OSM 数据许可为 ODbL 1.0：[OSM 版权页](https://www.openstreetmap.org/copyright)、[署名指引](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines)、[ODbL 原文](https://opendatacommons.org/licenses/odbl/1-0/)。按用户后续调整，地图角落将来源文字与 OSM 简短署名合并成一个文本链接，打开本项目弹窗；不再另放独立 OSM 链接。弹窗中的完整署名、版权页及 ODbL 各自保留。
- 当前 OSM 下载由 `src/infrastructure/district/geographic-map.ts` 的 `geographicOsmData()` 提供，包含地面轮廓、估计宽度、建筑部件、行车参考线及高架轴线；机器可读数据保留署名、ODbL 链接和重建说明，不包含混合 PDF 参考的完整地下几何。旧 `commercial-footprints.ts` 和 `osm-credit-download.ts` 已归档，仅供旧回归对照。数据许可不覆盖构内图整理、参考截图或整个项目。

## 待补充来源／授权的在用内容

以下资料虽未作为图片发布，但已有几何或布局整理结果进入页面，因此同时列入“数据与素材许可”，不能只放在参考书目中。公开下载不等于授权。

| 原始资料路径 | 在用结果与用途 | 待核实事项 |
| --- | --- | --- |
| `references/stations/jr-osaka/station-guide.pdf`、`references/stations/kitashinchi/station-guide.pdf` | `jr-osaka-map.ts`、`jr-osaka-upper-links.ts`、`kitashinchi-map.ts`：楼板、设备与层间关系 | JR 构内图的几何整理、改编及公开使用依据 |
| `references/stations/hankyu-umeda/station-guide.svg` | `stations/hankyu-umeda/index.ts`：阪急站台、站厅、设备布局 | SVG 的原发布页、版本与改编授权；在线官方英文 PDF 仅作补充，不假装是该 SVG 的原文件 |
| `references/stations/hanshin-umeda/station-guide.pdf` | `stations/hanshin-umeda/index.ts`：阪神 B1/B2 与出口竖向连接 | 阪神构内图适用于本用途的许可／授权 |
| `references/stations/metro-umeda/station-guide.pdf`、`T20_東梅田_構内図.pdf`、`Y11_西梅田_構内図.pdf` | `stations/metro-umeda/index.ts`、`stations/higashi-umeda/index.ts`、`stations/nishi-umeda/index.ts`：三站构内几何 | Osaka Metro 图表的整理改编依据 |
| `references/district/underground-walkway-map.pdf`、`references/district/elevated-walkways-2026.pdf` | `west-district-links.ts`、`south-walkway-plan.ts`、`southern-underground.ts`：DIAMOR、建筑占位、第一生命互通 | 周边图已识别为 UMEDA CONNECT 2024-02 系列，并找到发布方站点的同系列繁体版；本地简体文件是否为同一版、底层 Whity 图数据的改编条款仍需核实，不能套用大阪市其他资料的许可 |
| `references/connections/osaka-station-city/2f-map.png`、`osaka-station-city-3f.png`、`osaka-station-city-map-legend.png` | `jr-south-forecourt.ts` 与大丸前庭、竖向连接整理 | 原图发布地址、截图或图层的改编许可 |
| `references/connections/grand-green-osaka/jr-umekita-decks.pdf`、`grand-green-osaka-south-2f.png`、`jambase-2f-deck-route.jpg`、`jambase-access-overview.png` | 北侧连桥关系核对；Grand Green 目标区域未全部建模 | 各文件的原发布地址与后续几何使用依据，不能从目录名推定共同许可 |
| `references/district/station-area-orientation.webp` | 地铁相对位置、阪急街区与外围轮廓校准 | 原发布页、作者、允许改编的依据 |
| 会话上传的 Google 地图／卫星图及建筑外景截图（没有稳定仓库原文件路径） | `commercial-district.ts`、建筑外观呈现模块及连廊显示拟合 | 截图原始出处、摄影者和允许派生使用的授权；没有发布照片贴图或宣称获得 Google 授权 |
| 日本邮便 JP Tower 连桥 PDF、阪急通廊说明、日本设计／设施官网图文 | `jp-tower-links.ts`、`hanshin-commercial-building.ts`、建筑造型与外部通廊整理 | 发布页已核对；仍未确认适用于本项目改编的明确授权 |

配置中的公开链接逐项通过原发布站核对，包括 JR、阪急、阪神、Osaka Metro、大阪市两份 PDF、日本邮便、LUCUA、大丸、Grand Front、日本设计及 RESPIRE。线上资料可能更新，不能据此认定与仓库本地版本完全相同。无法确认的原始资料没有伪造公开下载链接，也没有把本地参考文件随弹窗发布。

阶段三新增在用结果：`public-areas/metro-interchange/` 的三处局部接驳面依据 JR p6、M16 p1 与地区图编写；`north-atrium/access.ts` 的公共设备依据 JR p5–6／8。`basement-buildings.ts` 的 OSM 宿主轮廓经 `basement-occupancy.ts` 与参考 PDF 公共面相减，属于混合来源结果，不纳入纯 OSM 下载。对应原始资料仍适用上表的待授权事项，本轮没有获得新的许可、引入外部模型或在线瓦片。维护分区不会将 PDF 派生数据变成 ODbL。

阶段四新增在用结果：`data/geography/elevated/ways.json` 摘取仓库 OSM 的 34 条高架步行轴线，原坐标及估计宽度在 OSM 下载中交付。`public-areas/north-decks/`、`south-decks/`、`west-decks/` 的公共平台、`deck-access.ts` 的公共设备及建筑裁口结合高架步行图、站城楼层图和既有参考照片；其混合几何不作为纯 OSM 子集发布，仍对应上表的待授权事项。Yodobashi 外圈的沿边界退让是程序化拟合，没有新增图片贴图或第三方模型。

## 交互检查

使用原生 `<dialog>.showModal()`，依赖浏览器的顶层模态与 inert 隔离；标题接收初始焦点，关闭按钮、Esc 和 cancel 均恢复入口焦点，Tab 首尾循环。手机入口包含 12px OSM 署名，触摸区域至少 44px，底部导览预留 58px 加安全区；对话框限制屏幕高度、内容独立滚动，关闭按钮在滚动区外。

本功能修改文件为 `src/index.html`、`src/main.ts`、`src/styles.css`、`src/infrastructure/source-credits.ts`、`deprecated/infrastructure/osm-credit-download.ts`（旧下载对照，页面现用 geographicOsmData）、`src/presentation/source-credits-dialog.ts`、`tests/source-credits.test.ts` 及本记录；其后用户追加的南侧布局、车站比例、北新地扶梯和默认展开调整单独记录于 `underground-space-plan.md`。

自动化测试覆盖内容节顺序、空节省略、许可分离、下载数据边界、打开关闭与键盘焦点生命周期，以及窄屏样式约束。遵照既有“不直接操作浏览器”的要求，没有做真实浏览器／手机视口的视觉和原生模态验收；原生 inert、触摸滚动与关闭后地图手势仍需在浏览器实测，不能把测试替身称为该项实测通过。

本轮追加：公共 2F 桥面使用统一暖赭色；`west-decks/inogate.ts` 根据 JR 位置图及两端 2F 图拟合独立公共前沿／新桥，具体资源为 `data/geography/elevated/inogate.json`。新增宿主轮廓来自仓库 OSM，前沿、桥面、门口及统一展示标高仍为混合来源参考拟合，适用原有待授权事项。`display-context.json` 根据地下公共面、核心站体及连廊裁剪地面铺装，不能当作纯 OSM 下载；原始数据下载内容和许可保持原样。

## PLATEAU 建筑补充

地下街区占位另有 `data/geography/underground/basement-source.json`／`basement-outlines.json`，分别保存 E-ma、Hilton West、MARU 的 PDF 原始边界及投影结果，用于 H5 B1 占位填充。来源为 `references/district/underground-walkway-map.pdf`，哈希及绘图对象可追溯；几何整理、改编和公开使用授权仍待核实。该部分不属于 OSM 或 PLATEAU 许可，不包含在纯 OSM 数据下载中。

设施迁移校对恢复 `public-areas/south-diamor/jp-access.ts`：日本邮便连桥说明第 2 页直接确认下沉广场 B1–1F 外部阶梯及 B1–2F 电梯；`deck-access.ts` 的步道桥北端楼梯依据 JR 南侧 1F 图。仅核对了存在性及层间关系，位置、尺寸为人工拟合；仍适用原有改编／公开使用授权待确认状态，不新增许可推断。已核对的原始文件归档到 `references/commercial/`，未作为页面图片发布。

Grand Front 官方梅北广场 1F／B1 图用于南侧广场两处扶梯和宽楼梯的拓扑及方位核对，单列在运行时数据与素材来源中；几何改编及公开使用授权待确认。原图保存在 `references/commercial/grand-front/`。全部本地资料按车站、地区、接驳及商业体分类，稳定 ID、原名、SHA-256、核对用途及待确认事项集中于 `references/catalog.json`；文件来源可追溯与获得授权是两个独立事项。

阪急 1F 公共通廊现役几何在 `src/infrastructure/buildings/hankyu-dept/concourse.ts`，拱门及橱窗程序模型在 `src/presentation/commercial-concourse-model.ts`；依据官方通廊说明和既有用户照片拟合，原始素材未嵌入页面。已单列数据条目，几何改编、外观参考及公开使用授权仍待核实，不能归入 PLATEAU 或 OSM 的许可。

2026-11-17 从大阪市 2025 CityGML 包提取指定三栋阪急／站房 LOD2 屋面及 JR 站房 LOD0／1 包络。包内 README 允许选用 CC BY 4.0；本项目据此明确选择该许可并记录出典、加工事实、GML ID、测绘年份和文件 SHA-256，见 `data/geography/buildings/PLATEAU-LICENSE.md`、`plateau-source.json`。未导入贴图。历史阪神／JP 数据未采用；这两栋重建后的人工体量及非开放外观资料不包含在 PLATEAU 的许可声明中。出处与限制见 `docs/building-model-calibration.md`。
