# JP Tower 与梅田步行连接核对

## 使用资料

- 用户新增 `references/district/elevated-walkways-2026.pdf` 第 1 页：左图地下网络、DIAMOR 圆形广场与弯曲分支，右图二层步道及上下层关系。文件名作为资料标识，不据此推定每个节点均于 2026 年实测。
- `references/connections/grand-green-osaka/jr-umekita-decks.pdf` 共 8 页：JR 西日本 2025-02-19 发布，主要核对第 1、3、4 页。第 4 页新连桥是 Inogate 大阪西端至 Grand Green 南馆，不是已有 LUCUA 1100 西侧连桥，不能混成一条线。
- [日本邮便 2023-10-27 发布的连桥资料](https://www.post.japanpost.jp/notification/productinformation/2023/1027_01_01.pdf)第 2 页：南门大楼二层连桥、JP Tower 东南下沉广场、B1 Garden Avenue，以及 1F 往 JR 西口的通道。
- [JP Tower 官方介绍](https://www.jp-re.japanpost.jp/sp/osaka/)确认地下接入周边车站的关系；不按早期发布资料的建设状态显示关闭或预留。
- [OSM way 1146510724](https://www.openstreetmap.org/way/1146510724) v13，读取日期 2026-11-16：建筑综合体外轮廓。
- 既有 JR 站图第 4、5 页与用户南立面照片：南门大楼二层前侧公共通道及两侧扶梯。
- `references/connections/osaka-station-city/` 的 2F、3F 图与图例：复核南门大楼二层前庭退避、两侧下行设备和三层斜向连接的层级关系。
- `references/connections/grand-green-osaka/` 的南馆、JAM BASE 路线及接入图：核对 Grand Green 南馆与 JAM BASE 的外部步行方向；这些目标不与既有 Grand Front 或 LUCUA 混用，扩建边界见下文。

## 当前模型与边界

| 区域 | 已落实内容 | 保留的示意边界 |
| --- | --- | --- |
| JP Tower／KITTE | 裙楼、办公／酒店塔楼及细竖框；B1、1F、2F 外部接口 | 体量按现役地理建筑重建，退台和局部宽度仍为拟合；不画店铺、办公室和酒店内部 |
| 南门大楼—JP Tower | 连桥接大丸西侧二层墙面，经东南下沉广场进入 JP Tower | 连桥长度随既有放大站体拟合，不表示实测距离 |
| 下沉广场 | B1→1F→2F 楼梯与连续直梯井道，三层公共落台及真实开口 | 外部楼梯宽度、落台位置与坡度简化；不采用早期运营时间表 |
| Garden Avenue | 官方资料确认地下接入关系，当前保留下沉广场落台 | 与地区公共主网的准确平面接口尚待定位，不把旧版折线视为已接通 |
| 大阪站南侧 2F | 中央弧形退避裁空，左右两组 1F→2F 双排扶梯；左侧 61 的落点移到前庭西侧 | 弧线半径与相对尺寸为示意；设备仍保留原参考编号，不解释为现场编号 |
| 第一生命／MARU | 圆形公共广场、弯曲互通分支，建筑占位避让公共走线 | 结合两份地下图作边界拟合，不把商场内店铺通道展开成室内图 |

现役建筑在 `src/infrastructure/buildings/jp-tower/`，连续主塔、侧翼及裙楼依据见[白模校对](./model-calibration.md)；原先独立偏移和压缩高度不再指导地理版本。地下设备在 `public-areas/south-diamor/jp-access.ts`，地面至二层段由公共高架板块持有，共用井道和开口。JR 南侧退避由 `stations/jr-osaka/south-forecourt.ts` 维护，设施编号不因重组而重排。

## 连接范围与待确认部分

Inogate—Grand Green 新连桥已接入独立公共高架板块，2F 显示公共落台，目标建筑轮廓绘在地面，见[二层装配](../public-areas/elevated.md)。JP Garden Avenue 的具体主网接口仍待核对，不能根据“地下可达”补最短捷径。东梅田附近的局部台阶也不能据平面图描述成完整无障碍路线，当前不提供跨站现场导航。

弧形退避使用 `AtriumVoid` 同时裁 JR 公共楼板和大丸商业楼板，避免仅裁掉一张表面后仍被建筑基座封住。扶梯逐条落点与孔洞共用数据，直梯在选 B1 时保留连续至 2F 的完整井道。

地下公共通路／落台使用统一的较深暖米色 `undergroundPublicColor`；商业 B1 楼板降低亮度，仍保留区域区别。地面与二层色调不变，地下不新增护栏或平台蓝色。

验证包含站间公共走廊的全宽付费区避让、建筑入口落在轮廓边界、跨层落台支撑与开口、退避裁空射线检查、完整电梯井、第一生命占位与公共弧线互不占用。已离线检查两向建筑造型和地下／二层平面；遵照要求未操作浏览器。
