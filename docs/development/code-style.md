# 代码风格与维护约定

本项目参考本地 `nstarter-temlates/templates/service-express` 的 `.editorconfig`、`server/.eslintrc.js` 及 `nstarter-eslint-config/base.js`。采用模板的 TypeScript 四空格缩进，以及 `curly: all`、`max-statements-per-line: 1`、分号等基本可读性规则；不安装或复制整套 ESLint 依赖，也不迁入服务端框架相关规则。

## TypeScript

- UTF-8、LF、文件末尾换行；四空格缩进，不使用 Tab。JSON、HTML、CSS 和 Markdown 使用两空格。
- 一行只放一条 statement。`for` 的初始化、条件和递增仍属于同一个循环头，不为形式要求拆成不同循环。
- 条件分支和循环体必须带大括号；短回调内有多条语句时也必须分行。
- 一条变量声明优先只定义一个变量；对象配置、参数列表、几何数据和长表达式按语义换行，目标行宽约 120 字符。URL、来源原文和不可拆的标识符不强行截断。
- 语义段落之间最多保留一行空行；参数列表、对象或数组的开闭分隔符内侧不填充空行。模板字符串中的空白作为数据保留。
- 命名函数、类方法、访问器、构造器及模块级函数变量提供英文 JSDoc，说明用途、输入约定、返回含义或副作用中真正重要的内容。已有明确类型不逐项重复成无信息量的 `@param`；短匿名回调不强制写模板注释。
- 关键算法步骤、坐标框架、单位、来源与人工估计边界使用英文注释解释原因；不添加仅复述赋值动作的注释。
- 不把嵌套三元表达式当成控制流程。超过简单二选一时优先使用具名中间变量、分支或查表。
- 保持现有 DDD 依赖方向。样式整理不顺带调整布局数值、设施身份、地理来源或算法行为。

`.editorconfig` 与 `.vscode/settings.json` 提供编辑器默认值，VS Code 使用自带 TypeScript formatter，无需安装扩展。格式化源代码后，压缩仍只发生在 esbuild 构建阶段。

## 本地检查

```powershell
npm run check:style
npm run typecheck
npm test
npm run build
```

`check:style` 复用已锁定的 TypeScript 解析器，检查源码、脚本和测试的单行语句、分号、大括号、缩进、多余空行、换行及命名方法文档；测试替身不强制 JSDoc。多行字符串中的空白按数据保留。CSS 检查两空格及每行单条声明。

测试按业务领域维护于根目录 `tests/`，目录职责见 [测试说明](../../tests/README.md)。`npm test` 递归收集所有领域的 `*.test.ts`，不能因移动文件漏跑；`tests/fixtures/` 只放共享基线，不放可执行测试。

该检查是项目约定的可执行子集，不是完整 ESLint，也不会自动生成注释、翻译词条或重排领域代码。英文注释是否准确、复杂表达式是否易读仍需人工审查。

## 样式模块

参考博客项目的 foundations／components 组织方式，当前使用原生 CSS，入口为 `src/styles/index.css`：

```text
src/styles/
├── index.css
├── foundations/base.css          # 变量、重置、共享表面和画布容器
└── components/
    ├── chrome.css                # 品牌、顶部及页面标题
    ├── map.css                   # 画布标签、缩放、方位及降级提示
    ├── navigation.css            # 侧栏、楼层、设施筛选及图例
    └── credits.css               # 底部署名、版权模态框
```

每个组件就近维护移动端、宽屏和减少动态效果规则。共享变量放 foundations，避免为了覆盖其他组件不断追加新规则。选择器和声明块正常换行，每条属性一行，媒体查询内继续缩进。

esbuild 在 `scripts/styles.ts` 合并本地 `@import`，仍只输出一个 `dist/styles.css`，开发服务器和部署资源路径不变。当前没有需要 Sass 才能完成的 mixin 或计算，先不增加编译器；以后若采用 Sass，保持这些领域边界及单一产物契约。

已移除两 Tab 导览不再使用的旧路线卡片／路线开关样式。其余样式按组件保留原来的覆盖顺序；本批不重设计视觉或交互。
