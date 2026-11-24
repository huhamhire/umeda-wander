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

优先保留后续脚本会读取的中间输入、本机仍使用的依赖和待复核的来源副本。过期预览、PDF 截页、重复日志和一次性迁移脚本可以清理。已核对的原始资料归入 `references/` 及其索引。预览、分析和审计结果按下文的命令重建。建筑预览及性能分析会自动清理转换中间文件。

网页构建直接使用仓库里的正式数据。清理上述本地缓存后，地面输入由 `render-plan.ts` 重建，地下预览底图由 `render-underground-plan.ts` 重建。PDF 矢量提取需要 PyMuPDF，PLATEAU 提取读取已归档的 CityGML。

## 地面基底与展示资源

```powershell
node scripts/geography/render-plan.ts
node scripts/geography/build-runtime.ts
node scripts/geography/build-ground-context.ts
```

`build-runtime.ts`、`build-ground-context.ts` 更新正式派生数据，检查生成差异。地下配准变更按[地下重建顺序](../../data/geography/underground/README.md)同时重建占位；高架轴线变更见[高架数据说明](../../data/geography/elevated/README.md)。

## PLATEAU 建筑重建

从已归档的 PLATEAU 原始网格重建派生数据。

```powershell
python scripts/geography/extract-plateau-buildings.py
python scripts/geography/extract-umekita-south.py
python scripts/geography/extract-umeda-sky-building.py
node scripts/geography/build-building-profiles.ts
```

核对其他版本时用 `fetch-plateau-buildings.py` 下载到本地缓存，确认后再归档。原始发布版本、测量年代及适用限制见 `docs/design/buildings/model-calibration.md`。

## 离线核查

从仓库根目录运行，输出写入 `build/geography/`。

| 对象 | 命令 | 结果 |
| --- | --- | --- |
| 七站模型 | `node scripts/geography/review-stations.ts` | 站体平面和校准报告，可加 `--station=nishi-umeda` 等站点参数。 |
| 地面展示 | `node scripts/geography/review-ground-context.ts` | 道路和地面展示范围。 |
| 地下公共网 | `node scripts/geography/review-underground.ts` | 公共面、前庭、门位绑定、设备及建筑占位。 |
| 高架公共网 | `node scripts/geography/review-elevated.ts` | 桥面、公共接口、建筑接入和设备。 |
| 建筑白模 | `node scripts/geography/render-building-details.ts` | 当前模型网格预览，可加 `--assembly` 检查通廊及楼板开口。 |
| 场景构造 | `node scripts/geography/profile-scene.ts` | CPU 构造与模型复杂度报告 `scene-profile.json`。 |

## 工具与数据职责

| 用途 | 入口与职责 |
| --- | --- |
| 地面与源数据 | `extract-osm.py`、`render-plan.ts`、`build-runtime.ts`；输出正式数据依赖的地面中间文件与宽度报告 |
| 轨道与建筑部件 | `extract-railways.py`、`extract-subway-rails.py`、`extract-building-parts.py`；从仓库快照重建在用 OSM 子集 |
| 地下源图 | `extract-underground-outline.py`、`extract-basement-outlines.py`、`pdf_vectors.py`、`build-basement-outlines.ts`；保留源图曲线、孔洞及投影来源 |
| 公共网校准 | `reference-projection.ts`、`local-road-fit.ts`、`underground-geometry.ts`；生成脚本与回归共同依赖，不是独立 CLI |
| 地上连廊 | `build-elevated.ts` 重建 OSM 下载子集；`render-elevated-plan.ts` 检查源轴线，`review-elevated.ts` 检查最终公共桥面，两者不是重复输出 |
| 地面裁剪 | `build-ground-context.ts`、`context-scope.ts`、`road-continuity.ts`、`road-width.ts`、`review-ground-context.ts`；分别负责生成、共享算法与结果核查 |
| PLATEAU 白模 | `fetch-plateau-buildings.py`、`extract-plateau-buildings.py`、`build-building-profiles.ts`、`render-building-details.ts`；下载／提取与无浏览器模型核查仍在用 |
| 站体与地下检查 | `review-stations.ts`、`review-underground.ts`、`basement-contact-audit.ts`；检查包络、接口、主网分量与建筑间距 |
| 局部离线预览 | `render-station-interiors.ts`、`render-rail-merges.ts`、`render-underground-plan.ts`；检查内部设备、轨道曲线及源轮廓位置，不能用粗略全图替代 |
| 来源及性能 | `audit-references.ts` 校验原始文件哈希，`profile-scene.ts` 诊断 CPU 场景构造 |
