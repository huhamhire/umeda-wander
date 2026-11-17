# 七站设计索引

各站独立交付 `StationMap`，构内资料使用本站来源；公共闸外空间由公共区域板块持有。最终站模通过 `createGeographicStation(id)` 创建，与 H5 总图共用校准和设备模型。

| 车站／子区 | 设计与参考 | 现役模块（相对 src/infrastructure/） |
| --- | --- | --- |
| JR 大阪站、梅北 | [JR 布局](./jr-osaka.md) | `stations/jr-osaka/`、`umekita/` |
| 阪急大阪梅田 | [阪急布局](./hankyu-umeda.md) | `stations/hankyu-umeda/` |
| 御堂筋线梅田 M16 | [M16 布局](./metro-umeda.md) | `stations/metro-umeda/` |
| 阪神大阪梅田 | [阪神布局](./hanshin-umeda.md) | `stations/hanshin-umeda/` |
| 谷町线东梅田 T20 | [T20 布局](./higashi-umeda.md) | `stations/higashi-umeda/` |
| 四桥线西梅田 Y11 | [Y11 布局](./nishi-umeda.md) | `stations/nishi-umeda/` |
| JR 北新地 | [北新地布局](./kitashinchi.md) | `stations/kitashinchi/` |

## 尺度与设备

`index.ts` 保存被现役站模复用的局部构内定义，`geographic.ts` 及校准模块把本站放入统一米制框架。局部草图尺寸不直接当成最终世界坐标。原来的 2.5 米／单位、独立显示偏移及旧站台长宽只保留在 Git 历史，不作为新布局约束。

OSM 站台边界可用于大致包络，不能直接当成有效净宽、逐股线位或实测可通行面。地面站台与梅北原始 OSM 对象记录在地理数据和源码，宽度、弧形、门户及设施端点仍须结合构内图检查。

设备调整同时检查：站台归属、落点和坡度、孔洞、井道、改札围栏、设施目录及内部编号。单层显示保留完整跨层模型，不能切断直梯井道。具体装配边界见[架构说明](../../development/architecture.md)，验证入口见[验证规范](../../development/validation.md)。

站内文档保留来源事实及必要修订说明；涉及旧局部坐标的历史段落不覆盖当前地理校准，未完成事项统一回到 [Roadmap](../../spatial-refactor-roadmap.md)。
