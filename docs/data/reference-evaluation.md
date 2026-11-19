# 参考资料与社区项目评估

调研日期：2026-11-14。此处保留来源适用范围及候选方案评估。已采用的地理数据、白模与权限见[来源审计](./source-credits-audit.md)。

## 1. 本地资料检查

### JR：`references/stations/jr-osaka/station-guide.pdf`

- 文件约 0.81 MB，共 8 页；标题为 `Osaka Station Map`，作者元数据为 West Japan Railway Company。
- 第 1 页有完整立体分层总览和设施图例，标注资料时点为 2026-01-14。
- 第 2 页主要为 3F 南北连络桥、桥上闸口相关区域；第 3 页包括 2F 站台与相邻区域；第 4 页包括夹层通道；第 5 页包括 1F；第 6 页包括 B1F；第 7–8 页包括西口连接与梅北地下口、地下站台区域。
- 这些页面并非“一页就是单一楼层”；同页可能包含相邻建筑楼层或跨层注记，必须按实际标签拆分。
- 图中存在站台、闸口、售票处、售票机、扶梯、直梯、无障碍路线及设施编号等信息，可作为语义整理依据。
- PDF 特别注明：部分楼梯、扶梯、直梯编号用于图示定位，并非站内现场编号。后续可以保留为内部引用，不应把它们直接当作游客现场寻路标识。

全部 8 页均经文本和图面核查。上述页别是资料索引，不代表已验证每个设施位置。当前实现的覆盖范围见 [JR 布局整理记录](../design/stations/jr-osaka.md)。

官网同名参考：[JR Osaka Station Map](https://www.westjr.co.jp/global/en/timetable/pdf/station_osaka.pdf)。官网文件可能更新；当前项目以本地版本为依据，不能默认二者长期一致。

### Osaka Metro M16 构内图

`references/stations/metro-umeda/station-guide.pdf` 共 1 页，提供站台、改札、中间层与跨层设施的图示关系。使用边界见 [M16 设计](../design/stations/metro-umeda.md)。

### 阪急：`references/stations/hankyu-umeda/station-guide.svg`

- 文件约 2.53 MB，`viewBox="0 0 1389.41 1385.41"`，为 Illustrator 导出的矢量图。
- XML 中包含约 1,727 个 path、1,219 个 polygon、446 条 line、74 个 rect，但只有 2 个 text 元素；大量文字已转成轮廓。统计是结构盘点，不是地图实体数。
- 视觉上是多层展开导览图，可辨认上方站台区域、中间闸口/通道层和下方地面区域，以及扶梯、楼梯、直梯和周边去向。
- 可以借鉴它的布局与配色，但没有现成的“楼层/房间/连接/可通行边”数据，不能把每个 polygon 自动视作一个地图区域。
- 不能把展开后的层间偏移当作建筑平面错位；需要按楼层重建局部坐标。
- 图内有施工文字，静态模型略去临时施工状态。
- 样式依赖 CSS class。临时 PDF 渲染器最初未应用这些样式，检查预览时已在内存中展开 CSS 后重新渲染；原 SVG 未修改。实施时需在浏览器再核对图标与文字，不把预览器差异当作原图损坏。

补充对照：[阪急官方英文导览图](https://www.hankyu.co.jp/global/common/pdf/station_guide/umeda.pdf)。该在线图带有 `2024.4` 版本标识，只用于名称和设施图例补充，不自动覆盖本地 SVG 的布局。

### 用户提供的外景照片 01：大屋顶与站台关系

来源：会话中用户上传的外景参考图片，原图尚未作为文件保存到仓库。拍摄时间、拍摄位置与使用授权信息未随图提供；当前用于造型观察，不作为精确尺寸或地理定位依据。

从照片中可观察到的建模重点：

- 大屋顶跨越平行站台，屋面宽大并具有明显倾斜；不能用一块普通水平楼板代替。
- 屋面具有浅色厚边、成排蓝灰色采光带，轮廓带有轻微起伏和端部弧度。
- 屋面下方可见三角形钢桁架；站台上方另有多条平行的窄雨棚，两者属于不同尺度的结构。
- 大屋顶两侧的建筑体量构成空间边界，有助于表现站区规模。周边高楼只需保留简化体量，不必复刻窗格和立面广告。

建议先用少量分段面构造屋顶轮廓，用重复色带表现采光带，用少量杆件表现桁架节奏。不要将照片直接贴到屋面，也不需要复现所有构件。屋顶与站台雨棚分别建模，并能独立隐藏；分层查看室内时优先移开大屋顶。

这是一张外部形态参考，不能从照片中确认内部闸机、售票处、跨层设施或可通行路径。照片拍摄方向也不直接决定应用相机方向，项目使用可读性优先的正交斜视构图。

## 2. 地区定位与连接资料

| 来源 | 适合使用的信息 | 不能据此直接推断 |
| --- | --- | --- |
| OSM | 建筑轮廓、地理锚点、道路、已有步行和连廊要素 | 未标注的室内连接、精确高程、当地完整室内覆盖 |
| Google 地图 | 人工核对建筑相对位置、名称和朝向 | 不能因视觉相邻就确认内部互通 |
| JR 地区图 | 周边设施位置关系、通道去向 | 通道的完整三维几何和所有端点 |
| 阪急换乘说明 | 对外换乘方向和步行关系的文字依据 | 整条路线的精确楼层坐标 |

可查阅 [JR Umeda Area Map](https://www.westjr.co.jp/global/en/timetable/pdf/umeda_map.pdf) 和[阪急官方换乘说明](https://www.hankyu.co.jp/en/station/transit/osaka.html)。这些资料用于交叉核对，不能仅凭“通往某站”的箭头就生成无缝连通的地图边。

如果采用 OSM 数据，应保存来源与处理记录，并在成品中提供署名及许可入口；开放数据不等于无署名要求，具体再分发方式按 [OSM Copyright and License](https://www.openstreetmap.org/copyright) 与所用数据的实际情况处理。

## 3. 社区与开放建模项目比较

这些候选不是同一种工具：有的提供模型来源，有的提供交互实现参考。没有发现已经验证、可直接用于本项目的“两站完整室内模型 + 导航图”组合；这不代表此类资产不存在。

### 优先级 P1：PLATEAU 大阪市开放 3D 城市模型

来源：[大阪市官方介绍](https://www.city.osaka.lg.jp/toshikeikaku/page/0000676393.html)、[PLATEAU 开放数据入口](https://www.mlit.go.jp/plateau/open-data/)、[大阪市 2024 年度数据目录](https://www.geospatial.jp/ckan/dataset/plateau-27100-osaka-shi-2024)。

这是公共开放数据项目。大阪市官方说明其模型覆盖建筑、道路、桥梁等，并可以表现高度和屋顶形状。对本项目最有价值的是用作建筑位置、体量与屋顶参考。

**建议采用方式**：先查看梅田站区的具体覆盖与细节等级，再只提取少数目标建筑；离线简化、去纹理、重配色，或按轮廓重新建立参数化模型。

**使用范围**：本项目采用的版本、对象和几何细节见[建筑白模校对](../design/buildings/model-calibration.md)。建筑数据本身无法核实室内通行。

使用时保留来源和加工说明，核对具体数据包的权利标记；[PLATEAU 站点政策](https://www.mlit.go.jp/plateau/site-policy/)提供总体使用与署名规则。

### 优先级 P1：indoor3D

仓库：[wolfwind521/indoor3D](https://github.com/wolfwind521/indoor3D)。

README 描述了基于 Three.js 的室内地图、楼层选择、全部楼层显示、主题、区域名称和点选能力，方向与本项目接近。项目自述为实验项目；文档出现旧式 `Projector` 等接口，不能直接假定兼容当前 Three.js。

**建议借鉴**：地图 JSON 与渲染分离、楼层展示方式、设施/区域选择、主题配色。

**不建议直接作为主工程**：需要验证旧依赖、移动端表现和导航语义；没有两站专用数据。仓库标记 GPL-2.0，若复制代码或整体采用需先评估对本项目的适用条件。项目采用独立实现。

### 优先级 P2：OSM2World

仓库：[tordanik/OSM2World](https://github.com/tordanik/OSM2World)，[项目 README](https://raw.githubusercontent.com/tordanik/OSM2World/master/README.md)。

项目将 OSM 数据转换为三维模型，当前 README 列出 glTF/GLB、OBJ 等输出。可以用小范围 OSM 数据生成周边外壳，再裁剪和统一风格。

**建议借鉴/采用**：地理数据到 3D 体量的离线转换；若 PLATEAU 采样成本高，可与它比较一个街区的输出。

**限制**：结果质量依赖 OSM 原始要素；工具不会补出未录入的室内站厅、闸机和精确屋顶。完整街区直接导入会增加文件体积和风格处理成本。

当前仓库 [LICENSE.txt](https://github.com/tordanik/OSM2World/blob/master/LICENSE.txt) 为 MIT 文本；若选历史版本须检查对应版本许可证。代码许可、默认样式/贴图许可、OSM 数据许可分别记录，不能只看工具许可证。

### 优先级 P2：MapLibre 室内挤出示例与车站实验

官方示例：[Extrude polygons for 3D indoor mapping](https://maplibre.org/maplibre-gl-js/docs/examples/extrude-polygons-for-3d-indoor-mapping/)。社区仓库：[clement-igonet/maplibre-indoor](https://github.com/clement-igonet/maplibre-indoor)。

官方示例展示 GeoJSON 区域的立体挤出；社区仓库以真实车站的 OSM 室内数据探索分层、楼梯/扶梯和导航表现，适合参考数据处理思路。

**建议借鉴**：区域属性与高度的表达、不同楼层筛选、通行数据与显示分离、现实车站中需要处理的问题。

**限制**：示例和实验不等于成熟产品，也不证明大阪两站有同等 OSM 数据覆盖。尚未运行或审计社区代码与许可证；若后续复制代码，先检查其具体版本 LICENSE。当前目标侧重固定轴测拆解，不为使用示例而更换主引擎。

## 模型来源的维护

模型采用独立语义布局、Three.js 程序化几何与 OSM 地理定位。补充外部模型时，先核对具体版本、目标覆盖、几何粒度、体积与许可；建筑外部数据用于体量参考，车站内部关系仍依据各站构内图。Grand Front 的现行连桥关系见[二层连廊](../design/public-areas/elevated.md)。
