# 2F 公共连廊投影底稿

三份区域配置使用统一地理坐标，`build-elevated.ts` 将登记的 OSM 轴线写入 `ways.json`，供 `elevated-blocks.ts` 组装公共网。

- `north.json`：Grand Front、Yodobashi、LUCUA 与阪急接口。
- `south.json`：大丸南侧、梅田新步道桥、阪急及阪神百货接口。
- `west.json`：LUCUA 西侧、梅北上方公共步道及独立参考拟合的新桥。

每组记录稳定 ID、OSM way ID、参考文件／页码、展示层与几何证据。修改对应区域配置后重新生成即可。OSM `level=1` 不机械转换为建筑 1F，参考图确认的二层外部公共步道归入展示 2F；原始 level 保存在导出属性中。H5 北侧标高 8、南侧 4，同归 2F；标高与桥宽为估计，不能据此认为全部等高。

```powershell
node scripts/geography/render-plan.ts
node scripts/geography/render-elevated-plan.ts
magick -background white build/geography/elevated-plan.svg build/geography/elevated-plan.png
```

输出 SVG、PNG、GeoJSON、JSON 核对报告到 `build/geography/`。当前 15 组、34 段线位；未定位项不绘制。桥宽 6–7 m 为可视化估计，尚非桥面精确多边形。大丸前庭为参考楼层图的示意轮廓；不能以色带相接作为导航连边，也不在跨地面道路处建立步行交点。

OSM 线位适用 ODbL，保留原 way 链接。参考图所依据的公共平台轮廓、图像和衍生几何不因此取得 OSM 许可；授权待核实，当前用于内部校对。源文件不修改，详情见 `docs/design/public-areas/elevated-projection.md`。

修改轴线配置后运行 `node scripts/geography/build-elevated.ts`，再运行 `node scripts/geography/review-elevated.ts` 检查实际装配。

Inogate 新桥的人工参考拟合单独保存在 `inogate.json`，由 `west-decks/inogate.ts` 接入 H5，包含两条路径及两端平面宿主；不伪装成额外 OSM way。端点、宽度、展示标高及维护归属见[公共二层连廊](../../../docs/design/public-areas/elevated.md)。
