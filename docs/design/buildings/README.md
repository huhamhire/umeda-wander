# 建筑轮廓与白模

建筑以裙楼、塔楼、退台和有依据的公共接入表达，不还原店铺内部。总览显示外观与上部体量，选层时隐藏装饰，保留相应楼板与设备；地面关闭时隐藏无独立地下轮廓的地上外壳。

| 区域／建筑 | 维护入口（相对 src/infrastructure/buildings/） | 约束及依据 |
| --- | --- | --- |
| 大丸／南门大楼／Hotel Granvia | `daimaru/` | 真实楼板开口、50/T、南侧两组扶梯、酒店屋顶内庭及“大阪駅”门面 |
| LUCUA／LUCUA 1100 | `lucua/`、`lucua-1100/` | 北中庭开放空间、办公体与西侧连廊分开 |
| Grand Front 南北馆 | `grand-front-south/`、`grand-front-north/` | 裙楼承接独立塔楼；馆间桥横跨道路，不按最近点斜接 |
| Yodobashi／LINKS／RESPIRE | `yodobashi/` | 同一综合体；内层弧形裙楼与公共二层外回廊分开，酒店连续承接 |
| 阪急百货／Grand Building | `hankyu-dept/`、`hankyu-grand/` | 独立建筑；百货南侧主塔及 1F 公共通廊，不能把邻楼凹口切进主塔 |
| 阪急三番街 | `hankyu-sanbangai/` | 与车站共用宿主及通口，不重复生成站外 2F 占位 |
| 阪神百货／Twin Towers South | `hanshin-dept/` | 保留临街弧线与退台长条办公塔，[独立说明](./hanshin-dept.md) |
| JP Tower／KITTE | `jp-tower/` | 连续塔身、裙楼及下沉广场，[独立说明](./jp-tower.md) |
| HEP FIVE／NAVIO | `hep-five/`、`hep-navio/` | 两栋独立白模、红色摩天轮，[地标说明](./hep-landmarks.md) |

上部造型的来源、PLATEAU 年代、白模承接和 JR 屋顶见[模型校对](./model-calibration.md)。当前采用的几何及待核实授权见[来源审计](../../data/source-credits-audit.md)。地下占位不是建筑外壳，另由[南侧地下设计](../areas/south.md)维护。

阪急公共通廊依据[官方发布](https://www.hankyu.co.jp/company/news/pdf/ER201209194N1.pdf)第 2、5、6 页，分别表达百货与 Grand Building 间的 1F 南北挑高、北侧东西通廊、其上方二层通路及 B1 Sun 广场。挑高裁孔与低矮东西通廊上方楼板分别处理，不新增“内庭层”或店内导航。

JP 业主名称为 `JPタワー大阪 / JP TOWER OSAKA`，商场为 `KITTE大阪`；未核实统一官方中文译名。门面上的物理字符维护为建筑常量，界面显示名使用领域 i18n key。
