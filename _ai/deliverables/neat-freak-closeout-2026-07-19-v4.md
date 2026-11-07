# tool-portal V4 知识与发布收尾

日期：2026-07-19（PDT）

## 终态

- 生产状态 schema v3，7 个非空动态板块、2 个总页面、31 个内容项目。
- 32 个可分组成员均有唯一板块归属；创建板块必须指定首个成员，来源板块为空时自动删除。
- 项目受众为 19 个公开、8 个仅自己、4 个小范围分享；40 个管理对象均正常运行。
- 0 个正式分享凭据，4 个分享项目仍待按实际伙伴设置独立密码。
- 唯一管理员入口为“磊哥总控台”：`https://www.haoyunlai.fun/toolbox-control/workspace/`。

## 事实面状态

| 事实面 | 状态 | 证据 |
|---|---|---|
| 代码 | changed-and-verified | schema v3、板块 API、动态渲染、总控台和 15 项测试 |
| 运行态 | changed-and-verified | 生产健康检查、74 路由矩阵、10 个文件哈希、桌面/390px 浏览器 |
| 文档 | changed-and-verified | README、PROJECT、handoff、decisions、worklog、项目索引和路径指针已同步 |
| 规则 | verified-current | AGENTS.md、CLAUDE.md 与统一协议入口仍有效，无需改写 |
| 记忆 | out-of-scope | Codex 机器生成记忆只读；用户本次未要求写入长期记忆 |
| 工作区 | pending | dirty 工作区与既有备份/Playwright/历史副本仍保留，未获清场确认 |

## 验证

- `npm run check` 通过。
- `npm test` 15/15 通过。
- 本地接口及真实浏览器完成：创建新板块 → 项目跨页面移动 → 最后成员移出 → 空板块自动删除。
- 生产 74 个分享网关、页面和目标路由：0 个 5xx、0 个权限矩阵失败、0 个网络错误。
- 生产 10 个部署文件与本地 SHA-256 完全一致。
- 公开首页、商业工具页、磊哥总控台和管理后台完成桌面与 390px 检查，控制台 0 错误、0 警告。
- 匿名访问公开页面为 200；匿名访问总控台与管理后台为 401。
- 发布备份：`/var/backups/toolbox-control/20260720T063443Z`。

## 保留边界

- 未提交或推送公开仓库；GitHub Pages 与历史工作流的公开边界仍待用户另行决定。
- 未删除 `.DS_Store`、历史 HTML 备份、生产备份、Playwright 产物或其他清场候选。
- Nginx 仍报告 `muxia.conf:18` 的旧式 `listen ... http2` 弃用警告；该文件属于其他站点，不在本项目变更范围。

复核现场仍保留，等待用户看完汇报后再决定是否清场。
