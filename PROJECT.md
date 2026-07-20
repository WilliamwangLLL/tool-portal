# tool-portal

## 项目一句话

磊哥工具、调研报告的统一入口，以及对每个板块和内容入口进行上线、隐藏、密码访问控制的管理后台。

## 事实来源

- 唯一本地源目录：`/Users/wanglei/Desktop/入口/03_学习研究/AI开发项目源文件/tool-portal`
- 生产服务器：`root@www.haoyunlai.fun`
- 工具箱首页：`https://www.haoyunlai.fun/my/`
- 管理后台：`https://www.haoyunlai.fun/toolbox-control/admin/`
- 入口清单：`config/catalog.json`
- 运行状态：生产机 `/var/lib/toolbox-control/state.json`

## 当前状态

- 阶段：管理后台 V2 已上线。
- 管理范围：9 个板块/页面、31 个内容入口。
- 能力：上线、隐藏、需要密码、每个项目独立账号密码和分享链接；状态修改自动同步页面与 Nginx。
- 验证：8 项自动化测试、真实桌面/手机浏览器、61 条受控路径、双项目密码隔离均已通过。
- 当前部署方式：`./deploy/deploy-production.sh`；不是 GitHub Pages。

## 开工前必读

1. `/Users/wanglei/Desktop/入口/00_项目中枢/00_统一规则/AI_COMMON_PROTOCOL.md`
2. `PROJECT.md`
3. `AGENTS.md`
4. `CLAUDE.md`
5. `_ai/handoff.md`

## 重要规则

- `config/catalog.json` 是管理对象和路由的唯一清单；新增入口不能只改 HTML。
- 修改访问策略后必须验证“页面入口”和“目标地址直访”两个层面。
- 本机托管项目的隐藏/密码由 Nginx 强制执行，不能只隐藏卡片。
- 管理员总密码不得分享给伙伴；对外分享必须在具体项目上设置独立密码。
- 项目密码只保存哈希，关闭设置弹窗后不能找回明文，只能重新设置。
- 外部服务器项目只能控制本工具箱的入口，不能宣称已控制外站直访。
- 发布前运行 `npm run check && npm test`；发布后检查 Nginx、systemd、公开 URL 和真实浏览器。
- 保留生产部署脚本生成的备份，不手工覆盖运行状态和审计日志。
