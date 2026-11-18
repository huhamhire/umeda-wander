# 测试维护

测试与源码分开，按被验证的业务能力归组。涉及多个层次的集成检查归入主要关注的领域，不复制测试，也不为每个源文件建立一层目录。

```text
tests/
├── stations/       # 本站布局、设备、接口与多站组装
├── public-areas/   # 地下公共网、二层连廊及天井
├── geography/      # 路网、轨道、坐标及地理运行时
├── buildings/      # 商业建筑体量、外观与设备可见性
├── navigation/     # 本站寻路、设施筛选、设施目录与迁移
├── presentation/   # 镜头、交互、遮挡、样式、版权及文案
└── tooling/        # 风格检查与源码依赖边界
```

从仓库根目录运行：

```powershell
npm test
node --test "tests/stations/*.test.ts"
node --test tests/navigation/facility-filter.test.ts
```

全量命令递归收集 `tests/**/*.test.ts`，新增子目录不需要修改命令。测试从仓库根目录运行，直接导入 TypeScript 源码。场景集成测试直接调用 H5 的模型组装入口，运行后无需清理测试 bundle。

设施回归直接使用当前的站模与目录。原始资料仍由 `references/` 管理；测试只引用需要的事实，不复制大文件。离线检查不替代真实浏览器与手机触控验收。
