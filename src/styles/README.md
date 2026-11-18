# 样式维护

入口为 `index.css`，构建时由 esbuild 合并成 `dist/styles.css`。共享布局和重置在 `foundations/`。品牌、地图、导览和版权在 `components/` 下各有目录。

`foundations/palette.css` 按色系维护基础色，`foundations/theme.css` 将基础色映射为界面用途，并为面板、标签、阴影和遮罩添加透明度。组件使用 `--color-*` 变量。扩展暗色主题时，在根元素上按主题设置对应的用途颜色。

各领域在自己的 `index.css` 引用通用样式和同级的 `mobile.css`。后者用于 760px 及以下的窄屏，其他媒体查询留在该领域的 `base.css`。

使用两空格缩进，每条属性独占一行。新增规则前先检查所属领域的现有声明。[代码风格](../../docs/development/code-style.md)
