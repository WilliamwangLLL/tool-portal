# 磊哥的工具箱

磊哥工具与调研报告的统一入口，以及对应的访问状态管理后台。

## 线上入口

- 工具箱首页：<https://www.haoyunlai.fun/my/>
- 管理后台：<https://www.haoyunlai.fun/toolbox-control/admin/>
- 商业工具页：<https://www.haoyunlai.fun/my/business/>

管理后台始终沿用服务器现有的管理员总密码。板块/页面需要密码时也使用总密码；具体项目则可以设置独立账号和密码。

## 管理后台

后台目前管理 9 个板块/页面和 31 个内容入口。每一项可以切换为：

- `上线`：入口显示，目标地址可以正常访问。
- `隐藏`：入口从工具箱页面消失；同一台服务器上的目标地址直接访问返回 404。
- `需要密码`：入口仍显示并标注“需密码”；具体项目使用自己的独立密码，板块/页面使用管理员总密码。

### 给伙伴设置项目独立密码

1. 在“内容入口管理”中找到要分享的项目。
2. 点击“设置独立密码”，填写分享用户名，手工输入或随机生成密码。
3. 点击“保存并启用密码”，后台会自动把该项目切换成“需要密码”。
4. 立即复制账号、密码和分享链接发给伙伴。明文密码关闭弹窗后无法找回，只能重新设置。

不同项目使用不同的密码文件和认证域。项目 A 的账号密码不能访问项目 B，也不能进入管理后台。不要把管理员总密码分享给伙伴。

旧项目如果仍在使用总密码，后台会显示“共用总密码，不适合分享”的警告。今后没有独立密码的项目不能直接切换到项目密码状态，必须先完成独立密码设置。

对外部服务器上的“全国社群与俱乐部客户看板”，后台只能控制工具箱入口；目标站的直接访问仍由外部服务器自身的密码策略负责。后台会用“外站入口”标识这类项目。

每次修改会立即重绘工具箱页面、原子保存状态、留下审计日志，并由 systemd path 单元生成 Nginx 访问规则；应用前会先执行 `nginx -t`，失败时回滚规则。

## 项目结构

- `config/catalog.json`：全部板块、入口、真实目标和默认状态，是管理清单的唯一来源。
- `index.html`、`business/index.html`：从生产环境同步回来的页面模板。
- `server.mjs`：仅监听 `127.0.0.1:3520` 的管理服务。
- `lib/control.mjs`：状态校验、页面渲染、Nginx 规则生成。
- `scripts/`：访问规则应用与 Nginx 配置补丁。
- `deploy/`：systemd、Nginx 和生产部署文件。
- `test/`：目录完整性、渲染和 Nginx 规则测试。

生产环境的主要路径：

- 程序：`/opt/toolbox-control`
- 持久状态：`/var/lib/toolbox-control/state.json`
- 状态备份：`/var/lib/toolbox-control/backups/`
- 审计日志：`/var/lib/toolbox-control/audit.jsonl`
- 渲染页面：`/var/lib/toolbox-control/rendered/`
- 独立密码元数据：`/var/lib/toolbox-control/credentials.json`
- 独立密码哈希：`/var/lib/toolbox-control/credentials/*.htpasswd`

服务器仅保存加盐 SHA-512 哈希，不保存或返回项目明文密码。

## 本地验证与部署

```bash
cd /Users/wanglei/Desktop/入口/03_学习研究/AI开发项目源文件/tool-portal
npm run check
npm test
./deploy/deploy-production.sh
```

部署脚本固定发布到 `root@www.haoyunlai.fun`，先备份现有程序与 Nginx 配置，再安装、验证并重载服务。不要把 README 中旧的 GitHub Pages 说明当作当前部署方式。

## 新增工具

新增或改动入口时，先更新 `config/catalog.json`，再把对应卡片放进页面模板。测试会阻止未纳入管理清单的卡片上线。完成后运行全部测试并通过统一部署脚本发布。
