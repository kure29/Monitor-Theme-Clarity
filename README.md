# Clarity

为 [monitor](https://github.com/monitor-probe/monitor) 设计的苹果风格公开状态页主题。界面简洁，支持明暗模式和四种节点视图。

![Clarity 主题预览](preview.png)

## 功能

- 大卡片、小卡片、迷你卡片、列表四种视图
- 节点分组、详情、历史图表和实时数据
- 管理员可设置节点展示方式和顶部概览；访客可按分组浏览节点
- 不覆盖站点原有 favicon

## 安装

1. 下载最新的 [theme.tar.gz](https://github.com/kure29/Monitor-Theme-Clarity/releases/latest/download/theme.tar.gz)。
2. 在 monitor 后台的「主题」页面上传并启用 **Clarity**。

管理员登录后，可在公开状态页右上角打开「主题设置」。此功能需要支持主题配置接口的 monitor 版本；旧版仍可使用默认界面。

## 本地开发

```bash
npm ci
MONITOR_HUB=https://your-monitor.example.com npm run dev
```

运行 `npm run package` 可生成安装包 `theme.tar.gz`。

## 致谢与许可

基于 [monitor-theme-default](https://github.com/monitor-probe/monitor-theme-default) 的参考实现，多视图思路参考 [LuminaPlus](https://github.com/kure29/Monitor-Theme-LuminaPlus)。遵循 [MIT 许可](LICENSE)。
