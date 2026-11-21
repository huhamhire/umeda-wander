# 南侧区域：阪神、地下街与南侧三站

## 参考资料

区域轮廓依据[地下地区图](../../../references/district/underground-walkway-map.pdf)黄色开挖面，并与地面道路控制点配准。站内分别依据[阪神](../../../references/stations/hanshin-umeda/station-guide.pdf)、[西梅田](../../../references/stations/nishi-umeda/station-guide.pdf)、[东梅田](../../../references/stations/higashi-umeda/station-guide.pdf)、[北新地](../../../references/stations/kitashinchi/station-guide.pdf)资料；地区图不能单独证明所有设施和门位。

## 区域关系

- 阪神位于百货前道路地下。B1 西半付费区的东西两端设检票口，北侧 JR 通廊、南侧百货通廊及百货店口外通向 DIAMOR 的南北通路均在闸外。B2 东口主出口朝东，宽两段式阶梯居中，两侧扶梯共用一处 B1 开口。[阪神大阪梅田站](../stations/hanshin-umeda.md#b1-付费区与东口上行)
- 阪神南侧接第一生命互通、DIAMOR 和西梅田。第一生命曲面节点与沿途凹凸来自开挖面，不能用等宽折线桥替代。
- 西梅田付费站厅、站台偏西，公共通路主要位于东侧；南端有南改札。轨道北端尽头，只向南延伸。
- 北新地东西改札共用 B1 北侧公共通廊，中央支路从 DIAMOR 接头穿过两处付费厅之间，南接 11-21／11-23。西端和东端分别有接入街面设备的局部公共前庭。JR 东西线下穿四桥线，共归 B2 不代表同深。[北新地站](../stations/kitashinchi.md)
- DIAMOR、站前大楼间通路、曾根地下道和 Whity／东梅田按既有网络衔接，不能按最近点穿越建筑或付费区。
- 地下建筑占位在街区／公共面孔洞内，减去通路及站体。E-ma、Hilton West、MARU 使用独立地下图边界，其余地上宿主不自动代表地下可通行范围。

## 归属与拟合边界

`data/geography/underground/` 保留源图、道路锚点及投影；[投影核对](../public-areas/underground-projection.md)说明配准方法。Crost、阪神—西梅田、第一生命、DIAMOR、北新地和外围公共面由 `src/infrastructure/public-areas/south-diamor/` 管理；Whity／东梅田由 `whity/` 管理。共享 B1 面及九个所有者见[地下装配](../public-areas/underground.md)。

道路配准用于相对位置，允许米级展示误差，不是测量。管理窗口不能改变原图开挖边界；平面接触、分量和最短间距不能证明入口、层高或无障碍通行。

JP 东南下沉广场经 B1 公共支路接入 Garden Avenue，西梅田 1、5 号楼梯从两侧接入往 JR 大阪站的 B1 闸外通道。西梅田短升降落台及第一酒店独立占位见 [Roadmap](../../roadmap.md)。修改时沿地下重建链检查孔洞、付费边界及接口共面。
