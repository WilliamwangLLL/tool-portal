# AI 交接记录：tool-portal

更新时间：2026-09-08 PT

## 最新状态

管理后台 V4 已上线，生产状态 schema 为 v3。原“上线 / 隐藏 / 需要密码”继续拆成：

- `audience`：`public` / `owner` / `shared`
- `listed`：是否出现在公开目录
- `status`：`online` / `maintenance` / `offline`

清单分类为 27 个公开、8 个仅自己、4 个小范围分享；运行态 sections+items 为 30 public / 6 owner / 3 shared。5 个非空动态板块和 2 个总页面公开，44 个管理对象（37 项目 + 2 页面 + 5 板块）全部在线。1 个分享项目已配置正式独立凭据，另外 3 个尚未设置，待设置项目仅管理员可访问。

2026-07-28 新增公开报告“中国在线教育行业调研报告 · 2026年7月”，项目 ID 为 `report-online-education-2026-07`，归属线上“各类调研”板块。公开直达地址为 `https://www.haoyunlai.fun/my/reports/online-education-2026-07/`，网关地址为 `https://www.haoyunlai.fun/toolbox-control/go/report-online-education-2026-07`。

2026-09-01 新增公开教程“Grok Bot 使用教程”，项目 ID 为 `grok-bot-guide`，归属线上知识项目板块。公开直达地址为 `https://www.haoyunlai.fun/my/reports/grok-bot-guide/`，网关地址为 `https://www.haoyunlai.fun/toolbox-control/go/grok-bot-guide`，首页卡片已出现。

2026-09-05 新增公开交互应用“曼哈顿 3D 城市 · ISLE”，ID `manhattan-atlas`，归属线上「知识项目」。直达 https://www.haoyunlai.fun/my/manhattan-atlas/，网关 https://www.haoyunlai.fun/toolbox-control/go/manhattan-atlas。静态文件位于 `/www/wwwroot/default/my/manhattan-atlas/`，源码为 `/Users/wanglei/Documents/随意的话题/manhattan-atlas`，版本 0.2.0，构建命令 `npm run build:toolbox`，输出 `dist/toolbox/`。工具箱注册仍以此仓库的清单和模板为准。

本次核验：工具箱 check 和 16/16 测试通过；生产 WebGL 渲染、地标与普通建筑聚焦、独立查看、夜景及重置通过；首页卡片可见，原有持久访问策略与部署备份一致。源项目的 `outputs/toolbox-delivery.json` 保存逐文件公网校验与页面状态回执。以下历史验证基线仅用于原控制系统回归参考，不代表本轮重跑全部历史路由矩阵。

2026-09-05 新增公开交互应用「月面漫游 · SELENE」，ID `lunar-rover`，知识项目板块。直达 https://www.haoyunlai.fun/my/lunar-rover/，网关 https://www.haoyunlai.fun/toolbox-control/go/lunar-rover。源码 `/Users/wanglei/Documents/随意的话题/lunar-rover`，版本 1.0.2，构建 `npm run build:toolbox` → `dist-toolbox/`，线上目录 `/www/wwwroot/default/my/lunar-rover/`。本次只新增静态应用并更新控制服务清单与模板，原策略和板块逐项核对保留；备份 `/var/backups/toolbox-control/selene-20260905T191821Z`。工具箱 check、16/16 测试通过；5 文件公网哈希一致；首页卡片、网关 302、WebGL 画面、暂停、旋转缩放、自由模式、返回工具箱均验证；正式页控制台无错误或警告。回执位于月面项目 `outputs/toolbox-delivery.json`。

V4 新增正式板块模型：可创建、改名、排序、切换显示页面和移动项目。创建板块必须同时放入首个项目；最后一个项目移走后，空板块自动删除。公开首页和商业工具页按运行时板块重新渲染。

子页面没有任何 `public + listed + online` 项目时，它在首页、磊哥总控台和后台顶部的入口自动隐藏，但旧 URL 保留兼容。当前商业工具子页为空，因此不再出现多余的“商业工具”卡片；公众号排版器、黄金歌曲匹配测评和主理人测评仍在首页。

## 权威入口

- 本地源：`/Users/wanglei/Desktop/入口/2_工作/开发项目/tool-portal`
- 清单：`config/catalog.json`
- 首页模板：`index.html`
- 商业工具模板：`business/index.html`
- 磊哥总控台：`workspace/index.html`
- 管理后台：`admin/index.html`
- 控制服务：`server.mjs`
- 线上首页：`https://www.haoyunlai.fun/my/`
- 线上商业工具：`https://www.haoyunlai.fun/my/business/`
- 线上总控台：`https://www.haoyunlai.fun/toolbox-control/workspace/`
- 线上后台：`https://www.haoyunlai.fun/toolbox-control/admin/`
- 部署命令：`./deploy/deploy-production.sh`

## 生产运行

- 应用：`/opt/toolbox-control`
- 状态：`/var/lib/toolbox-control/state.json`
- 凭据元数据：`/var/lib/toolbox-control/credentials.json`
- 项目 htpasswd：`/var/lib/toolbox-control/credentials/*.htpasswd`
- 审计日志：`/var/lib/toolbox-control/audit.jsonl`
- 服务：`toolbox-control.service`
- 规则监听：`toolbox-control-apply.path`
- 最近部署备份：`/var/backups/toolbox-control/selene-20260905T191821Z`

部署备份包含应用、`/var/lib/toolbox-control` 运行数据、Nginx 配置和 systemd 单元；失败回滚会恢复这些内容。服务只监听 `127.0.0.1:3520`。

## 密码与访问模型

- 管理后台、磊哥总控台和 `owner` 项目使用管理员总密码。
- `shared` 项目未设置独立凭据时，也只允许管理员总密码访问，并显示“待设置”。
- 设置项目密码后，独立 htpasswd 同时包含管理员哈希和该项目伙伴哈希：管理员继续可访问，伙伴只可访问这个项目。
- 伙伴密码是 SHA-512 crypt 加盐哈希；服务器不保存明文，关闭弹窗后只能轮换。
- 外部“全国社群与俱乐部客户看板”只保护工具箱网关，外站直达由外部服务器负责。

## 本次修复要点

- “我的工作台”升级为唯一的“磊哥总控台”，顶部提供公开工具箱、公开商业工具、我的私人工具和管理后台四个入口；公开页右上角及页脚增加“磊哥入口”。
- `config/catalog.json` 升级到 v3，固定页面与动态板块解耦；运行时状态 v2 自动迁移到 v3，并保留原项目权限。
- 每个项目/可分组页面拥有唯一板块归属；新建、改名、排序、跨页面移动和空板块自动删除均已接入 API、后台、公开渲染、审计与状态备份。
- `/my/` 与 `/my/business/` 不再使用会拼成 `home.htmlindex.html` 的单文件 alias，由控制服务返回渲染页，原 500 已消除。
- 公开首页与商业工具页不再整体加密，只显示公开项目；内部与分享项目进入磊哥总控台。
- 新增 `maintenance` 503 和 `offline` 404，与受众、目录展示彼此独立。
- Nginx 权限 map 改用原始 `$request_uri` 派生路径，避免 `/cohort-api/`、`kkhc.fun/admin/` 等 location rewrite 改写 `$uri` 后绕过 Basic Auth。
- 公开模板补 data favicon，清除 `/favicon.ico` 404 控制台错误。

## 验证基线

- 自动化：`npm run check` 通过，`npm test` 16/16 通过。
- 板块闭环：本地接口与真实浏览器完成创建新板块、跨页面移动项目、最后成员移走后自动删除；控制台 0 错误、0 警告。
- 路由：74 个真实线上网关/页面/直达地址，0 个 5xx、0 个权限矩阵失败、0 个网络错误。
- 状态闭环：OpenClaw 公开、仅自己、维护、停用和恢复均命中预期 200/302、401、503、404。
- 凭据隔离：A→A 302、A→B 401、B→B 302、A→后台 401；管理员哈希存在于两个项目文件；测试后凭据元数据和文件均恢复为 0。
- 浏览器：生产后台、磊哥总控台、公开首页与商业工具页均完成桌面/390px 验证；最终 0 错误、0 警告。
- 部署一致性：本次生产发布通过统一部署脚本；生产状态为 schema v3、5 个板块、33 个项目、1 个正式分享凭据。
- 空页入口：生产首页桌面端和 390px 移动端完成 Playwright 验证，多余自引用卡片为 0，三个真实工具均存在，无横向溢出，控制台 0 错误、0 警告；总控台快捷入口和后台顶部入口均已隐藏。
- 新报告：本地与服务器报告 SHA-256 均为 `d6aa7c5d04dee8be98eeba3dd3282dd9cacb3a8a281c2b4253bad6bf5c3ca556`；直达 200、网关 302、首页卡片可点击，桌面和 390px 报告页控制台 0 错误、0 警告。
- 新教程：本地与服务器 reports/grok-bot-guide/index.html SHA-256 均为 d50580110f5ede9d0b358dd920dede62d82e00d0ea86840fa091f19a17674e95；直达 200，网关 302，首页卡片存在。
- 服务：Nginx 配置通过，`toolbox-control.service` 与 `toolbox-control-apply.path` active。
- 服务器仍有一条 `muxia.conf:18` 的旧式 `listen ... http2` 弃用警告，属于其他站点，不是本项目故障。

## 产品决策

当前不建设开放注册系统。公开内容直接访问，个人内容用管理员密码，4 个定向项目用项目独立密码即可。未来只有出现大量成员频繁变动、同一成员跨项目、操作审计或角色授权需求时，再建设邀请制账号系统。

## Git 与公开边界

生产 V4 来自当前 dirty 工作区，公开 GitHub/Gitee `main` 仍是旧版；GitHub Pages 和历史工作流仍公开。当前目录含内部页面与未跟踪控制代码，在用户决定仓库是否私有、Pages/工作流如何处理前，不整体提交或推送。

## 下一步

- 按实际分享对象，为剩余 3 个 `shared` 项目逐个设置正式独立密码并分发各自链接。
- 如需撤销某个伙伴，轮换该项目密码；旧密码立即失效。
- 另行决定公开仓库、GitHub Pages 和历史部署工作流边界，再整理提交。

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
- 内容：顶部精简版，下方完整详细版；源稿为 `2_工作/内容创作/直播与短视频/deliverables/退休开拍吧_内部产品文档_20260909_v1.html`，发布副本保存在本项目 `reports/retire-kaipai-membership/`。
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

## 2026-09-10 国庆全家包栋度假报告上线

- 新增 `report-national-day-travel-2026`（2026 国庆全家包栋度假报告），知识项目板块，public/listed/online。
- 直达：https://www.haoyunlai.fun/my/reports/national-day-travel-2026/ ；网关：https://www.haoyunlai.fun/toolbox-control/go/report-national-day-travel-2026
- 内容：四家庭（北京/成都/深圳/呼和浩特/南京出发，8 大 4 小）国庆包栋度假分析；4 个候选地（皖南黟县/桐庐/阳朔/张家界）、真实房源与携程/木鸟/途家预订链接、五地交通表、对比与预订清单。
- HTML SHA-256：`f3e1dd2494af69a799cafcb372c8346858d971e3b088ff2084c3972aab2f369d`，本地、服务器与公网一致；4 张配图为平台图床直链，公网均 200。
- 变更：`config/catalog.json`（public 列表 + items + knowledge-projects 板块成员）、`test/control.test.mjs` 计数（39 items / 28 public / 41 classified / 40 members）、新增 `reports/national-day-travel-2026/index.html`；check 通过、16/16 测试通过。
- 发布走 `deploy/deploy-production.sh`，静态文件 scp 至 `/www/wwwroot/default/my/reports/national-day-travel-2026/`；备份 `/var/backups/toolbox-control/20260911T015552Z`。
- 验证：网关 302、直达 200、无斜杠 301、首页卡片出现且可点击、公网哈希一致、4 张配图 200。
- 按公开边界规则未 commit/push；源稿另存 WorkBuddy 工作区并已同步至资料库「我的文档」。

## 2026-09-22 银发观察0.1.0上线
- 新增 silver-observer，知识项目板块，public/listed/online，唯一入口；https://www.haoyunlai.fun/my/silver-observer/ ，网关 /toolbox-control/go/silver-observer。
- 独立服务silver-observer.service，127.0.0.1:8791；公开阅读11条资料和5条选读，编辑页面/接口复用管理员认证，后端内部代理标识防绕过。
- 工具箱catalog/index模板同步，check和16项测试通过，官方deploy-production.sh发布；备份 /var/backups/toolbox-control/20260922T074707Z。应用备份 /var/backups/silver-observer/20260922T074610Z。
- 所有原有持久访问策略、板块标题/顺序/成员保留。新卡片恰好1个，从卡片真实进入成功。公开文件哈希一致，搜索/收藏/详情/日报浏览器通过，无控制台错误或警告。
- 当前40个内容项目+2页面+5非空板块。公开API200，编辑未认证401；原后台、cohort、huacai-dashboard仍401，圆周率200。
- 源项目为同级silver-observer，后续内容在其线上持久库管理；自动采集未接通。未commit/push。手机尺寸、公网管理员登录后的编辑未验收。

## 2026-10-19 我的点亮中国上线
- 新增 `china-footprint-map`（我的点亮中国），知识项目板块首位，public/listed/online，首页卡片唯一。
- 直达：https://www.haoyunlai.fun/my/reports/china-footprint-map/ ；网关：https://www.haoyunlai.fun/toolbox-control/go/china-footprint-map
- 内容：高德「点亮城市」141 座已点亮城市的地级市夜景地图（D3 + DataV 边界），未去过城市标注，A 山西 / B 冀鲁胶东 / C 辽宁东蒙三条北京出发自驾环线与模拟点亮。源稿在 `1_生活/旅行/点亮中国地图/`，发布副本在本项目 `reports/china-footprint-map/`（index.html + mapdata.json）。
- SHA-256：index.html `56cb654bea736fb2c515deea68611986e5bf9331a59f43520a30d6dea756d31d`，mapdata.json `8bd75b57785c5a55904aa14aef0184f11947cccfa6d0a92c0db39b6f86eb22eb`，本地与服务器一致；公网 mapdata 哈希一致，gzip 传输约 770 KB。
- 变更：`config/catalog.json`（public + items + knowledge-projects 首位）、`index.html` 卡片、`test/control.test.mjs` 计数（41 items / 30 public / 43 classified / 42 members）；check 通过、16/16。
- 发布走 `deploy/deploy-production.sh`，备份 `/var/backups/toolbox-control/20261019T052454Z`；运行态 public 34 / owner 6 / shared 3，43 个对象 online。静态文件 scp 至 `/www/wwwroot/default/my/reports/china-footprint-map/`。
- 验证：直达 200、无斜杠 301、网关 302、首页卡片 1 个、后台仍 401；真实浏览器经网关打开，地图与路线面板渲染正常，控制台无错误。
- pending：手机真机未验收；足迹数据是 2026-10-19 快照，点亮新城市后需改 `reports/china-footprint-map/build_mapdata.py` 里的 LIT 名单重建 mapdata 再发布。未 commit/push（按公开边界规则）。
- 2026-10-19 补充：新增 D「石家庄起步环线」（北京→石家庄→阳泉→太原→晋中→长治→晋城→济源→焦作→濮阳→邯郸→邢台→衡水→沧州→北京，约 2000 km，新点亮 11 座）；首页卡片文案改为“四条”。再次走官方脚本，备份 `/var/backups/toolbox-control/20261019T055415Z`；index.html 新 SHA-256 `63fe1725c66b3b677400d2f3df2f60ac3fcc3d98b1393b985bbb078d794ad658`，本地/服务器/公网一致，网关 302，线上浏览器可见 D 线、无控制台错误。
- 2026-10-19 补充：D 线扩为「石家庄起步大环线」（加入朔州、忻州、吕梁、临汾、运城、三门峡、聊城、滨州、德州；21 站约 3250 km、新点亮 20 座，顺序用 2-opt 求最短）。官方脚本发布，备份 `/var/backups/toolbox-control/20261019T061947Z`；index.html SHA-256 `6b7830dcc659680f5c815674498e10db3c20576b22b05ab547a67680a45bcab2` 本地与公网一致，网关 302。
- 2026-10-19 补充：新增 D 线城市手册 `reports/china-footprint-map/guide.html`（21 城介绍、必去景点、吃什么、贴士、17 天日程），地图 D 线各站加“手册”链接，D 线天数改为 13–17 天。只 scp 静态文件（模板与清单未变，未跑部署脚本）；线上旧 index 备份为 `index.html.bak-20261019-guide`；index/guide 本地与公网哈希一致，均 200。
- 2026-10-23 补充：新增 E「9 天回京版」，ROUTES 首位，带 plan 逐日数据与 renderPlan 侧栏；11-1 前默认选中 E，之后回到全部路线；支持 #E/#D 等 hash 直达。只 scp index.html，线上旧版备份 `index.html.bak-20261023-e`，本地与公网 SHA-256 前缀 fcbb9ddddca568a1 一致；本地 Chrome 桌面/手机截图检查无控制台错误。
- 2026-10-25 补充：E 线加延安（stop 第 4 项用 [110.15,36.30] 覆盖坐标，画在壶口附近）和焦作，新点亮 16。本地已改；当时 www.haoyunlai.fun 从 Travel-Mac 和 Mini 都打不开（SSH 被断开、HTTPS 000，疑似服务器卡死，参考 ECS OOM 事故），上传待重试，线上备份名 index.html.bak-20261025-yanan。
- 2026-10-25 补充：网站不通的原因是火山引擎账户欠费（服务器本身 uptime 78 天未重启），用户充值后恢复；E 线新版已上线，哈希一致。以后网站整体 000/SSH 被断，先查火山账户余额。
- 2026-10-26 补充：E 线按新行程重写 plan/stops（太原重复出现一次、吕梁用覆盖坐标 [112.20,37.58]），km 2940、新点亮 16。线上备份 index.html.bak-20261026-newplan。剩余线路图 `1_生活/旅行/2026-10山西自驾/山西剩余行程线路图_20261026.jpg`（往网站传图被权限拦截，未上传）。
- 2026-10-26 补充：新增长文页 https://www.haoyunlai.fun/my/reports/china-footprint-map/shanxi.html （地图+十个时代+11 城卡片+路上日程，城市点亮状态和『今天』按北京时间自动变化）。d3 改为同目录本地文件，cdnjs 在国内常连不上。只 scp 静态文件，未跑部署脚本；index 备份 index.html.bak-20261026-shanxi。

## 2026-11-01 Asia/Shanghai 特斯拉 Optimus 进展报告上线

- 新增公开报告 `report-tesla-optimus`，标题「特斯拉人形机器人 Optimus 进展」，group 调研报告。
- 直达：https://www.haoyunlai.fun/my/reports/tesla-optimus-progress/
- 网关：https://www.haoyunlai.fun/toolbox-control/go/report-tesla-optimus （302 → 直达）
- 静态目录：`reports/tesla-optimus-progress/index.html`；线上 `/www/wwwroot/default/my/reports/tesla-optimus-progress/`
- catalog：items 42→43；audienceDefaults.public 31→32；boards `company-research` 成员放在星链之后；classified 44→45；board members 总和 43→44。
- 首页：`index.html` 公司调研区补 🤖 卡片（运行时由 board 渲染）；生产运行态里该项目落在 `company-research`（其他旧调研仍在自定义板块「各类调研」）。
- 验证：`npm run check` + `npm test` 16/16；公网报告 200、无尾斜杠 301、首页 200 可见卡片、网关 302；本地/服务器 index.html SHA-256 `9721abecba0883d94f4669c4636519d8fb68d9e101eed4b2e797ef1109c0ce52`。
- 部署：`./deploy/deploy-production.sh`；备份 `/var/backups/toolbox-control/20261101T095351Z`（安装段曾出现一次 healthz 瞬时连不上，随后 apply/nginx 成功，以公网 200 为准）。
- 资料截至 2026-11-01（Asia/Shanghai）；产能/售价/对外交付均标「目标/可能跳票」；一手来源含 Tesla Q3 2026 Update PDF。

