# 步行路线

## 使用方式

- 「设施」页先显示查找。选中已接入步行图的设施后，可以将它设为起点、终点，或加入已有路线草稿的途经点。
- 「步行路线」独立保存起点、终点和最多三个途经点。途经点可以调整顺序和删除。切换到「楼层」可以查看当前层上的路线段，返回后继续编辑。
- 起点、终点和途经点各占一行，可直接输入关键词。选中地点后，框内右侧的 × 可清除必选地点或移除途经点。下方快捷区提供车站筛选和地图选点，楼层、设施类型与改札设置放在「更多选项」。未指定车站时，输入关键词才显示搜索结果。候选显示车站、楼层和闸内外，筛选与设施页独立。
- 「在地图上选点」只显示本次筛选范围内、已经接入步行图的地点。点中标记后先看位置和楼层，再确认。退出选点后，地图恢复普通设施点选。

## 路径和范围

现役界面提供七站已有站内路线，以及 JR 大阪站经 Crost 接入南侧 B1 公共通道的**示意预览**。设施落点通过 [端点表](../../src/infrastructure/district/walking-places.ts) 显式绑定到既有图节点。部分站厅或站台到达点没有对应设施条目，仍可从地点选择器或地图选取。

| 闸外段 | 接入位置与依据 |
| --- | --- |
| JR 大阪站 ↔ 阪神大阪梅田 | 从 JR 中央口外经中央通路南端 68 号楼梯到 Crost B1，再沿地下公共通廊接阪神西口外。楼梯依据 [JR 大阪站构内图](../../references/stations/jr-osaka/station-guide.pdf)，B1 转折从[梅田地下通道图](https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda05-3%28202607%29.pdf)及现役公共面拟合。 |
| 阪神大阪梅田 ↔ 西梅田 | 从阪神西口外沿地下通道进入西梅田北侧公共站厅。两侧的连接关系见[阪神构内图](../../references/stations/hanshin-umeda/station-guide.pdf)、[西梅田构内图](../../references/stations/nishi-umeda/station-guide.pdf)和[大阪市地下路线图](https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda05-2%28202606%29.pdf)。 |
| 西梅田 ↔ JR 北新地 | 经西梅田站厅东侧公共通路到南改札附近，再往东接 JR 北新地西改札外。南端有小坡道，示意数据沿用 B1 公共面标高。见[大阪市换乘图 G](https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda01-5-3%28202109%29.pdf)及[步行指引照片](https://www.city.osaka.lg.jp/shimin/page/0000621502.html)。 |

四站之间可双向规划闸外路线。西梅田北、中、南改札外均可设为起点、终点或途经点。纯 B1 换乘预览直接切到 B1，跨层换乘使用分层总览。

路线按用户给出的顺序逐段寻路。默认避开改札。遇到必须通过改札才能连通的路段时，可在结果下选择「允许经过改札并重试」，路线仍遵守图中的可行方向。任何一段没有完整路径时，界面指出该段并清除路线图。预览使用展示坐标和已有示意边，未提供现场定位、动态通行状态或无障碍路线承诺。

楼板、通道轮廓、护栏留口和 `PassageGuide` 描述空间关系。可走的邻接关系由独立步行图确认。单站图和区际空间可以独立更新，接口对齐后仍需核对实体门洞、楼层高差、闸内外及通行方向。

## 维护入口

- `application/navigation/walking-route.ts` 复用领域寻路，处理有序途经点和首个不可达分段。
- `infrastructure/district/walking-places.ts` 维护可选端点及闸内外标记。新设施加入前核对同层落点与真实图节点，设施编号独立维护。
- `infrastructure/public-areas/south-diamor/walking-routes.ts` 明确登记跨站通道、转折点和两端的站内图节点。离线回归检查平走段位于对应的公共面内，跨层段连接 68 号楼梯的两端。实际通行宽度和转折位置仍以现场为准。
- `presentation/components/walking-route-panel.ts` 管理路线草稿、筛选和确认。地图只拾取显式提供的节点，`RouteModel` 绘制当前路线。

其余跨站路径、任意落点约束与真机验收见 [Roadmap](../roadmap.md#步行路线)。验证命令见[开发验证规范](../development/validation.md)。
