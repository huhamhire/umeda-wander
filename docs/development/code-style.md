# 代码风格与维护约定

本项目沿用 nstarter 的 TypeScript 四空格缩进、单语句、大括号和分号约定。本地配置只启用本项目所需的 ESLint 与 Stylelint 规则。

## TypeScript

- UTF-8、LF、文件末尾换行；四空格缩进，不使用 Tab。JSON、HTML、CSS 和 Markdown 使用两空格。
- 一行只放一条 statement。`for` 的初始化、条件和递增仍属于同一个循环头，不为形式要求拆成不同循环。
- 条件分支和循环体必须带大括号；短回调内有多条语句时也必须分行。
- 一条变量声明优先只定义一个变量；对象配置、参数列表、几何数据和长表达式按语义换行，目标行宽约 120 字符。URL、来源原文和不可拆的标识符不强行截断。
- 语义段落之间最多保留一行空行；参数列表、对象或数组的开闭分隔符内侧不填充空行。模板字符串中的空白作为数据保留。
- 命名函数、类方法、访问器、构造器及模块级函数变量提供英文 JSDoc，说明用途、输入约定、返回含义或副作用中真正重要的内容。已有明确类型不逐项重复成无信息量的 `@param`；短匿名回调不强制写模板注释。
- 关键算法步骤、坐标框架、单位、来源与人工估计边界使用英文注释解释原因；不添加仅复述赋值动作的注释。
- 注释中的罗马字地名、站名和线路名附日文原名，例如 `Kitashinchi (北新地駅)`。以正式日文表记为准。
- 不把嵌套三元表达式当成控制流程。超过简单二选一时优先使用具名中间变量、分支或查表。
- 保持现有 DDD 依赖方向。样式整理不顺带调整布局数值、设施身份、地理来源或算法行为。

`.editorconfig` 与 `.vscode/settings.json` 提供编辑器默认值，VS Code 使用自带 TypeScript formatter，无需安装扩展。格式化源代码后，压缩仍只发生在 esbuild 构建阶段。

## 本地检查

日常修改后用 `npm run check:style:changed`。它按当前 Git 工作区选择已暂存、未暂存和未跟踪的 TypeScript、CSS 文件，检查的是工作区里的版本。改动 ESLint 配置、Stylelint 配置或依赖锁文件时会自动转为全量。

只检查指定文件时，可以直接调用对应工具。

```powershell
npm exec -- eslint src/main.ts
npm exec -- stylelint src/styles/foundations/base.css
```

提交前或 CI 可按改动范围使用全量检查。

```powershell
npm run check:style
npm run typecheck
npm test
npm run build
```

`check:style` 通过 `eslint.config.js` 检查源码、脚本、测试和数据代码的单行语句、分号、大括号、缩进、连续空行、块边缘空行、行尾空白和换行。JSDoc 规则适用于源码、脚本和数据代码。`stylelint.config.js` 检查 CSS 的两空格缩进、声明换行和文件换行。

测试按业务领域维护于根目录 `tests/`，目录职责见 [测试说明](../../tests/README.md)。`npm test` 递归收集所有领域的 `*.test.ts`，不能因移动文件漏跑。

代码审查继续核对参数列表、对象及数组边缘的单个空行、英文注释的准确性、日文地名标注和复杂表达式的可读性。HTML 缩进由 EditorConfig 和编辑器维护。

## 样式模块

样式使用原生 CSS。完整目录见[项目结构](../../README.md#项目结构)。

```text
src/styles/
├── index.css
├── foundations/
│   ├── index.css
│   ├── palette.css               # 按色系维护基础色
│   ├── theme.css                 # 界面用途及衍生颜色
│   ├── base.css                  # 重置、共享表面及画布
│   └── mobile.css
└── components/
    └── <领域>/
        ├── index.css             # 本领域的样式入口
        ├── base.css              # 通用样式和其他媒体查询
        └── mobile.css            # 本领域的窄屏样式
```

各领域的 `index.css` 先加载通用样式，再用 `(max-width: 760px)` 加载同级的 `mobile.css`。宽屏和减少动态效果等规则留在所属领域的 `base.css`。选择器和声明块正常换行，每条属性一行，媒体查询内继续缩进。

组件引用 `foundations/theme.css` 中按用途命名的 `--color-*`。主题从 `palette.css` 取用基础色，在需要透明度时使用同一基础色的 RGB 通道。扩展暗色主题时，在根元素上按主题覆盖用途变量。地图图例的付费区动态颜色继续由车站配色提供，Three.js 场景材质由呈现层维护。

`scripts/styles.ts` 通过 esbuild 合并本地 `@import`，输出 `dist/styles.css`。CSS 变量、媒体条件和领域拆分均由原生 CSS 支持。
