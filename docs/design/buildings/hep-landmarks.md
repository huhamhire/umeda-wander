# HEP 与阪急站周边地标

HEP FIVE 与 HEP NAVIO 分别使用已有 OSM 快照的 `way/161451126`、`way/174789734`，两栋建筑独立维护。不导入照片纹理，不增加商场内部通行图。

## 直接事实与展示拟合

- [HEP FIVE 官方说明](https://www.hepfive.jp/ferriswheel)及[阪急设施介绍](https://cdn.hankyu-app.com/content/article/2022/article_12.html)确认直径 75 米、最高处约 106 米、52 个轿厢。程序模型保留这些参数；圈梁、轮辐、支架与轿厢简化为静态几何。
- 轮心位置、轮面方向、裙楼高度、影院屋面和设备体量依据用户俯视照片人工拟合。照片未嵌入页面，相关外观资料的派生授权待核实。
- 轮面在平面上的方向对齐 FIVE 与 NAVIO 之间的街巷，以现有 OSM `way/1228523292` 的两端方向为基准，约向东偏北 5.6°。不再沿用 JR 轨道约 31.65° 的斜向；轮心位置与高度独立保留，街巷线位只用于朝向参考。
- 竹中工务店记录轮体下部穿过建筑，HEP FIVE 官方楼层图将乘降区标在 7F。模型按俯视照片沿轮面裁出长槽，槽随下半轮和轿厢的扫掠范围向下收窄，同时裁开裙楼、屋面设备体量及压顶。槽底标高、边缘退距和支架座均为展示拟合。[施工方结构说明](https://jscakansai.com/wp/wp-content/uploads/2019/12/structurekansai061.pdf#page=6) · [HEP FIVE 7F 楼层图](https://www.hepfive.jp/floor/7F)
- HEP FIVE 西侧正门有两部并排玻璃电梯，运营方将 B1 免税柜台标在这组电梯前。模型依据用户照片拟合胶囊形井道、红色顶罩与玻璃分格，井道按同一轮廓裁入裙楼外壳，底部落到地区 B1 展示标高。井道位置、尺寸、上端标高及地下落台形状均为展示拟合。该组是商场内部设备，现役 Whity H-30 公共楼梯独立保留。[大阪观光局无障碍指南](https://osaka-info.jp/special/universal/tourism/hep-five/) · [阪急阪神运营方公告](https://www.hhp.co.jp/news/docs/e3559584929761c19accd58bebbe2114265568a6.pdf#page=2)
- 阪急南端 Terminal 高部继续采用已登记的 PLATEAU 屋面分层，增加浅色立面节奏；西侧两段附属楼在同一车站 OSM 宿主内拟合，约 34 米高。体量和间隔为示意，不新增内部楼层；既有站厅通口、站台和三线轨道独立保留。

## 显示与维护

`GeographicBuilding.wheel` 持有地标配置，模型在 `presentation/models/buildings/ferris-wheel-model.ts`。总览、地面层及建筑轮廓开关沿用其他外壳规则，选层隐藏外壳，全图取景包含摩天轮顶端。

`GeographicBuilding.panoramicElevators` 由 `presentation/models/buildings/panoramic-elevator-model.ts` 生成两座井道、轿厢及局部 B1 落台，跟随建筑外壳显隐。

新增 OSM 外壳后运行 `node scripts/geography/build-ground-context.ts`。`node scripts/geography/render-building-details.ts` 输出实际网格离线预览；真实浏览器及手机端待人工复核。
