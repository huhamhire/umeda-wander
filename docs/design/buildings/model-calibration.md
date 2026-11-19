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
- **大阪站北门大楼（ノースゲートビルディング）**：使用本地网格 `52350349_bldg_6697_op.gml` 中 `bldg_a7a0f325-c271-44db-bced-7d3066780c65` 的 LOD2 屋面核对退台位置。两翼分别保留 LUCUA 与 LUCUA 1100 标识，简化体量沿站房轴线拟合。面向 Grand Front 的挑空两侧由裙楼承托，开口上方保留约 50 米的横梁带，靠轨道一侧逐级升至约 77 米。西端办公塔约 150 米，屋顶机房略高。裙楼最高约 78 米和办公主塔约 150 米参考 [JR 西日本项目资料](https://www.westjr.co.jp/company/ir/library/fact/pdf/2011/fact09.pdf)，北侧入口与通高空间参考 [大阪站城北中庭介绍](https://osakastationcity.com/green/atrium/)。中庭内净高、外立面和低层基底均为简化拟合。新外壳保持 11 番线的展示净空。
- **其他组合体**：复核上部投影与承接体量的搭接。Grand Front、Yodobashi、大丸未改变平面位置。

## 阪急 1F 公共通廊

`src/infrastructure/buildings/hankyu-dept/concourse.ts` 持有现役地理坐标、来源和裁空；`commercial-concourse-model.ts` 生成奶油色拱门、暖色玻璃橱窗、竖框、檐口与地坪网格。

两条公共轴线按百货与独立 Grand Building 的接缝重新拟合，归入 1F `district-ground`。南北挑高通廊约 12 米宽／12 米高，东西通廊约 10 米宽／3.3 米高，仅为白模展示参数。依据仍为[官方通廊说明](https://www.hankyu.co.jp/company/news/pdf/ER201209194N1.pdf)及既有用户照片，具体边界和外观授权待核实。

外壳、立面层带及竖向饰条共用通廊裁口；交会处不画横挡的拱墙。南北挑高对南／北两组 2F 占位均裁空，东西通廊保留其上方楼板。1F 选层时保留内庭细节、隐藏上部建筑；关闭地面显示时内庭和地上占位一起隐藏。没有新增商场店铺内部布局或跨站寻路边。

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

白模按[离线核查命令](../../../scripts/geography/README.md#离线核查)检查。蓝天大厦的展示范围见 [Roadmap](../../roadmap.md)。

车站主题为低饱和度风味：JR 大阪站浅蓝，阪急灰粉／栗红，M16 淡珊瑚红，阪神浅蓝，T20 淡紫，Y11 淡蓝，北新地淡粉。Metro 色系参考其官方线路图，色值为本项目白模适配，不是运营者品牌色数值复刻；公共通路保持统一语义。
