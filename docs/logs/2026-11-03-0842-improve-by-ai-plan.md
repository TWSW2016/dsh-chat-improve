---
title: "规划 Improve by AI：澄清需求并落实施计划"
created: 2026-11-03T08:42:30+08:00
updated: 2026-11-03T08:42:30+08:00
log_deai_profile: agent
log_deai_version: 0.1.4
tags:
  - log-deai
  - project/dsh-chat-improve
  - type/decision
  - topic/dsh-plugin
git_branch: main
---

## 交接摘要

需求已定稿（R1–R12，见计划书），实施计划已落 `docs/plans/2026-11-03-improve-by-ai.md`，尚未写任何功能代码。下一步：按计划步骤 0 做 4 项事实校准，再进步骤 1（Host 路由）。阻塞点：无；但步骤 0 的三条事实（`agent.session.requestHeader()`、`useInput` 选择器语义、`setDraft` 后的焦点）必须先验，每条都有回退方案。

## 目标与请求

用户原话：「I plan to add a new workflow to use agent to improve the user input prompt. In the prompt input panel, add a new button "Improve by AI" so that the current prompt is rewrite by the agent to be a better one... You need to ask me sufficient questions to make clear about the requirement following Paul Grice's pragmatic principles strictly... Then propose a detailed implementation plan after you have >= 95% confidence.」

本轮只做两件事：把需求问清；给出可执行的实施计划。不写功能代码。

## 执行与命令

工作目录 `E:\Repos\dsh-chat-improve`。策略 `danger-full-access`。

1. `Get-ChildItem -Force` + `docs/logs` 列表：仓库结构；`logs/` 不存在，日志在 `docs/logs/`。
2. 读 `README.md`、`package.json`、`cordis.patch.yml`、`src/client.js`、`src/index.js`、`src/settings.js`、`src/settings-page.jsx`、`src/use-settings.js`、`src/composer/index.js`、`src/composer/format.js`、`scripts/build.mjs`、`scripts/verify-web.mjs`、`docs/plans/implementation-plan.md`、`docs/logs/2026-11-03-0011-git-history-mermaid.md`（最近一份日志）。
3. `cordis_inspect_list`；`cordis_inspect_query` client `Slots.listSubTree`（无 root / `conversation.input.right` / `conversation.input.model`）、client `Service.listService`、client `Builtin.listBuiltins`、client `Event.listEvents`、host `Service.listService`（catalog + `llm` + `webServer` + `agentDefaultModel` + `sessionController` + `sessionTitle`）、host `Event.listEvents`（`webserver/index-inject`）、host `Config.listConfigs`（`@deepseek-ai/dsh-client-ui-conversation`）。
4. 读 asar 内 `@deepseek-ai/dsh-client-ui-conversation/package.json` 与 `@deepseek-ai/dsh-cordis-client-runner/README.md`（后者说明 `host.call` 属动态包 lane，不是本插件 lane）。
5. `Invoke-WebRequest http://127.0.0.1:12129/` → **失败**：`dsh web authentication required; reopen the URL printed by dsh web`，退出码 1。改为不依赖页面、只用 inspect 与本地源码取证。
6. `pwsh` 列 `.research\tar`、`.research\repo`、`.research\repo\packages\client`、`packages\host`：发现本机已有一份 DSH 源码检出（`0.2.2-alpha.2`，sparse），以及 0.2.1-rc.5 的 tar 解包类型。
7. 读 `.research/repo/packages/host/open-in-app/src/index.ts` + `src/shared.ts`（Host 路由 + `connection.requestRejection` + 路径不带 `/api` 的范例）；读 `.research/tar/package/lib/types/client/contract/input.d.ts` + `draft-editor.d.ts`（`InputState` / `InputActions` 契约）；`grep` 该 repo 的 `host.call`、`Package-private JSON RPC`（只在注释里命中一处，未找到 Host 侧注册 API）。
8. `ask_user_question` 两轮（8 问 + 4 问）后又补 1 问确认「补细节 vs 不编造」的冲突；中间一次调用因第 4 问的两个选项缺 `label` 被工具拒绝，补齐后重发成功。
9. `Get-Date` 取时（08:41:59），写本计划与本日志。

## 结果与证据

用户决策（原句保留）：

- 范围：整段草稿，忽略选区。
- 落地：直接替换，并留一次“还原原文”入口。
- “更好”的自定义回答：`Make the user input prompt to be a better one`（抽象，故追加一轮）。
- 标准多选：动作与对象明确、消除指代；补齐可执行细节；写明可验证的完成标准；原话里的约束一条不能少。
- 长度：不限制。语言：跟随草稿语言。
- 引擎：一次性模型调用（当前会话模型、无工具、不写会话记录）。
- 上下文：只给草稿本身。
- 反馈：按钮转圈，完成后一次性替换。
- 引用：允许改写，但清空 @ 引用与命令（先提示）。
- 交付：并入现有插件，加设置开关，默认开启。
- 还原：输入框上方提示，几秒后自动消失。
- 细节边界：允许推得出来的，推不出的标“待确认”。

关键技术结论（都有取证路径，详见计划书 §2）：

- 按钮槽 `conversation.input.right`（list/session），ownerProps 为空，standardProps 含 `useInput`、`inputActions`、`sessionId`；还原提示用 `conversation.input.dock`。
- `InputActions.setDraft(text)` 是官方整体替换入口；`InputState` 带 `draft/draftRev/phase/occurrences`，`occurrences` 正是检测 @ 引用的依据。
- 客户端拿不到模型名（`useSession` 无该字段），模型必须 Host 侧解析：`agent.session.requestHeader()?.config` → `agentDefaultModel.currentSelection()`。
- `ctx.llm.stream` 可用，`StreamChunk` 的 `text-delta` + `finish.reason` 足够做一次性聚合。
- Host 路由走 `ctx.webServer.register` + `connection.requestRejection`，路径 `chat-improve/rewrite`（不占 `/api` 前缀）。

## 决策

- 用 Grice 的“数量/质量/关系/方式”约束提问：先自己查清槽位、草稿 API、Host 调用点、设置机制，只问会改变实现的 12 项，避免把可查的事丢给用户。
- 不采用 `host.call`：它是动态包（cordis_run）lane 的包内 RPC，本插件是 Loader bundle lane；改用 webServer 路由（`open-in-app` 已验证的公开做法）。
- 不采用子 agent：用户要求不写会话记录、只给草稿，子 agent 会多一条会话且更贵。
- 不采用流式写回：用户选择一次性替换，流式会与撤销、@ 引用交互复杂化。
- 还原只留一层：连续改写覆盖前一次快照，避免引入历史栈。
- 计划书用纯文本路径而非 Markdown 链接：遵守全局 §4.8（Agents Anywhere 会改写本地文件链接）。

## 涉及文件

- `docs/plans/2026-11-03-improve-by-ai.md`（新增，实施计划）
- `docs/logs/2026-11-03-0842-improve-by-ai-plan.md`（本日志，新增）
- 其它仓库文件：未改动

## 未决与下一步

- 计划未获用户确认前不动代码；确认后从步骤 0 开始。
- 步骤 0 需确认三条事实：`agent.session.requestHeader()` 在空会话的返回、`useInput` 是否支持函数选择器、`setDraft` 后的焦点与 chip 清理行为。
- 待用户补一个“烂提示 → 理想提示”的真实例子，用于固化 system prompt 的验收样例（计划已留出位置，不影响开工）。
- 页面取证受 `dsh web` 登录 token 限制：本轮拿不到 HTML；后续 GUI 验收需用户提供 `DSH_VERIFY_URL`（`verify-web.mjs` 的既有约定）。

## 来源

- 无链接：用户决策；定位：2026-11-03 本会话三轮问答；原因：会话无可分享链接。
- `README.md`、`package.json`、`src/client.js`、`src/settings.js`、`src/settings-page.jsx`、`scripts/build.mjs`、`scripts/verify-web.mjs`、`docs/plans/implementation-plan.md`（2026-11-03 读取）。
- `.research/repo/packages/host/open-in-app/src/index.ts`、`src/shared.ts`；`.research/tar/package/lib/types/client/contract/input.d.ts`、`draft-editor.d.ts`。
- 无链接：运行时 inspect 结果；定位：`cordis_inspect_query`（client Slots/Service/Builtin/Event，host Service/Event/Config）；原因：运行时数据无文件。
