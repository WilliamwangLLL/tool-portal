# AI 交接记录：tool-portal

更新时间：2026-07-19

## 最新状态

管理后台 V2 已上线，管理 9 个板块/页面和 31 个内容入口。除上线、隐藏、需要密码外，每个具体项目现在可以设置独立用户名和密码；项目密码不能访问其他项目或管理后台。

2026-07-19 晚的生产状态快照：30 项上线、4 项隐藏、6 项需密码。其中需密码包含 2 个板块/页面和 4 个仍使用旧共用总密码的项目；当前尚未给任何正式项目配置独立密码，测试凭据已经清理。

## 权威入口

- 本地源：`/Users/wanglei/Desktop/入口/03_学习研究/AI开发项目源文件/tool-portal`
- 清单：`config/catalog.json`
- 首页模板：`index.html`
- 商业工具模板：`business/index.html`
- 管理服务：`server.mjs`
- 线上首页：`https://www.haoyunlai.fun/my/`
- 线上后台：`https://www.haoyunlai.fun/toolbox-control/admin/`
- 部署命令：`./deploy/deploy-production.sh`

## 生产运行

- 应用目录：`/opt/toolbox-control`
- 持久状态：`/var/lib/toolbox-control/state.json`
- 独立密码元数据：`/var/lib/toolbox-control/credentials.json`
- 独立密码哈希：`/var/lib/toolbox-control/credentials/*.htpasswd`
- 审计日志：`/var/lib/toolbox-control/audit.jsonl`
- 状态备份：`/var/lib/toolbox-control/backups/`
- 服务：`toolbox-control.service`
- 状态应用监听：`toolbox-control-apply.path`
- 服务仅监听 `127.0.0.1:3520`，公网经 Nginx 访问。
- 最近部署备份：`/var/backups/toolbox-control/20260720T042122Z`

## 密码模型

- 管理后台和受保护的板块/页面使用管理员总密码。
- 内容项目通过后台“设置独立密码”创建单项目凭据；默认分享用户名可用 `guest`，密码至少 10 位。
- 项目密码使用独立 htpasswd 文件、独立 Basic Auth realm，服务器只保存加盐 SHA-512 哈希。
- 保存独立密码会自动启用项目密码模式；关闭弹窗后明文无法找回，只能轮换。
- 尚未迁移的旧密码项目会显示“共用总密码”警告；不要把管理员总密码发给伙伴。
- 外部站点项目只能保护工具箱分享入口，不能改变外部服务器的直访权限。

## 本次故障与修复

`/my/` 和 `/my/business/` 的 trailing-slash 请求曾把单文件 `alias` 与继承的 `index.html` 拼接为 `home.htmlindex.html` / `business.htmlindex.html`，导致 500。现在两个入口都由本地控制服务的 `/page/home`、`/page/business` 返回渲染文件，不再使用会触发目录索引的文件 alias。

## 验证基线

- `npm run check` 通过；`npm test` 8/8 通过。
- `/my/` 公开状态实测 200；商业工具页临时上线实测 200，恢复密码后为 401。
- 31 个项目的分享入口与 30 个可控直达地址共 61 条，状态检查 61/61 通过，无 5xx。
- 生产双项目隔离：A 凭据访问 A 成功、访问 B 返回 401；B 凭据访问 B 成功；测试后已清理凭据并重启服务。
- 生产后台桌面端和 390px 手机端 Playwright 验证通过，控制台 0 错误、0 警告。
- Nginx 配置测试成功，`toolbox-control.service` 与 `toolbox-control-apply.path` 正常。

## 边界与注意事项

- 页面模板来自生产环境反向同步，以本目录为唯一修改源。
- 新增工具必须同时更新清单和页面模板；测试会检查所有卡片是否已纳管。
- 部署后必须验证公开地址、目标直访、密码隔离和浏览器流程，不能只看退出码。
- 运行状态、凭据和审计日志都在 `/var/lib/toolbox-control`，部署不能覆盖。

## 下一步

- 用户按实际分享需求，为指定项目逐个设置正式独立密码，并把弹窗生成的账号、密码、分享链接发给对应伙伴。
- 如需撤销伙伴访问，直接对该项目“更换独立密码”；旧密码会立即失效。
