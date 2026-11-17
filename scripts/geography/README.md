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

下载需要网络；原始发布版本、测量年代及适用限制见 `docs/building-model-calibration.md`，缓存中的公开文件不代表其几何可用于所有现状建筑。
