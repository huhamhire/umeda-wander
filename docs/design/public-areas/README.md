# 公共空间设计

| 层次 | 现行设计 | 原始数据／生成说明 |
| --- | --- | --- |
| 地面 | [展示范围与连续路网](./ground.md) | [地理快照](../../../data/geography/README.md) |
| 地下 | [共享地下网与设备](./underground.md)、[轮廓提取及道路配准](./underground-projection.md) | [地下数据](../../../data/geography/underground/README.md) |
| 二层 | [高架公共网与接口](./elevated.md)、[道路平面对照](./elevated-projection.md) | [高架数据](../../../data/geography/elevated/README.md) |

地下采用异形开挖面，保留凹凸、孔洞和局部落台；高架采用公共桥面并集，保留外缘栏杆和接口留口。两者不能以同一套等宽路径代替。维护所有者和几何流程见[源码旁说明](../../../src/infrastructure/public-areas/README.md)。

调整位置时先检查源图与道路／车站关系，再改具体板块；不改变资料版本、不以最近点补无依据连接。`StationPublicInterface` 只表达门户与落脚，不自动生成跨站导航边。

地下门位、局部高差、桥门口及真机复核的当前待办统一见 [Roadmap](../../spatial-refactor-roadmap.md)。各记录中的历史测试数量、时间和性能样本不代表最新结果；重跑方式见[验证规范](../../development/validation.md)。
