# 地理生成与核查脚本

正式数据放在 `data/geography/`，原始参考资料放在 `references/`。`build/geography/` 只存本地缓存和可重建的检查结果，不参与 H5 运行，也不提交。

## 本地输出的保留范围

```text
build/
├── geography/
│   ├── ground-plan.geojson     # 地面运行时数据生成输入
│   ├── road-width-audit.json   # 地面运行时道路宽度输入
│   ├── ground-plan.svg        # 地面和连廊等平面预览底图
│   ├── underground-plan.svg   # 站内地下平面预览底图
│   ├── plateau-roofs.json     # PLATEAU 屋面数据生成输入
│   ├── plateau-2025/          # 上游下载缓存，供核对新版本
│   └── downloads/             # 既有下载副本
├── district-review/           # 早期 OSM 来源副本
└── pdf-tools/                  # 本机提取地下轮廓时使用的 Python 依赖
```

优先保留后续脚本会读取的中间输入、本机仍使用的依赖和待复核的来源副本。旧阶段预览、PDF 截页、重复日志和一次性迁移脚本可以清理。已核对的原始资料归入 `references/` 及其索引。预览、分析和审计结果按下文的命令重建。建筑预览及性能分析会自动清理转换中间文件。

网页构建直接使用仓库里的正式数据。清理上述本地缓存后，地面输入由 `render-plan.ts` 重建，地下预览底图由 `render-underground-plan.ts` 重建。PDF 矢量提取需要 PyMuPDF，PLATEAU 提取读取已归档的 CityGML。

## 常用重建顺序

```powershell
node scripts/geography/render-plan.ts
node scripts/geography/render-underground-plan.ts
node scripts/geography/build-runtime.ts
node scripts/geography/build-ground-context.ts
node scripts/geography/review-ground-context.ts
node scripts/geography/review-stage-three.ts
node scripts/geography/review-stage-four.ts
node scripts/geography/render-building-details.ts
node scripts/geography/render-building-details.ts --assembly
```

其中 `build-runtime.ts`、`build-ground-context.ts` 会更新正式派生数据，应审查数据差异；仅为查看已有数据时运行对应 `review-*` / `render-building-details.ts` 即可。早期七站对照图仍可用 `render-station-interiors.ts` 按需重建，不必长期保留每个阶段的副本。


从已归档的 PLATEAU 原始网格重建派生数据。

```powershell
python scripts/geography/extract-plateau-buildings.py
node scripts/geography/build-building-profiles.ts
```

核对其他版本时用 `fetch-plateau-buildings.py` 下载到本地缓存，确认后再归档。原始发布版本、测量年代及适用限制见 `docs/design/buildings/model-calibration.md`。

## 脚本保留核对

本批检查了代码／测试导入、文档命令、实际输入输出及现役数据消费者。旧坐标校准脚本已在上轮删除；目前下列工具仍用于重建或复核，不能仅因没有被 npm 自动调用就删除。

| 用途 | 入口及保留原因 |
| --- | --- |
| 地面与源数据 | `extract-osm.py`、`render-plan.ts`、`build-runtime.ts`；输出正式数据依赖的地面中间文件与宽度报告 |
| 轨道与建筑部件 | `extract-railways.py`、`extract-subway-rails.py`、`extract-building-parts.py`；从仓库快照重建在用 OSM 子集 |
| 地下源图 | `extract-underground-outline.py`、`extract-basement-outlines.py`、`pdf_vectors.py`、`build-basement-outlines.ts`；保留源图曲线、孔洞及投影来源 |
| 公共网校准 | `reference-projection.ts`、`local-road-fit.ts`、`underground-geometry.ts`；生成脚本与回归共同依赖，不是独立 CLI |
| 地上连廊 | `build-elevated.ts` 重建 OSM 下载子集；`render-elevated-plan.ts` 检查源轴线，`review-stage-four.ts` 检查最终公共桥面，两者不是重复输出 |
| 地面裁剪 | `build-ground-context.ts`、`context-scope.ts`、`road-continuity.ts`、`road-width.ts`、`review-ground-context.ts`；分别负责生成、共享算法与结果核查 |
| PLATEAU 白模 | `fetch-plateau-buildings.py`、`extract-plateau-buildings.py`、`build-building-profiles.ts`、`render-building-details.ts`；下载／提取与无浏览器模型核查仍在用 |
| 站体与地下检查 | `review-stage-two.ts`、`review-stage-three.ts`、`basement-contact-audit.ts`；检查包络、接口、主网分量与建筑间距 |
| 局部离线预览 | `render-station-interiors.ts`、`render-rail-merges.ts`、`render-underground-plan.ts`；检查内部设备、轨道曲线及源轮廓位置，不能用粗略全图替代 |
| 来源及性能 | `audit-references.ts` 校验原始文件哈希，`profile-scene.ts` 诊断 CPU 场景构造 |

本轮未发现可以证明已废弃、且不影响重建的额外正式脚本，因此没有为减少文件数而删除它们。一次性格式转换和文案迁移工具只在忽略的 `build/` 中执行，不登记为长期开发入口。根目录 `scripts/` 新增的样式构建、HTML 文案解析及风格检查均由构建、测试或 npm 命令调用。
