---
title: "Improve by AI：用模型改写输入框草稿（实施计划）"
created: 2026-11-03T08:42:00+08:00
updated: 2026-11-03T20:35:00+08:00
log_deai_profile: agent
log_deai_version: "1.0.0-rc.1"
tags:
  - log-deai
  - project/dsh-chat-improve
  - type/plan
  - topic/dsh-plugin
git_branch: main
---

# Improve by AI 实施计划

## 0. 目标

在输入框工具栏加一个 “Improve by AI” 按钮：点击后把当前草稿交给模型改写成一条更好的提示，结果就地替换草稿，并给出一次“还原原文”的入口。改写是一次性模型调用，不进会话记录、不跑工具、不改 core。

## 1. 需求定稿（本次会话逐条确认）

| # | 项 | 结论 | 依据 |
| --- | --- | --- | --- |
| R1 | 改写范围 | 整段草稿，忽略选区 | 用户选 “整段草稿，忽略选区” |
| R2 | 结果落地 | 直接替换，并留一次“还原原文”入口 | 用户选 “直接替换，并留一次‘还原原文’入口” |
| R3 | 改写标准 | ①动作与对象明确、消除指代；②补齐可执行细节；③写明可验证的完成标准；④原话里的约束一条不能少 | 用户多选这 4 条 |
| R4 | 细节边界 | 允许推断可推出的；推不出的直接省略，不写“待确认/unknown”，不凭空立约束 | 2026-11-03 修订：用户要求结果里不出现“未知/待确认”行 |
| R5 | 长度 | 不限制 | 用户选 “不限制” |
| R6 | 语言 | 跟随草稿语言 | 用户选 “跟随草稿语言” |
| R7 | 引擎 | 一次性模型调用：当前会话的模型、无工具、不写会话记录 | 用户选该推荐项 |
| R8 | 上下文 | 草稿 + 有上限的工作区简报（cwd、项目名、git 分支、根 AGENTS.md/README 摘要）；不含会话历史、git status | 2026-11-03 修订：用户要求带入项目名与分支名 |
| R9 | 过程反馈 | 按钮转圈，完成后一次性替换 | 用户选 “按钮转圈，完成后一次性替换” |
| R10 | @ 引用/命令 | 允许改写，但先提示会清空 @ 引用与命令 | 用户选 “允许改写，但清空 @ 引用与命令（先提示）” |
| R11 | 交付 | 并入 dsh-chat-improve，设置页加开关，默认开启 | 用户选该推荐项 |
| R12 | 还原入口 | 输入框上方一条提示，几秒后自动消失 | 用户选该推荐项 |

R3 与 R4 是一组：先按四条标准改写；能由草稿或工作区事实推出的细节可以补，推不出的直接省略，不写“待确认/unknown”，也不编造需求。2026-11-03 用户明确要求结果里不要再出现“未知项目/未知分支”这类占位行。

## 2. 已核实的技术事实

都不需要再问用户，也不该在计划里假设：

1. 按钮位置：`conversation.input.right`（list，session 作用域，“Compact controls before the composer submit action”）。注册项只要 `id` / `order`。该槽的 standardProps 含 `useInput`、`inputActions`、`sessionId`、`useSession` 等；**ownerProps 为空**，没有 `locked`（那是 `conversation.input.model` 的 owner props）。
2. 草稿读写：`InputState` 有 `draft`、`draftRev`、`phase`（`plain`/`adjudicating`/`claimed`/`submitting`）、`occurrences`（@ 引用在剪贴板投影里的位置）、`queue`；`InputActions` 有 `captureInsertion()`、`insertText(text, span)`、`setDraft(text)`、`addAttachments/removeAttachment/pruneAttachments`、`submit()`。**没有 focus 方法**（`SessionInput.focus()` 在更内层，不进 `InputActions`）。
3. 还原提示的位置：`conversation.input.dock`（list，“Full-width entries above the composer card”），正好在输入卡上方。
4. 客户端拿不到模型名：`useSession` 的契约里没有 model 字段；模型选择属于另一个插件（`ui-model-selection` 占用 `conversation.input.model`）。所以**模型必须由 Host 解析**，不能由前端传。
5. Host 侧模型来源：`Agent` 可拿到 `agent.session`（仓库 packages/AGENTS.md 明确要求“derive `agent.session`”）；`Session.requestHeader(): EpochHeader | undefined`，其 `config: { provider, model, reasoningEffort? }` 就是该会话上一次请求用的模型。无 header 时回退 `ctx.agentDefaultModel.currentSelection(): ModelSelection`。
6. 模型调用：`ctx.llm.stream(GenerateOptions)`，`options.provider/model/messages/system/maxTokens/temperature/signal/sessionId`；`StreamChunk` 里取 `text-delta`，`finish` 的 `reason.kind` 为 `stop`/`max-tokens`/`error`/`aborted`。`purpose` 只接受 `'compaction' | 'session-title'`，本功能不设。
7. Host 路由：`ctx.webServer.register({ kind:'exact', path, handler })`，handler 是 Node `(req,res)`；`connection.requestRejection(req)` 返回 `401 | 403 | undefined`，是官方信任栅栏。`open-in-app` 就是这套：路径 `/open-in-app/open`，**不带 `/api` 前缀**（`/api` 是 connection 自己的前缀 owner），浏览器用文档相对路径访问。
8. 构建：`scripts/build.mjs` 只打 `src/client.js` → `lib/client.js`（`window.__ModuleLoader__.load` 工厂，baseline external 含 React/Cordis/ui-primitives/ui-slots/ui-conversation）。Host 半 `src/index.js` 由 Loader 直接加载，无需构建。
9. 设置：`src/settings.js` 的 localStorage store（key `dsh-chat-improve:settings:v1`），`sanitizeSettings` + 设置页 `src/settings-page.jsx`，组件通过 `useSettings()` 订阅。
10. 文案：`src/client.js` 里 `en`/`zh` 字典 + `ctx.locale.register('chat-improve', ...)`，`const t = ctx.locale.bind('chat-improve')`。`settings.section` 注册带 `locale: 'chat-improve'`，所以注入组件能收到 `t`；`conversation.input.*` 的注册项**不支持 `locale`**，新组件必须由我们闭包传入 `t`。
11. 验证：`scripts/verify-web.mjs` 用 `playwright-core` + 本机 Chrome，入口是环境变量 `DSH_VERIFY_URL`（带 token 的 Web GUI URL），截图落 `.research/verify/`。本功能照此新增一个脚本。

## 3. 设计

### 3.1 文件与职责

| 文件 | 内容 | 类型 |
| --- | --- | --- |
| `src/host/prompt.js` | system prompt 常量、`composeSystemPrompt()`、请求体解析、输出清理 | 纯函数，可单测 |
| `src/host/context.js` | 会话目录、项目名、git 分支、AGENTS/README 摘要、6000 字符截断 | 纯函数，可单测 |
| `src/host/rewrite.js` | 路由注册、信任栅栏、模型解析、工作区简报接入、`llm.stream` 聚合、状态码映射 | Host |
| `src/index.js` | 由空 `apply` 改为 `inject` + 调 `registerRewriteRoute(ctx)` | Host 入口 |
| `src/improve/store.js` | 一次点击的状态机：`idle`/`running`/`error`/`ready`，原文快照、单飞、取消 | 纯 JS，可单测 |
| `src/improve/client.js` | `fetch('chat-improve/rewrite')`、错误码→本地文案、与 store 装配、dispose | 客户端 |
| `src/improve/Button.jsx` | 工具栏按钮（图标 + tooltip + aria-label），loading/禁用态 | 客户端 |
| `src/improve/Notice.jsx` | 输入卡上方的提示条：还原 / 确认清空引用 / 错误重试 / 草稿已变化 | 客户端 |
| `src/client.js` | 注册两个槽、按设置开关启停、把 `t` 与 store 传给组件、补字典 | 客户端 |
| `src/settings.js`、`src/settings-page.jsx` | 新设置项 `improvePrompt`（默认 true）+ 提示文案 | 客户端 |
| `tests/rewrite-prompt.test.js`、`tests/rewrite-context.test.js`、`tests/rewrite-route.test.js`、`tests/improve-store.test.js` | 见 §5 | 测试 |
| `scripts/verify-improve.mjs` | 真实 GUI 验收 | 脚本 |

不新增依赖：图标用内联 SVG（sparkles），样式用 `--dsw-alias-*` token 的内联样式，与现有组件一致。

### 3.2 一次点击的时序

```
用户点按钮
  → 前端校验：设置开、草稿非空、phase==='plain'、无进行中请求
  → 若草稿含 @ 引用(occurrences>0) 或以 '/' 开头(phase==='claimed')
      → 不发送，先在 dock 显示确认条「会清空 @ 引用与命令」[继续] [取消]
  → 记录 draft、draftRev、原文快照(仅在成功后才写入)
  → store: running（按钮转圈、保持可输入）
  → POST chat-improve/rewrite { draft, sessionId }（AbortSignal.timeout(90s)）
Host:
  → connection.requestRejection → 401/403
  → method/content-type/body 上限/草稿上限校验
  → 解析模型（会话 header → 默认模型）；无模型 → 409
  → 解析工作区简报（cwd/项目名/分支/AGENTS/README；失败降级为空）
  → llm.stream(messages=[{role:'user',content:[{type:'text',text:draft}]}], system=composeSystemPrompt(brief), maxTokens)
  → 聚合 text-delta；finish 分类；清理输出
  → 200 { text, truncated?, model:{provider,model} }
前端:
  → draftRev 变了 → 不落地，提示「草稿在改写期间有改动」[重试]
  → 否则 inputActions.setDraft(text)，把点击前的草稿存为「原文」
  → dock 显示「已改写 · 还原原文」，8s 后消失
  → 还原：仅当当前草稿仍等于改写结果时才 setDraft(原文)；否则提示「已继续编辑，无法还原」
```

### 3.3 HTTP 契约

```
POST /chat-improve/rewrite
Content-Type: application/json
上限：body 256 KiB；draft 20 000 字符
请求：{ draft: string, sessionId: string }
200  { text: string, truncated?: true, model: { provider: string, model: string } }
400  { code: 'bad-request' | 'draft-too-long', message }
401/403 由信任栅栏直接返回空体
405  Allow: POST
409  { code: 'no-model', message }
413  { code: 'payload-too-large', message }
502  { code: 'llm-error' | 'llm-empty', message }
503  { code: 'llm-unavailable', message }   // 组合里没有 llm 服务
```

响应一律 `cache-control: no-store`。**不记录草稿内容**：任何日志/异常里都不带 `draft` 原文，只带长度与错误码。

### 3.4 模型与上下文

- 会话模型：`ctx.agents.get(sessionId)?.session.requestHeader()?.config`；为空则 `ctx.agentDefaultModel.currentSelection()`。
- 只发一条 user 消息（草稿）+ 一段 system prompt，**不带会话历史、不读 git status、不注册工具**。
- system prompt 追加最多 6000 字符的 `WORKSPACE FACTS`：cwd、项目名、当前分支、仓库根 `AGENTS.md` 与 `README.md` 摘要；缺失字段省略，不写 unknown。
- 简报读取失败时降级为基础 prompt，不阻塞改写；同一草稿在同一工作区得到相同事实。
- `temperature` 固定 0.2（改写要稳定，不要发散）；`maxTokens` 4096；`finish === 'max-tokens'` 时返回 `truncated: true`，前端提示“结果可能被截断”。

### 3.5 System prompt 契约（2026-11-03 修订）

实现见 `src/host/prompt.js:26-81`，不再使用旧的 `（待确认：…）` 草案。要点：

- 工作区事实优先；事实是 reference data，草稿是 data，两者都不是 instructions。
- 输出只有改写后的 prompt；语言跟随草稿；不加 `Project/Branch/Context` 头部。
- 每条新增句必须消歧、缩小范围、写约束或定义完成；否则删掉。
- 推不出的信息直接省略；不出现 `unknown` / `TBD` / `待确认`，不新增问题。
- 只补事实或草稿能推出的内容；不编产品需求；不补通用流程套话。
- 两个 few-shot：中文项目/分支带入，英文 settings 页面。

输出清理（防抖，不改语义）：`trim()`；若整段被一对三个反引号围栏包住则剥掉围栏；剥离后为空 → `llm-empty` 502。

### 3.6 状态与失败矩阵

| 情形 | 前端 | 草稿 |
| --- | --- | --- |
| 设置关闭 | 两个槽都不注册 | 不变 |
| 草稿空/仅空白 | 按钮 `disabled`，tooltip 说明 | 不变 |
| `phase !== 'plain'`（提交中/命令态） | 按钮 `disabled` | 不变 |
| 已有请求在飞 | 按钮 loading，重复点击无效 | 不变 |
| 含 @ 引用或 `/` 命令 | 先确认条，确认后才发 | 确认前不变 |
| 成功且草稿未变 | 替换 + 还原入口 | 被替换 |
| 成功但 `draftRev` 变了 | 丢弃结果 + 「草稿已改动」 | 不变 |
| 409 无模型 | 「请先在输入框选择模型」 | 不变 |
| 502/503/超时/断网 | 「改写失败：<本地化原因>」+ [重试] | 不变 |
| Host 侧用户关闭页面 | `req` close → abort `llm.stream` | — |
| 工作区简报不可用 | 仍改写，system 只用基础 prompt | 不变 |
| 插件卸载/HMR | store 清空、fetch abort、槽随 effect 移除 | 不变 |

### 3.7 安全与隐私

- 路由走 `connection.requestRejection`：挡跨站与 DNS rebinding，并要求登录 cookie；路径不带 `/api`，不与 connection 的前缀 owner 冲突。
- 请求体：媒体类型校验 + 256 KiB 上限 + draft 20 000 字符上限 + 类型校验。
- 草稿属于敏感内容：不进日志、不进错误信息、不写 localStorage（只存在内存里的“原文”快照）。
- 工作区简报只读根级事实（cwd、项目名、当前分支、AGENTS.md、README 摘要），最多 6000 字符；不读全局 `~/.dsh/AGENTS.md`、会话历史、git status；简报与草稿都不进日志。
- 结果只写回输入框，**不 append 任何会话事件**，因此不进模型历史、不改变 fork/replay。

## 4. 分步实施

| 步 | 内容 | 完成判据 | 预估 |
| --- | --- | --- | --- |
| 0 | 校准 spike：确认 4 个事实（见 §8） | 4 条都有结论与证据；不满足的项切到对应回退 | 0.5–1 h |
| 1 | Host：`prompt.js` + `rewrite.js` + 路由注册 + 单测 | 单测绿；无 cookie 的 `curl` 得 401；坏 body 得 400 | 1.5 h |
| 2 | 客户端骨架：store、按钮、设置项与开关、i18n | 按钮出现在发送键左侧；关设置后消失；空草稿禁用 | 1.5 h |
| 3 | happy path：点击 → 请求 → 替换 → 还原条 | 真实 GUI 里完成一次改写与还原 | 1.5 h |
| 4 | 边界：@ 引用确认、draftRev 守卫、错误/超时/截断、卸载清理 | §3.6 每行都有可复现验证 | 1.5 h |
| 5 | 文档与文案：README、`locale/*.json`、设置提示、`docs/verification.md` | README 明说“会发一次模型请求”；文案无硬编码中文 | 0.5 h |
| 6 | 验收：`npm test`、`npm run build`、装/刷新 bundle、`scripts/verify-improve.mjs` | 截图 + report.json 全绿；bundle 增量 < 20 KiB | 1 h |

总计约 6–8 h。步骤 0 不通过时，§8 的每一条都有不改变 UX 的回退，不需要回头改需求。

## 5. 测试与验收

单测（vitest，纯逻辑，沿用现有 `tests/*.test.js` 风格）：

- `rewrite-prompt.test.js`：新契约的关键句（工作区事实优先、禁止 unknown/待确认、禁止元数据头部、两个 few-shot、`composeSystemPrompt()`）；输出清理；请求体解析。
- `rewrite-context.test.js`：会话目录、git/非 git、worktree、detached、子目录、缺失/不可读文件、截断、格式化与降级。
- `rewrite-route.test.js`：system 含简报、user message 仍只有 draft、无 session 时走基础 prompt。
- `improve-store.test.js`：`idle→running→ready`、单飞、`draftRev` 不匹配时丢弃、还原守卫（当前文本 ≠ 改写结果时拒绝还原）、错误态保留原文。

真实 GUI（`scripts/verify-improve.mjs`，照 `verify-web.mjs` 的接法）：

1. 打开 `DSH_VERIFY_URL`，定位按钮（`aria-label`），断言存在且可点。
2. 填入一条含指代的草稿，点击，等待替换；断言草稿变化、还原条出现、截图。
3. 点还原，断言草稿回到原文。
4. 填含 `@` 的草稿，点击，断言确认条出现且**未发请求**（拦截 `fetch` 计数）。
5. 断开模型（临时把设置里的模型改空/用一个无效 provider 不方便时，改为直接 `fetch` 一个不存在的路径验证错误分支），断言草稿不变且有重试。
6. 断言 console 零 error。

回归：`composer` 相关现有测试与 `verify-composer*.mjs` 全绿（按钮在工具栏，不能挤压输入区布局）。

## 6. 风险与回退

| 风险 | 影响 | 回退 |
| --- | --- | --- |
| `setDraft` 丢光标或清空撤销栈 | 替换后要重新点输入框 | 替换后手动 `focus()` 到 `[data-composer-input]`（一次性 DOM 调用，注释说明没有 API 座位）；还原条兜底 |
| 会话模型不可得（`requestHeader()` 为空） | 用默认模型，可能与会话显示不一致 | 回退 `agentDefaultModel.currentSelection()`；两者都空 → 409 明示“请先选择模型” |
| `useInput` 不支持函数选择器 | 代码跑不通 | 改为 `useInput()` 全量快照 + `useMemo` 选字段 |
| 改写质量不稳 | 有的草稿被改坏 | 固定 rubric + `src/host/prompt.js` 单点；先人工看 10 条真实草稿再定稿；必要时加 `temperature: 0` |
| 路由与别的插件冲突 | 注册时抛错 | 路径用 `chat-improve/rewrite` 前缀；冲突即改前缀，不动协议 |
| 草稿被送到模型 provider | 隐私预期变化 | 设置默认开但 hint 明说；关闭即完全不发请求（两个槽都不注册） |
| 工作区简报带来隐私变化 | 路径、分支、README 摘要离开本机 | 只读根级事实并限 6000 字符；关闭 Improve 即完全不发请求；后续可加独立开关 |

## 7. 不做

流式写回、选区局部改写、保留 @ 引用/命令、快捷键、多次改写历史栈（只留一层还原）、读会话历史、git status 或完整工作目录内容、子 agent、自动重试、Desktop 与 Web 的差异化行为、对改写结果做二次校验（长度/规则检查）。

## 8. 实现期需确认的 3 个事实（都不改需求）

1. `agent.session.requestHeader()` 在空会话/新会话上的返回值（undefined 还是上一轮 header）。
2. slot 组件里 `useInput` 的选择器语义（是否为 `(state) => slice`）。
3. `setDraft` 之后焦点与光标位置，以及它是否把 @ 引用 chip 一并清掉。

三条都在步骤 0 用一次临时按钮 + `console.log` 确认，每条都有上表的回退。

## 来源

- 无链接：用户决策；定位：2026-11-03 本会话两轮问答（R1–R12）；原因：会话无可分享链接。
- 无链接：Slots 实时目录；定位：`cordis_inspect_query` client `Slots.listSubTree`（`conversation.input.right`、`conversation.input.dock`、`conversation.input.model`）；原因：运行时数据无文件。
- `src/client.js`、`src/settings.js`、`src/settings-page.jsx`、`scripts/build.mjs`、`scripts/verify-web.mjs`（本仓库，2026-11-03 读取）。
- `.research/repo/packages/host/open-in-app/src/index.ts`、`src/shared.ts`（Host 路由 + 信任栅栏 + 路径前缀的现成范例）。
- `.research/tar/package/lib/types/client/contract/input.d.ts`、`draft-editor.d.ts`（`InputState`/`InputActions` 契约）。
- 无链接：Host Service 契约；定位：`cordis_inspect_query` host `Service`（`llm`、`webServer`、`sessionTitle`、`sessionController`、`agentDefaultModel`）；原因：运行时数据无文件。
