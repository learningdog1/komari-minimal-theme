# 开发说明

## 工作区职责

当前仓库把主题交付拆成两层：

- `src/**` 与 `dist/`：主题页面运行时代码和构建产物
- `komari-theme.json`、`preview/**`、`scripts/package-theme.mjs`：主题清单、预览与打包收尾

## 日常命令

安装依赖：

```bash
npm install
```

开发模式：

```bash
npm run dev
```

静态校验：

```bash
npm run typecheck
npm run test
npm run build
npm run check
```

## 主题清单

`komari-theme.json` 使用 Komari 官方支持的字段：

- `name`：主题全名
- `short`：主题短标识，只包含字母和数字
- `description`：主题描述
- `version`：主题版本
- `author`：作者字符串
- `preview`：预览图相对路径
- `configuration`：`managed` 动态配置定义

当前配置项全部使用 camelCase key，并与运行时消费的主题设置保持一致。`defaultGroup` 在管理面板里用空字符串表示“全部分组”，主题运行时会将空字符串视作未配置。

## 预览资源

当前仓库保留两份 SVG 预览资源：

- `preview/thumbnail.svg`：`komari-theme.json.preview` 指向的缩略图
- `preview/dashboard-overview.svg`：仓库内静态复核图

这两份文件是交付物的一部分，但不参与 `dist/` 的运行时代码引用。

## 打包流程

```bash
npm run package:theme
```

该命令会：

1. 先执行 `npm run build`
2. 读取 `komari-theme.json.version`
3. 在仓库根目录输出 `komari-theme-<version>.zip`
4. 将 `komari-theme.json`、`dist/`、`preview/` 直接写入 zip 根目录

## 变更约束

- 若只调整主题元数据或文档，不应修改 UI 与核心数据层源码。
- 若为了恢复构建链必须修复代码，应限制在最小范围并先复现问题。
- 所有文档中的命令、路径、产物名必须与仓库现状一致，不能保留“待补充”式的不可验证说法。
