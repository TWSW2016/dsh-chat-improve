---
title: "Step 3 — 用户消息 Markdown 渲染"
created: 2026-11-01
updated: 2026-11-01
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/dsh-plugin"]
git_branch: "main"
---

# Step 3 — 用户消息 Markdown 渲染

## 目标

把已发送的用户消息按 Markdown 显示，同时保留原文与引用 chip 的行内流；设置关闭时恢复原文。〔来源：[implementation-plan.md:46-47](../plans/implementation-plan.md#L46-L47)〕

## 实现

- 替换 `conversation.user.text.node` 的 `text` 键；该槽是 inline keyed 槽，owner 提供 `raw` 与 `interactive`，原渲染器是 `PlainUserText`（priority 100）。〔来源：无链接：cordis_inspect_query 结果；定位：`conversation.user.text.node` 的 catalog，`ownerProps` 为 `raw`/`interactive`；原因：工具输出无可分享链接〕
- 新注册使用 `priority: 0`，低于内置项；组件在设置关闭时直接返回 `UserTextRun`，因此开关不需要重新注册，引用 chip 也不会被挤到新行。〔来源：[client.js:97-102](../../src/client.js#L97-L102)，[UserMarkdown.jsx:42-47](../../src/user-text/UserMarkdown.jsx#L42-L47)〕
- 文本来源取 `node.data.display ?? node.data.text ?? raw`，与内置渲染器一致，避免把 `raw` 里的原始空白当成显示文本。〔来源：[UserMarkdown.jsx:42-46](../../src/user-text/UserMarkdown.jsx#L42-L46)〕
- 新增小型行内扫描器：支持行内代码、`**`/`__` 粗体、`*`/`_` 斜体、`~~` 删除线、`[文字](url)` 链接与反斜杠转义；`2*3` 这类词内星号保持字面量。〔来源：[inline.js:16-90](../../src/user-text/inline.js#L16-L90)，[inline.js:100-125](../../src/user-text/inline.js#L100-L125)〕
- 块级只做轻量处理：标题、引用、列表、分隔线、围栏代码用 `display:block` 的 span；普通行保持 inline，外层 `white-space: pre-wrap` 保留换行，chip 仍是同一行内流。〔来源：[UserMarkdown.jsx:54-150](../../src/user-text/UserMarkdown.jsx#L54-L150)〕
- 链接渲染为带下划线与工具提示的文本，不接管导航；用户消息里的链接点击仍走原文选择，不打开网页。〔来源：[UserMarkdown.jsx:150-163](../../src/user-text/UserMarkdown.jsx#L150-L163)〕

## 验证

- `npx vitest run`：4 个测试文件、30 个测试全部通过，其中行内扫描器 7 个。〔来源：[inline.test.js:1-57](../../tests/inline.test.js#L1-L57)〕〔来源：无链接：命令输出；定位：2026-11-01，工作目录 `E:\Repos\dsh-chat-improve`；原因：终端输出无可分享链接〕
- 真实 GUI（web profile，Chrome headless）：新建会话发送 `**bold** and \`code\` and *em* and ~~gone~~`，用户气泡中出现 1 个 `strong`、1 个 `code`、1 个 `em`、1 个 `del`，页面文本不含 `**bold**` 或 `` `code` ``，控制台零错误。〔来源：无链接：浏览器验证结果；定位：`.research/verify/user-markdown-report.json` 与 `user-markdown.png`；原因：验证产物未提交〕
- 关闭“按 Markdown 渲染用户消息”后：`strong` 数量变为 0，页面文本重新出现 `**bold**`，localStorage 写入 `userMessageMarkdown:false`；重新打开后恢复为 1 个 `strong`。〔来源：无链接：浏览器验证结果；定位：`.research/verify/user-toggle-report.json` 与 `user-markdown-off.png`；原因：验证产物未提交〕

## 问题与限制

- ⚠️ 行内扫描器不是完整 GFM：表格、KaTeX、任务列表、嵌套链接不会按完整 Markdown 渲染；用户消息以行内格式为主，块级内容保持原文或轻量块。〔来源：[inline.js:1-14](../../src/user-text/inline.js#L1-L14)〕
- ⚠️ 围栏代码用 `display:block` 的 span 嵌在 inline run 里，块后的 chip 会换行；用户消息里出现代码块时属于可接受退化。〔来源：[UserMarkdown.jsx:54-150](../../src/user-text/UserMarkdown.jsx#L54-L150)〕
- ⚠️ 队列预览与 steering 也走同一个 factory，因此同样受开关影响；这是预期行为，未单独测试。〔来源：[UserMarkdown.jsx:42-47](../../src/user-text/UserMarkdown.jsx#L42-L47)〕
- 🚧 验证在 Web GUI 完成；Desktop 窗口加载同一份 bundle，但未在桌面窗口内重复断言。〔来源：无链接：验证缺口；定位：本文件“验证”节；原因：会话无可分享链接〕

## 下一步

Step 4：输入框行内渲染 spike。先只做行内代码，验证中文输入法、光标、撤销、chip、斜杠菜单与发送不回归，再扩到粗斜、链接、标题与列表。〔来源：[implementation-plan.md:47-48](../plans/implementation-plan.md#L47-L48)〕

## 来源

- [inline.js:16-90](../../src/user-text/inline.js#L16-L90) 与 [inline.js:100-125](../../src/user-text/inline.js#L100-L125)：行内扫描与强调匹配。
- [UserMarkdown.jsx:42-47](../../src/user-text/UserMarkdown.jsx#L42-L47)：设置开关与回退。
- [UserMarkdown.jsx:54-150](../../src/user-text/UserMarkdown.jsx#L54-L150)：块级轻量渲染。
- [UserMarkdown.jsx:150-163](../../src/user-text/UserMarkdown.jsx#L150-L163)：行内节点渲染。
- [client.js:98-102](../../src/client.js#L98-L102)：槽注册。
- [inline.test.js:1-57](../../tests/inline.test.js#L1-L57)：扫描器测试。
- [implementation-plan.md:46-48](../plans/implementation-plan.md#L46-L48)：Step 3 与 Step 4 目标。
- 无链接：cordis_inspect_query 结果；定位：`conversation.user.text.node` 的 catalog；原因：工具输出无可分享链接。
- 无链接：命令输出；定位：2026-11-01，工作目录 `E:\Repos\dsh-chat-improve`；原因：终端输出无可分享链接。
- 无链接：浏览器验证结果；定位：`.research/verify/user-markdown-report.json`、`user-toggle-report.json`、`user-markdown.png`、`user-markdown-off.png`；原因：验证产物未提交。
- 无链接：验证缺口；定位：本文件“问题与限制”节；原因：会话无可分享链接。

