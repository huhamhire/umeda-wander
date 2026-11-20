# 地下公共网与设备

## 板块与装配

`src/infrastructure/public-areas/underground-blocks.ts` 登记九个公共板块：北中庭、M16 接驳、阪急地下区、Whity、Crost、阪神—西梅田／第一生命、DIAMOR、北新地／曾根地下道和外围延伸。`application/public-areas/shared-underground.ts` 将地区投影、站前公共面和有依据的接驳面合并，并避让车站内部及付费区。分区边界只定义维护归属，源图的凹凸、曲面和街区孔洞由[地下投影](./underground-projection.md)保留。

公共 B1 统一使用 `district-underground` 的展示标高 -8 m 和展开序号 -1。`StationPublicInterface` 按改札全宽检查同高承接，跨管理边界的门组可绑定多个相邻面。十六处 B1 改札接入同一个平面公共分量；独立出口及短升降落台可保留在其他分量。跨站寻路使用有依据的显式路径，见[步行路线](../walking-routes.md)。

- **JR 北侧**保留 LUCUA 北侧绕行至梅北的闸外通路，中央改札留在 1F，梅北西口 B2 闸内连接通道单独维护。
- **M16** 的中北西前庭接 JR 一侧，中北东前庭接阪急一侧，北口西侧从付费区外绕行。三处接驳角点与宽度结合 JR 构内图及 M16 图人工拟合，离线图以虚线标示。
- **南侧**的西梅田公共带位于付费站厅东侧，北／中改札向东，南改札仍在南端。北新地的东西改札由北侧公共主廊承接，11-21／11-23 经中央支路接入同一公共面，其他出入口使用东西端局部前庭。站点关系见[南侧区域](../areas/south.md)。

## 公共设备

设备用 `blockId` 标明归属；上下层落点进入设施目录，内部编号不进入界面名称。井道保持竖直，上层楼板、铺装与遮盖使用共用孔洞。

### Whity 梅田 · 泉之广场北侧

首批为 NOMOKA／泉之广场北侧的 **M-1、M-2、M-5、M-6**。[Whity 运营方出口清单和别图 2](https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf#page=50)确认四处为自管地面出口，下端从北侧 B1 通廊两边接入。图中另标示的 B2 范围不用于这四组楼梯。

| 出口 | 街面梯口与顶棚 |
| --- | --- |
| M-1 | [梯口](https://www.openstreetmap.org/node/2330458903) · [顶棚](https://www.openstreetmap.org/way/618516676) |
| M-2 | [梯口](https://www.openstreetmap.org/node/5018031053) · [顶棚](https://www.openstreetmap.org/way/618516665) |
| M-5 | [梯口](https://www.openstreetmap.org/node/5018031052) · [顶棚](https://www.openstreetmap.org/way/618516675) |
| M-6 | [梯口](https://www.openstreetmap.org/node/2715291801) · [顶棚](https://www.openstreetmap.org/way/618516664) |

`whity/street-exits.ts` 按 OSM 梯口及顶棚定地面位置。B1 局部接驳以运营方平面图和 [OSM 地下步道](https://www.openstreetmap.org/way/1010195578)拟合，合并至 `whity-b1` 的现役公共面。阶梯宽度、坡度、地下落点及中间平台为展示拟合。四处顶棚与相邻建筑轮廓分离，1F 裁孔用在各自的独立落台。后续若资料明确显示穿过楼体，应通过具名宿主绑定同时裁剪该建筑的首层楼板和阻挡入口的墙体。

### Whity 梅田 · 泉之广场

- **M-9、M-13** 按[运营方别图 2 和别图 5](https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf#page=53)表达从 B1 上行至共用平台，再分成两个地面梯口。M-9 的两支共用 [OSM 顶棚](https://www.openstreetmap.org/way/618516674)，M-13 的两支各有[西支顶棚](https://www.openstreetmap.org/way/618713380)和[东支顶棚](https://www.openstreetmap.org/way/618713379)。分叉平台高差、梯段轴线和宽度为展示拟合。梯口落在街面，首层开口绑定各自落台。
- **公共客梯**连接 B1 与新御堂筋高架下方的街面中央分隔岛。运营方图区分客用与货运井道，[大阪市无障碍详图及照片](https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda04-1%28202303%29.pdf)给出公共接入，[国土地理院正射影像](https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/18/229741/104099.jpg)用于拟合地面位置。井道与楼板开口共用中心，门向按公共落台拟合。模型表达客梯。
- **水之树**位于 B1 广场中心，按[大阪地下街说明](https://www.osaka-chikagai.jp/facility/whity)与[设计团队资料](https://naked.co.jp/works/6817/)制作静态银色树干、放射状枝条与蓝白镜面树冠。圆形广场以 [OSM 广场节点](https://www.openstreetmap.org/node/5018031057)定中心，边界与造型尺寸为展示拟合。地标随 B1 显隐，广场保持连续公共楼板。

- **M-10、M-14** 按官方图分别从广场东北和东南两侧接出，均由 B1 先到分岔平台，再分向两个街面梯口。街面四处节点位于原 OSM 快照东界之外，用补查到的梯口、步道和顶棚定位。M-10-1 沿扇町通向东、M-10-2 沿新御堂筋向北，M-14-1 沿新御堂筋向南、M-14-2 沿扇町通向东。模型在广场东缘补齐两条独立 B1 接驳。平台标高、梯宽和 B1 梯脚为展示拟合。 [运营方编号图](https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf#page=53)

| 街面梯口 | 顶棚 | 街面衔接 |
| --- | --- | --- |
| [M-10-1](https://www.openstreetmap.org/node/5846147483) | [顶棚](https://www.openstreetmap.org/way/618516673) | [步道](https://www.openstreetmap.org/way/618516667) |
| [M-10-2](https://www.openstreetmap.org/node/5846147484) | [顶棚](https://www.openstreetmap.org/way/618516672) | [步道](https://www.openstreetmap.org/way/618516668) |
| [M-14-1](https://www.openstreetmap.org/node/5847763275) | [顶棚](https://www.openstreetmap.org/way/618713381) | [步道](https://www.openstreetmap.org/way/618713378) |
| [M-14-2](https://www.openstreetmap.org/node/5847763274) | [顶棚](https://www.openstreetmap.org/way/618713382) | [步道](https://www.openstreetmap.org/way/618713377) |

这些几何由 `whity/izumi-plaza-access.ts` 登记，归 `whity-b1`。

### Whity 梅田 · North Mall 1

- **H-28 和 H-30** 按运营方的 North Mall 1 平面图及设施指南，通过 Sunny Terrace 接入同一片公共通道。H-28 以室外梯口和街面步道方向定位。H-30 以 HEP FIVE 南立面的梯口与巷道接点定位，首层楼板和墙体按设备轴线局部裁口，明确绑定 `hep-five`。模型保留从巷道进入公共楼梯的关系。 [运营方平面图](https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf#page=53) · [设施指南](https://whity.osaka-chikagai.jp/service) · [H-28 街面楼梯](https://www.openstreetmap.org/way/1208420372) · [H-30 梯口](https://www.openstreetmap.org/node/5865318036) · [巷道接点](https://www.openstreetmap.org/way/1458907022)
- **H-40** 按运营方详图，把 North Mall 1 东侧通向楼梯的 B1 短接驳接回主通道。接驳的横向位置和宽度为展示拟合。街面门位的公开资料只给出 HEP NAVIO 一侧的大致区域，模型表达至 B1 梯前。 [运营方详图](https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf#page=54) · [大阪市地下街图](https://www.city.osaka.lg.jp/kita/cmsfiles/contents/0000419/419991/10_en.pdf#page=2)
- **H-41** 位于 North Mall 1 西侧。街面梯口和独立顶棚定位上端，地下步道的折角与轴线定位下端。模型将 B1 西向支路接回公共面，并在折角处用平台连接两段楼梯。 [运营方出口图](https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf#page=50) · [梯口](https://www.openstreetmap.org/node/5865318493) · [顶棚](https://www.openstreetmap.org/way/620835761) · [地下步道](https://www.openstreetmap.org/way/1322885763)

`whity/north-mall-access.ts` 根据这些街面控制点局部修正 Sunny Terrace 的 B1 横向接驳面和 H-41 的西向支路，合并进 `whity-b1`。Sunny Terrace 梯脚及通道宽度、H-41 的折角平台标高、三处梯段尺寸和首层净空均为展示拟合。三处设备进入设施目录，步行路线仍使用已登记的公共边。

### Whity 梅田 · North Mall 2

**J-2、J-3、J-4** 是运营方图上从 North Mall 2 支廊通往地面的三处楼梯。OSM 梯口节点同时落在建筑轮廓和街面步道上，J-2、J-4 对应 OS 大楼，J-3 对应 HEP NAVIO。三处首层墙体和楼板分别按所属楼体裁口。OS 大楼沿 HEP NAVIO 一侧补画约 60 米的广场顶棚，按广场图的 4.5 米檐下标高表达，支柱避开梯口。 [Whity 运营方出口图](https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf#page=50) · [J-2](https://www.openstreetmap.org/node/8878597296) · [J-3](https://www.openstreetmap.org/node/8878597300) · [J-4](https://www.openstreetmap.org/node/8878597302) · [OS 广场平面与立面](https://www.osgroup.co.jp/business/assets/os_guidance.pdf)

`whity/north-mall-2-access.ts` 用三处街面梯口校正 B1 支廊的末段及分支，接回现役 `whity-b1` 公共面。B1 梯脚、分叉点、通道宽度、梯段尺寸与顶棚端点均为展示拟合。OS 大楼用 OSM 外轮廓与估算高度表达。现役步行图使用已登记的公共路径。 [OS 大楼轮廓](https://www.openstreetmap.org/way/162157817) · [OS 大楼资料](https://www.hhp.co.jp/services/lease/office/)

### Whity 梅田 · Center Mall 与曾根崎警察署前

- **H-49、H-51** 从 Center Mall 经图中的 H-50 接驳段上行，到路边共用梯亭后分向南北。B1 接驳从现役通廊向西延伸至分岔平台，平台平面位置受已标绘的地下轴线与梯亭轮廓约束。 [运营方出口图](https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf#page=53) · [地下轴线](https://www.openstreetmap.org/way/1322885774) · [共用梯亭](https://www.openstreetmap.org/way/618516677)
- **H-58、H-60** 分别接到警察署北侧和西侧的街面步道。模型用各自的街面梯口和遮盖轮廓定位，分别接回 B1 公共面，首层开口与梯段采用同一定位。 [H-58 梯口](https://www.openstreetmap.org/node/5024365373) · [H-58 顶棚](https://www.openstreetmap.org/way/620835758) · [H-60 梯口](https://www.openstreetmap.org/node/5024365375) · [H-60 梯亭](https://www.openstreetmap.org/way/620835755)

`whity/central-access.ts` 负责这四处梯口、三个街面遮盖及对应的 B1 局部接驳。下端落点、分岔平台标高、梯宽及净高均为展示拟合。四处出口归 `whity-b1`，步行图继续使用已登记的公共路径。

### Whity 梅田 · Puchishan

- **H-1** 位于北广场通往茶屋町方向的一侧。按带编号的街面梯口和地面步道定位，校正 B1 北端的西向接驳，并在三番街现役外壳的临街边缘局部裁口。 [H-1 梯口](https://www.openstreetmap.org/node/8872207243) · [街面步道](https://www.openstreetmap.org/way/958843695) · [地下步道](https://www.openstreetmap.org/way/1010195568)
- **H-16** 位于南端 ABC-MART 梅田楼外侧。按街面梯口、梯段和独立顶棚定位，校正 B1 东向短接驳并补上首层开口。 [H-16 梯口](https://www.openstreetmap.org/node/4609280782) · [梯段](https://www.openstreetmap.org/way/466035093) · [顶棚](https://www.openstreetmap.org/way/466035113)

- **3-31** 按运营方详图及大阪市地下街图定位为 Puchishan 南端的西向短支路，区别于独立编号的 3-27。模型接通 B1 梯前公共面，街面门位的资料精度仅够定位到阪急侧通廊一带。 [运营方详图](https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf#page=54) · [大阪市地下街图](https://www.city.osaka.lg.jp/kita/cmsfiles/contents/0000419/419991/10_en.pdf#page=2)

`whity/puchishan-access.ts` 维护这三处 B1 接驳，接入 `hankyu-basements` 公共面。梯脚、梯段尺寸和局部通廊宽度为展示拟合。

### Whity 梅田 · East Mall 酒店接入口

- **7-72 · 宜必思大阪梅田酒店** 从 East Mall 北侧接入。按酒店到达说明、运营方编号图及街面参考点，校正 Whity 一侧的 B1 前庭。 [酒店到达说明](https://ibisosakaumeda.com/access/) · [街面参考点](https://www.openstreetmap.org/node/5024365349)
- **7-75 · Hotel Dans le Coeur 大阪梅田** 从 East Mall 南侧接入。按运营方编号图、业主直连说明及街面参考点，校正 Whity 一侧的 B1 前庭。 [业主说明](https://www.isereality.co.jp/2019/12/05/post-60/) · [街面参考点](https://www.openstreetmap.org/node/5024365348)

`whity/east-mall-access.ts` 维护两处公共通道侧的接入口，两处均可在设施目录中定位。前庭宽度与 B1 落点为展示拟合。街面编号点用于平面配准，两处归运营方清单中的楼体连接项。 [运营方出口与接入清单](https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf#page=6) · [运营方编号图](https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf#page=53)

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
