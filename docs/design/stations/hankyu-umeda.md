# 阪急大阪梅田站

## 资料事实

构内依据为 [station-guide.svg](../../../references/stations/hankyu-umeda/station-guide.svg)，[阪急车站页](https://www.hankyu.co.jp/station/umeda.html)用于站名及线路补充。SVG 的来源版本和改编授权仍按 [catalog](../../../references/catalog.json)及[来源审计](../../data/source-credits-audit.md)核对，不能假定补充 PDF 与该 SVG 是同一原文件。

- 1F 为入口及公共通道，2F 包含中央口、茶屋町口，3F 为终端站台及改札。
- 三条线路保持京都线在东、神户线在西、宝冢线在中间；站外各自收为双线北行，不画成站口三向远距离分叉。
- 终端降车带不伪造额外轨道，三组尾端只标线路，不重复标共同下一站。

## 当前实现

行李设施随楼层定位。1F 标出阪急游客中心的人工寄存，以及 BIGMAN 前广场和三番街高速巴士总站附近的寄存柜。2F 标出中央改札和茶屋町口外的柜组。3F 区分神户线侧闸外寄存柜室和京都线侧闸内柜组。构内图核对楼层和闸内外关系，相邻柜组共用示意落点。见[阪急游客中心](https://www.hankyu.co.jp/station/tourist_center/index.html)和[神户线侧柜室](https://multiecube.com/location/1339)。

地理包络和内部校准共用本站坐标。三番街与站体共用建筑宿主，建筑体量不能重复封住 1F／2F 公共通道；造型见[建筑索引](../buildings/README.md)。

JR／Yodobashi 方向接本站公共接口，连接归地区二层板块，不把其他站内部数据导入本站。付费区、闸机、站台铺装使用浅灰粉／淡栗红主题，京都／宝冢／神户的线路色分别保留。

### 3F 闸外主通道

3F 改札正面的一排主梯组跨过 2F 直达 1F。构内图以 A、B、D、E 标出扶梯，并在 A、C、E 一带画出楼梯。模型按横向分布布置扶梯和宽楼梯。阪急终端大楼 ② 号直梯停靠 1F、2F 和 3F，2F 以公共通道接中央改札外站厅。闸内往各站台的 2F–3F 设备仍各有独立落点。见[大阪市步行指引与照片](https://www.city.osaka.lg.jp/shimin/page/0000600942.html)和[阪急直梯分层说明](https://www.hankyu.co.jp/station/umeda_ev.html)。

梯组宽度、轴线、出口间距和直梯前通道为展示拟合。楼板和三番街建筑外壳共用设备落点核对净空。

## 拟合与检查

构内图可确认层级、设备符号和相对位置；当前站台尺寸、设备间距、桥门口与行车区域仍为地理拟合。不得用把整站推远的方式掩盖 JR 轨道与本站南端比例问题。建筑与轨道的平面净距、设备落点、开口、付费边界和公共落脚面均需同步检查。

运行 `node scripts/geography/review-stations.ts --station=hankyu-umeda`，结合 `tests/stations/`、`tests/geography/` 和二层相关检查。实际外观与触屏仍需人工复核，见[北侧区域](../areas/north.md)。
