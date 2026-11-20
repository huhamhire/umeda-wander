# 地下公共网与设备

## 板块与装配

`src/infrastructure/public-areas/underground-blocks.ts` 登记九个公共板块：北中庭、M16 接驳、阪急地下区、Whity、Crost、阪神—西梅田／第一生命、DIAMOR、北新地／曾根地下道和外围延伸。`application/public-areas/shared-underground.ts` 将地区投影、站前公共面和有依据的接驳面合并，并避让车站内部及付费区。分区边界只定义维护归属，源图的凹凸、曲面和街区孔洞由[地下投影](./underground-projection.md)保留。

公共 B1 统一使用 `district-underground` 的展示标高 -8 m 和展开序号 -1。`StationPublicInterface` 按改札全宽检查同高承接，跨管理边界的门组可绑定多个相邻面。十六处 B1 改札接入同一个平面公共分量；独立出口及短升降落台可保留在其他分量。跨站寻路使用有依据的显式路径，见[步行路线](../walking-routes.md)。

- **JR 北侧**保留 LUCUA 北侧绕行至梅北的闸外通路，中央改札留在 1F，梅北西口 B2 闸内连接通道单独维护。
- **M16** 的中北西前庭接 JR 一侧，中北东前庭接阪急一侧，北口西侧从付费区外绕行。三处接驳角点与宽度结合 JR 构内图及 M16 图人工拟合，离线图以虚线标示。
- **南侧**的西梅田公共带位于付费站厅东侧，北／中改札向东，南改札仍在南端。北新地的东西改札由北侧公共主廊承接，11-21／11-23 经中央支路接入同一公共面，其他出入口使用东西端局部前庭。站点关系见[南侧区域](../areas/south.md)。

## 公共设备

设备用 `blockId` 标明归属；上下层落点进入设施目录，内部编号不进入界面名称。井道保持竖直，上层楼板、铺装与遮盖使用共用孔洞。

### 曾根地下道

- **11-43** 按[凤凰厅到达指引](https://phoenixhall.jp/access/)表达扶梯。采用 [OSM 地面梯口](https://www.openstreetmap.org/node/3499801000)、[顶棚](https://www.openstreetmap.org/way/618802454)和[地下折角支路](https://www.openstreetmap.org/way/1322885750)。地下落点和支路宽度是拟合值。
- **11-44** 依据 [OSM 节点](https://www.openstreetmap.org/node/5024365381)和[顶棚轮廓](https://www.openstreetmap.org/way/618802450)表达街面标记和遮盖。地下门位和跨层设备缺少足够依据，模型只表达地面部分。
- **11-41 东侧公共直梯**按 [OSM 电梯点](https://www.openstreetmap.org/node/5865318044)定位。依据[地下步道](https://www.openstreetmap.org/way/1322885752)和[街面步道](https://www.openstreetmap.org/way/1551653211)将门向分别拟合为西向、南向。[国土交通省资料第 1 页](https://www.kkr.mlit.go.jp/plan/happyou/thesises/2021/ol9a8v000004bznv-att/aka-11.pdf)区分地面、地下 1 层桜橋停车场与地下 2 层步道。模型中的 `district-underground` 是地区公共步道的 B1 展示层，井道只表达公共步道与地面两处落点，停车层未建模。

上述设施归 `kitashinchi-public-b1`。11-43 扶梯和公共直梯的地下落点接入现役公共楼板，两处 1F 开口与设备共用坐标。步行图继续采用已登记的公共路径。

### 其他区域

| 区域 | 设施和依据 |
| --- | --- |
| JR 北中庭 | JR 构内图第 5、6 页标出 75／76 扶梯和 B 直梯。B 直梯的上部停靠见[二层连廊](./elevated.md)。 |
| JR—M16 | 3A、8 号宽梯、9 号扶梯、18 号楼梯及御堂筋南口电梯下段由 `metro-interchange/street-exits.ts` 维护。18 号和电梯保留独立 B1 落台。[地面出入口](../stations/metro-umeda.md#jr-一侧地面出入口) |
| 梅北闸外 | JR 构内图第 8 页标出未编号的地面扶梯、楼梯和直梯，位于 AD／AE 与西口闸内连接通道之外。 |
| JP 下沉广场 | [日本邮便连桥说明](../../../references/commercial/jp-tower/deck-and-sunken-garden.pdf)第 2 页标出 B1–1F 阶梯及 B1–2F 电梯。`south-diamor/jp-access.ts` 维护独立广场，电梯下段与 `public-jp-deck-lift` 共轴。 |
| Grand Front 南侧广场 | [梅北广场 1F 图](../../../references/commercial/grand-front/umekita-plaza-1f.jpg)及 [B1 图](../../../references/commercial/grand-front/umekita-plaza-b1.jpg)用于核对两处扶梯和一组宽楼梯。由 `north-atrium/grand-front-plaza-access.ts` 维护。 |

设备米制位置、尺寸及展示高差为拟合。地下门位、主网接驳和局部高差的待核对项统一见 [Roadmap](../../roadmap.md)。

## 建筑占位

`basement-buildings.ts` 登记宿主，`basement-occupancy.ts` 减去公共面及站内空间，并去除重复占位。占位仅表达地下街区边界，文字平贴楼板，窄碎片不放名称。关闭「显示建筑轮廓」时，地下建筑填充及其贴地名称一起隐藏。公共通道、站厅和站台继续按所选楼层显示。

E-ma、Hilton West 使用地区图第 1 页的绿色面，绘图对象分别为 405、436；MARU 使用对象 243 的闭合弧形外边界。`basement-source.json` 记录源文件哈希、页码、绘图序号及采样结果，`basement-outlines.json` 与公共面共用道路投影。第一酒店附近的对象 63 同时描绘道路、建筑细部和站前第 1 大楼，复合线不足以定义酒店边界。

E-ma、Hilton West 和 MARU 与公共面有几何接触。JP 下沉广场与 JP 宿主接触，仍独立于地下主网。`basementGaps` 使用包含孔洞的内外边界计算最短距离，供查看图面间距；入口认定需要另有资料。

## 重建与复核

按[地下数据说明](../../../data/geography/underground/README.md)更新源轮廓或道路配准，再运行 `node scripts/geography/review-underground.ts`。输出写入 `build/geography/`。

- `underground-network.svg` 与 `underground-north.svg`、`underground-south.svg` 展示公共面、建筑占位、付费区、公共设备及接口。
- `underground-basement-review.svg` 展示占位几何和间距诊断。
- `underground-network-audit.json` 记录板块、改札绑定、投影控制、公共设备及建筑接触状态。`component=-1` 表示该点未落入当前公共面。

`tests/public-areas/underground-network.test.ts` 核对分区并集、孔洞、付费边界、改札连通分量、设备开口与稳定编号。资料及混合几何的权限见[来源核查](../../data/source-credits-audit.md)。
