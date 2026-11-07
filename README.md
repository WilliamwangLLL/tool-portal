# 磊哥的工具箱

磊哥工具与调研报告的统一入口，以及可调整板块、公开范围和项目独立密码的管理后台。

## 线上入口

- 公开工具箱：<https://www.haoyunlai.fun/my/>
- 商业工具兼容地址：<https://www.haoyunlai.fun/my/business/>（没有公开项目时不显示入口）
- 磊哥总控台：<https://www.haoyunlai.fun/toolbox-control/workspace/>
- 管理后台：<https://www.haoyunlai.fun/toolbox-control/admin/>

“磊哥总控台”和管理后台使用服务器现有的管理员总密码。公开页面无需密码，只显示允许公开展示的内容。公开页面右上角和页脚都有“磊哥入口”，不用记管理网址。

## 板块管理

生产运行时状态为 schema v3。后台当前有 5 个非空板块、2 个总页面和 35 个内容项目，共 42 个管理对象。

- 每个项目以及“商业工具页面”必须且只能属于一个板块。
- 可创建板块、改名、调整显示页面和排序，也可把项目直接移动到其他板块。
- 新建板块时必须同时选择首个项目，系统不会保留空板块。
- 项目移走后，如果原板块失去最后一个成员，原板块会自动删除。
- 子页面没有任何可公开展示的项目时，首页、总控台和后台会自动隐藏该页面入口；旧 URL 继续保留兼容。
- 板块决定公开目录中的分组和顺序；项目自身的 `audience`、`listed`、`status` 及独立密码仍决定真实访问权限。

板块可以显示在“工具箱首页”或“商业工具页”。把公开项目移动到另一个页面的板块后，公开页面会立即重新渲染；内部项目仍只在总控台出现。

## 权限模型

页面、板块和项目分别管理三个维度：

- `audience`：`public` 任何人可访问；`owner` 只允许管理员；`shared` 用于少量伙伴。
- `listed`：只决定公开目录是否展示；不代替目标地址的访问控制。
- `status`：`online` 正常运行；`maintenance` 返回 503；`offline` 返回 404。

截至 2026-09-05，本次发布后的清单默认分类为 25 public / 8 owner / 4 shared（含 2 个页面）；真实运行态 sections+items 为 28 public / 6 owner / 3 shared，共 37 个策略对象，另有 5 个动态板块，均在线。清单默认值与用户已保存的运行态权限相互独立。

最新发布的《月面漫游 · SELENE》版本 1.0.2 位于首页「知识项目」：<https://www.haoyunlai.fun/my/lunar-rover/>，网关 <https://www.haoyunlai.fun/toolbox-control/go/lunar-rover>。源码 `/Users/wanglei/Documents/随意的话题/lunar-rover`，`npm run build:toolbox` 生成 `dist-toolbox/`，生产静态目录 `/www/wwwroot/default/my/lunar-rover/`。

此前发布的《曼哈顿 3D 城市 · ISLE》位于首页「知识项目」，公开地址为 <https://www.haoyunlai.fun/my/manhattan-atlas/>，网关为 <https://www.haoyunlai.fun/toolbox-control/go/manhattan-atlas>。城市应用版本 0.2.0；原 Grok Bot 教程及其他入口继续保留。

公开工具箱只显示“板块与项目都满足 `public + listed + online`”的内容。`owner` 与 `shared` 项目只在磊哥总控台出现。

## 给伙伴设置项目密码

1. 进入管理后台的“小范围分享”分类。
2. 找到项目，点击“设置项目密码”。
3. 填写分享用户名，手工输入或随机生成至少 10 位密码。
4. 保存后立即复制账号、密码和分享链接给对应伙伴。

每个分享项目使用独立 htpasswd 文件和独立认证域。项目 A 的伙伴密码不能访问项目 B、磊哥总控台或管理后台。项目文件同时保留管理员凭据，因此管理员仍能进入全部分享项目。

服务器只保存 OpenSSL SHA-512 crypt 加盐哈希，不保存或返回伙伴明文密码。关闭弹窗后只能重新设置。尚未设置项目密码的 `shared` 项目会显示“待设置，当前仅管理员可访问”；不要把管理员总密码分享给伙伴。

“全国社群与俱乐部客户看板”位于外部服务器，工具箱只能保护分享网关，不能控制外站直达地址。

## 为什么暂不做用户注册

当前不建设公众注册系统。现有需求只有三类固定受众，公开访问、管理员总密码、项目独立密码已经覆盖，注册会额外引入账号审核、找回密码、隐私数据和长期运维成本。

只有当需要频繁增减大量使用者、同一人跨多个项目、记录个人操作或按角色授权时，再升级为“邀请制账号系统”，而不是开放注册。

## 实现与生产路径

- `config/catalog.json`：对象、路由、初始板块和默认受众的唯一清单。
- `index.html`、`business/index.html`：公开页面模板。
- `workspace/index.html`：仅管理员可见的磊哥总控台。
- `admin/index.html`：板块、项目归属、访问策略和项目密码管理页面。
- `server.mjs`：仅监听 `127.0.0.1:3520` 的控制服务。
- `lib/control.mjs`：schema 迁移、公开页渲染和 Nginx 规则生成。
- `scripts/`：访问规则应用和 Nginx 配置补丁。
- `deploy/`：systemd、Nginx 与可回滚生产部署。
- `test/`：板块创建/移动/自动删除、迁移、渲染、认证、维护/停用和密码隔离测试。

生产环境：

- 程序：`/opt/toolbox-control`
- 状态：`/var/lib/toolbox-control/state.json`
- 凭据元数据：`/var/lib/toolbox-control/credentials.json`
- 项目密码哈希：`/var/lib/toolbox-control/credentials/*.htpasswd`
- 审计日志：`/var/lib/toolbox-control/audit.jsonl`
- 状态备份：`/var/lib/toolbox-control/backups/`
- 部署备份：`/var/backups/toolbox-control/`

每次后台修改都会原子保存状态、重绘公开页并记录审计日志；访问策略变化会触发 Nginx 规则应用。Nginx 先执行 `nginx -t`，失败会恢复旧规则。部署脚本会同时备份程序、运行数据、密码文件、systemd 和 Nginx 配置，安装失败自动回滚。

## 本地验证与部署

```bash
cd /Users/wanglei/Desktop/入口/2_工作/开发项目/tool-portal
npm run check
npm test
./deploy/deploy-production.sh
```

生产发布只认统一部署脚本、服务状态和真实 URL/浏览器验证，不以 GitHub Pages 或退出码单独判定。

## Git 与公开边界

GitHub 仓库和历史 Pages/工作流仍是公开发布面，无法执行生产 Nginx 权限策略。当前工作区包含内部页面和未跟踪的生产控制代码；在用户明确哪些源码可以公开、并决定 Pages/历史工作流去留前，不整体提交或推送到公开 `main`。

## 新增工具

新增入口时先更新 `config/catalog.json` 的对象、路由、默认受众和初始板块归属，再增加页面卡片。发布前运行全部测试；发布后同时检查公开目录、分享网关、目标直达地址和真实浏览器流程。
