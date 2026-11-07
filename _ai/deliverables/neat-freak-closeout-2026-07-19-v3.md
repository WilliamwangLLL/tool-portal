# tool-portal V3 neat-freak 收尾凭证

时间：2026-07-19 22:46 PDT

## 结果

管理后台 V3、管理员工作台、公开目录和项目独立密码已部署并完成生产验收。当前 31 个内容项目分为 19 个公开、8 个仅自己、4 个小范围分享；9 个板块/页面公开；40 个管理对象全部在线。

## 事实矩阵

| 主题 | 权威来源 | 代码 | 运行态 | 文档/规则 | 动作与验证 |
|---|---|---|---|---|---|
| 权限 schema | `config/catalog.json`、`lib/control.mjs` | verified-current | verified-current | changed | V1 迁移到 audience/listed/status；11/11 测试 |
| 公开目录 | `index.html`、`business/index.html`、渲染输出 | verified-current | verified-current | changed | 仅 public+listed+online；两页 200；浏览器 0 错误 |
| 个人工具 | `workspace/index.html`、Nginx map | verified-current | verified-current | changed | 8 个 owner；匿名工作台与直达均 401 |
| 分享密码 | credentials 元数据与独立 htpasswd | verified-current | verified-current | changed | A→A 302、A→B 401、B→B 302、A→后台 401；测试凭据清理 |
| 维护/停用 | Nginx maintenance/hidden map | verified-current | verified-current | changed | 503/404 线上闭环后恢复 |
| rewrite 认证 | `$toolbox_original_uri` | verified-current | verified-current | changed | cohort-api 与 kkhc admin 最终 401 |
| 部署/回滚 | `deploy/deploy-production.sh` | verified-current | verified-current | changed | 完整数据与配置备份；最终备份 `20260720T054355Z` |
| 规则链 | 全局协议、项目 AGENTS/CLAUDE | verified-current | n/a | verified-current | 无冲突；按要求更新工作日志、交接和索引 |
| Codex memory | 平台生成目录 | n/a | n/a | generated-read-only | 未直接编辑 |

## 生产证据

- 健康接口：schema v2，audience 28/8/4（含 9 个公开板块），status 40/0/0，正式凭据 0，待配置分享项目 4。
- 路由矩阵：72 条，200×26、301×1、302×19、401×25、404×1；0 个 5xx，0 个失败。404 是公开应用自身的空 API 根路径，不是策略或服务器错误。
- 服务：`toolbox-control.service`、`toolbox-control-apply.path` active；Nginx 配置测试成功。
- 浏览器：管理后台、工作台、公开首页、商业工具页完成桌面和 390px 验证，最终控制台 0 错误、0 警告。
- 生产仍有 `muxia.conf:18` 的旧式 `listen ... http2` 弃用警告，属于其他站点，未在本任务越权修改。

## 同步完成

- 更新 `README.md`、`PROJECT.md`、`_ai/decisions.md`、`_ai/handoff.md`、`_ai/worklog.md`。
- 更新项目中枢 `项目总览.md`。
- 不建设开放注册系统的产品决策已写入项目文档；未来升级条件为邀请制、多项目授权、审计或角色需求。

## 清理预览（未执行）

以下仅为候选，没有得到本次收尾报告之后的用户确认，因此未删除：

- 根目录 `.DS_Store`、`.playwright-cli/`、`output/`。
- 多个 `index.html.bak*` 与 `reports.bak-20260625-025825.tar.gz` 历史副本。
- `/Users/wanglei/Documents/磊哥的工具箱` 路径指针目录中的 Git 元数据。
- 生产部署备份与本次凭据隔离测试备份。

当前 Git 工作区有 35 个状态条目，并包含用户与此前任务留下的修改。未提交、未推送、未清场，以保留复核证据并避免把内部页面发布到公开仓库。
