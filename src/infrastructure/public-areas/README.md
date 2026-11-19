# 公共区域模块

`district/geographic-map.ts` 将公共区域与独立车站组装。车站提交本站前庭和改札接口，跨板块公共几何由下列模块持有。

| 源码 | 职责 |
| --- | --- |
| `underground-blocks.ts` | 地下板块登记及接驳面，最后一个管理窗口接收剩余几何。 |
| `north-atrium/`、`metro-interchange/`、`whity/`、`south-diamor/` | 北中庭及梅北、M16 前庭、阪急与 Whity、南侧地区的地下公共面和设备。 |
| `station-frontages/` | 将必要的构内图公共前庭与设备落台交给共享地下网。 |
| `basement-buildings.ts`、`south-diamor/basement-outlines.ts` | 地下宿主清单及 E-ma、Hilton West、MARU 的独立地下轮廓。 |
| `elevated-blocks.ts` | 登记北、南、西及 Inogate 四个高架板块，各板块持有自己的桥面和接口。 |
| `deck-access.ts`、`deck-buildings.ts` | 高架公共设备、显式外壳避让绑定与目的地二层占位。 |

板块布局、拟合约束及核查命令分别见[地下公共网](../../../docs/design/public-areas/underground.md)与[公共二层连廊](../../../docs/design/public-areas/elevated.md)。共享装配与跨层职责见[架构说明](../../../docs/development/architecture.md)。
