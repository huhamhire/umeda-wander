# UMEDA · 车站漫游

[English](./README.md) · 简体中文 · [日本語](./README.ja.md)

「UMEDA · 车站漫游」是一张可交互的大阪梅田站区立体地图。使用者可在同一张地图上查看各站的楼层、站台和改札，了解地下公共通道与二层连廊如何连接车站和周边建筑。

地图覆盖 JR 大阪站、阪急大阪梅田站、御堂筋线梅田站、阪神大阪梅田站、谷町线东梅田站、四桥线西梅田站与 JR 北新地站。

**当前几何、设施位置和路线均为示意，不能用于现场导航。**

## 项目背景

本项目源于作者在大阪梅田停留数日的经历。当地多家铁路运营方的车站经地下商业街、地面出入口和二层连廊相接，构成常被称为「梅田迷宫」的多层步行网络。项目以公开的车站平面图和地理资料为参考，尝试借助 AI 完成资料整理、空间建模和交互开发。

> **站区沿革与参考资料**
>
> - 初代大阪站于 1874 年开业。1933 年，现御堂筋线的梅田至心斋桥段开通。1939 年，阪神梅田站迁入地下。1963 年开业的梅田地下中心（今 Whity 梅田）连接地铁改札与周边百货、办公楼。阪急梅田站扩建后于 1973 年在现址建成。[大阪站城沿革](https://www.osakastationcity.com/about/gallery/develop.php) · [大阪市立图书馆近现代史资料](https://www.oml.city.osaka.lg.jp/page/1147.html) · [阪急阪神集团沿革](https://www.hankyu-hanshin.co.jp/docs/5a3dc356c73b5a393bd52202f6320606d60a6fe2.pdf) · [阪急大阪梅田站沿革](https://www.hankyu-hanshin.co.jp/release/docs/dbc36f2ba7c005e19e021aab9cf0b947c4bf3802.pdf) · [大阪地下街公司沿革](https://www.osaka-chikagai.jp/70th/history)
> - 2011 年大阪站城开业后，站区的二层步行网络继续延伸。2023 年，梅北地下站台经闸内通道接入 JR 大阪站既有站区。2024 年，连接大阪站方向与梅北片区的步行连廊投入使用。[大阪站城沿革](https://www.osakastationcity.com/about/gallery/develop.php) · [梅北地下站台说明](https://www.westjr.co.jp/company/info/issue/bsignal/23_vol_199/rail/) · [大阪站西侧开发项目](https://www.westjr.co.jp/railroad/project/project22/)
> - 大阪站城周边指南以「梅田ダンジョン」描述站区。在 Jタウンネット 2019 年开展的「最像迷宫的车站」读者投票中，大阪（梅田）在七个候选站中排名第一。[大阪站城周边指南](https://media.osakastationcity.com/25942/) · [Jタウンネット投票结果](https://j-town.net/2019/03/22277320.html?p=all)

## 地图功能

- 展开楼层，查看站台、改札和扶梯、楼梯、直梯等跨层设施。通过「设施」按车站、楼层和类型筛选并定位，或直接在地图上点选设施。
- 「步行路线」支持站内路径、JR 大阪站经 Crost 接入阪神大阪梅田、西梅田和 JR 北新地的闸外换乘，以及经北侧二层连廊前往阪急。最多可添加三个途经点，地点可搜索、筛选或从地图标记选择。见[步行路线设计](./docs/design/walking-routes.md)。
- 使用右上角的「自由探索」播放导览。地图支持中文、日语和英语，可切换主题及静音。
- 地图停稳后，复制地址即可分享镜头中心、旋转、俯仰、缩放、楼层、所选设施和已预览的步行路线。接收设备的屏幕比例决定横向可见范围。

## 目录结构

```text
umeda-wander/
├── src/          # 地图与界面源码
├── data/         # 派生数据和地理配置
├── references/   # 原始参考资料及来源索引
├── scripts/      # 开发服务、构建和离线核查
├── tests/        # 按领域组织的回归测试
└── docs/         # 设计、开发和数据来源文档
```

源码分层和组装入口见[架构文档](./docs/development/architecture.md#项目结构)。

## 文档

`docs/` 下的设计、开发与数据来源文档以简体中文为主。

- [本地开发与部署](./docs/development/run-and-deploy.md)涵盖启动、VS Code、构建与静态子路径发布。
- [开发文档](./docs/development/README.md)涵盖架构、代码风格、国际化和验证。
- [文档索引](./docs/README.md)按车站、公共空间、建筑及数据来源整理。
- [变更日志](./CHANGELOG.md)记录影响使用和部署的变更。
- [Roadmap](./docs/roadmap.md)记录后续功能改进。

## 许可与署名

本项目的原创代码和原创文档采用 [MIT 许可证](./LICENSE)。复制或分发软件的全部或实质性部分时，请保留原版权声明和许可声明。

如果你在作品中使用了本项目，欢迎署名「UMEDA · 车站漫游」并链接至项目仓库。公开署名与链接为自愿请求。

第三方依赖、地图数据、参考资料和第三方作品仍适用各自条款。OSM 数据按 ODbL 1.0 使用，项目选用的 PLATEAU 数据按 CC BY 4.0 使用。混合来源几何及改编素材的发布范围见[来源与版权核查](./docs/data/source-credits-audit.md)。
