# 二层连廊与路网平面对照

轴线预览使用统一地理米制坐标，北向上。OSM 快照提供步行线位，楼层图用于核对连接对象及高架属性。完整桥面、平台和设备以[公共二层连廊](./elevated.md)为准。

## 来源与分区

| 分区 | 参考资料 | 线位与边界 |
| --- | --- | --- |
| Grand Front 南北馆 | `references/district/elevated-walkways-2026.pdf` 第1页右图 | way 220190709 跨街线位，沿建筑轴向直连，不再斜向拉接 |
| 北中庭—Grand Front—Yodobashi | 同上及 `references/connections/osaka-station-city/2f-map.png` | 北中庭连接、Yodobashi 西桥与外圈回廊分组；回廊不能当作商场实体外轮廓 |
| LUCUA—Yodobashi 东桥—阪急 | 同上，结合此前用户卫星图核对 | 共用分叉点，东桥接入外圈，阪急方向沿独立跨街段；阪急内部不展开 |
| 大丸前庭 | `references/connections/osaka-station-city/2f-map.png`、JR 构内图 | 前庭弧形退避为示意公共面；不把南北联络桥3F穿站段加入2F网络 |
| 南侧步道桥 | 地区高架图右侧 | 北／南横向支臂、沿路主干分别维护，接阪急西侧及阪神方向。桥下地面路口不作为高架通路交点 |
| JP Tower—大丸 | 站城2F图、[日本邮便连桥说明](../../../references/commercial/jp-tower/deck-and-sunken-garden.pdf) | OSM 1305504565 接 JP Tower 东侧至大丸西侧；下沉广场另由地下公共网维护 |
| LUCUA 西侧—梅北上方 | 站城2F图 | 采用 OSM 跨街及转折线位，只画公共连廊，不接入地下付费站台 |
| 梅北地上公共步道 | `references/connections/grand-green-osaka/jr-umekita-decks.pdf` 第1页位置关系 | 保留 OSM 弧形线位；逐段楼层和平台边缘需补核，不等同地下轨道 |
| Inogate—Grand Green | 同 PDF 第4页“新たな歩行者デッキ” | Inogate 2F 西端接 Grand Green 南馆 2F，运行时使用独立参考拟合数据 |

以上参考文件均位于 `references/`。OSM ID、源文件和层级解释随数据记录。文件名中的年份不证明资料全部更新至该年。

## 重建与检查

[高架数据说明](../../../data/geography/elevated/README.md)列出配置、源轴线预览和运行时复核命令。检查 OSM way 及来源可追溯性、Grand Front 直桥走向、南侧支臂和主干共用节点。
