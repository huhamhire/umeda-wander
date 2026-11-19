# 地下公共网数据与重建

地图使用地区地下图第 1 页的矢量轮廓，空间依据见[地下轮廓与道路配准](../../../docs/design/public-areas/underground-projection.md)，运行时归属见[地下公共网与设备](../../../docs/design/public-areas/underground.md)。

| 文件 | 用途 |
| --- | --- |
| `pdf-outline.json` | 黄色填充的原图数据，含 SHA-256、页码、PDF 坐标及绘图对象序号。保留直线顶点，三次曲线每段采样 24 次。 |
| `reference-controls.json` | 人工读出的北、南分区控制点及匹配的 OSM 建筑。 |
| `road-anchors.json` | 局部道路与建筑锚点，配准实现见 `scripts/geography/reference-projection.ts` 及 `local-road-fit.ts`。 |
| `basement-source.json`、`basement-outlines.json` | 独立地下占位的原图边界与共用道路投影结果。绘图对象及使用边界见[地下公共网](../../../docs/design/public-areas/underground.md#建筑占位)。 |
| `network.ts` | 离线校对图据以绘制车站参考范围并说明排除项。 |

## 重建顺序

源 PDF 变更时需核对版本、SHA-256 及对象序号。安装 PyMuPDF 后运行提取脚本；两者共用 `pdf_vectors.py`。只调整道路控制点时直接从投影重建开始。

```powershell
python scripts/geography/extract-underground-outline.py
python scripts/geography/extract-basement-outlines.py
```

以下命令从仓库数据重建地面输入、运行时公共轮廓、地下占位及地面展示范围，再生成核查报告。三个 `build-*` 命令会更新正式派生数据，需审查差异。

```powershell
node scripts/geography/render-plan.ts
node scripts/geography/build-runtime.ts
node scripts/geography/build-basement-outlines.ts
node scripts/geography/build-ground-context.ts
node scripts/geography/review-underground.ts
```

用 `node scripts/geography/render-underground-plan.ts` 单独核对源图投影，输入为 `build/geography/ground-plan.svg`。输出为同目录下的 `underground-plan.svg`、WGS84 `underground-plan.geojson`、`underground-reference-fit.json` 和 `underground-report.json`。

回归检查包含锚点落位、三角形方向、孔洞、DIAMOR 交会关系、Hilton 接入方向及第一生命通道与阪神主轴关系。所用 OSM 基底适用 ODbL；提取的参考图几何按[来源与版权审计](../../../docs/data/source-credits-audit.md)管理。
