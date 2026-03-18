# 发布说明

## 发布前检查

执行：

```bash
npm run check
```

通过后再执行：

```bash
npm run package:theme
```

## 当前发布产物

当前版本号为 `1.0.0`，打包后会得到：

```text
komari-theme-1.0.0.zip
```

压缩包根目录包含：

```text
komari-theme.json
dist/
preview/
```

可直接复核：

```bash
unzip -l komari-theme-1.0.0.zip
```

## 安装验证

```bash
komari theme install ./komari-theme-1.0.0.zip
```

## 文件边界

- `dist/`：真实运行时代码，必须存在且包含 `index.html`
- `komari-theme.json`：主题清单，必须与实际版本号、预览路径一致
- `preview/`：交付时一并打包的静态预览资源
- `README*.md`、`docs/**`：仓库文档，不要求进入主题运行时，也不会进入主题 zip

## 关于占位资源

当前预览资源使用仓库内可复核的 SVG 文件，而不是“后续补图”的口头占位：

- `preview/thumbnail.svg`
- `preview/dashboard-overview.svg`

这两份文件用于主题元数据和交付复核；真正被 Komari 渲染的是 `dist/` 内构建产物。

## 故障排查

### `npm run check` 失败

先分别运行：

```bash
npm run typecheck
npm run test
npm run build
```

确认是脚本、类型、测试还是构建步骤失败。

### `npm run package:theme` 失败

检查：

1. 系统是否存在 `zip`
2. `dist/index.html` 是否存在
3. `komari-theme.json.version` 是否可读取

### 主题无法安装

优先用以下命令核对压缩结构：

```bash
unzip -l komari-theme-1.0.0.zip
```

如果 `komari-theme.json` 没有位于 zip 根目录，或 `dist/` 缺失，Komari 将无法正确识别主题。
