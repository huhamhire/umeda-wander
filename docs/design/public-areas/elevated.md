# 公共二层连廊

## 板块与装配

| 独立板块 | 公共空间 |
| --- | --- |
| `public-areas/north-decks/` | Grand Front 南北馆直桥、Grand Front—北中庭、Yodobashi 西／东桥与外圈回廊、LUCUA／JR 公共廊至阪急接口 |
| `public-areas/south-decks/` | JP Tower—大丸前庭、梅田新步道桥北／南支臂及沿路主干、阪急百货西侧两个接入口、阪神百货和南出口直梯接入、东南延伸 |
| `public-areas/west-decks/` | LUCUA 1100 西侧公共廊至梅北上方公共步道；不绘对侧建筑，不接地下付费站台 |
| `west-decks/inogate.ts` | 独立 Inogate 2F 公共前沿及西端至 Grand Green 南馆连桥；两端只补平面占位 |

`src/infrastructure/public-areas/elevated-blocks.ts` 登记板块，`data/geography/elevated/` 保存 OSM 轴线配置及 Inogate 参考拟合。桥宽通常取 6–7 m；源轴线保留原经纬度、标签和版本。OSM `level=1` 不直接对应建筑 1F。

`public-deck-assembly.ts` 在分支处合并桥面，再减去同高车站楼板、付费区和前序公共板块。前往建筑的二层平面占位由 `building-occupancy.ts` 减去公共面、车站楼板和设备孔洞；名称平贴楼板，随建筑轮廓开关显隐。高架公共网没有跨站 `RouteEdge`。

## 标高与开口

- 北侧用 `district-north-deck`，y=8、stackIndex=2，与 JR 北门大楼 2F、阪急 2F 对齐。
- 南侧用 `district-south-deck`，y=4、stackIndex=1，与大丸较低的前庭 2F、阪神 Deck 对齐。探索层均为 2F，但不声称两侧物理等高；北侧没有直穿 JR 站台连接南侧的新公共桥。
- 北中庭 2F 广场延伸至北侧挑高门廊，与 Grand Front 主桥同高交接。天井和 2/3、47/48 的外缘连接继续由 JR 楼板和公共桥面共用同一开口。B 直梯的 2F、3F 停靠使用既有 JR 公共楼板。
- 大丸南侧保留弧形退避，西／东连接分别接到已有前庭的两侧，不以一条新楼板封住中央开敞区。50/T、61/U 和东侧双排扶梯继续由 JR 独立维护，未重复创建。
- 公共设备包括北侧参考 26/28 直梯、南侧参考 6/7/8/9 直梯和 JP Tower 2F 接入处楼梯／直梯。南侧 21 号是阪神南出口直梯，由站模持有同轴三段井道。桥层短支臂沿 OSM way 597941440 连接既有公共桥面，门前保留门宽短接板。上层楼板和地面遮盖共用真实井口。[阪神站南出口](../stations/hanshin-umeda.md#f23-地面南出口)

[JR 构内图](../../../references/stations/jr-osaka/station-guide.pdf) PDF 第 2、3、5、6 页将 B 直梯标在北中庭东侧，分列 3F、2F、1F、B1。[大阪市 2024 年 4 月无障碍图](../../../references/district/osaka-station-accessibility-2024-04.pdf) 第 1 页编号 26 列出地面、北门大楼 2F 和联络桥 3F。依据位置和停靠层，两套编号合并为共轴的四层直梯。2F、3F 门口分别落在 `north-2f-public`、`bridge-north`，LUCUA 外壳按地上井道范围留空。井道位置和门口宽度为展示拟合。设施目录每层只保留一个落点，1F 沿用 B 直梯原编号，2F 沿用 26 号的原编号。

JR 图第 6 页画出 LUCUA 侧通路至 B 直梯，其 B1 落台接入地区主网保留为[资料核对项](../../roadmap.md)。阪神南出口直梯的 B1 落台沿 OSM 足道接至 F23 下端，公开资料未确定向地区主网的具体门位和局部高差。

南侧参考图中 62 指向 B1。JP Tower 的地上连桥接入与[地下下沉广场](./underground.md)分别维护。

Grand Front 接驳使用原 OSM 轴线。到南馆的两条支臂分别对接入口节点 5275712276 和 5342198626，在南馆外壳留出门口。另一短支臂在节点 5574843124 接地面直梯；西侧支臂按 OSM way 501012842 接下行至梅北广场的外置楼梯。楼梯、电梯和入口均在同一 2F 公共分量内，宽度、门向和落台为展示拟合。[Grand Front 接入图示](https://jambase-space.com/access/)

`umeda-deck-north-stairs` 依据 JR 南侧／东侧 1F 图拟合外围步道桥北端阶梯至 `bridge-north` 的轴线；地面端使用既有 JR `south-public`，桥上端参与公共桥面合并和真实开口。JP 的 B1 下段由地下板块持有，和 `public-jp-deck-lift` 连续；74 号南侧东扶梯归 JR 本站入口组。

## 回廊、建筑门口与栏杆

Yodobashi 外圈由公共回廊板块独立绘制，关闭建筑轮廓后仍保留。内侧采用沿边界约 5 m 的退让面，避免围绕中心缩放时在凹角形成零宽断口；多边形布尔输入以毫米取整稳定计算，这不是毫米级数据精度声明。裙楼低层轮廓同步避让该回廊。

接口按参考图声明目标和落点。Yodobashi 两端接的是外环而非内层墙体；LUCUA 西桥先到 JR／LUCUA 侧公共廊，不把原始 OSM 端点误作零售墙面门洞。阪急站校准后的接口比原 OSM 廊端偏北，沿西侧公共前沿编写局部延伸，保持付费区避让；该延伸的位置与宽度仍是估计。

商业门口的低层外壳、层带和竖向装饰按指定接入范围留缺口，不能只让桥面撞到实体墙上。JP 入口楼梯及贴着阪急／阪神门口的公共直梯另有明确宿主绑定，从地面到桥面留出完整通道，不只在上层切一扇门。栏杆沿公共面暴露边界绘制：细浅横杆和约 0.9 m 间距的立柱；同高续接、T 形交汇、建筑门口及设备上端留口。地下板块不复用这套栏杆。

已画出目标的连桥不添加浮动名称；只保留梅北上方北侧与南侧东南端两处未画目标延伸的去向标签。标签引用已存在桥面，不再生成一份桥面模型。

## 来源与重建

- `references/district/elevated-walkways-2026.pdf` p1 右图：高架系统、商业接入及公共直梯关系。文件名年份不证明发布版本。
- `references/connections/osaka-station-city/2f-map.png`、`references/connections/osaka-station-city/3f-map.png`，以及 JR 构内图 p2–5：北中庭、南侧前庭、50/T 与不同去向的设备。
- `references/connections/grand-green-osaka/jr-umekita-decks.pdf` p1／4：梅北步道及 Inogate 新桥的不同目标。
- 仓库 OSM 经地面统一原点投影；只摘取已登记的高架步行线，不重新采集在线数据。

`node scripts/geography/build-elevated.ts` 重建 `data/geography/elevated/ways.json`。修改地区配置时运行它，再执行 `node scripts/geography/review-elevated.ts`，生成：

- `build/geography/elevated-network-overview.svg` 和 north／south／west 局部 SVG：道路、公共桥面、既有车站公共面、付费区及接口；蓝点为公共设备、红圈为指定接口。
- `elevated-network-audit.json`：板块、接口公共落脚与目标距离、设备和待定位项。距离只是核查，不创建门洞或路线。

`tests/public-areas/elevated-network.test.ts` 检查共用节点、同高楼板避让、标高、回廊、设备真孔洞、建筑裁口、栏杆和设施编号。实际门位、标高及浏览器验收见 [Roadmap](../../roadmap.md)。

OSM 原始轴线及估计宽度随 OSM 下载提供；公共平台、建筑裁口及设施等混合来源几何的权限见[来源核查](../../data/source-credits-audit.md)。

## Inogate 连桥与桥面外观

公共高架桥面统一使用暖赭色 `elevatedPublicColor`，与浅色商业占位分开；细浅栏杆、付费区主题及区域灰化规则保持。离线平面图沿用桥面的展示色。

Inogate 连桥采用 `data/geography/elevated/inogate.json` 与独立 `inogate-decks` 板块。JR 发布资料第 1 页位置图、第 4 页两端及楼层说明，与两份本地 2F 图、OSM Inogate／Grand Green 南馆 Gate Tower 外围轮廓联合拟合：从 JR 北侧 2F 公共面接 Inogate 前沿，再从西端朝西北接南馆。它与更北面的 LUCUA—Green Place 连桥保持独立，不误接 Grand Front 或梅北付费站台。

两端坐标、7 m 桥宽及北侧统一展示标高仍是参考拟合，不是实测门位；两处宿主只显示 2F 平面占位，无商场内部路线、上部建筑或新增跨站 RouteEdge。公共面避让占位、孔洞、同高楼板和付费区，回归检查覆盖 JR 至目标处的连续公共分量；入口栏杆按声明的门户留口。新桥的细部门口和实际标高继续纳入人工复核。

## 桥面顶棚

JP Tower—大丸的 Skywalk 与大丸东侧到路口的桥臂按用户俯视照片增加顶棚。配置在 `south-decks/canopies.ts`，只覆盖已指定轴线，不把整个外围步道或通往阪急的分支全部封顶。净高约 3.2 米、分格及边柱为示意；顶棚跟随桥面所在层，并由建筑轮廓开关控制。屋面与桥面、栏杆分别建模，不新增步行路线。

北中庭至 Grand Front 南馆的主桥和 Yodobashi 西、东两侧跨街桥使用半透明顶棚，配置在 `north-decks/canopies.ts`。桥轴沿用已核对的 OSM 步行线，覆盖范围参照俯视照片。北中庭 2F 广场的顶部由北门大楼挑高结构表达，桥棚净高与分格为展示拟合。

Yodobashi 的西、南、东侧外廊沿 OSM 标注为有盖的路段设置浅色雨棚，顶棚线位贴合现有环廊，LINKS 梅田北侧保留开放。东西跨街桥的顶棚延伸到外廊交界，桥口避让立柱。东侧钟楼广场落台与 A Deck 合用连续顶棚，往阪急方向另覆盖 OSM 标注为有盖的跨街段。覆盖端点、棚宽和柱列间距为展示拟合。[Yodobashi 外廊与连桥说明](https://www.yodobashi.com/ec/support/news/190603326750/index.html)
