# JR 中央区与南北门

## 资料事实

主依据为 [JR 大阪站构内图](../../../references/stations/jr-osaka/station-guide.pdf)，楼层接驳辅以 [Osaka Station City 资料](../../../references/connections/osaka-station-city/)。文件版本及许可边界见 [catalog](../../../references/catalog.json)，页码与设备编号见 [JR 布局](../stations/jr-osaka.md)。

- 中央改札和中央公共通道属于 1F；樱桥及中央口内部存在 M2F 夹层，不是地下 B1。
- 地面六组站台承担 1–11 番线，南北连络桥位于其上；大屋顶北高南低。
- 中央口南端向 Crost B1 下行，大丸侧小半层从左右台阶接回中央通道。
- 南门大楼 2F／3F／4F 使用建筑楼层名称，不能机械等同 JR 同名楼层标高。

## 归属与实现

本站由 `src/infrastructure/stations/jr-osaka/geographic-station.ts` 组装，构内布局在 `layout.ts`，夹层与南端连接在 `upper-links.ts`，Crost 下行和南门设备在 `crost-access.ts`、`south-entrance.ts`，二层弧形退避在 `south-forecourt.ts`。

公共网由 `src/infrastructure/public-areas/` 持有，不在本站重复绘制长距离闸外楼板。大丸、酒店和南立面归 `buildings/daimaru/`，大屋顶参数在 `data/geography/buildings/jr-roof.json`。西口至梅北 B2 闸内连接与北侧 B1 公共网分开，见[北侧区域](./north.md)。

## 拟合边界与检查

屋顶尺度及中心采用已整理依据；弧度、南缘高度、台阶步数和局部高差为参考拟合，见[白模校对](../buildings/model-calibration.md)。50/T 等跨层设施须检查上下层可见性、完整井道和商业楼板开口，不能靠恢复整块上层楼板解决消失问题。

运行 `node scripts/geography/review-stations.ts --station=jr-osaka`，结合车站、公共区域、建筑及呈现测试复核；实际 WebGL 和手机触控按[验证规范](../../development/validation.md)另行检查。
