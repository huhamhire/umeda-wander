# 建筑白模校对

建筑体量按板块维护，只在总览及“显示建筑轮廓”开启时显示。阪急建筑、Grand Building、三番街及 RESPIRE 酒店塔楼采用浅灰粉／淡栗红点缀；其他白模保持中性色，公共步行颜色不变。

## 来源选择

| 来源 | 核对结果与用途 |
| --- | --- |
| [大阪市 PLATEAU 2025](https://www.geospatial.jp/ckan/dataset/plateau-27100-osaka-shi-2025) | 已下载梅田两张局部网格。选中建筑仍注明 surveyYear=2017。使用阪急百货、三番街附属站房和大阪站北门大楼的 LOD2 屋面。JR 站房只有 LOD0／1。 |
| [Microsoft Global ML Building Footprints](https://github.com/microsoft/GlobalMLBuildingFootprints) | 有日本覆盖，当前仓库声明 CDLA Permissive 2.0；主要是机器识别平面轮廓，不能替代裙楼／塔楼分部。当前白模未使用。旧发布镜像的 ODbL 说明不能直接套用到当前版本。 |
| [Google Open Buildings](https://sites.research.google/open-buildings/) | 官方公布的覆盖范围不含日本，当前白模未使用。 |
| [Google Maps 3D Tiles](https://developers.google.com/maps/documentation/tile/policies) | 在线地图服务资源；政策限制提取及手工／自动描摹衍生模型。未导入瓦片、纹理或其网格。 |

## 各建筑的处理

- **阪急百货**：不再用全局矩形裁剪加凸包制造主塔。LOD2 屋面按高度分组合并，保留南侧主塔、折角、低层退台及屋顶高差；裁到独立宿主。LOD1 的 measuredHeight 和 LOD2 实际屋面不一致，因此不混用。最高处约 187 米，与[设计方 186.95 米说明](https://www.nikken.co.jp/ja/projects/commercial_retail/umeda_hankyu_building.html)相符。
- **阪神百货**：[设计方](https://www.nihonsekkei.co.jp/projects/18825/)明确说明曲面低层与直线上部，以及原两地块之间道路上空利用。结合[竹中设计人员的防灾说明第 1–2 页配置及剖面](https://www.gbrc.or.jp/assets/documents/gbrc/GBRC188_06.2.pdf)核对组装关系。地面 L 形退让保留，曲面转角局部柔化；14 米以上裙楼与跨道路部分先合并为一个包络，不再把同一塔楼矩形从 14 米延伸到 52 米并与主裙楼重叠。办公塔楼从 52 米退台上连续上升，四角落在上部裙楼内；架空裙楼仍使用裙楼材质，不能因基底大于零而被当成塔身。14 米净空、52 米裙楼、约 96×42 米独立直角塔楼轮廓均为示意拟合，尚非实测定位。North 是另一侧阪急百货综合体，不是在阪神上方补第二座塔。
- **JP Tower／KITTE**：不使用重建前 PLATEAU 邮局几何。按[业主现况介绍](https://www.jp-re.japanpost.jp/properties/jptower-osaka.html)表达连续主塔、搭接的中层侧翼与小幅冠部；整体约 188 米。塔身从裙楼连续上升，不能将上部酒店画成脱离主体的积木。各部分位置、高差和立面节奏为参考拟合。
- **阪急三番街**：与站体共用宿主，而非车站外另放一栋商场。LOD2 表达南北低层体量、屋顶节奏及南端 Terminal 附属高部。[官方楼层关系](https://www.h-sanbangai.com/floor/)说明 3F 为车站，1F／2F 为附属商业和改札。运行时为既有地上公共站厅裁出外壳通口，不生成第二份 2F 占位楼板，不新增店铺内部布局。
- **梅北 Green Place（うめきたグリーンプレイス）**。设施为地上三层，1F 接梅北地下口的地面出口，2F 接 LUCUA 1100 西侧连桥。OSM 北翼、南翼和架空中段之间留出穿楼净空，以 OSM 主体轮廓合上连续屋面。屋面顶约 14.5 米、中段基底 8 米为展示拟合。北翼按已有梯组及落台裁口，电梯位于架空中段下方，邻接的站前交通广场保持露天。[设施楼层指南](https://umekita-greenplace.com/#floor) · [JR 西日本开业资料第 4–5 页](https://www.westjr.co.jp/press/article/items/250219_00_press_umekitagreenplace.pdf#page=4) · [OSM 主体](https://www.openstreetmap.org/way/1371178368)
- **Grand Green 南公园和南馆**。同一 PLATEAU 网格包含 2025-03-21 创建的对象，`surveyYear=0001` 无法用来确定实测年份。大屋顶和两组西侧低层建筑保留 LOD2 屋面、墙面和原有开敞关系。南馆 Park Tower 保留塔身、机房冠部及较低翼楼，Gate Tower 和 South Tower 从同一 GML 对象按屋面位置拆出。三塔最高选用屋面约 182.3、89.6、122.9 米。裙楼采用 OSM 外轮廓，裙楼标高和塔身外立面为示意。Inogate 2F 桥口、南馆下沉庭院沿现役模型留空。[官方项目资料](https://umekita.com/project/) · [运营方大屋顶介绍](https://umekita.com/midori/map/)
- **梅田蓝天大厦（梅田スカイビル）**。使用 `52350349_bldg_6697_op.gml` 的 `bldg_9dcffdb5-9431-4650-951e-7f7c715e28a9`，LOD2.2／surveyYear=2017。保留双塔立面、屋顶圆孔、挑空下表面、22F 空中桥和两条约 35F 至 39F 的扶梯筒体；原网格最高约 172.9 米，与官方 173 米吻合。玻璃和金属颜色为展示材质，广场与入口为拟合。建筑跟随总览和建筑开关，地面广场可在 1F 查看。[运营方建筑资料](https://www.skybldg.co.jp/study/) · [空中庭园楼层](https://www.skybldg.co.jp/en/)
- **大阪站北门大楼（ノースゲートビルディング）**：使用本地网格 `52350349_bldg_6697_op.gml` 中 `bldg_a7a0f325-c271-44db-bced-7d3066780c65` 的 LOD2 屋面核对退台位置。两翼分别保留 LUCUA 与 LUCUA 1100 标识，简化体量沿站房轴线拟合。中庭在 Grand Front 一侧和轨道一侧均挑空，由东西裙楼承托上部跨接体量。北侧横梁顶约 50 米，南侧上部体量逐级升至约 77 米。西端办公塔约 150 米，屋顶机房略高。裙楼最高约 78 米和办公主塔约 150 米参考 [JR 西日本项目资料](https://www.westjr.co.jp/company/ir/library/fact/pdf/2011/fact09.pdf)，挑空关系参考 [大阪站城北中庭介绍](https://osakastationcity.com/green/atrium/)及现场观察。中庭内净高、外立面和低层基底均为简化拟合，外壳保持 11 番线的展示净空。
- **其他组合体**：复核上部投影与承接体量的搭接。Grand Front、Yodobashi、大丸未改变平面位置。

## 阪急 1F 公共通廊

`src/infrastructure/buildings/hankyu-dept/concourse.ts` 持有现役地理坐标、来源和裁空；`commercial-concourse-model.ts` 生成奶油色拱门、暖色玻璃橱窗、竖框、檐口与地坪网格。

两条公共轴线按百货与独立 Grand Building 的接缝重新拟合，归入 1F `district-ground`。南北挑高通廊约 12 米宽／12 米高，东西通廊约 10 米宽／3.3 米高，仅为白模展示参数。依据仍为[官方通廊说明](https://www.hankyu.co.jp/company/news/pdf/ER201209194N1.pdf)及既有用户照片，具体边界和外观授权待核实。

外壳、立面层带及竖向饰条共用通廊裁口。交会处保持通行，南北挑高在南／北两组 2F 标高均保留开口，东西通廊采用较低净高。内庭与公共通廊跟随 1F 显隐，关闭地面底图时可继续查看。

从东西通廊可经 1F 公共步道向北，穿过 JR 大阪站东侧本线和环状线高架下方，进入阪急大阪梅田站 1F 闸外站厅。走向采用相接的 OSM 地面步道轴线，6 米宽度、首尾接合和外壳净空按模型拟合。 [大阪市步行指引](https://www.city.osaka.lg.jp/shimin/page/0000600942.html) · [OSM 百货侧轴线](https://www.openstreetmap.org/way/557024413) · [OSM 下穿段](https://www.openstreetmap.org/way/747189967) · [OSM 站厅端](https://www.openstreetmap.org/way/747189969)

南北通廊的南端设六台并列扶梯与东侧宽楼梯，连接 1F 和 B1。两组梯段按 OSM 轴线定位，B1 落台经源步道先向南、再向西接入公共网。1F 公共楼板、铺装线和百货低层体量共用梯口净空。梯宽、坡度与落台范围按模型展示拟合。 [大阪市步行指引](https://www.city.osaka.lg.jp/shimin/page/0000600942.html) · [阪急电铁通廊资料](https://www.hankyu.co.jp/company/news/pdf/ER201204123N2.pdf) · [OSM 扶梯](https://www.openstreetmap.org/way/637935250) · [OSM 楼梯](https://www.openstreetmap.org/way/1320007682) · [OSM 地下接段](https://www.openstreetmap.org/way/1320007679)

设施目录标注南端梯组和百货西南侧 9 号连廊电梯。大阪市图在 2F 和 B1 均标出 9 号公共电梯。现有模型的拟合井道在 B1 投影与 M16 南闸内重合，导航只采用有公共落点的设备连接。阪急东、西及南北通廊的跨层关系以各个具名公共设备和实际落台为准。 [大阪市步道桥详图](../../../references/district/elevated-walkways-2026.pdf) · [阪急东西通廊发布说明](https://www.hankyu.co.jp/company/news/pdf/ER201209194N1.pdf)

北支步道桥进入百货后，2F 东西通路延伸到太阳广场侧，楼梯和扶梯分别落到 1F。太阳广场前沿通过 1F 公共面接原本通往阪急站和内庭的通道。外壳按各层分别裁空，2F 楼板为梯口留孔。轴线和设备落点取 OSM，宽度、标高与广场铺装范围为展示拟合。 [阪急 1F／2F 平面示意](https://www.hankyu.co.jp/company/news/pdf/ER201209194N1.pdf#page=1) · [OSM 二层通路](https://www.openstreetmap.org/way/496684916) · [楼梯](https://www.openstreetmap.org/way/685434321) · [扶梯](https://www.openstreetmap.org/way/620835769)

离线组装复核命令：`node scripts/geography/render-building-details.ts --assembly`，生成阪神四方向及阪急 1F 两方向的实际网格深度预览到忽略的 `build/geography/building-assembly.png`。测试检查实际外壳与内庭组合后的步行轴线、2F 挑高裁空、阪神道路净空及塔楼承接。未直接操作浏览器。

## JR 大屋顶

模型采用[大阪市建筑介绍](https://www.city.osaka.lg.jp/toshiseibi/page/0000647324.html)的约 180×100 米，中心对齐 PLATEAU 站房约 184×100 米的包络。站房 GML ID、原包络、中心和展示参数在 `data/geography/buildings/jr-roof.json`。

该站房无 LOD2 斜屋面，因此不能宣称坡度来自开放精细模型。北高南低保持，北缘约 49.3 米与官方“最高约 50 米”、北楼屋面附近相符；南缘 34 米、轻弧度和采光带仍为参考拟合。屋顶变换与标签共用坐标函数，旧坐标屋顶已退役，历史比例通过 Git 记录追溯。

## 地下数据边界

[PLATEAU 标准](https://www.mlit.go.jp/plateaudocument/toc4/toc4_01/toc4_01_01/)支持地下街、地下埋设物和室内 LOD4，但实际下载的大阪市 2025 CityGML 包只有 bldg／tran／dem／urf／frn／veg／brid／cons 及灾害、土地利用等目录，未发现独立地下街、地下管线或隧道模型，也无可直接替代梅田 B1 步行网的几何。bldg 的地下层数属性不等于地下可通行模型。现有地下网络继续以已整理 PDF 和构内图为依据。

## 许可及重建

包内 README 明确允许从 CC BY 4.0 等许可中择一，本项目对提取部分选用 **CC BY 4.0**。在来源弹窗中注明大阪市、版本及加工事实；此许可不覆盖另行参考的照片、构内图或拟合几何。

```powershell
python scripts/geography/fetch-plateau-buildings.py --year 2025
python scripts/geography/extract-plateau-buildings.py
node scripts/geography/build-building-profiles.ts
node scripts/geography/build-ground-context.ts
node scripts/geography/render-building-details.ts
```

原包按 HTTP Range 只取压缩目录及指定 GML／README，已核对的网格和原包说明归档在 `references/district/plateau-2025/`。现役只导入小型 `plateau-profiles.json` 和 `jr-roof.json`。离线校对现在使用 H5 实际网格和 CPU 深度缓冲，替代旧的面片画家排序，避免错误的悬空观感；仍不替代浏览器光照与触控验收。

## 核查

白模按[离线核查命令](../../../scripts/geography/README.md#离线核查)检查。

车站主题为低饱和度风味：JR 大阪站浅蓝，阪急灰粉／栗红，M16 淡珊瑚红，阪神浅蓝，T20 淡紫，Y11 淡蓝，北新地淡粉。Metro 色系参考其官方线路图，色值为本项目白模适配，不是运营者品牌色数值复刻；公共通路保持统一语义。
