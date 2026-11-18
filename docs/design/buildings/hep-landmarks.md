# HEP 与阪急站周边地标

HEP FIVE 与 HEP NAVIO 分别使用已有 OSM 快照的 `way/161451126`、`way/174789734`，两栋建筑独立维护。不导入照片纹理，不增加商场内部通行图。

## 直接事实与展示拟合

- [HEP FIVE 官方说明](https://www.hepfive.jp/ferriswheel)及[阪急设施介绍](https://cdn.hankyu-app.com/content/article/2022/article_12.html)确认直径 75 米、最高处约 106 米、52 个轿厢。程序模型保留这些参数；圈梁、轮辐、支架与轿厢简化为静态几何。
- 轮心位置、轮面方向、裙楼高度、影院屋面和设备体量依据用户俯视照片人工拟合。照片未嵌入页面，相关外观资料的派生授权待核实。
- 轮面在平面上的方向对齐 FIVE 与 NAVIO 之间的街巷，以现有 OSM `way/1228523292` 的两端方向为基准，约向东偏北 5.6°。不再沿用 JR 轨道约 31.65° 的斜向；轮心位置与高度独立保留，街巷线位只用于朝向参考。
- 阪急南端 Terminal 高部继续采用已登记的 PLATEAU 屋面分层，增加浅色立面节奏；西侧两段附属楼在同一车站 OSM 宿主内拟合，约 34 米高。体量和间隔为示意，不新增内部楼层；既有站厅通口、站台和三线轨道独立保留。

## 显示与维护

`GeographicBuilding.wheel` 持有地标配置，模型在 `presentation/models/buildings/ferris-wheel-model.ts`。总览、地面层及建筑轮廓开关沿用其他外壳规则，选层隐藏外壳，全图取景包含摩天轮顶端。

新增 OSM 外壳后运行 `node scripts/geography/build-ground-context.ts`。`node scripts/geography/render-building-details.ts` 输出实际网格离线预览；真实浏览器及手机端待人工复核。
