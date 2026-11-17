# 旧版设施迁移校对

校对基线为 `b2a3da6` 的旧坐标总图，覆盖七站及地区公共设备。快照固定在 `tests/fixtures/legacy-facilities.json`，不含旧坐标几何；旧登记复用了当时的局部车站源数据，因此这项检查证明版本间清单覆盖，不证明现场设施无遗漏。

## 结果

旧版 476 个设施候选、177 组跨层设备及全部站台，均在新地理图中找到原 ID 或经明确核对的替代项。补充 Grand Front 南侧广场后，新图现有 511 个候选、195 组跨层设备；新增项允许保留，不按总数抵消遗漏。检查类型、服务楼层、站台归属、双排数量、实际落点及原 ID 的内部编号。

本轮修正：

- 恢复 `umekita-link`、`walkway-ac-poi`，并将 AB 直梯既有定位项同步到重新组装后的井道落点。保留 JR-004／030／031，不重复增加设备模型。
- 恢复南侧外围步道桥北端楼梯 `umeda-deck-north-stairs`。依据 JR 南侧 1F 图，沿新桥轴线拟合，地面端落在既有 `south-public` 公共面，不再叠一张地面落台。
- 恢复 JP 下沉广场 B1–1F 楼梯及直梯下段 `jp-garden-b1-ground-stairs`／`jp-garden-lift-0`。日本邮便官方连桥说明第 2 页明确列出外部阶梯及 B1–2F 电梯；新下段与既有 `public-jp-deck-lift` 共井道。位置、宽度和标高仍为拟合，Garden Avenue 的具体接驳不自动补线。

已核对的改名设备只保留新模型：74 号由南侧东扶梯组替代；JP 地面至 2F 楼梯及电梯上段由公共连廊板块持有。迁移表在 `scripts/geography/facility-migration.ts`，不能简单忽略消失的 ID。

## 检查与维护

```powershell
node scripts/geography/audit-facility-migration.ts
node --test tests/navigation/facility-migration.test.ts
```

报告生成到 `build/geography/facility-migration.json`。回归还会故意移除设备／定位项、移动错误落点，确认审计能够发现这些回退；JP 下段在 B1 探索时保留上段井道，并检查没有悄悄补出通向主网的捷径。

原内部编号保留；替代后的新 ID 沿用已分配编号，不重排或复用旧编号。快照只在明确更换校对基线时更新，不能跟随现役生成结果自动覆盖。

## 归档移除边界

本检查已脱离旧代码运行。原来依赖归档的 29 个测试文件已迁移或退役，旧校准脚本和 22 个旧模块已移除，空的 `deprecated/` 目录及类型检查包含项一并删除。历史对照使用 Git `b2a3da6`，不恢复旧运行入口。保留和替代的回归范围见 [退役记录](./legacy-retirement.md)。

本轮清理 `build/geography/` 的 61 个过时文件，约 90.7 MiB，包括早期校准输出、一次性脚本、重复日志和不再使用的无年份 CityGML 缓存。保留 2025 缓存、当前核查图及后续生成输入；已核对的原始资料迁到 `references/`，尚在处理的下载留在 `downloads/`。保留规则见 [生成脚本说明](../scripts/geography/README.md)。
