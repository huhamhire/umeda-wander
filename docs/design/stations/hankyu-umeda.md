# 阪急大阪梅田站

## 资料事实

构内依据为 [station-guide.svg](../../../references/stations/hankyu-umeda/station-guide.svg)，[阪急车站页](https://www.hankyu.co.jp/station/umeda.html)用于站名及线路补充。SVG 的来源版本和改编授权仍按 [catalog](../../../references/catalog.json)及[来源审计](../../data/source-credits-audit.md)核对，不能假定补充 PDF 与该 SVG 是同一原文件。

- 1F 为入口及公共通道，2F 包含中央口、茶屋町口，3F 为终端站台及改札。
- 三条线路保持京都线在东、神户线在西、宝冢线在中间；站外各自收为双线北行，不画成站口三向远距离分叉。
- 终端降车带不伪造额外轨道，三组尾端只标线路，不重复标共同下一站。

## 当前实现

地理包络和内部校准共用本站坐标。三番街与站体共用建筑宿主，建筑体量不能重复封住 1F／2F 公共通道；造型见[建筑索引](../buildings/README.md)。

JR／Yodobashi 方向接本站公共接口，连接归地区二层板块，不把其他站内部数据导入本站。付费区、闸机、站台铺装使用浅灰粉／淡栗红主题，京都／宝冢／神户的线路色分别保留。

## 拟合与检查

构内图可确认层级、设备符号和相对位置；当前站台尺寸、设备间距、桥门口与行车区域仍为地理拟合。不得用把整站推远的方式掩盖 JR 轨道与本站南端比例问题。建筑与轨道的平面净距、设备落点、开口、付费边界和公共落脚面均需同步检查。

运行 `node scripts/geography/review-stations.ts --station=hankyu-umeda`，结合 `tests/stations/`、`tests/geography/` 和二层相关检查。实际外观与触屏仍需人工复核，见[北侧区域](../areas/north.md)。
