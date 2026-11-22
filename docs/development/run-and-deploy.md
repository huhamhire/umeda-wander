# 本地开发与部署

## 本地启动

需要 Node.js 24 或以上。在仓库根目录安装依赖并启动服务：

```sh
npm install
npm run dev
```

手动打开 <http://127.0.0.1:5173/>。开发服务默认监听 `0.0.0.0:5173`，局域网设备可通过本机局域网 IP 访问。用 `PORT` 环境变量覆盖端口。修改 `src/` 后服务会重新构建，刷新页面即可查看。

Windows PowerShell 若阻止执行 `npm.ps1`，将命令中的 `npm` 换成 `npm.cmd`。

## VS Code

安装依赖后，在「运行和调试」选择 **梅田地图 · 启动服务**，按 F5 启动服务。停止调试会结束服务。

**梅田地图 · 本地预览** 会在页面可访问后打开 Chrome。停止调试或按 `Shift+F5` 可结束本次预览的 Chrome 和开发服务。启动前确认 5173 端口空闲。

`Ctrl+Shift+B` 构建网页。「运行任务」提供风格检查、类型检查和测试。详见[启动配置](../../.vscode/launch.json)和[任务配置](../../.vscode/tasks.json)。

## 构建与发布

```sh
npm run build
```

入口为 `dist/index.html`。楼层与设施目录随页面交付，立体场景从 `dist/chunks/` 按需加载。通过 HTTP 或 HTTPS 静态托管，保留整个 `dist/` 的模块、样式、OSM 派生数据和 `LICENSE`。项目 MIT 许可和第三方软件许可证也随入口 HTML 保留。`dist/` 不纳入 Git。发布前按[验证与交付](./validation.md)选择对应检查。

地图分块和 `osm-derived-data.json` 各交付一份原始文件。本地开发服务按 `Accept-Encoding` 提供 Brotli 或 gzip 响应。静态部署可在主机或 CDN 启用 HTTP 压缩。

### 子路径部署

同一份 `dist/` 可部署在站点根目录或子目录。页面、样式、JS 模块和来源弹窗的数据链接使用相对路径，换目录时无需重新构建。

以 `/maps/umeda/` 为例，将 `dist/` 内的全部文件和子目录发布到该路径，保留 `index.html` 与 `chunks/` 的相对位置。静态主机应在 `/maps/umeda/` 提供 `index.html`，并将 `/maps/umeda` 重定向到带末尾斜杠的地址，同时保留查询参数。更新时一并发布入口和对应的模块分块。

在地图仓库内模拟同一路径：

```sh
npm run dev -- --base-path=/maps/umeda/
```

开发服务会在终端显示完整预览地址，无末尾斜杠的目录入口会自动重定向。

### GitHub Actions 与 Pages

[CI 工作流](../../.github/workflows/ci.yml)使用 Node.js 24 和 `npm ci` 安装锁定依赖。拉取请求及非默认分支运行会下载 Git LFS 文件，并执行样式检查、类型检查、测试和静态构建。默认分支推送或手动运行时，工作流执行样式检查、类型检查和静态构建，跳过测试和 LFS 下载，随后将 `dist/` 发布到 GitHub Pages。

启用站点时，在仓库的 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。项目站点通常位于 `https://<owner>.github.io/<repository>/`，实际地址由部署任务回传。页面资源沿用相对路径。[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
