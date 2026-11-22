# 项目协作说明

## 当前状态

- 仓库名称为 `umeda-h5`，已实现 JR 大阪站、阪急大阪梅田、御堂筋线梅田、阪神大阪梅田、谷町线东梅田、四桥线西梅田及 JR 北新地站的局部样板，采用 TypeScript、Three.js 和 esbuild，无 UI 框架。
- `references/` 按 `stations/`、`district/`、`connections/`、`commercial/` 分类原始资料，`catalog.json` 登记来源、核对事实、SHA-256 与授权边界；入口见 `references/README.md`。移动资料同步更新源码、脚本、测试和派生数据的路径，不能只改文件名。
- Node.js 版本要求为 24 或以上。使用 `npm install` 安装锁定依赖，`npm run dev` 启动本地服务，`npm run typecheck` 检查类型，`npm test` 运行测试，`npm run build` 构建网页。Windows PowerShell 如阻止 npm 脚本，使用 `npm.cmd`。
- 应用代码采用 TypeScript，源码放在 `src/`；构建产物输出到 `dist/`，最终入口为 `dist/index.html`。
- `src/` 服务网页运行，依赖已准备好的 `data/`；正式派生资源和重建配置纳入版本控制，原始资料优先使用 `references/` 已有条目，补充前核对版本和哈希。原始素材提取、校准报告和离线核查放在 `scripts/`，生成的预览和审计报告写入 `build/`。
- HTML 保持单入口，JS、CSS、模型与图片等资源可独立加载，无需全部内嵌；部署和复制时保留整个 `dist/`。
- 地理版本默认正北朝上、正南朝下的斜俯视。鼠标中键、Alt／Option 触控板和触屏双指旋转或俯仰共用画布中心射线与 1F 平面的交点。手势开始时固定轴心，保持取景尺度；地面隐藏、楼层展开或中心有楼板遮挡时仍使用 1F 平面。捏合缩放以触点中点为锚点。指南针同步投影，重置恢复朝北。地面层关闭时同时隐藏地上建筑占位和外壳，独立地下轮廓按层级保留。南北指示与场景轴向一致；未地理校准时明确标为方位示意。
- 默认视角以用户选定的官方示意图为参照，采用固定正交斜视，不再强制严格正等轴测。选层后保留全部下层并灰化，当前层高亮，上层隐藏；下层不拦截当前层设施点选。
- 上述习惯方向指地面轨道；梅北地下站台相对地面长轴斜交约 31°，来源记录见布局文档，不能简化成正交。大屋顶固定为北高南低。

## 工作约定

- 文档按 `docs/design/`（区域、车站、公共空间、建筑）、`docs/development/`（开发规范）和 `docs/data/`（来源审计）维护，入口为 `docs/README.md`。维护待办统一写 `docs/roadmap.md`；事实、人工拟合和待核实项分开。已失效方案与迁移流水查 Git，不保留 archive 副本；删除前先转移唯一的有效依据。文档移动同步更新所有链接及维护入口，原始 references 不随文档治理删除。规范见 `docs/development/documentation.md`。

- B1 街区占位可以独立于地上 OSM 实体。E-ma／Hilton West／MARU 使用 `data/geography/underground/basement-outlines.json` 的源图边界，由 `south-diamor/basement-outlines.ts` 适配；原始路径、SHA-256 和绘图对象在 `basement-source.json`。道路配准变化后须运行 `build-basement-outlines.ts`、`build-ground-context.ts` 和 `review-underground.ts`。边界接触和核查报告的最短间距均不证明门洞，不可据此补最近点通道。

- 阪急百货 1F 内庭／公共通廊在 `buildings/hankyu-dept/concourse.ts` 独立维护，复用拱门、暖色橱窗和地坪模型；接入 `district-ground`，向北经 JR 轨道下方连到阪急站 1F 闸外站厅。外壳按通廊高度裁开，南北挑高在两组 2F 标高保留开口。内庭跟随 1F 显隐，关闭地面底图时仍可查看。地面建筑轮廓不复制到 2F。阪神上部裙楼先合并为单一包络，再承接退台塔楼；`BuildingVolume.surface` 明确材质角色，不以悬空基底推断为塔楼。

- 建筑白模校对见 `docs/design/buildings/model-calibration.md`。`data/geography/buildings/plateau-profiles.json` 只含已核对的阪急 LOD2 分层屋面，包版本 2025、选中建筑 surveyYear=2017；阪神／JP 重建体量不能套用旧模型。阪神地面退让与跨道路上部裙楼分开，JP 保持连续塔身。三番街共用站体宿主，不另画 2F 占位；公共站厅外壳裁口由 `station-building-openings.ts` 维护。浅色建筑主题在 `models/building-palette.ts`，地下公共颜色不随线路更改。JR 地理屋顶按独立 `jr-roof.json` 的约 180×100 米及 LOD0／1 包络拟合，斜面仍是示意，旧屋顶参数不混用。

- 地面展示使用 `data/geography/display-context.json`，原始 OSM／地下公共面不裁掉。修改站体、公共网、高架或宿主清单后运行 `node scripts/geography/build-ground-context.ts`，再构建页面。`context-policy.json` 维护外围参照余量；同一源道路从首次进入到最后离开范围之间保留连续走线，同名／同 ref 分段只按原始共用顶点接续，只裁外围端头，不补无来源捷径。无关普通建筑占位剔除，核心站体、地下宿主与连廊目的地保留；维护记录见 `docs/design/public-areas/ground.md`。
- 公共二层桥面采用 `elevatedPublicColor` 暖赭色，与浅色商业占位区分；细浅栏杆和既有区域灰化规则保留。`west-decks/inogate.ts` 是独立第四个高架板块，资源为 `data/geography/elevated/inogate.json`；新桥连接 Inogate 西端与 Grand Green 南馆，端点、宽度和标高为参考拟合，不误接 Grand Front 或梅北付费站台。

- 地理 2F 公共网由 `public-areas/elevated-blocks.ts` 登记北、南、西及 Inogate 板块，数据在 `data/geography/elevated/`。北侧 y=8、南侧 y=4，同归 2F 探索；`public-deck-assembly.ts` 合并桥面并避让既有楼板、付费区和天井，`deck-boundaries.ts` 控制细浅密栏杆及接口留口。Yodobashi 外环只由公共板块绘制，建筑外壳保留内层轮廓，不能重复绘制；建筑低层及层带通过明确门户／设备绑定裁口。来源、接口和标高见 `docs/design/public-areas/elevated.md`。

- 地理地下公共网按 `public-areas/underground-blocks.ts` 登记九个独立所有者，管理窗口不改变原 PDF 开挖轮廓；各块共用 `district-underground` 标高与展开序号。建筑占位经 `basement-occupancy.ts` 减去公共面及站体，不能盖住通路；几何接触不等于已确认入口。公共设备用 `blockId` 声明归属，不误归车站付费区；维护入口见 `public-areas/README.md` 和 `docs/design/public-areas/underground.md`。

- H5 使用 `district/geographic-map.ts`，`createGeographicStation(id)` 提供与总图共用的独立站模。车站、建筑和公共区域使用统一米制坐标，设备造型可按可读性适度放大。各板块通过公开接口组装，共享逻辑按 DDD 语义归层。1F 地面路网独立显隐。空间核对与真机验收见 `docs/roadmap.md`。
- 默认使用中文沟通，代码标识符沿用项目已有风格。
- 修改前先阅读相关文件，保持变更聚焦，保留用户已有改动。
- 源码风格参考本地 nstarter service-express 模板，规范见 `docs/development/code-style.md`。TypeScript 使用 4 空格，CSS／HTML／JSON 使用 2 空格；UTF-8、LF、末尾换行。每行只放一条 statement，条件与循环必须带大括号，多语句回调分行，简单语句使用分号，避免多个副作用或长链式三元表达式挤在同一行。对象配置、参数和表达式按语义展开；构建压缩仅由 esbuild 执行。
- 注释统一使用英文。罗马字地名、站名及线路名随注释注明日文原名。命名函数、类方法、访问器、构造器及模块级函数变量提供说明用途和重要约束的 JSDoc。关键算法、坐标框架、人工估计和副作用补必要说明。编辑器约束在 `.editorconfig`／`.vscode/settings.json`，`npm run check:style` 通过 ESLint 和 Stylelint 检查 TypeScript、CSS。格式整理与行为变更分别校对。
- CSS 按 `src/styles/foundations/` 和 `components/<领域>/` 维护。各领域的 `index.css` 先引入通用样式，再为 760px 及以下的窄屏加载同级 `mobile.css`。`foundations/palette.css` 维护基础色板，`foundations/theme.css` 定义界面用途及衍生颜色供组件使用。每条属性独占一行，`scripts/styles.ts` 通过 esbuild 合并为 `dist/styles.css`。
- 显示文案通过 `infrastructure/i18n/` 的领域 key 维护，`zh-CN/`、`ja/`、`en/` 使用同一套界面、车站、建筑、公共区域、设施、线路领域键。版权正文按语言在 `src/content/source-credits.<locale>.html` 整体维护。key 不使用某种语言的整句，参数具名；领域实体 ID、来源 URL、OSM 匹配名称不随显示语言变化。HTML 模板 key 在构建时解析并转义，应用层公共标签在基础设施组装边界解析。门面装饰文字放建筑常量，不作为翻译词条；语言优先使用 Cookie 内的选择，否则按浏览器首选语言列表依次匹配，默认回退简体中文。语言与主题开关同放右上角。维护说明见 `docs/development/i18n.md`。
- 当前源码入口与目录职责见根 README 的项目结构。Roadmap 维护待办和待验收项。测试覆盖现役站模、设施目录、开口和公共接口，历史版本通过 Git 查阅。
- 设施目录测试直接核对现役设备落点、站台及稳定编号。`build/geography/` 只保留当前核查结果、必要中间输入及当前来源缓存，生成目录保留范围见 `scripts/geography/README.md`。
- 日常修改可用 `npm run check:style:changed` 检查改动文件。规则配置或依赖锁文件改动时自动转为全量，`npm run check:style` 可用于提交前与 CI。
- 根据明确需求选择技术方案，不提前引入无关依赖或大规模脚手架。
- TypeScript 配置启用严格类型检查；地图实体、楼层、设施和通行图使用明确类型。类型检查与构建分别验证。
- 修改 `src/` 中的源码，通过构建生成 `dist/`；不要直接维护或提交生成产物。
- 应用层在 stations、public-areas、connections、exploration、i18n 下按能力归组，map-session 保留状态入口；呈现层在 camera、labels、appearance、components、models 下归组，模型再分 buildings、stations、public-areas。MapScene 只协调生命周期、镜头和状态，模型构造用 MapModels，DOM 标签用 SceneLabels，指针识别用 MapGestures；离线核查直接使用模型入口，不通过反射调用场景私有方法。移动模块更新源码、脚本、测试和文档引用，不保留旧路径转发；细则见 `src/application/README.md`、`src/presentation/README.md`。
- 按 DDD 边界拆分：`src/domain/` 定义地图模型与导航规则；`src/application/` 协调使用场景；`src/infrastructure/` 提供数据来源；`src/presentation/` 实现渲染和界面；`src/utils/` 只放无领域语义的通用工具。领域层不能依赖 Three.js、DOM 或基础设施。
- 每站以领域 `StationMap` 独立交付布局、设施、本站路线及轨道；`district/geographic-stations.ts` 登记并创建地理站模，`compose-station-maps.ts` 纯组装，`district/geographic-map.ts` 为 H5 数据入口。JR 特殊层名适配在 `stations/jr-osaka/index.ts`，不要在总图重复罗列本站数组。旧版登记与总图已移除，对照使用 Git 历史；维护入口见 `docs/development/architecture.md`。
- 当前地理 H5 使用 `district/geographic-map.ts`。B1 公共面由 `shared-underground.ts` 单独持有，构内图局部前庭经 `public-areas/station-frontages/` 合并，不重复画本站 public 楼板。`StationPublicInterface` 与 `public-interface-bindings.ts` 校验实际门户标高和落脚面，不因绑定而新增跨站路线。设备坡度修正使用 `calibrate-equipment.ts`，固定站厅／夹层端，调整实际站台端，节点与已有设施锚点同步。
- 测试统一放在根目录 `tests/`，按 stations、public-areas、geography、buildings、navigation、presentation、tooling 领域维护。`npm test` 递归收集各领域测试，移动后同步更新引用及文档命令。避免为简单逻辑引入不必要的仓储、工厂或服务层。参数、对象及数组分隔符内侧不填充空行，语义段落之间最多一行空行；模板字符串中的空白按数据保留。
- 当前设施位置与路线为明确标注的示意数据，不能描述成已核验现场导航。参考图事实、人工推断和样板设计要分别记录。
- 车站入口统一位于 `src/infrastructure/stations/<station-id>/index.ts`，原根目录十个兼容转发已删除，调用方直接引用实际模块。JR 布局数据在 `src/infrastructure/stations/jr-osaka/layout.ts`，来源页码与简化边界见 `docs/design/stations/jr-osaka.md`。中央改札属于地上 1F，M2F 是夹层；梅北地下口为 B1F，地下 21–24 番线为 B2F，不要混为同层。
- 梅北的北侧 B1F 闸外地下公共通路与西口的 B2F 闸内连接通道分开建模；通过梅北改札前不得将公共通路标成付费通路。
- 扶梯与电梯使用 `src/presentation/models/stations/vertical-connection-model.ts`；直梯井道当前宽 3 场景单位，轿厢与门框按井道宽度同步调整，开口共用 `elevatorShaftWidth`；楼板开口由应用层规划、呈现层做真实多边形裁剪，新增设施时同步检查落点与孔洞。改札围栏和闸机共用付费区边界，不要只改颜色或用实体楼板覆盖孔洞。
- 与站台相连的设施保留 `platformId`，电梯门向、井道与孔洞共用该站台坐标框架。同一付费区边界可有多组闸机，围栏留口需合并计算。
- 单层探索时，已显示直梯保留完整井道、轿厢及两端落台；同一落点连续连接的多段井道由 `elevator-visibility.ts` 一起显示，不能按当前层切短。只恢复井道组，不恢复隐藏的上层楼板；取景须包含井道顶端。
- 连接通道直梯可用 `doorFacingRad` 指定通道门向，不强制归属站台。双排扶梯使用 `lanes`，模型和开口共用逐条展开的端点。选下层时仍显示完整扶梯和楼梯，并将上端落台计入取景；不要将隐藏踏步压成零尺寸网格。
- 北中庭 2/3 采用 `placement: exterior`，斜段位于上层楼板外侧，端点接楼板边缘，不生成内部井口。夹层 17–31 与南端大楼连接数据在 `stations/jr-osaka/upper-links.ts`；51 只连至 M2F，不能直接连至站台。南门大楼 3F 对应站台标高、4F 对应联络桥标高，区域保留建筑楼层名称。
- 同层局部高差使用 `elevationOffset`，例如中央口往大丸的小半层台阶；不要为了小高差新增完整逻辑楼层。自动售票机作为独立设施，与售票柜台区分。
- `district/geographic-map.ts` 组装各站数据；各站使用独立 `LevelId`、`station` 和 `stackIndex`，展开偏移不能依赖组合数组下标。JR 原有层名保留兼容；Metro 中间层不能归入 JR M2F。开口按所属站点过滤。
- 新站设施和区域的 `Evidence.source` 必须指向自己的资料；阪急 SVG 不伪装成 JR PDF 页码。各站以 `stations/<id>/geographic.ts` 的地理框架放在同一图中，`district-placement.ts` 只保留原图适配／旧展示拟合；站间连接为闸外空间示意，未核验前不添加导航边，各站相邻不代表闸内互通。
- 阪急仅使用浅灰粉、淡栗红作为主题提示，付费区、闸机与边界均保持浅色，不使用深色栗红；三条线路的绿/橙/蓝标识独立保留。调色定义在 `presentation/appearance/station-palette.ts`，属于呈现规则。
- 导览统一位于左侧：楼层、设施、步行路线为三个 Tab；桌面面板宽 320–344px，移动端自适应，默认取景按实际面板边界计算可用空间。已移除独立“车站”页和底部导航卡，设施页车站下拉框兼顾筛选与 `focusStation` 聚焦，“全部车站”回到地区总览；未选具体探索层时，M16、阪神、T20、Y11、北新地默认聚焦 B1，其余车站聚焦全部层级，手动楼层筛选优先；默认七站总览，模型是否隐藏只由楼层剖切决定。楼层选项为 3F / 2F / 1F / B1 / B2，JR 樱桥及中央口夹层并入 1F 探索，M16 中间层并入 B1；`application/exploration/exploration-level.ts` 定义分组，`presentation/components/floor-options.ts` 定义文案。组内跨站同时高亮且可点选，下层灰化、上层隐藏，物理标高、站点身份和 LevelId 仍独立。同物理标高须共用展开位置，导览分组不表示 M16 真实楼层编号已核验或付费区互通。
- 现役站间连接分别由 `public-areas/` 的地下／高架板块及公共设备维护；旧图连接仅在 Git 历史中保留。内部下行除了上层楼板，基座和铺装线也必须裁出开口。地理投影在领域层，取景范围与镜头缓动在呈现层；完整车站包络独立于楼层剖切与屋顶显隐，切层保留镜头定位、缩放和平移；拖动展开滑块时取消镜头缓动以保持跟手。
- `PassageGuide` 只保留普通通路去向标注及关系检查数据，不加入步行寻路图。默认不显示常驻路线箭头、路线虚线或专用图例；仅在步行路线预览时显示所选路径。地点显式绑定步行图节点，最多三个途经点；现役范围和维护规则见 `docs/design/walking-routes.md`。M16 中间层去向需落到已有直梯/扶梯及具体改札内侧；含扶梯的示意不能描述为完整无障碍路线。
- 地区扩展以反映步行连接为主，坡道和小半层可并入同一探索层；车站南北外侧的连接优先选较低相邻层。商业外廊按连续的 2F 步行层展示，不机械按各建筑实际标高拆层；JR 内部既有跨层设施仍保留。
- 现役商业轮廓由 `buildings/` 及 `data/geography/` 维护，公共通路由 `public-areas/` 维护；地上建筑体量使用 `GeographicBuilding`，公共桥面与地下空间使用公共楼板。只画轮廓和外部入口，门户必须落在轮廓边缘；不添加商场内部路线或寻路边。资料来源用 `district` 并附直接链接，不伪造 JR PDF 页码；OSM 原始投影轮廓与展示拟合分开记录。B1 通路不得穿过车站付费区。
- 地下公共通路不设护栏和立柱；站外高架连桥保留护栏。围墙和桥边护栏按同高公共通路全宽避让，包含 T 形交汇，不仅检查命名入口。
- 闸外公共通路与公共楼板共用米色语义，地上用 `publicAreaColor`，地下用更深的 `undergroundPublicColor` 以区分页面背景，不使用站台蓝色；运营者付费区主题独立保留。中央口南端 67/68/69 朝南下行到 Crost B1，大丸侧小半层从左右台阶接回中央通道，不能改成中间整幅宽梯，也不能与付费 M2F 混淆。
- 具体连接优先采用对应构内图；缺少明确依据的候选只记录在 `docs/design/buildings/README.md`，不渲染、不补最短捷径。北侧梅北公共通路按 JR 第 6 页绕 LUCUA 1100 北侧。
- `references/district/station-area-orientation.webp` 只作地区方位参照，不把旧名称、开发状态或图上比例当成现况测量。M16 既有展示拟合另沿北向主轴取 -34 单位，地下公共接口随站体推导；允许地下线与地上外部轨道平面交叉，不允许侵入 JR 站台主体。校对边界见 `docs/design/buildings/README.md`。
- 阪急 Grand Building 使用独立轮廓，不能合并进百货实体。已核对的 1F 南北/东西公共通廊是商业内部不展开规则的明确例外；`CommercialConcourse` 只表达公共空间，不展开店铺。南北挑高裁孔与东西通廊上方 2F 通道分别处理，造型由 `commercial-concourse-model.ts` 生成，商业裁孔同步避让外墙与压顶。
- 阪神布局见 `stations/hanshin-umeda/index.ts`，四个独立 LevelId 与 Evidence.source=hanshin；B1 西口/百货店口，B2 东口及四线终端、独立降车区。南出口 F23 楼梯、两条扶梯、地面顶棚和 21 号电梯的地理校准见 `stations/hanshin-umeda/south-exit.ts` 和同目录 `geographic.ts`；21 号为同一座 B2→B1→地面→Deck 电梯。现役闸外接驳归公共板块，阪神西口通往西梅田的 B1 路径由公共站间步行图维护。来源边界见 `docs/design/stations/hanshin-umeda.md`。
- 北中庭 2/3、47/48 共用 `AtriumVoid` 开放天井，由 `atrium-openings.ts` 裁剪上层；南侧斜角楼板、15 双排扶梯、16 错位宽梯和通往大丸 4F 的平层支路由 `south-bridge.ts` 校准，50 双排扶梯及其旁侧楼梯由 `south-entrance.ts` 接到大丸 2F 前侧。组合地图的 `south-deck` 归 2F 探索，按南侧较低相邻层展示，原 JR 数据保留建筑楼层名称。
- 地图标签被实际不透明楼板、商业体块或屋顶遮挡时隐藏；真实孔洞保留视线，玻璃与隐藏楼层不遮挡。便利店统一短标签 7-Eleven，设施页“便利店”可分别定位。设施页只保留分类、名称定位和图例，不显示参考图页码及设施说明详情；来源与注释继续保留在数据和文档中。
- 阪急原图拟合与历史偏移在 `district-placement.ts`，现役定位在 `stations/hankyu-umeda/geographic.ts`；站体、平台、落点、连廊和轨道共用比例，层高不缩放。向南调整时同时检查 JR 东侧本线曲率与道床净距，不能靠把整站向北推远解决比例问题。
- 站外短段轨道使用独立 `RailApproach` 图，不能加入步行 `RouteEdge`。站台轨道与延伸线共用 `platformRail` 计算端点；并线节点共用切向，公共尾段只画一次。地理轨道在 `geography/runtime-rails.ts`，JR 走廊约束在 `stations/jr-osaka/rail-corridors.ts`；旧 `rail-approaches.ts` 已退役，历史查 Git，渲染在 `rail-approach-model.ts`，取景包络包含尾段与标记。
- 地理投影锚点与示意展示偏移分开记录；阪急沿本站北向增加展示净距，M16 向地理东侧调整以避开示意 JR 站体，不得将展示偏移解释为测量位置。M16 的 3A、8、9 号闸外地面口由 `public-areas/metro-interchange/street-exits.ts` 按 OSM 工程编号定位，B1 落点接本站公共面；改动站体或公共面后同步验算落点。中间层不承担直接到 JR 的闸内换乘。调整位置或轨道尾段时运行跨站道床净距检查。梅北 21–24 番线两端短段继承 B2F 斜向，不推断地下配线。
- 阪急三线横向顺序按地图保持东侧京都线、西侧神户线；局部参考布局用 `acrossSign: -1` 映射，JR 接口仍留在西侧。三组站台出站后各汇成独立双线并行北行，不能直接画成梅田站口三向远距离分叉。
- 阪急三组轨道末端只标京都线、宝冢线、神户线，不重复标注共同的下一站。
- 将 `references/` 视为原始参考资料；除非任务明确要求，否则不要覆盖或删除。生成或转换的素材放到单独目录。
- 不提交密钥、令牌、真实环境配置、依赖目录及构建产物；需要配置示例时提供不含秘密的 `.env.example`。

## Git 与大文件

- 本项目使用 Git LFS，跟踪规则以根目录 `.gitattributes` 为准。协作者首次使用时需安装 Git LFS 并执行 `git lfs install`。
- PDF、设计源文件、常见位图及音视频通过 LFS 管理；SVG、源码和配置保留为普通文本，便于审查差异。
- 新增大体积二进制格式时，先更新 `.gitattributes`，再暂存对应文件。不要仅因文件较大就将文本源码放入 LFS。
- 提交前检查 `git status`、`git diff --check` 及暂存差异；涉及二进制资源时检查 `git lfs status`。
- 未经明确要求，不创建提交、不推送、不重写历史。

## 验证与交付

- 来源正文按语言维护在 `src/content/source-credits.<locale>.html`，构建时嵌入弹窗；只显示已核实许可、用途、出处及署名，未确认的授权或发布地址保留在内部审计，不显示待查文案。无公开 remote、源码许可证或反馈渠道时省略相应内容；构内图或步行图参与几何整理的条目不可只列作参考，更不能推定已获授权。OSM 衍生数据与编制说明作为独立资源交付，不在正文描述下载机制。版权弹窗使用原生 dialog，关闭按钮仅显示 × 并保留无障碍名称，焦点在打开／关闭时正确转移；详细核查见 `docs/data/source-credits-audit.md`。

- 地下公共空间采用面状布局，与二层天桥区分：现役合并在 `application/public-areas/shared-underground.ts`；旧地区示例已退役；`application/public-areas/underground-space.ts` 的纯几何能力保留独立夹具回归。`surfaceId` 骨架不重复生成楼板；`FloorArea.holes` 必须在渲染和公共接触判定中保留。各站可提供独立 `StationMap.site`，缺省由本站楼板派生外围区域。允许车站重点放大，不强求全图统一比例，优先保证方位、边界和接入口连通，见 `docs/design/public-areas/underground.md`。

- 按实际改动运行相关检查。尚无可用测试或构建命令时，明确说明已检查的内容和未验证的部分。
- 应用界面建立后，界面改动需检查移动端布局、资源加载及基本交互。
- 引入框架或新增开发流程时，及时更新本文件，避免保留过时说明。
- 移动端导航作为地图上的悬浮面板，默认折叠为“地图操作”入口。折叠保留楼层和设施状态，地图视口保持满幅；楼层按钮只显示层号，完整描述保留辅助标签。`ResizeObserver` 将实际面板高度写入 `--navigation-height`，缩放按钮与方位标记随折叠和设施页高度变化调整。
- 设施定位按 `facility-focus.ts` 的可见区域中心平滑移动：移动端扣除底部悬浮菜单，桌面扣除左侧面板，跟随面板尺寸和窗口变化更新。设施标高包含分层展开及局部偏移；手动拖动取消定位跟随，普通切层仍保留镜头，不因选中设施而反复抢回中心。尊重减少动态效果设置。
- 设施页首行查找，随后按车站、探索楼层和设施类型筛选。未指定车站时，候选仅在输入非空关键词后显示，楼层和分类仍约束搜索范围。搜索等待输入法完成组字，再对已提交文本统一防抖。设施页有筛选时以匹配设施标签替换普通地图标签，定位具体设施时仅显示其标签。筛选状态独立于地图定位；选择具体设施或地图点选不修改筛选条件。手动改变筛选时，若当前设施不在结果内则取消选中；筛选无结果时显示空态。 `facility-codes.ts` 保留独立内部编号，新设施追加且不重排旧编号，编号不出现在下拉列表显示文本中。设施选择器使用辅助标签。
- 设施候选由 `facility-directory.ts` 补齐全部已建模跨层设施的各层落点和站台，保留来源、局部标高及内部编号；补齐候选不重复绘制设备模型或常驻标签。“售票”筛选合并售票处与售票机，底层类型继续分开。`selection-marker.ts` 用暖橙色立体图钉和地面圈标记所选设施，跟随层级标高，支持入场与浮动动画；减少动态效果时静止，标记隐藏后不持续请求动画帧。
- 桌面设施类型用三列图标网格，名称可换行。移动端用单行横向滑动按钮，保留至少 44px 点击高度、选中状态及筛选后的横向滚动位置。
- 地面层与建筑轮廓开关使用相同字号，在分层展开滑块下方同一行排列，并留出上下间距；展开距离上限为原先的 1.5 倍，不显示百分比数值。自动缩小下限按完整地图包络占可见纵向空间 80% 计算，移动端扣除底部菜单。手动缩小可继续适配较宽的投影，补足横向取景时最多将上述纵向跨度加倍，仍可平移。
- 商业楼板与车站楼板共用应用层规划的 `FloorOpening`；`buildCommercialFloor` 必须接收开口，不能让商业体底板重新封住扶梯井口。大丸南侧 61 双排扶梯接 1F 与 2F，62 双排扶梯直通 B1 与 2F，独立楼梯 74 接 B1 与 1F。保留 1F 局部标高、62 的穿层开口及完整下层模型。
- LUCUA 1100 西侧往梅北 Green Place 的 2F 连廊有独立来源；独立半透明桥棚伸入连续建筑屋面下，穿楼段、地面公共落台和梅北地下付费站台分别维护。LUCUA 上部裙楼与办公塔楼只在总览显示，选层隐藏，取景包络仍包含其高度。

## Grand Front 补充

- Grand Front 南北馆及 Tower A/B/C 使用独立 OSM 轮廓，和 Yodobashi 西侧道路相邻；JR 北侧中庭连廊在共用分支处分向南馆与 Yodobashi，南北馆之间保留已确认的 2F 公共贯通关系。
- `GeographicBuilding.volumes` 分别描述裙楼和塔楼楼块；塔楼落在裙楼屋面，二层公共连接在相应高度留口。由 `geographic-building-model.ts` 负责造型，总览显示、选层隐藏上部体量，完整取景包络保持稳定。
- 阪急百货与大丸的外观同样只在总览显示，现役建筑模型绘制层带、窗格及大丸南侧“大阪駅”立面标识；大丸上方长条酒店体量的两处屋顶内庭保留真实孔洞。上部轮廓与压缩高度参考用户照片示意，不新增可通行楼层。
- 阪神百货和 Twin Towers South 是同一综合体；现役 `buildings/hanshin-dept/` 独立维护 L 形裙楼及临街长条办公塔楼，原始 OSM 轮廓保留在地理快照。现役公共板块维护 B1/1F 公共接入，旧商业及连接模块已退役，二层连桥须落到百货墙面；外观由地理建筑模型绘制，服从“显示建筑轮廓”开关与选层隐藏规则。来源与示意尺寸见 `docs/design/buildings/hanshin-dept.md`。
- JP Tower／KITTE 是旧大阪中央邮便局地块的现有综合体，建筑位于 `buildings/jp-tower/`，现役接入归公共板块，旧 JP 总图与连接已退役；下沉广场连接 B1/1F/2F，地下经 Garden Avenue 接西梅田闸外。JR 南侧二层弧形退避在 `stations/jr-osaka/south-forecourt.ts`，真实裁空须同时作用于商业楼板。新增目录 `references/connections/` 用于详细连接核对，Inogate 西端新连桥不能误接成 LUCUA 连桥或地下站台；范围见 `docs/design/buildings/jp-tower.md`。
- 画布铺满 `.atlas`，顶部 header 和底部 footer 为透明悬浮元素，空白区域允许拖动地图；移动端隐藏内层 `.map-heading`，保留顶部大阪梅田品牌与底部版权。
- 梅北北端延伸向 Grand Front 西侧道路地下收转，不能穿入南北馆轮廓。修改站台长度时同步检查延伸线和商业体相对位置。
- 南侧阪神／西梅田／东梅田／北新地的相对布局使用 `projectSouthReference` 共用步行图校准，以阪神为展示锚点；保留各站原始地理锚点，不恢复彼此独立的南移补丁。南侧建筑占位只画 B1 区域轮廓，`FloorArea.labelStyle: floor` 将文字平贴楼板，不生成悬浮标签。
- 西梅田北端是尽头，仅南端延伸；北新地东西两端延伸，JR 东西线在四桥线下方通过。北新地站台物理 y=-24、stackIndex=-2，仍归 B2 探索；8 单位高差是展示值，不是实测净空。B1 跨站寻路仅加入已核对并显式登记的公共通道。
- JR 北侧中庭 B1 公区与 LUCUA、梅北北侧公共通路及 M16 北改札外分别衔接，不把它延伸成到南侧 Crost 的未核验捷径。站台比例及待确认数据见 `docs/design/stations/README.md`。

- Yodobashi 与阪急 RESPIRE 酒店作为同一商业综合体建模；酒店塔楼使用独立 OSM 部件，不能与新阪急酒店混淆。二层 `perimeterGallery` 外圈是公共回廊，内层轮廓才是裙楼墙体，原有连桥接外环，墙体与竖向立面不得封住回廊。

- 东侧二层站外连接共用 `districtAnchors.jrNorthEastDeck`，JR/LUCUA 平台分别直接接 Yodobashi 回廊与阪急公共接口，不恢复中途折点。Yodobashi 的 `podiumParts` 分前侧弧形旧馆与后侧 LINKS 酒店基座，屋面高差与外圈回廊独立。
- JR 东侧轨道按用户要求贴近阪急，当前道床外缘平面间隔至少 4 单位；收束区须足够长，检查接头切向、单调向东和局部转角，不能为满足旧的宽隔离阈值再加入明显 S 弯。

- 阪急百货以西北端/西侧立面为拟合基准向东南扩展，整体横向宽度接近阪急站；两条二层连廊分别落在西侧直墙，不能改回按最近点吸附到南侧弯角。直线连接臂、围墙留口和原始轮廓来源同时检查。

- 谷町线东梅田数据在 `stations/higashi-umeda/index.ts`，独立站点 `higashi-umeda`、楼层 `t20-platform/hall/ground`、来源 `tanimachi` 和编号 T20。两座侧式站台的轨道朝内，1 番线电梯接南改札、2 番线接中西改札；公共站厅不得画成两侧站台闸内直通。现役 Whity 接驳归公共板块，不添加跨站导航边；临时施工关闭按用户约定忽略。

- 西梅田使用 `stations/nishi-umeda/index.ts`、Y11 编号和来源 yotsubashi；北新地使用 `stations/kitashinchi/index.ts`、KS 编号和独立来源 kitashinchi。Y11 北端车挡用 `terminalEnd: end`，北改札只出、中改札只进；北新地是通行岛式站台。现役公共地下网按地区通道 PDF 连接 DIAMOR／阪神／西梅田／北新地。阪神、西梅田、北新地的闸外步行路线由 `south-diamor/walking-routes.ts` 显式登记。

- “显示建筑轮廓”沿用内部 `roof` 状态，统一控制 JR 大屋顶与商业外观/上部体量；仅在总览显示。地下通路和入口不显示浮动标签，二层联络桥只有未画目标的延伸段显式启用 `PublicPassage.label`。
- 阪神 B1 付费区在西半侧，`west-concourse.ts` 校准两端检票口及付费轮廓，北侧、南侧及百货店口外朝南的通道归共享公共面；站台内部楼梯／扶梯向西上行。B2 东口主出口朝东，宽两段式阶梯和两侧扶梯共用 B1 开口，宽度随 `laneSpacing` 计算；`stairLandingLength` 和 `gateCount` 继续统一落台造型与闸机／围栏留口。
