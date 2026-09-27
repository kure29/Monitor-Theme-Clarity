# Clarity · monitor 公开状态页主题

一款为 [monitor](https://github.com/monitor-probe/monitor) 设计的独立公开状态页主题。以 macOS 仪表盘为主要方向：清楚的状态层级、克制的半透明导航、明暗模式，以及适合手机的节点卡片。参考 [LuminaPlus](https://github.com/kure29/Monitor-Theme-LuminaPlus) 的多视图思路，提供大卡片、小卡片、迷你卡片和列表四种节点布局。

主题沿用官方默认主题的公开数据接口和实时更新逻辑，支持节点分组、节点详情、历史指标和网络延迟图表。已登录的管理员可在公开页右上角打开「主题设置」，配置默认节点布局和顶部概览；设置通过 hub 的主题配置接口保存，对所有访客生效。访客自行切换的布局仅保存在自己的浏览器。hub 自带的后台与登录页仍由 hub 提供。

主题不附带 favicon，也不在 HTML 中指定图标，不会用主题图标覆盖站点原有 favicon。

## 本地开发

```bash
npm ci
MONITOR_HUB=https://your-monitor.example.com npm run dev
```

数据源需要开放公开状态页。不设置 `MONITOR_HUB` 时，开发代理连接 `http://127.0.0.1:9911`。访问本地 Vite 地址查看主题；没有 hub 时，页面会显示接口错误。

## 构建与安装

```bash
npm run build
npm run lint
npm test
npm run package
```

`npm run package` 在项目根目录生成 `theme.tar.gz`，其压缩包根目录包含 `theme.json`、`preview.png` 和 `dist/`。可从 [Releases](https://github.com/kure29/Monitor-Theme-Apple/releases) 下载发布包，在 monitor 后台的主题页上传并切换到 **Clarity**。主题详情路由为 `/node/{id}`；若反向代理或 WAF 使用路径白名单，需要允许这个前缀。

`preview.png` 使用本地模拟节点制作，仅用于展示主题外观。

「主题设置」依赖支持 `/api/themes/clarity/config` 的 monitor 版本。较旧的 hub 仍可显示状态页和切换卡片布局，但无法保存管理员默认设置。

## 来源与许可

本主题基于 [monitor-theme-default](https://github.com/monitor-probe/monitor-theme-default) 的 React + Vite 参考实现，保留其数据访问、格式化、图表及测试代码，并重新设计公开页视觉。沿用原项目的 MIT 许可，详见 [LICENSE](LICENSE)。
