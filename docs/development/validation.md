# 验证与交付

## 基本检查

在仓库根目录运行，Node.js 24 或以上。Windows PowerShell 如限制 npm 脚本，使用 `npm.cmd`。

```powershell
npm run check:style
npm run typecheck
npm test
npm run build
git diff --check
```

按改动运行相关检查，提交前复核暂存差异；不为已通过且未变化的代码反复运行同一套检查。文档修改检查本地链接、路径、命令和事实引用；只调整链接与源码注释时无需重建模型或把历史测试数更新成当前数。

测试按[七个领域](../../tests/README.md)组织，`npm test` 递归收集全部 `*.test.ts`。单域可用 `node --test "tests/stations/*.test.ts"`；固定设施基线不可自动重写。单个测试文件的范围比“第几阶段”的历史名称更重要。

## 数据与模型改动

| 改动 | 必须一并复核 |
| --- | --- |
| 本站布局、包络或站台 | 设备端点、平台归属、孔洞、围栏、路线节点、设施目录、轨道接头、公共接口 |
| 地下投影与道路配准 | 重新投影地下占位、重建地面范围；检查孔洞、付费区、公共面并集及接口共面 |
| 二层桥面或建筑入口 | 共享桥面所有者、楼板避让、栏杆留口、回廊、商业开口及目的地落脚 |
| 建筑体量与模型 | 承接关系、立面裁口、选层隐藏、路网开关、完整取景及许可记录 |
| 原始资料路径或版本 | catalog 哈希、来源用途、派生配置、受影响脚本和授权边界 |

站模离线入口为 `review-stage-two.ts`，地下和二层为 `review-stage-three.ts`、`review-stage-four.ts`，位于 `scripts/geography/`；重建顺序由[脚本说明](../../scripts/geography/README.md)和对应[数据说明](../../data/geography/README.md)确定。产物写入忽略的 `build/`，网页由构建写入 `dist/`，均不直接维护或提交。

设施迁移使用 `node scripts/geography/audit-facility-migration.ts`，原始资料校验使用 `node scripts/geography/audit-references.ts`。哈希一致只证明本地版本未变化，不证明授权或外部网址仍可访问。

## 真实交互与交付边界

按用户约定不直接操作浏览器。UI 变更仍需由用户在桌面及手机检查：资源加载、标签遮挡、选层与展开、导航面板、可见区聚焦、缩放／旋转及焦点恢复。离线几何、CPU 网格预览和替身测试不能替代 WebGL、性能、触控或现场通行验收。

交付说明写清改动、依据、实际运行的检查及剩余限制；未经明确要求不提交或推送。测试数量与性能数字是某次检查的快照，不作为长期门槛。
