# 工作日志：tool-portal

## 2026-07-05 Codex 接入项目中枢

做了什么：

- 新增统一项目文件。
- 未修改业务页面。

## 2026-07-19 Codex 上线工具箱管理后台 V1

做了什么：

- 盘点生产环境工具箱、商业工具页和独立工具路由，把线上页面与静态内容同步回唯一源目录。
- 建立 `config/catalog.json`，纳管 9 个板块/页面和 31 个内容入口。
- 新增管理后台，支持每项“上线、隐藏、需要密码”，同时控制页面展示和本机目标地址直访。
- 新增状态原子保存、最多 50 份状态备份、JSONL 审计日志、Nginx 规则生成与失败回滚。
- 新增 systemd 服务/path 单元和可回滚的生产部署脚本。
- 修复重部署未重启服务、移动端搜索过滤、favicon 与 CSP 等验收中发现的问题。
- 更新 README、PROJECT、交接文档与项目中枢索引，明确唯一源目录和外部服务器边界。

验证：

- `npm run check` 通过，`npm test` 6/6 通过。
- 生产 Nginx 配置测试通过，两个 systemd 单元正常运行。
- 线上 OpenClaw 完成 200/404/401/200 三状态循环并恢复上线。
- 管理后台真实桌面/手机浏览器通过，无控制台错误。

部署：

- 生产程序：`/opt/toolbox-control`
- 最近备份：`/var/backups/toolbox-control/20260720T033902Z`

## 2026-07-19 21:25 Codex 修复入口 500 并上线项目独立密码

做了什么：

- 从生产 Nginx 错误日志定位 `/my/`、`/my/business/` 的单文件 alias 被拼接 `index.html`，分别形成 `home.htmlindex.html`、`business.htmlindex.html`。
- 改为由控制服务的 `/page/home`、`/page/business` 返回渲染页面，修复首页与商业工具 trailing-slash 500。
- 为每个内容项目新增独立用户名、密码、认证域和分享链接；板块与管理后台继续使用管理员总密码。
- 新增密码设置/轮换弹窗、随机密码、显示密码、一次性复制账号密码与链接，以及旧共用密码风险提示。
- 密码只保存加盐 SHA-512 哈希；没有独立密码的项目不能直接切换到可分享密码状态。
- Nginx 新增动态密码文件映射，systemd path 同时监听状态和凭据变化；完善部署回滚对生成配置的恢复。

验证：

- `npm run check` 通过，`npm test` 8/8 通过。
- 首页 200；商业工具页临时上线 200，恢复密码后 401。
- 61 条分享/直达路径检查全部通过，无 5xx。
- 生产双项目隔离验证通过：A 密码不能访问 B；测试凭据已清理。
- 桌面端与 390px 手机端真实浏览器通过，控制台 0 错误、0 警告。

部署：

- 生产程序：`/opt/toolbox-control`
- 最近备份：`/var/backups/toolbox-control/20260720T042122Z`

## 2026-07-19 22:25 Codex neat-freak 全仓收尾审计

做了什么：

- 从 `/Users/wanglei/Documents/磊哥的工具箱` 路径指针追溯到唯一源目录，机械枚举全仓文件、规则链、Markdown、Git/worktree 与清理候选。
- 建立代码、运行态、文档、规则、记忆和工作区事实矩阵，未编辑 Codex 机器生成记忆。
- 修正 `PROJECT.md`、`README.md`、`_ai/handoff.md` 与 `huacai-admin/README.md` 中的发布边界、旧域名/示例密码和浏览器警告说法；在 `_ai/decisions.md` 记录公开仓库推送安全门。
- 生成 `_ai/deliverables/neat-freak-closeout-2026-07-19.md` 作为本次知识收尾凭证。

验证：

- `npm run check` 通过；`npm test` 8/8 通过。
- 部署 Shell、2 个独立 JS、2 个 Python 脚本、26 个 HTML 中 14 段内联 JS 均通过语法检查；39 个相对 HTML 资产引用存在。
- 隔离本地服务的健康、状态、渲染、跳转和 PATCH 流程通过。
- 生产 8 个核心文件与本地逐字节一致；systemd/Nginx 正常，运行态为 30 上线 / 4 隐藏 / 6 需密码，公开首页桌面与 390px 浏览器流程通过。

未执行：

- 未提交或推送 dirty 工作区，未关闭 GitHub Pages/历史工作流，未部署 favicon 修复。
- 未删除备份、`.DS_Store`、Playwright 产物、`output/` 或路径指针目录中的空 Git 元数据；等待用户看完完整报告后再确认清场。

## 2026-07-19 22:36 Codex 并发版本复核与终态修正

发生了什么：

- neat-freak 审计期间检测到同一仓库出现并发代码更新和生产重部署，因此停止沿用 22:25 的代码、测试和运行状态结论。
- 重新读取最终代码、catalog schema v2、部署清单和生产状态，并把 `PROJECT.md`、`README.md`、`_ai/handoff.md`、决策记录、项目索引和收尾报告统一到最终版本。
- 22:25 日志中的 8/8 测试和 30 上线 / 4 隐藏 / 6 需密码是并发更新前的历史快照，由本条终态记录取代，不删除旧日志。

最终模型：

- 9 个板块/页面、31 个内容入口；访问策略拆为受众、公开展示、运行状态。
- 生产为 28 项 `public`、8 项 `owner`、4 项 `shared`，40 项 `online`。
- 0 个已配置伙伴凭据，4 个 `shared` 项目待配置独立密码；配置前回退到管理员总密码，不适合对外分享。

最终验证：

- `npm run check` 通过，`npm test` 11/11 通过；部署 Shell、2 个独立 JS、2 个 Python 脚本、28 个 HTML 中 16 段内联 JS 和 38 个相对 HTML `href/src` 引用均通过复核。
- 隔离本地集成通过健康、后台、工作台、公开跳转、受保护入口、策略 PATCH 和维护状态流程。
- 生产 10 个部署文件与本地逐字节一致；Nginx 配置通过，两个 systemd 单元 active，最近备份为 `/var/backups/toolbox-control/20260720T053351Z`。
- 线上 `/my/`、`/my/business/` 为 200；本人工作台、管理后台、本人入口和待配置伙伴入口为预期 401。
- 公开首页桌面端和 390px 手机端显示 21 张卡片；商业工具页显示 3 张卡片。商业页控制台无错误，首页仍有 `/favicon.ico` 404。
- Nginx 配置有效；服务器另有 `/www/server/panel/vhost/nginx/muxia.conf:18` 的旧式 `listen ... http2` 弃用警告，来源不在本项目生成配置中。

仍未执行：

- 未删除任何清场候选，未提交或推送 Git，未变更 GitHub Pages/历史工作流，也未使用管理密码修改生产策略或凭据。

## 2026-07-19 22:46 Codex 工具箱管理后台 V3 与访问分层

做了什么：

- 将旧的“上线 / 隐藏 / 需要密码”迁移为受众、公开展示、运行状态三个维度；V1 生产状态按用户批准的清单迁移，不把旧隐藏误判成停用。
- 完成 19 个公开项目、8 个仅自己项目、4 个小范围分享项目和 9 个公开板块/页面的正式分类。
- 重做管理后台，增加公开、仅自己、小范围分享、停用维护四个视图；板块设置收纳为高级项。
- 新增管理员工作台，统一显示全部公开、个人和分享项目；公开首页和商业工具页只保留公开项目。
- 分享项目使用独立密码文件和认证域，同时保留管理员哈希；伙伴密码不能跨项目或进入后台。
- 新增维护 503、停用 404；部署备份覆盖应用、运行数据、密码、systemd 和 Nginx，并完善失败自动回滚。
- 修复 Nginx location rewrite 后 `$uri` 变化导致 `/cohort-api/` 和声乐后台认证绕过的问题，权限规则改用原始请求 URI。
- 修复公开页 favicon 404，校准公开页面文案；不建设开放注册，保留未来邀请制账号升级路径。

验证：

- `npm run check` 通过，`npm test` 11/11 通过。
- 72 个生产网关、页面与直达路由通过访问矩阵：0 个 5xx、0 个策略失败。
- OpenClaw 完成公开、仅自己、维护、停用、恢复公开闭环，目标状态分别为 200/302、401、503、404、恢复正常。
- 两个分享项目完成临时独立凭据隔离验证，伙伴 A 不能访问项目 B 或后台；管理员哈希保留；测试凭据已清理为 0。
- 管理后台、管理员工作台、公开首页和商业工具页完成桌面与 390px Playwright 验证，最终控制台 0 错误、0 警告。
- Nginx 配置通过；`toolbox-control.service` 和 `toolbox-control-apply.path` active。

部署：

- 生产程序：`/opt/toolbox-control`
- 最终部署备份：`/var/backups/toolbox-control/20260720T054355Z`
- 正式状态：19 个公开项目、8 个仅自己项目、4 个小范围分享项目；9 个板块/页面公开；40 个对象在线；正式分享凭据 0、待设置 4。

同步：

- 更新 README、PROJECT、决策、交接、项目总览和 V3 neat-freak 收尾凭证。
- 未提交或推送公开仓库，未删除备份、历史页面副本、Playwright 产物或 dirty 工作区内容。

## 2026-07-19 23:41 Codex 动态板块管理与磊哥总控台 V4

做了什么：

- 把运行时状态从 schema v2 升级到 v3，将固定总页面、动态板块和内容项目拆开；V2 生产状态迁移时保留全部项目访问策略。
- 建立 7 个初始非空板块，为 31 个项目和“商业工具页面”配置唯一归属；后台可创建、改名、排序、切换显示页面和移动项目。
- 新建板块必须同时选择首个成员；项目移走导致来源板块为空时，服务端自动删除来源板块并写入审计记录。
- 公开首页和商业工具页改为按运行时板块动态重组；板块状态控制目录分组，项目权限和独立密码继续控制真实访问。
- 将“我的工作台”升级为“磊哥总控台”，增加公开工具箱、公开商业工具、我的私人工具、管理后台四个大入口；公开页增加右上角和页脚“磊哥入口”。

验证：

- `npm run check` 通过，`npm test` 15/15 通过。
- 隔离本地接口和 Playwright 均完成创建板块、把 Dan Koe 项目移到商业工具页、再移回公司调研并自动删除空板块的闭环。
- 生产 74 个分享网关、页面和目标路由：0 个 5xx、0 个策略失败、0 个网络错误。
- 生产 10 个部署文件与本地 SHA-256 完全一致；状态为 schema v3、7 个板块、32 个成员、2 个总页面、31 个项目、0 个正式分享凭据。
- 公开首页、商业工具页、磊哥总控台和管理后台完成桌面/390px 真实浏览器检查，最终控制台 0 错误、0 警告；匿名访问总控台和后台仍为 401。

部署与同步：

- 生产备份：`/var/backups/toolbox-control/20260720T063443Z`。
- 更新 README、PROJECT、决策、交接、项目总览、路径指针和 V4 neat-freak 收尾凭证。
- 未提交或推送公开仓库，未删除任何历史备份、Playwright 产物或 dirty 工作区内容。

## 2026-07-20 00:20 Codex 删除空商业工具页入口

做了什么：

- 确认首页多余的“商业工具”卡片是指向当前 0 个公开项目的子页面，不是下方三个真实工具中的任何一个。
- 公开页渲染增加“子页至少有一个可公开项目”条件；无项目时自动隐藏入口，有项目时自动恢复。
- 磊哥总控台和管理后台同步隐藏空子页面快捷入口，避免从其他管理页再进入空页。
- 保留 `/my/business/` 旧地址作为兼容路由，没有破坏历史链接或未来再启用能力。

验证：

- `npm run check` 通过，`npm test` 16/16 通过；新增回归测试覆盖“子页公开项目归零后不显示入口”。
- 生产首页为 200，多余子页入口为 0，19 张真实公开卡片仍在；公众号排版器、黄金歌曲匹配测评和主理人测评均存在。
- Playwright 完成 1440px 桌面端和 390px 移动端验收：无横向溢出，控制台 0 错误、0 警告。通过只读 SSH 隧道复验总控台和后台，两处空页入口均已隐藏。
- 匿名访问总控台和后台仍为 401；`toolbox-control.service` 与 `toolbox-control-apply.path` 均为 active；正式项目独立凭据仍为 0。

部署与同步：

- 生产备份：`/var/backups/toolbox-control/20260720T071643Z`。
- 同步 README、PROJECT、决策、交接和项目总览到当前 5 个板块、38 个管理对象的生产事实。
- 未提交或推送公开仓库，未删除历史备份或修改生产权限/凭据。

## 2026-07-28 20:37 Codex 发布在线教育行业调研报告

做了什么：

- 将 WorkBuddy 生成的《中国在线教育行业调研报告 · 2026年7月》纳入权威项目源，保存为 `reports/online-education-2026-07/index.html`，并补充空 favicon 避免浏览器 404。
- 在 `config/catalog.json` 新增公开项目 `report-online-education-2026-07`，为首页模板增加报告卡片，并同步更新目录完整性测试。
- 报告文件上传至 `/www/wwwroot/default/my/reports/online-education-2026-07/index.html`，随后通过 `./deploy/deploy-production.sh` 发布控制服务和目录配置。
- 通过生产管理 API 将新项目移动到现有“各类调研”板块；生产状态保持 5 个非空板块，新项目为 `public + listed + online`。

验证：

- `npm run check`、`npm test` 和 `git diff --check` 通过，自动化测试为 16/16。
- 本地与生产报告 SHA-256 均为 `d6aa7c5d04dee8be98eeba3dd3282dd9cacb3a8a281c2b4253bad6bf5c3ca556`；本地与生产 `config/catalog.json` SHA-256 均为 `14f95967c2258f496c782dc8f6e11179ad2c26cd4c5f988490a42fafa5e1793f`。
- 报告直达地址返回 200，网关返回 302 到直达地址，公开首页显示新卡片；Playwright 从首页点击进入报告，并完成桌面端与 390px 移动端检查，报告页控制台 0 错误、0 警告。
- `toolbox-control.service` 与 `toolbox-control-apply.path` 均为 active；健康接口显示 schema v3、5 个板块、34 个页面/项目策略对象全部在线。

部署与同步：

- 生产备份：`/var/backups/toolbox-control/20260729T033514Z`。
- 同步 `PROJECT.md`、`README.md`、`_ai/handoff.md`、本工作日志和项目总览到当前 5 个板块、2 个总页面、32 个项目、39 个管理对象的生产事实。
- 当前为 `mba/tool-portal-20260728` 分支；未提交或推送公开仓库，未删除历史备份、Playwright 产物或其他 dirty 工作区内容。

## 2026-09-01 18:52 PT Codex 发布 Grok Bot 中文教程

做了什么：

- Saved tutorial at reports/grok-bot-guide/ with relative links.
- Added public catalog item grok-bot-guide to knowledge-projects and audienceDefaults.public.
- Added homepage card; tests now 33 items / 23 public with grok-bot-guide assertion.
- rsync then deploy-production.sh. Did not wipe toolbox-control state. Migration set public+listed+online.
- No git commit or git push.

验证：

- tests 16/16 pass.
- Direct URL 200 with tutorial text; lessons/css/js/svg 200.
- Gateway 302 to /my/reports/grok-bot-guide/.
- Homepage 200 with Grok Bot card.
- Runtime schema v3, 5 boards, 33 items on knowledge-projects.
- Backup 20260902T015223Z. Synced PROJECT README handoff. No public git push.


## 2026-09-05 12:11 PT Codex 发布曼哈顿 3D 城市

- 用户明确要求将已完成的三维城市场景上传到磊哥的工具箱。
- 新增 `manhattan-atlas` 清单、公开默认值、知识项目归属与首页卡片；同步既有目录完整性和页面渲染测试，check 与 16/16 测试通过。
- 先发布独立静态应用 0.2.0，再通过统一部署脚本更新目录；备份 `/var/backups/toolbox-control/20260905T190340Z`。
- 公开地址：https://www.haoyunlai.fun/my/manhattan-atlas/；网关：https://www.haoyunlai.fun/toolbox-control/go/manhattan-atlas。真实浏览器首页可见新卡片，场景渲染 5,948 栋楼，地标/普通建筑聚焦、独立查看、昼夜与复位通过，控制台无 error/warn。
- 参考图 0600 文件模式曾导致 403；已改为 0644，应用构建脚本规范静态文件权限。最终逐文件公网校验回执保存在源项目 `outputs/toolbox-delivery.json`。
- 现有持久权限与发布备份逐项一致；不覆盖运行态板块排序。源代码发布边界未改变，未向公开 GitHub/Gitee 推送此内部控制目录。
- neat-freak 定向收尾：更新 README、PROJECT、交接和本工作日志；既有手机/跨浏览器回归范围未扩大，无用户文件清场。

## 2026-09-05 12:24 PT · SELENE 月面漫游发布

用户要求上传到磊哥的工具箱。新增 lunar-rover 清单、公开分类、knowledge-projects 初始归属与首页卡片；同步精确计数和公开渲染检查，check 与 16/16 测试通过。新应用版本 1.0.2，地址 https://www.haoyunlai.fun/my/lunar-rover/。仅上传新增应用与清单/模板，生产备份 selene-20260905T191821Z；原 36 个策略对象和 5 个板块保留，新增对象 public/listed/online。公网逐文件哈希、资源递归检查、页面与网关、真实浏览器交互通过；Nginx 和两服务状态正常。neat-freak 定向同步文档；保留既有 dirty 工作区，未整体推送内部控制代码到公开 Git。

## 2026-09-05 松间家居探索入口

- 新增 `songjian-home` 到公开“知识项目”；真实 URL：https://www.haoyunlai.fun/my/songjian-home/ ，网关 `/toolbox-control/go/songjian-home`。
- 网页源码：`/Users/wanglei/Documents/随意的话题/house-atlas`；独立静态版 1.1.0，17 个文件服务器与公网哈希均通过。
- 使用 `deploy/deploy-production.sh` 发布，备份 `/var/backups/toolbox-control/20260905T192330Z`；生产当前 36 个项目、2 个固定页面、5 个运行板块。既有权限、板块标题/顺序/归属与部署前比较保留。
- 检查及测试 16/16 通过；直达与全部静态文件 200，网关正确跳转，首页恰好一个入口。真实浏览器确认模型渲染、六房间 1.6 m 漫游、平面默认线框、白模、家具显隐和夜晚 10 灯；错误日志为空。
- 本轮只修改目录、首页、对应测试和交接记录。保留其他 dirty 工作区；月面漫游在本轮发布前已上线，发布基线重新核验后保留。按现有公开边界规则未整体提交/推送 tool-portal。
- pending：手机真机性能与长时间漫游未验收。Three.js 大块和 Vinext manifest 提示保留在源项目文档。

## 2026-09-08 圆周率数字搜索器上线

- 新增 `pi-digit-explorer`，知识项目板块，public/listed/online。直达 https://www.haoyunlai.fun/my/pi-digit-explorer/ ，网关 /toolbox-control/go/pi-digit-explorer，首页入口唯一。
- 服务器版 1.0.1：最多 15 位输入，前 100 万～10 亿位；数据独立存于 /var/lib/pi-digit-explorer，完整 10 亿位与本机 53 块 SHA-256 一致。源码为同级 pi-digit-explorer；本机版保留 100 亿位上限。
- 独立服务 pi-digit-explorer.service，127.0.0.1:8766；CPUQuota=50%、MemoryMax=256M、单任务并发，Nginx 每 IP 搜索 6 次/分钟（burst 2）。数据为只读，公开服务禁止按请求增加下载。
- 工具箱 check、16/16 测试通过。公网 4 个静态文件哈希与发布物一致；345 → 1700～1702、15 位数字 → 1～15；完整 10 亿位未匹配搜索实测 5.64 秒（单次观测，不承诺固定耗时）。超范围请求 400。浏览器无错误或警告。
- 原有 items/sections 权限及板块标题、顺序、归属逐项保留；只新增本项目一个成员。管理后台、/cohort/、/huacai-dashboard/ 仍 401。Nginx 与三项服务检查正常。
- 备份：/var/backups/toolbox-control/20260909T010326Z；应用接入前 Nginx 与状态备份 /var/backups/pi-digit-explorer/20260909T005247Z。上线后可用磁盘约 11 GB。
- 仅发布授权内容，保留其他未提交工作，未 commit/push。


## 2026-09-09 退休开拍吧内部产品文档上线

- 版本：1.0.0；ID：`retire-kaipai-membership`；商业工具板块，唯一归属。
- 网关：https://www.haoyunlai.fun/toolbox-control/go/retire-kaipai-membership
- 直达：https://www.haoyunlai.fun/my/reports/retire-kaipai-membership/
- 权限：`owner / listed:false / online`，使用已有管理员认证；公开首页不显示内部内容。
- 内容：顶部精简版，下方完整详细版；源稿为 `09_直播相关/deliverables/退休开拍吧_内部产品文档_20260909_v1.html`，发布副本保存在本项目 `reports/retire-kaipai-membership/`。
- HTML SHA-256：`5caf551c6d69ab041730b7da0a0701ba95c5ccca88c25f6af2c34b83f829371c`，本地与服务器一致。
- 验证：check 通过，16/16 测试通过；Nginx 配置通过，控制服务与原圆周率服务 active；未认证网关、直达、index.html、release.json 均为 401，公开首页和圆周率页面均为 200。
- 原有所有项目、页面策略、板块顺序与成员关系保持，唯一新增本项目；公开首页没有新内部条目。
- 浏览器访问被管理员认证拦截，未进行登录后的视觉验收。
- 官方部署备份：`/var/backups/toolbox-control/20260909T161656Z`。
- 本地清单、商业工具模板及测试计数已同步部署版本；未提交或推送 Git。


## 2026-09-09 退休开拍吧文档改为免密码链接访问

- 用户明确确认：任何拿到链接的人都可免密码查看。
- 通过现有管理 API 将 `retire-kaipai-membership` 运行态调整为 `public / listed:false / online`，其他项目及板块保持原样；清单默认分类未修改，实际访问以持久运行状态为准。
- 链接：https://www.haoyunlai.fun/toolbox-control/go/retire-kaipai-membership
- 无认证请求跟随网关到直达页面返回 HTTP 200；线上文档与原稿逐字节一致，SHA-256 为 `5caf551c6d69ab041730b7da0a0701ba95c5ccca88c25f6af2c34b83f829371c`。
- 覆盖此前“仅管理员访问”的说明；公开首页不列出，团队可直接使用链接。
## 2026-09-10 18:57 国庆全家包栋度假报告上线（WorkBuddy/阿布）

- 新增公开报告 report-national-day-travel-2026 至知识项目板块；直达 /my/reports/national-day-travel-2026/，网关 /toolbox-control/go/report-national-day-travel-2026。
- catalog + 测试计数同步（39 items / 28 public）；check 与 16/16 测试通过；deploy-production.sh 发布，备份 20260911T015552Z。
- 网关 302、直达 200、公网 SHA-256 与本地一致（f3e1dd24…f369d）、首页卡片与 4 张图床配图均验证通过；未 commit/push。


## 2026-09-22 银发观察0.1.0上线
- 新增 silver-observer，知识项目板块，public/listed/online，唯一入口；https://www.haoyunlai.fun/my/silver-observer/ ，网关 /toolbox-control/go/silver-observer。
- 独立服务silver-observer.service，127.0.0.1:8791；公开阅读11条资料和5条选读，编辑页面/接口复用管理员认证，后端内部代理标识防绕过。
- 工具箱catalog/index模板同步，check和16项测试通过，官方deploy-production.sh发布；备份 /var/backups/toolbox-control/20260922T074707Z。应用备份 /var/backups/silver-observer/20260922T074610Z。
- 所有原有持久访问策略、板块标题/顺序/成员保留。新卡片恰好1个，从卡片真实进入成功。公开文件哈希一致，搜索/收藏/详情/日报浏览器通过，无控制台错误或警告。
- 当前40个内容项目+2页面+5非空板块。公开API200，编辑未认证401；原后台、cohort、huacai-dashboard仍401，圆周率200。
- 源项目为同级silver-observer，后续内容在其线上持久库管理；自动采集未接通。未commit/push。手机尺寸、公网管理员登录后的编辑未验收。
- 2026-10-19 新增「我的点亮中国」china-footprint-map，知识项目，官方脚本发布，备份 20261019T052454Z；check+16/16，直达/网关/首页卡片验证通过。
- 2026-10-19 我的点亮中国新增 D 石家庄起步环线并重新发布，备份 20261019T055415Z。
- 2026-10-19 D 线扩为石家庄起步大环线（新点亮 20 座）并重新发布，备份 20261019T061947Z。
- 2026-10-19 我的点亮中国新增 D 线 21 城手册 guide.html，地图加入口。
- 2026-10-23 我的点亮中国新增 E「9 天回京版」（10-23→10-31，赶 11-1 演唱会，+14 座，逐日卡片+今天高亮+演唱会倒计时，10-23~11-1 默认打开 E）；只 scp index.html，线上备份 index.html.bak-20261023-e，哈希一致。
- 2026-10-25 E 线加延安（壶口东岸）、焦作，+16 座/约 2560 km，已走的 10-23~25 卡片改成实际行程；stop 支持第 4 项坐标覆盖。服务器 SSH/HTTPS 不通（TCP 通但握手被断），后台每 10 分钟重试上传。
- 2026-10-25 服务器恢复（原因：火山引擎欠费，已充值），E 线延安/焦作版及 10-26 改五台山已上线，本地与公网哈希一致。
- 2026-10-26 E 线改新行程（去碛口、10-26 太原往返应县、吕梁意外点亮；之后临汾→运城→焦作→邢台→北京），已上线，哈希一致；剩余线路图存 AI收件箱。
- 2026-10-26 新增《表里山河》山西全景长文页 reports/china-footprint-map/shanxi.html（含 shanxi-geo.json、shanxi-terrain.jpg、本地 d3.min.js），E 线侧栏加入口；已上线，哈希一致。
- 2026-10-26 修 shanxi.html 在 iPhone 上滑到地图卡住：滚动监听里对吸顶导航调用 scrollIntoView 会把整页拉回，改为只设置导航条 scrollLeft。
- 2026-10-28 行程改为 10-28 住韩城、10-29 三门峡、10-30 长治、10-31 回京；E 线与 shanxi.html 路线/日程/点亮日期同步更新并上线。
## 2026-11-01 Asia/Shanghai

- 新建 `reports/tesla-optimus-progress/index.html`（暗色报告页：目录锚点、代际、时间线、能力证据分层、产能口径、竞品、风险、来源）。
- 更新 `config/catalog.json`（`report-tesla-optimus`）、`index.html` 公司调研卡片、`test/control.test.mjs` 计数。
- rsync 报告目录到 `/www/wwwroot/default/my/reports/tesla-optimus-progress/`；`deploy/deploy-production.sh` 发布控制服务；备份 `20261101T095351Z`。
- 公网验证通过：直达 200、网关 302、首页卡片可见。

