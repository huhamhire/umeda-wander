# 建筑白模校对

本批保留独立建筑板块，体量只在总览及“显示建筑轮廓”开启时显示。没有增加商场内可通行楼层、跨站路线或照片贴图。阪急建筑、Grand Building、三番街及 RESPIRE 酒店塔楼采用浅灰粉／淡栗红点缀；其他白模保持中性色，公共步行颜色不变。

## 来源选择

| 来源 | 核对结果与用途 |
| --- | --- |
| [大阪市 PLATEAU 2025](https://www.geospatial.jp/ckan/dataset/plateau-27100-osaka-shi-2025) | 已下载梅田两张局部网格。选中建筑仍注明 surveyYear=2017。采用阪急百货、三番街附属站房的 LOD2 屋面；JR 站房只有 LOD0／1。不能因包名含 2025 就推定建筑是现况。 |
| [Microsoft Global ML Building Footprints](https://github.com/microsoft/GlobalMLBuildingFootprints) | 有日本覆盖，当前仓库声明 CDLA Permissive 2.0；主要是机器识别平面轮廓，不能替代裙楼／塔楼分部。这轮未导入。旧发布镜像的 ODbL 说明不能直接套用到当前版本。 |
| [Google Open Buildings](https://sites.research.google/open-buildings/) | 官方公布的覆盖范围不含日本，这轮不采用。 |
| [Google Maps 3D Tiles](https://developers.google.com/maps/documentation/tile/policies) | 在线地图服务资源；政策限制提取及手工／自动描摹衍生模型。未导入瓦片、纹理或其网格。 |

本次没有找到比已许可的 PLATEAU 更适合直接引入的目标建筑模型，采用原生几何和开放模型派生体量，便于维护。

## 各建筑的处理

- **阪急百货**：不再用全局矩形裁剪加凸包制造主塔。LOD2 屋面按高度分组合并，保留南侧主塔、折角、低层退台及屋顶高差；裁到独立宿主。LOD1 的 measuredHeight 和 LOD2 实际屋面不一致，因此不混用。最高处约 187 米，与[设计方 186.95 米说明](https://www.nikken.co.jp/ja/projects/commercial_retail/umeda_hankyu_building.html)相符。
- **阪神百货**：[设计方](https://www.nihonsekkei.co.jp/projects/18825/)明确说明曲面低层与直线上部，以及原两地块之间道路上空利用。地面 L 形退让保留，曲面转角局部柔化；上部裙楼跨道路后承接东侧单座办公塔楼。14 米底部净空、52 米裙楼、约 4,650 平方米塔楼轮廓均为示意拟合。不得为了收进地面 L 形轮廓而把塔楼压成细条。North 是另一侧阪急百货综合体，不是在阪神上方补第二座塔。
- **JP Tower／KITTE**：不使用重建前 PLATEAU 邮局几何。按[业主现况介绍](https://www.jp-re.japanpost.jp/properties/jptower-osaka.html)表达连续主塔、搭接的中层侧翼与小幅冠部；整体约 188 米。塔身从裙楼连续上升，不能将上部酒店画成脱离主体的积木。各部分位置、高差和立面节奏为参考拟合。
- **阪急三番街**：与站体共用宿主，而非车站外另放一栋商场。LOD2 表达南北低层体量、屋顶节奏及南端 Terminal 附属高部。[官方楼层关系](https://www.h-sanbangai.com/floor/)说明 3F 为车站，1F／2F 为附属商业和改札。运行时为既有地上公共站厅裁出外壳通口，不生成第二份 2F 占位楼板，不新增店铺内部布局。
- **其他组合体**：复核上部投影与承接体量的搭接。Grand Front、Yodobashi、大丸未改变平面位置；LUCUA 1100 办公体保留原独立 OSM 部件，不因边界有挑出而统一裁小。

## JR 大屋顶

原地理展示约 220×115 米；改按[大阪市建筑介绍](https://www.city.osaka.lg.jp/toshiseibi/page/0000647324.html)的约 180×100 米，中心对齐 PLATEAU 站房约 184×100 米的包络。站房 GML ID、原包络、中心和展示参数在 `data/geography/buildings/jr-roof.json`。

该站房无 LOD2 斜屋面，因此不能宣称坡度来自开放精细模型。北高南低保持，北缘约 49.3 米与官方“最高约 50 米”、北楼屋面附近相符；南缘 34 米、轻弧度和采光带仍为参考拟合。屋顶变换与标签共用坐标函数，旧版示意屋顶独立保留。

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

原包按 HTTP Range 只取压缩目录及指定 GML／README，缓存在忽略的 `build/`；不下载照片贴图。现役只导入小型 `plateau-profiles.json` 和 `jr-roof.json`。离线校对现在使用 H5 实际网格和 CPU 深度缓冲，替代旧的面片画家排序，避免错误的悬空观感；仍不替代浏览器光照与触控验收。

## 可选外围地标

蓝天大厦可作为未来远景白模候选，突出双塔和空中庭园；距离当前核心步行网较远，本批不加入默认地图或取景包络。接入西侧步行路线或实现可选地标层后再决定展示范围。

## 本批验证

244 项测试通过，覆盖分层屋面来源、体量承接、连续主塔、三番街通口和不重复楼板、屋顶尺度／中心／坡向、浅色主题。类型检查与构建分别执行，H5 产物约 2,942 KB。已检查实际 H5 网格的离线模型预览；未直接操作浏览器，手机布局、触控及真实 WebGL 光照仍需人工复核。

车站主题为低饱和度风味：JR 大阪站浅蓝，阪急灰粉／栗红，M16 淡珊瑚红，阪神浅蓝，T20 淡紫，Y11 淡蓝，北新地淡粉。Metro 色系参考其官方线路图，色值为本项目白模适配，不是运营者品牌色数值复刻；公共通路保持统一语义。
