---
title: "dsh-chat-improve 验收记录"
created: 2026-11-01
updated: 2026-11-03
log_deai_profile: "agent"
log_deai_version: "1.0.0-rc.1"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/dsh-plugin"]
git_branch: "main"
---

# dsh-chat-improve 验收记录

## 环境

- 目标版本 `0.2.1-rc.5`，Desktop 与本机 Web GUI。〔来源：无链接：用户决策；定位：2026-11-01 本会话；原因：会话无可分享链接〕
- 早期真实浏览器验证使用 `web` profile 与 `http://127.0.0.1:3099`；2026-11-03 的 Improve 上下文验收使用 `http://127.0.0.1:3080`、`/usr/bin/google-chrome`（headless，Playwright `playwright-core`），token 化 URL 不写入本文件。〔来源：无链接：验证环境；定位：本轮 `scripts/verify-*.mjs`；原因：验证产物在 `.research` 内，未提交〕
- 验证脚本随仓库提交在 `scripts/verify-*.mjs`；截图与 JSON 结果保存在 `.research/verify/`，不进版本库。〔来源：[verify-web.mjs:1-145](../scripts/verify-web.mjs#L1-L145)〕
- Improve by AI 的部署形态：desktop profile 以 `link:E:/Repos/dsh-chat-improve` 挂载，`dsh.profile.bundles` 含该包；2026-11-03 通过 `plugin_manager set_plugin` 关→开该行（entryId `include:dsh-chat-improve`）完成 Host 半重载，`application: applied`、无 warning。〔来源：无链接：本机会话；定位：`.dsh/profiles/desktop/package.json` 与 `plugin_manager` 返回值；原因：运行时数据无文件〕

## 结果

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 插件安装与 Host 行 | 通过：`application: applied`，profile 中出现 link 依赖 | `.research` 无；Step 0 日志 |
| 设置页注册 | 通过：`settings.section` 出现 `chat-improve`，order 50 | Step 1 日志 |
| 设置持久化 | 通过：开关写入 `dsh-chat-improve:settings:v1`，刷新后保持 | `.research/verify/user-toggle-report.json` |
| Mermaid 渲染 | 通过：SVG 65 节点、源码隐藏、切换按钮“源码” | `.research/verify/mermaid-ok.png` |
| Mermaid 失败回退 | 通过：保留源码，显示“Mermaid 渲染失败。重试” | `.research/verify/mermaid-error.png` |
| 主题切换刷新 | 单元测试覆盖；浏览器未切换明暗后复查 | `tests/mermaid-enhance.test.js` |
| 用户消息 Markdown | 通过：粗体、代码、斜体、删除线渲染，原文标记不可见 | `.research/verify/user-markdown.png` |
| 用户消息开关 | 通过：关闭后显示 `**bold**` 原文，重开恢复 | `.research/verify/user-markdown-off.png` |
| 用户消息空行 | 通过：干净两项列表 86px、2 块、块后 0 换行；1/2/3 消息 130px、3 块、块后 0 换行 | `.research/verify/user-newline-verify.json`、`user-newline-verify.png` |
| 输入框行内渲染 | 通过：多行草稿隐藏 10 个标记，代码/列表/标题/强调渲染 | `.research/verify/composer.png` |
| 输入框光标行 | 通过：点入代码正文后标记 reveal，输入插入正文 | `.research/verify/composer-revealed.png` |
| 输入框失焦恢复 | 通过：失焦后重新隐藏标记并恢复代码样式 | `.research/verify/composer-report.json` |
| 输入法 | 通过：CDP 合成“中文”后提交，文本与样式正常 | `scripts/verify-composer-ime.mjs` |
| 撤销 | 通过：`Ctrl+Z` 删除的是文字，格式化样式保留 | `.research/verify/composer-safety-report.json` |
| 发送 | 通过：格式化草稿发送后输入框清空，消息进入会话 | `.research/verify/composer-send.png` |
| 输入框开关 | 通过：关闭后隐藏标记 0、代码样式 0；重开恢复 | `.research/verify/composer-toggle-report.json` |
| 性能 | 200 行草稿插入约 3.0 秒，10 字符输入约 85 ms；无错误 | `scripts/verify-perf.mjs` |
| 打包内容 | 通过：21 个文件，包含 `lib/client.js`、patch、locale、icon、src | `npm pack --dry-run --json` |
| 卸载残留 | 通过：移除后 `settings.section` 无 `chat-improve`，`conversation.user.text.node` 只剩内置 `text`；插件卸载无残留 | 本次会话的 Slots 查询 |
| 重装 | 通过：`application: applied`，设置页与用户消息渲染器恢复 | 本次会话的 Slots 查询 |
| Desktop 窗口 | 未做 DOM 断言；加载同一份 `lib/client.js` | — |
| Improve by AI 按钮注册 | 通过：`conversation.input.right` 出现 `chat-improve.improve`，order 10，active | 本会话 Slots 查询（2026-11-03T09:03） |
| Improve by AI 提示条注册 | 通过：`conversation.input.dock` 出现 `chat-improve.improve-notice`，order 30，排在 todo/goal/queue 之后 | 本会话 Slots 查询（2026-11-03T09:03） |
| Improve by AI 路由与栅栏 | 通过：无凭证 `POST /chat-improve/rewrite` → 401；同 method 的未知路径 → 405，说明路由已注册且先走信任栅栏 | `curl.exe` 探测（2026-11-03T09:03） |
| Improve by AI 改写与还原 | 通过：真实 GUI 点击后草稿被替换，提示条显示“已改写/还原原文”；还原后回到原文 | `.research/verify-step4/improve-report.redacted.json` 与 `real-improve-ready.png` |
| Improve by AI 失败回退 | 通过：路由拦截返回 502 时草稿不变，提示条显示“模型调用失败”与“重试” | `.research/verify-step4/improve-report.redacted.json` |
| Improve by AI 引用闸门 | 未覆盖：当前 composer 状态下未能构造引用 chip，确认条分支未触发 | `.research/verify-step4/improve-report.redacted.json` |
| Improve by AI 开关 | 通过：关闭后按钮数量 0；刷新后设置保持 | `.research/verify-step4/improve-report.redacted.json` |
| Improve by AI 工作区上下文 | 通过：真实路由与真实 GUI 输出均带入 `dsh-chat-improve` 与 `main`，不含 unknown/待确认/TBD | `.research/verify-step4/real-improve-output.txt` |
| Improve by AI 约束保留 | 通过：草稿“只改 host，不要动 UI；改完告诉我”在结果中保留 | 本会话真实路由输出（2026-11-03T20:26） |
| Improve by AI 英文草稿 | 通过：英文草稿自然带入 branch main，无 Project/Branch 头部 | 本会话真实路由输出（2026-11-03T20:26） |
| Improve by AI 无计划/无步骤 | 未覆盖：指令、few-shot 与简报已改为只写目标、约束与完成判据；真实模型抽样待宿主重载后执行 | 本会话单测（2026-11-03T23:25，157 例） |

本轮新增的 Improve 行来自 2026-11-03T20:26–20:28 的真实路由与 GUI 验收；GUI 脚本见 [verify-improve.mjs:1-166](../scripts/verify-improve.mjs#L1-L166)，产物在 `.research/verify-step4/`，未提交。〔来源：无链接：本会话真实路由与 GUI 验收；定位：`real-improve-output.txt`、`improve-report.redacted.json`、`real-improve-ready.png`；原因：验证产物未提交〕

2026-11-03T23:22–23:26 起改写契约调整为"只写目标、对象、约束与末态判据，不写计划、方案与操作步骤"。改动落在 [prompt.js:27-89](../src/host/prompt.js#L27-L89)（规则 2/3、开头框架、三条 few-shot、`BRIEF_REMINDER`）与 [context.js:199-213](../src/host/context.js#L199-L213)（简报头、README 标签、cwd 去重）；单测覆盖新契约，真实模型抽样记入上表"未覆盖"行，待宿主重载后补。〔来源：无链接：本会话实现与单测；定位：2026-11-03T23:25 的 `npm test`，退出码 0；原因：终端输出无可分享链接〕

## 限制

- 输入框只做行内与行级前缀；代码块、表格、图片、公式仍为原文。〔来源：[format.js:33-95](../src/composer/format.js#L33-L95)〕
- 一次性粘贴的多行文本若落在单个文本节点内，可能保持原文；逐行输入与 Shift+Enter 分行正常。〔来源：无链接：验证观察；定位：`verify-perf.mjs` 的单节点 14k 草稿；原因：验证产物未提交〕
- 用户消息里真实存在的空行会保留，渲染器不折叠有意空行；CRLF 只算一次换行，孤立 `\r` 按 `pre-wrap` 的浏览器行为忽略。〔来源：[plan.js:17-18](../src/user-text/plan.js#L17-L18)〕
- Desktop 窗口没有独立断言；Web GUI 与 Desktop 共用同一 bundle。〔来源：无链接：验证缺口；定位：本文件“结果”表；原因：会话无可分享链接〕
- Improve by AI 会把草稿发送给会话所用的模型 provider；草稿不进会话日志、不进 localStorage、不进日志，关掉开关即两个槽都不注册。〔来源：[rewrite.js:1-9](../src/host/rewrite.js#L1-L9)、[client.js:183-185](../src/client.js#L183-L185)〕
- 改写是整体替换：`@` 引用与斜杠命令会被清空，含引用时先弹确认；还原只留一层，且仅在草稿仍等于改写结果时可用，提示条约 8 秒后消失。〔来源：[store.js:99-105](../src/improve/store.js#L99-L105)、[store.js:147-156](../src/improve/store.js#L147-L156)、[Notice.jsx:6-24](../src/improve/Notice.jsx#L6-L24)、[Notice.jsx:51-58](../src/improve/Notice.jsx#L51-L58)〕
- Improve by AI 现在会发送一份有上限的工作区简报：cwd、项目名、当前分支、仓库根 `AGENTS.md` 与 `README.md` 摘要；不读全局 `~/.dsh/AGENTS.md`、不读会话历史、不读 git status。〔来源：[context.js:1-250](../src/host/context.js#L1-L250)、[prompt.js:26-81](../src/host/prompt.js#L26-L81)〕
- 真实路由的模型输出不具确定性；本轮用三条草稿取样，观察到项目名、分支自然带入且无占位行，但这不构成对所有草稿的保证。〔来源：无链接：本会话真实路由输出；定位：2026-11-03T20:26；原因：会话无可分享链接〕

## 来源

- [verify-web.mjs:1-145](../scripts/verify-web.mjs#L1-L145)：Mermaid 与设置的真实验证。
- [verify-user-newline.mjs:86-105](../scripts/verify-user-newline.mjs#L86-L105)：用户消息块后换行检查与 86px/130px 判定。
- [plan.js:17-18](../src/user-text/plan.js#L17-L18)：CRLF 与孤立 CR 的归一化。
- [format.js:33-95](../src/composer/format.js#L33-L95)：输入框能力边界。
- [rewrite.js:1-9](../src/host/rewrite.js#L1-L9)：改写路由的信任栅栏、单次模型调用与“不写会话”约束。
- [verify-improve.mjs:1-166](../scripts/verify-improve.mjs#L1-L166)：Improve by AI 的真实 GUI 验收脚本（默认拦截路由，`DSH_VERIFY_REAL=1` 打真模型）。
- [context.js:1-250](../src/host/context.js#L1-L250)：工作区简报的采集、截断与降级。
- [prompt.js:26-81](../src/host/prompt.js#L26-L81)：新 system prompt 与 `composeSystemPrompt()`。
- [client.js:183-185](../src/client.js#L183-L185)：Improve 设置开关注册与移除。
- [store.js:99-105](../src/improve/store.js#L99-L105)：改写成功后替换草稿。
- [store.js:147-156](../src/improve/store.js#L147-L156)：还原守卫与恢复。
- [Notice.jsx:6-24](../src/improve/Notice.jsx#L6-L24)：提示条自动消失计时。
- [Notice.jsx:51-58](../src/improve/Notice.jsx#L51-L58)：ready 提示与还原按钮。
- [rewrite.js:10-180](../src/host/rewrite.js#L10-L180)：简报接入路由与流式调用。
- 无链接：本会话真实路由与 GUI 验收；定位：`.research/verify-step4/real-improve-output.txt`、`improve-report.redacted.json`、`real-improve-ready.png`；原因：验证产物未提交。
- 无链接：本会话真实路由输出；定位：2026-11-03T20:26 的三次 `curl` 调用（含“只改 host”和英文 settings 草稿）；原因：终端输出无可分享链接。
- 无链接：本机会话；定位：2026-11-03 的 `plugin_manager set_plugin` 与 Slots 查询；原因：运行时数据无文件。
- 无链接：用户决策；定位：2026-11-01 本会话；原因：会话无可分享链接。
- 无链接：验证环境；定位：`http://127.0.0.1:3099` 与 `.research/verify/`；原因：验证产物未提交。
- 无链接：本次浏览器验证；定位：`.research/verify/user-newline-verify.json`、`user-newline-verify.png`；用途：用户消息空行结果；原因：`.research/` 未提交。
- 无链接：验证观察；定位：`verify-perf.mjs` 的单节点草稿；原因：验证产物未提交。
- 无链接：验证缺口；定位：本文件“限制”节；原因：会话无可分享链接。


