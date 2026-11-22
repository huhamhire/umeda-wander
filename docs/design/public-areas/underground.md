# 地下公共网与设备

## 板块与装配

`src/infrastructure/public-areas/underground-blocks.ts` 登记九个公共板块：北中庭、M16 接驳、阪急地下区、Whity、Crost、阪神—西梅田／第一生命、DIAMOR、北新地／曾根地下道和外围延伸。`application/public-areas/shared-underground.ts` 将地区投影、站前公共面和有依据的接驳面合并，并避让车站内部及付费区。分区边界只定义维护归属，源图的凹凸、曲面和街区孔洞由[地下投影](./underground-projection.md)保留。

公共 B1 统一使用 `district-underground` 的展示标高 -8 m 和展开序号 -1。`StationPublicInterface` 按改札全宽检查同高承接，跨管理边界的门组可绑定多个相邻面。十六处 B1 改札接入同一个平面公共分量；独立出口及短升降落台可保留在其他分量。跨站寻路使用有依据的显式路径，见[步行路线](../walking-routes.md)。

在 B1 聚焦单站时，改札接口直接绑定的公共板块保持原色，其余公共楼板使用与 JR 1F 参照层相同的半透明浅色。半透明板块保留孔洞，不投影、不遮挡标签或步行选点。全站总览和步行路线播放沿用原有楼板外观。显示分组不改变板块所有权或寻路关系。

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

### DIAMOR 大阪 · 北侧接驳

**D-23、D-24** 位于运营方图上的同一条北侧 B1 通道两边，公共面归现役 `hanshin-west-b1`。用各自的 OpenStreetMap 梯口、顶棚和街面步道定位，分别补齐到 B1 主通道的接驳及 1F 独立开口。D-23 表达带转向平台的两段楼梯，D-24 表达带中间平台的直行双跑楼梯。梯脚、转向和中间平台高差为展示拟合。 [DIAMOR 运营方平面图](https://www.oud.co.jp/pdf/hinankeikaku.pdf#page=40) · [D-23 顶棚](https://www.openstreetmap.org/way/618802492) · [D-24 顶棚](https://www.openstreetmap.org/way/618802490)

**D-22** 在阪神百货一侧，依据 OSM 梯线及其明确标为地下 1 层的步道接入北侧公共面。**D-27** 按第一生命大厦侧梯线、地下步道和顶棚拟合，顶棚只覆盖中段。两处采用带中间平台的楼梯。 [D-22 地上出口记录](https://ocu-omu.repo.nii.ac.jp/record/2011144/files/111G0000009-2013-018.pdf) · [D-22 地下步道](https://www.openstreetmap.org/way/1053003665) · [D-27 地下步道](https://www.openstreetmap.org/way/1322885769) · [D-27 顶棚](https://www.openstreetmap.org/way/618802485)

### DIAMOR 大阪 · 圆形广场至梅田 DT 塔

- **D-31、D-33** 分别接圆形广场西侧支路和南向主通道西缘。D-31 采用街面梯线及巴士运营方指引，D-33 采用梯亭轮廓及西侧出入步道，并补顶棚。 [运营方 B1 图](https://www.oud.co.jp/pdf/hinankeikaku.pdf#page=40) · [D-31 交通指引](https://www.hankyu-kankobus.co.jp/limousine/busstop/12322/) · [D-33 梯亭](https://www.openstreetmap.org/way/618802475)
- **D-39、D-41、D-44** 按街面梯线定位。D-39、D-41 接 DT 塔西侧的南北公共通道，两组楼梯的上行方向相反。D-44 接横向通道北侧，依 B1 图与街面梯线补短接驳。上述出口的梯宽、中间平台和 B1 接驳形状为展示拟合。 [运营方 B1 图](https://www.oud.co.jp/pdf/hinankeikaku.pdf#page=40) · [D-39 梯线](https://www.openstreetmap.org/way/618802442) · [D-41 梯线](https://www.openstreetmap.org/way/618802441) · [D-44 梯线](https://www.openstreetmap.org/way/619294225)
- **D-40** 按 OSM 共用节点定位 1F 梯口、转向点和通向 B1 步道的梯脚。模型补两段转向楼梯、街面开口和局部 B1 步道，梯宽、平台尺寸与标高为展示拟合。研究资料确认 DT 塔有地下开放空间。模型的地下边界止于可定位的步道段，与 DIAMOR 主通道的接口缺少位置依据。 [街面梯线](https://www.openstreetmap.org/way/623086751) · [B1 步道](https://www.openstreetmap.org/way/1313639762) · [京都美术工艺大学研究纪要 §2.1.5](https://www.kyobi.ac.jp/img/pdf/kyobikiyou2022.pdf)

### DIAMOR 大阪 · 北新地方向

**D-49／50** 分别接在北新地方向通道北端交会口的西、东两侧，街面梯口按 OSM 节点定位。D-49 按西侧梯亭轮廓拟合顶棚，地面开口接南侧人行道。D-50 按东西向梯线拟合带平台的两段梯，从北侧步道接入街面梯口。B1 仅补接入各自梯脚的短段。D-49 的折返、两处梯脚、平台尺寸和段间标高均为模型拟合。 [运营方 B1 图](https://www.oud.co.jp/pdf/hinankeikaku.pdf#page=40) · [D-49 梯亭](https://www.openstreetmap.org/way/623086721) · [D-50 梯线](https://www.openstreetmap.org/way/623086724) · [D-50 接驳步道](https://www.openstreetmap.org/way/623086725)

运营方图把 **D-51／52、D-55／56、D-57／58** 标在南北公共通道两侧。按 OSM 街面梯口、步道和梯段方向拟合三组 B1 梯脚与接驳。D-51／52、D-55／56 的街面上端向北，D-57／58 向南。D-55、D-56 用已有梯亭轮廓拟合顶棚。六处均表达独立首层开口和带中间平台的楼梯，梯段宽度、平台尺寸和地下落点为展示拟合。 [运营方 B1 图](https://www.oud.co.jp/pdf/hinankeikaku.pdf#page=40) · [D-55 梯亭](https://www.openstreetmap.org/way/623086716) · [D-56 梯亭](https://www.openstreetmap.org/way/623086712)

#### 校准覆盖率

以运营方别图 3 第 40 页明确标出的 **16 个 D 编号**为基准，并保留 **D-22、D-40** 两个补充项。每个编号计一次，具备街面梯口、跨层设备并接入 B1 公共主通道的模型计为完整校准。E 编号、EV、建筑接入口和同图其他编号采用各自的资料核对口径。 [统计底图](https://www.oud.co.jp/pdf/hinankeikaku.pdf#page=40)

| 范围 | 完整校准 | 已建局部楼梯和步道 | 完整覆盖率 |
| --- | --- | --- | --- |
| 运营方图 · 北侧及中段 | D-23、D-24、D-27、D-31、D-33、D-39、D-41、D-44 | — | 8／8（100%） |
| 运营方图 · 北新地方向 | D-49、D-50、D-51、D-52、D-55、D-56、D-57、D-58 | — | 8／8（100%） |
| 运营方图小计 | 16 处 | — | **16／16（100%）** |
| 补充编号 | D-22 | D-40 | 1／2（50%） |
| 合计 | 17 处 | 1 处 | **17／18（94.4%）** |

18 个编号均已有街面定位和楼梯模型。D-40 的公共主通道接驳未计入完整覆盖率。

### DIAMOR 大阪 · 东侧街面接入

截图所示的东侧区域独立核对 14 个编号。11 个楼梯出口和 1 部直梯由 1F 人行网接入 DIAMOR 地下公共网，E-32、E-33 表达街面入口及人行接驳。地下分支归属参照运营方图，街面锚点取自 OSM，梯宽、平台标高、局部地下落脚面为展示拟合。 [运营方 B1 图](https://www.oud.co.jp/pdf/hinankeikaku.pdf#page=40)

| 范围 | 已接通 1F 与地下公共层 | 街面入口及人行接驳 |
| --- | --- | --- |
| DT 塔东侧及北段 | E-8、E-13、E-14、E-17、E-20 | — |
| 站前第 3、4 大楼之间 | 10-18、10-21、10-22、EV-4 | — |
| 站前第 2、3 大楼之间 | E-26、E-34、E-35 | E-32、E-33 |

- **E-14** 按街面梯亭轮廓定位顶棚和梯向，1F 开口避让梯口旁的人行道节点。E-8、E-14 的地下落点在 `hanshin-west-b1` 范围，其余按 DIAMOR 公共通道接入。 [E-14 顶棚](https://www.openstreetmap.org/way/618802467) · [街面人行道](https://www.openstreetmap.org/way/959779307)
- **10-21／E-26** 的楼梯线共用地下上行段，随后分成两个街面出口。E-26 上行支路保留第二个转向平台。 **EV-4** 采用室外直梯的 1F 和地下停靠位置，地下门前平台接东西向公共通道，街面按带顶步道接入人行网。 [共享梯线](https://www.openstreetmap.org/way/619294213) · [E-26 支路](https://www.openstreetmap.org/way/619294216) · [EV-4 井道](https://www.openstreetmap.org/node/5853250928) · [EV-4 街面接驳](https://www.openstreetmap.org/way/619294219)
- 大阪市图将站前第 3、4 大楼之间的 B1、B2 分别标为独立连通层，当前模型只接入运营方图所示的 DIAMOR 公共层。EV-1 的 OSM 停靠层级与当前公共面之间缺少可对位的地下门前路径。 [大阪市地下连接图](https://www.city.osaka.lg.jp/toshiseibi/cmsfiles/contents/0000585/585427/6_siryou.pdf) · [EV-1 停靠层级](https://www.openstreetmap.org/node/5853250929)

### Garden Avenue 西段

大阪市图确认 Garden Avenue 公共通廊从西梅田北侧经 HERBIS 延伸至西梅田公园。首批补齐 **6-71 楼梯、6-71 直梯、6-77 楼梯**。OSM 共用节点定位街面梯口、井道和地下支路。6-71 两处设备共用一段 B1 公共支路，6-77 沿独立支路接入现有通廊。三处均有 1F 开口及两端步行接驳，梯宽、平台高差与直梯门向采用展示拟合。 [大阪市导向编号图](https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000545/545556/12-4bessi2-2.pdf) · [6-71 地下支路](https://www.openstreetmap.org/way/1322885759) · [6-77 地下支路](https://www.openstreetmap.org/way/1322885761)

- **6-58，KITTE 西侧**。街面入口编号见商户指引。楼梯沿 OSM 两端锚点布置，B1 保留两段支路的转折后接入 Garden Avenue，1F 接楼外人行道。梯宽和中间平台采用拟合。 [商户指引](https://www.global-style.jp/archives/562222) · [地下支路](https://www.openstreetmap.org/way/1473638614) · [楼梯](https://www.openstreetmap.org/way/1473638615)
- **6-1，西梅田公园侧西端**。大阪市图标出西端出入口和独立电梯，公开照片显示有盖楼梯及并排上行扶梯。模型用现役 B1 西端和 OSM 公园侧人行道拟合设备坐标、接段和顶棚，保留各设备的 1F 开口。楼梯与电梯双向接入，扶梯只登记上行。 [大阪市无障碍详图](https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda01-4-2%28202109%29.pdf) · [设备及街面照片](https://yuruku-walk.hatenablog.jp/entry/240810) · [公园侧人行道](https://www.openstreetmap.org/way/623352523)
- **6-20、6-36、6-46**。街面锚点沿 OSM 人行道共用节点定位。踏步方向采用 OSM 楼梯走线，依据大阪市 B1 导向图拟合下端回接和中间平台。 [6-20 梯段](https://www.openstreetmap.org/way/623352521) · [6-36 梯段](https://www.openstreetmap.org/way/639381333) · [6-46 梯段](https://www.openstreetmap.org/way/623352516)
- **6-13、6-19**。西端 B1 主脊按 OSM 地下轴线及 6-13 支路交点局部校准，现有轮廓和孔洞同步调整，变形向两端渐隐。6-13 保留 B1 折线支路、转角平台和公园地面接驳。6-19 依据酒店步行指引确认街面楼梯，短下接段按导向图支路拟合。 [6-13 地下支路](https://www.openstreetmap.org/way/1323837456) · [公园指引](https://hanshin-enkachi.com/parkguide/) · [6-19 酒店步行指引](https://stg.www.2nd-inn.com/access/)
- **6-40、6-48**。6-40 采用与 OSM 人行道共节点的一侧梯口，同号另一节点未计作独立出口。6-48 保留两段楼梯与转角平台，B1 短接段按北侧支路拟合。两处均有地面楼板开口。 [6-40 梯段](https://www.openstreetmap.org/way/623352512) · [6-48 下段](https://www.openstreetmap.org/way/623352514) · [6-48 上段](https://www.openstreetmap.org/way/1316049318)

#### 楼宇接口与 HERBIS ENT 下沉广场

| 编号 | 现役模型 |
| --- | --- |
| 6-10 | 每日新闻大楼 B1 门口接西端北侧支路。大厅导览图标出 6-10 和楼内上行设备，入口位置按支路拟合。 [大厅 B1 图](https://www.hearton.co.jp/wp-content/uploads/2017/01/hall_mai_2.pdf#page=2) |
| 6-25 | 街面楼梯与旁边直梯均到 HERBIS HALL B2，B2 门前回接 Garden Avenue。设备位置沿 OSM 梯线及电梯点，门向和短接段拟合。 [HERBIS HALL 官方指引](https://hankyuhanshin-hall.com/herbis-hall/access/) · [直梯节点](https://www.openstreetmap.org/node/5887069625) |
| 6-31 | Garden Avenue 接 HERBIS PLAZA B2 西侧入口。 [场馆接驳图](https://bhj.biock.jp/common/files/bio2025_access.pdf) |
| 6-47 | 同一编号对应两条去向，分别接 HERBIS PLAZA B2 东侧入口和 BREEZÉ BREEZÉ B1。 [HERBIS 会议设施指引](https://www.hhbm.hankyu-hanshin.co.jp/meeting/herbis/download/pdf/access_map.pdf) · [BREEZÉ 地下接入图](https://www.breeze-breeze.jp/info/map_underground) |
| 6-57 | Garden Avenue 接 HERBIS PLAZA ENT B2 西侧门户，邻近 Billboard Live。 [HERBIS 地下通道图](https://www.hhbm.hankyu-hanshin.co.jp/meeting/herbis/download/pdf/access_passage.pdf) · [楼层图](https://umeda-sc.jp/wp2/wp-content/themes/hhp_umeda/assets/pdf/malls/herbis/floor-guide_202312.pdf) |

HERBIS 楼层图将 B2 门口画在 Garden Avenue 通路上，模型在接口处沿用公共 B1 的物理标高，并保留楼方的 B2 名称。东端靠 Hilton Plaza West 的地下入口广场用真实地面裁口露出下层，开口取在已绘人行线南侧，人行线继续连通。广场尺寸和开口范围为示意拟合。6-57 对应 ENT 西侧另一处门口。 [HERBIS 楼层图第 1、2 页](https://umeda-sc.jp/wp2/wp-content/themes/hhp_umeda/assets/pdf/malls/herbis/floor-guide_202312.pdf) · [竹中工务店广场说明](https://www.takenaka.co.jp/design/takenaka_design_works/068/book/pageindices/index5.html)

### 堂岛地下中心（ドーチカ）

- **C-60 北、C-60 南** 在西梅田南侧接入。运营方平面图显示两处街梯在东侧共用一段 B1 上行梯，随后分向北、南。本轮按两个 OSM 梯口和梯亭轮廓固定街面位置，补齐共享平台、两处 1F 开口及顶棚。 [运营方平面图，PDF 第 47 页](https://dotica.osaka-chikagai.jp/front/common/img/dotica_evacuation_plan_2024.pdf#page=47) · [北梯亭](https://www.openstreetmap.org/way/619294244) · [南梯亭](https://www.openstreetmap.org/way/619294243)
- **C-69** 从 B1 主通道西侧接出，转向后向北上到街面。按 OSM 的梯口、梯亭和街面步道建模，B1 梯脚、梯宽与平台高度为展示拟合。C-60 与 C-69 共用地区地下层，落点分别由 `kitashinchi-public-b1` 和 `outer-underground` 承接。既有步行图保持原有边。 [运营方平面图](https://dotica.osaka-chikagai.jp/front/common/img/dotica_evacuation_plan_2024.pdf#page=47) · [街面梯亭](https://www.openstreetmap.org/way/619294237) · [人行道](https://www.openstreetmap.org/way/619294235)

- **C-83** 接近铁堂岛大厦南端一带。运营方图和到达照片共同支持街梯及旁侧扶梯。模型从 B1 向西并排上至共用转向平台，再由街梯向南接 1F 梯亭。按 OSM 梯口、顶棚和步道固定街面位置。同编号的近铁堂岛大厦内部接入口另列。 [运营方平面图](https://dotica.osaka-chikagai.jp/front/common/img/dotica_evacuation_plan_2024.pdf#page=47) · [到达照片 ⑪–⑭](https://www.dojima-hari.com/our-hospital/pdf/nishi_umeda.pdf) · [街面梯口](https://www.openstreetmap.org/node/5024365391) · [梯亭](https://www.openstreetmap.org/way/619294234)
- **C-93** 位于 B1 主通道南端西侧，转向后向南上到纪阳大厦旁的人行道。按 OSM 梯口、步道和梯亭核对上端，B1 梯脚、跑段宽度和段间标高为模型拟合。同编号的纪阳大厦内部接入口另列。 [运营方平面图](https://dotica.osaka-chikagai.jp/front/common/img/dotica_evacuation_plan_2024.pdf#page=47) · [三得利到达指引](https://www.sps.sgn.ne.jp/company/profile/) · [街面梯口](https://www.openstreetmap.org/node/5024365393) · [梯亭](https://www.openstreetmap.org/way/621688356)

运营方自管街面出入口 **5／5（100%）** 已完成街面定位、楼梯模型和 B1 接驳。C-60 北、南按两处独立街梯计数。楼体接入口、邻接设施出口及西梅田 8 号地下接驳另计。C-83、C-93 的 OSM 梯口和梯亭取自地区快照南界以外的公开 OSM 查询，梯口均采用第 4 版节点，梯亭均采用第 2 版轮廓。两处沿现役 `outer-underground` 公共面补局部接驳，未新增寻路边。 [运营方清单，第 5 条](https://dotica.osaka-chikagai.jp/front/common/img/dotica_evacuation_plan_2024.pdf)

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
| JP 下沉广场 | [日本邮便连桥说明](../../../references/commercial/jp-tower/deck-and-sunken-garden.pdf)第 2 页标出 B1–1F 阶梯及 B1–2F 电梯。`south-diamor/jp-access.ts` 维护广场、Garden Avenue 接驳及 1F 街面接入，直梯的 B1 和 2F 段共用一个 1F 停靠点。[JP 楼层连接](../buildings/jp-tower.md) |
| Grand Front 南侧广场 | [梅北广场 1F 图](../../../references/commercial/grand-front/umekita-plaza-1f.jpg)及 [B1 图](../../../references/commercial/grand-front/umekita-plaza-b1.jpg)用于核对两处扶梯和一组宽楼梯。由 `north-atrium/grand-front-plaza-access.ts` 维护。 |

设备米制位置、尺寸及展示高差为拟合。

## 建筑占位

`basement-buildings.ts` 登记宿主，`basement-occupancy.ts` 减去公共面及站内空间，并去除重复占位。占位仅表达地下街区边界，文字平贴楼板，窄碎片不放名称。关闭「显示建筑轮廓」时，地下建筑填充及其贴地名称一起隐藏。公共通道、站厅和站台继续按所选楼层显示。

E-ma、Hilton West 使用地区图第 1 页的绿色面，绘图对象分别为 405、436；MARU 使用对象 243 的闭合弧形外边界。`basement-source.json` 记录源文件哈希、页码、绘图序号及采样结果，`basement-outlines.json` 与公共面共用道路投影。第一酒店附近的对象 63 同时描绘道路、建筑细部和站前第 1 大楼，复合线不足以定义酒店边界。

E-ma、Hilton West 和 MARU 与公共面有几何接触。JP 下沉广场按运营资料接入 Garden Avenue。`basementGaps` 使用包含孔洞的内外边界计算最短距离，供查看图面间距；入口认定需要另有资料。

## 重建与复核

按[地下数据说明](../../../data/geography/underground/README.md)更新源轮廓或道路配准，再运行 `node scripts/geography/review-underground.ts`。输出写入 `build/geography/`。

- `underground-network.svg` 与 `underground-north.svg`、`underground-south.svg` 展示公共面、建筑占位、付费区、公共设备及接口。
- `underground-basement-review.svg` 展示占位几何和间距诊断。
- `underground-network-audit.json` 记录板块、改札绑定、投影控制、公共设备及建筑接触状态。`component=-1` 表示该点未落入当前公共面。

`tests/public-areas/underground-network.test.ts` 核对分区并集、孔洞、付费边界、改札连通分量、设备开口与稳定编号。资料及混合几何的权限见[来源核查](../../data/source-credits-audit.md)。
