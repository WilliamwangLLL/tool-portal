# tool-portal

## 项目一句话

磊哥工具与调研报告的统一入口，包含动态板块、磊哥总控台和按项目独立密码分享的管理后台。

## 事实来源

- 唯一本地源：`/Users/wanglei/Desktop/入口/2_工作/开发项目/tool-portal`
- 对象与路由清单：`config/catalog.json`
- 生产运行状态：`/var/lib/toolbox-control/state.json`
- 生产服务器：`root@www.haoyunlai.fun`
- 公开首页：`https://www.haoyunlai.fun/my/`
- 磊哥总控台：`https://www.haoyunlai.fun/toolbox-control/workspace/`
- 管理后台：`https://www.haoyunlai.fun/toolbox-control/admin/`

## 当前状态

- 阶段：管理后台 V4 已上线，运行时状态 schema 为 v3。
- 管理范围：5 个非空动态板块、2 个总页面、40 个内容项目；可分组成员均有唯一板块归属。
- 项目分类：清单 29 个 `public`、9 个 `owner`、4 个 `shared`；运行态 sections+items 为 33 public / 6 owner / 3 shared；5 个板块和 2 个总页面均为 `public`。
- 运行状态：47 个管理对象均为 `online`，0 个维护、0 个停用。
- 板块规则：新建时必须选择首个项目；移动最后一个成员离开后，空板块自动删除；可改名、排序和切换首页/商业工具页；子页面没有公开项目时自动隐藏导航入口。
- 分享凭据：1 个 `shared` 项目已配置独立凭据，另 3 个待设置；待设置项目仅管理员可访问。
- 用户体系：当前不做开放注册；未来只有出现跨项目、多人频繁授权或审计需求时才考虑邀请制账号。
- 最新公开教程：Grok Bot 使用教程，位于知识项目板块；直达地址 `https://www.haoyunlai.fun/my/reports/grok-bot-guide/`，网关 `https://www.haoyunlai.fun/toolbox-control/go/grok-bot-guide`。
- 最新公开项目：月面漫游 · SELENE，知识项目；https://www.haoyunlai.fun/my/lunar-rover/，网关 https://www.haoyunlai.fun/toolbox-control/go/lunar-rover；版本 1.0.2。
- 其他公开项目：曼哈顿 3D 城市 · ISLE，位于知识项目；直达 `https://www.haoyunlai.fun/my/manhattan-atlas/`，网关 `https://www.haoyunlai.fun/toolbox-control/go/manhattan-atlas`；版本 0.2.0。
- 最近部署备份：`/var/backups/toolbox-control/20260922T074707Z`。

- 最新上线：圆周率数字搜索器 1.0.1，https://www.haoyunlai.fun/my/pi-digit-explorer/ ，最多 15 位输入、10 亿位搜索，单任务并发，详见最新交接。

- 最新内部资料：退休开拍吧 · 980会员产品文档 1.0.0，商业工具板块，任何持链接者可免密码访问，公开首页不列出；https://www.haoyunlai.fun/toolbox-control/go/retire-kaipai-membership 。顶部精简版、下方详细版；本次发布证据见最新交接。

## 验证基线

- `npm run check` 通过，`npm test` 16/16 通过。
- 线上 74 个分享网关、页面和目标路由完成矩阵检查：0 个 5xx、0 个策略失败、0 个网络错误。
- 本地接口和浏览器均验证新建板块、跨页面移动项目、唯一归属与空板块自动删除。
- OpenClaw 完成公开 → 仅自己 → 维护 → 停用 → 恢复公开的线上闭环：302/200、401、503、404、恢复正常。
- 双项目临时凭据验证：A 可访问 A、不可访问 B；B 可访问 B；伙伴凭据不可进入后台；测试凭据已全部清理。
- 生产管理后台、磊哥总控台、公开首页和商业工具页完成桌面/390px 真实浏览器检查，最终控制台 0 错误、0 警告。
- 当前商业工具子页无公开项目，首页自引用卡片、总控台快捷入口和后台顶部入口均自动隐藏；三个真实公开工具仍在首页。
- 在线教育行业报告已完成传输哈希、网关 302、直达 200、首页卡片验证。
- Grok Bot 教程已完成传输哈希、网关 302、直达 200、课时/静态资源 200、首页卡片验证。
- Nginx 使用原始请求 URI 判断权限，避免 location rewrite 后绕过认证；`cohort-api` 与黄金歌曲后台直达保护已复验为 401。

## 开工前必读

1. `/Users/wanglei/Desktop/入口/4_系统管理/项目中枢/00_统一规则/AI_COMMON_PROTOCOL.md`
2. `PROJECT.md`
3. `AGENTS.md`
4. `CLAUDE.md`
5. `_ai/handoff.md`

## 重要规则

- 新增入口必须同时更新 `config/catalog.json` 和对应页面模板。
- 每个新增项目必须进入 `config/catalog.json` 的初始板块；运行时每个可分组对象必须保持唯一归属，不能创建空板块。
- 访问策略必须分别考虑 `audience`、`listed`、`status`，不要恢复旧的单一 mode。
- 安全结论必须验证分享网关和目标直达地址；隐藏卡片不是安全边界。
- `shared` 项目配置独立凭据后才能发给伙伴；管理员总密码禁止外传。
- 外部服务器项目只能控制工具箱网关，不宣称控制外站直达。
- 发布前运行 `npm run check && npm test`；发布后检查 Nginx、systemd、公开 URL、权限矩阵和真实浏览器。
- `/var/lib/toolbox-control` 是持久运行数据，发布不得覆盖；生产备份不得随意删除。
- 当前公开 Git/Pages 边界未裁决，不把内部页面和控制服务整体推送到公开 `main`。

- 2026-09-22最新上线：银发观察0.1.0，知识项目；https://www.haoyunlai.fun/my/silver-observer/ ，公开阅读、管理员编辑，详见最新交接。
