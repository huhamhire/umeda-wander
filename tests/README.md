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
├── tooling/        # 风格检查与源码依赖边界
└── fixtures/       # 共享事实及冻结的设施迁移基线
```

从仓库根目录运行：

```powershell
npm test
node --test "tests/stations/*.test.ts"
node --test tests/navigation/facility-migration.test.ts
```

全量命令递归收集 `tests/**/*.test.ts`，新增子目录不需要修改命令。测试中的源码导入相对于测试文件；读取数据与生成临时产物的路径相对于仓库根目录，产物统一放在忽略的 `build/`。

`fixtures/legacy-facilities.json` 是冻结基线，不能因设施调整而自动覆盖。原始资料仍由 `references/` 管理；测试只引用需要的事实，不复制大文件。离线检查不替代真实浏览器与手机触控验收。
