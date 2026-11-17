# 地理生成与核查脚本

正式数据放在 `data/geography/`，原始参考资料放在 `references/`。`build/geography/` 只存本地缓存和可重建的检查结果，不参与 H5 运行，也不提交。

## 本地输出的保留范围

```text
build/geography/
├── plateau-2025/             # 当前建筑提取使用的 CityGML 与来源目录
├── downloads/                # 尚在核对的上游文件缓存
├── phase-three-sources/      # 地下核对源图缓存
├── phase-four-sources/       # 连廊核对源图缓存
├── roadmap-review/           # 当前局部核查图
├── ground-plan.geojson       # build-runtime.ts 的中间输入
├── road-width-audit.json     # build-runtime.ts 的宽度输入
├── plateau-roofs.json        # build-building-profiles.ts 的中间输入
└── *.svg / *.png / *.json    # 当前平面图、组装预览与审计结果
```

早期试验脚本不放在生成目录长期维护；有复用价值时整理到本目录。旧阶段输出、重复日志和转换中间图可删除，需要时由原命令重建。建筑网格预览只保留最终 PNG，转换中间文件在完成或失败后自动清理；CPU profile 的临时 JS bundle 也自动清理。已核对的原始资料进入 `references/` 及其索引，下载缓存不作为唯一事实依据。

`ground-plan.geojson`、`road-width-audit.json` 和 `plateau-roofs.json` 虽可重建，但被后续数据生成脚本读取，清理时保留。当前提取脚本使用 `plateau-2025/`；无年份的早期 `plateau/` 不再使用。整个 `build/geography/` 删除后不会影响 `npm run build`，但重新提取建筑需要下载 CityGML。

## 常用重建顺序

```powershell
node scripts/geography/render-plan.ts
node scripts/geography/build-runtime.ts
node scripts/geography/build-ground-context.ts
node scripts/geography/review-ground-context.ts
node scripts/geography/review-stage-three.ts
node scripts/geography/review-stage-four.ts
node scripts/geography/render-building-details.ts
node scripts/geography/render-building-details.ts --assembly
```

其中 `build-runtime.ts`、`build-ground-context.ts` 会更新正式派生数据，应审查数据差异；仅为查看已有数据时运行对应 `review-*` / `render-building-details.ts` 即可。早期七站对照图仍可用 `render-station-interiors.ts` 按需重建，不必长期保留每个阶段的副本。

设施迁移检查：`node scripts/geography/audit-facility-migration.ts`，输出 `facility-migration.json`。基线冻结在 `tests/fixtures/legacy-facilities.json`，替代关系维护在 `facility-migration.ts`；不要通过重新生成旧基线来消除差异。

PLATEAU 原始缓存的重建：

```powershell
python scripts/geography/fetch-plateau-buildings.py --year 2025
python scripts/geography/extract-plateau-buildings.py
node scripts/geography/build-building-profiles.ts
```

下载需要网络；原始发布版本、测量年代及适用限制见 `docs/design/buildings/model-calibration.md`，缓存中的公开文件不代表其几何可用于所有现状建筑。

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
| 迁移、来源及性能 | `audit-facility-migration.ts`、`facility-migration.ts`、`audit-references.ts`、`profile-scene.ts`；维护稳定清单、原始文件哈希和 CPU 场景构造诊断 |

本轮未发现可以证明已废弃、且不影响重建的额外正式脚本，因此没有为减少文件数而删除它们。一次性格式转换和文案迁移工具只在忽略的 `build/` 中执行，不登记为长期开发入口。根目录 `scripts/` 新增的样式构建、HTML 文案解析及风格检查均由构建、测试或 npm 命令调用。
