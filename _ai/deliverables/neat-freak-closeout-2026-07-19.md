# tool-portal neat-freak 全仓收尾报告

收尾时间：2026-07-19 22:36 PDT

审计期间检测到仓库并发更新和生产重部署。本报告已丢弃更新前的 8 项测试及 30/4/6 mode 快照，以下只记录最终稳定的 schema v2 代码与生产事实。

## 范围与权威源

- `/Users/wanglei/Documents/磊哥的工具箱` 只是路径说明，不保存第二份源码。
- 唯一源目录：`/Users/wanglei/Desktop/入口/03_学习研究/AI开发项目源文件/tool-portal`。
- 清单权威：`config/catalog.json`；生产运行状态权威：`/var/lib/toolbox-control/state.json`。

## 事实矩阵

| 事实面 | 状态 | 结论与证据 |
|---|---|---|
| 代码 | `verified-current` | `npm run check`、11/11 测试、Shell/Python/独立 JS/HTML 内联 JS 语法、相对资产与隔离本地集成均通过。 |
| 运行态 | `verified-current` | 生产 10 个部署文件与当前工作区逐字节一致；健康接口报告 schema v2、28/8/4 受众分布、40 项在线；systemd、Nginx、URL 和真实浏览器已复核。 |
| 文档 | `changed-and-verified` | 项目事实、README、交接、决策、工作日志、huacai-admin 指引和项目索引已统一到现役模型；旧日志保留为历史快照。 |
| 规则 | `changed-and-verified` | `PROJECT.md` 与决策记录明确公开仓库推送安全门和 schema v2 三维策略；统一协议和项目规则链已读取。 |
| 记忆 | `generated-read-only` | Codex 记忆仅作历史线索，未编辑；其中旧的 URL 状态不作为当前证据，以本次生产实测为准。 |
| 工作区 | `pending` | 生产 schema v2 来自 dirty 工作区，远端 `main` 仍为 `76e72de`；公开仓库、Pages、历史工作流与大量未跟踪内部文件的边界尚未裁决。 |

## 最终现役事实

- 管理 9 个板块/页面和 31 个内容入口。
- 策略拆为受众（`public` / `owner` / `shared`）、公开展示（`listed`）和运行状态（`online` / `maintenance` / `offline`）。
- 生产为 28 项公开、8 项仅本人、4 项伙伴分享，40 项在线。
- 已配置伙伴凭据 0，待配置伙伴项目 4；配置前回退使用管理员总密码，不适合对外分享。
- `/my/`、`/my/business/` 返回 200；本人工作台、管理后台、`/huacai-admin/`、`/activity-kit/` 返回预期 401。
- `/opt/toolbox-control` 的 10 个部署文件与本地逐字节一致；最近备份 `/var/backups/toolbox-control/20260720T053351Z` 存在。

## 验证收据

- `npm run check` 通过；`npm test` 11/11 通过。
- 2 个 Python 图表脚本、部署 Shell、2 个独立 JavaScript 文件、28 个 HTML 中 16 段内联脚本语法通过。
- 38 个相对 HTML `href/src` 引用存在。
- 隔离本地服务通过健康、后台、工作台、公开页、跳转、401、PATCH 和维护 503 流程。
- Nginx `-t` 成功；`toolbox-control.service`、`toolbox-control-apply.path` active。
- Playwright：公开首页桌面和 390 × 844 均显示 21 张卡片；商业工具页显示 3 张卡片且控制台无错误。

## 风险与待用户决定

1. 公开边界：GitHub 仓库为公开，GitHub Pages 为 built/public，历史 `deploy-my.yml` 为 active。当前内部页面若直接推送，Pages 不会执行生产 Nginx 访问策略。应先决定仓库是否改为私有，并关闭或改造 Pages 与历史工作流。
2. Git 归档：最终复核时有 34 个状态条目（8 个已跟踪修改、26 个未跟踪条目）；公开边界裁决后再分类提交和推送。
3. 伙伴凭据：4 个 `shared` 项目尚未设置独立账号密码，暂时不能把管理员总密码或入口发给伙伴。
4. 浏览器警告：首页功能正常，但 `/favicon.ico` 返回 404；需要补充并走完部署与线上浏览器复验。
5. 服务器警告：Nginx 配置测试成功，但 `/www/server/panel/vhost/nginx/muxia.conf:18` 使用已弃用的 `listen ... http2` 写法；不属于本仓库生成配置，需在对应站点维护时单独处理。

## 清场候选（未删除）

- 当前按常见备份后缀识别到 1 个文件，19,875 字节；另有历史命名备份需在实际清场前重新按项目规则分类，不能凭名字直接删除。
- 6 个 `.DS_Store`。
- `.playwright-cli/`：31 个文件，约 300 KiB。
- `output/`：约 2.4 MiB。
- 路径指针目录 `/Users/wanglei/Documents/磊哥的工具箱` 中的 `.DS_Store` 和无提交的空 Git 元数据。

复核现场全部保留。以上删除、Git 提交/推送、GitHub Pages/工作流关闭均未执行，等待用户看完报告后明确确认。

## 明确边界

- `pending`：公开仓库与推送边界、dirty 工作区 Git 归档、4 个伙伴凭据、favicon 404、清场候选。
- `out-of-scope`：未使用管理员总密码登录后台，未在生产修改策略或凭据。
- 警告仍保留：首页 favicon 404；GitHub Pages/历史发布面仍 active；服务器另有非本项目的 Nginx `listen ... http2` 弃用警告。
