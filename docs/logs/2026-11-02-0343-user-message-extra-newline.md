---
title: "用户消息多出空行：根因与修复计划"
created: 2026-11-02
updated: 2026-11-02
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/diagnosis", "topic/user-message"]
git_branch: "main"
---

# 用户消息多出空行：根因与修复计划

## 交接摘要

- 状态：根因已定位并复现，代码未改。
- 根因有两条。第一，`UserMarkdownText` 对块级行（标题、列表、引用、分隔线、围栏代码）已用 `display:block` 换行，行循环又追加 `'\n'`，每个块级行因此多出一整行空行。第二，行拆分前的 `replace(/\r\n?/g, '\n')` 把孤立 `\r` 也当成换行，而浏览器对 `pre-wrap` 文本里的孤立 `\r` 不换行；于是 `\r\n\r` 这类源文本被额外拆出一个空行。
- 证据：同一条干净的两项列表，插件开 108px、关 86px；22px 行高，差值正好一行。带 CRLF 的 1/2/3 消息，开 218px、关 130px；其中两行来自块级行分隔，另两行来自孤立 `\r` 被当成换行。
- 下一步：P0 只改用户消息渲染，去掉块级行后的多余分隔，并让孤立 `\r` 不再被当成换行；P1 是否规范化粘贴来源文本另议，因为会改 model-visible 输入。
- 关键文件：`src/user-text/UserMarkdown.jsx`，证据 `.research/verify/user-newline-report.json`。

## 目标与请求

用户报告：使用插件后，聊天界面里显示自己输入的提示词时总会多出一个换行，要求定位根因并给出详细修复计划。〔来源：无链接：用户 2026-11-02 消息；定位：本会话用户消息；原句：“I found after I use the plugin, in the chat interface shown my input prompt, always another new line is added. Figure out the root reason and provide me a detailed fix plan.”；原因：会话无可分享链接〕

用户随后给出三条执行约束：先提交并保持工作区干净；第二条无异议；暂不合并。〔来源：无链接：用户 2026-11-02 消息；定位：本会话用户消息；原句：“1. yes, always commit at first and make sure the current workspace is clean / 2. fine / 3. not merge yet”；原因：会话无可分享链接〕

## 执行与命令

| 命令或工具 | 工作目录 | 结果 |
| --- | --- | --- |
| `git log --oneline -30`、`git status --short` | `E:\Repos\dsh-chat-improve` | 退出码 0；分支 `main`；工作区仅有一个与本次无关的未跟踪日志 `docs/logs/2026-11-02-0330-chart-timeline.md`。 |
| Node + `zlib.zstdDecompressSync` 逐帧解压 `session-2065f120-…/session.v4.jsonl.zstd` | 同上 | 退出码 0；在 `user/message` 事件里读到原文 `"You can use this as a reference:\n\r\n1. …\r\n\r2. fine\r\n\r3. not merge yet"`，确认源文本本身含成对换行。 |
| 用本地凭据签 `dsh-auth-*` cookie，Playwright + headless Chrome 打开 `http://127.0.0.1:12686` | 同上 | 退出码 0；只读打开现有会话，未发送任何消息；取到用户气泡的 `innerText`、`textContent`、`innerHTML` 与 `getBoundingClientRect().height`。 |
| 同一会话切换 `userMessageMarkdown` 开关后重复测量 | 同上 | 退出码 0；干净列表 108px → 86px；1/2/3 消息 218px → 130px。 |
| 在新建会话的输入框派发 `ClipboardEvent('paste')`，对比插件开关 | 同上 | 退出码 0；开关前后都是单个 Lexical TextNode，HTML 都是 `<p><span data-lexical-text>line one\r\n\r\n1. item one\r\n2. item two</span></p>`，说明粘贴路径未被本插件改写。 |

以上浏览器测量结果、DOM 片段和截图索引保存在 `.research/verify/user-newline-report.json`。〔来源：无链接：本次浏览器验证；定位：.research/verify/user-newline-report.json、clean-list-on.png、clean-list-off2.png、live-on.png、live-off.png；原因：.research/ 未提交〕

## 结果与证据

同一条干净的两项列表，源文本只有单换行：

```text
Propose a detailed plan to solve these issues:
1. render timeline and gantt
2. fix the invalid key words
```

插件开启时 `innerText` 变成 `"…issues:\n\n1. …\n\n\n2. …"`，气泡高度 108px；关闭 `userMessageMarkdown` 后恢复为 `"…issues:\n1. …\n2. …"`，高度 86px。两者相差 22px，等于该气泡一行的高度。〔来源：无链接：本次浏览器验证；定位：.research/verify/user-newline-report.json 的 cases.cleanList；原因：.research/ 未提交〕〔来源：[UserMarkdown.jsx:108-134](../../src/user-text/UserMarkdown.jsx#L108-L134)〕

用户刚发的 1/2/3 消息复现同一现象但更重：源文本含 `\n\r\n`、`\r\n\r`，插件开 218px、关 130px，相差 88px，等于四行。四行的来源是两处叠加：当前 `replace(/\r\n?/g, '\n')` 把孤立 `\r` 也当成换行，在 item1→item2、item2→item3 之间各造出一个空行；块级行后的 `'\n'` 又在 item1、item2 后各加一行。浏览器对关闭插件后的原始 `pre-wrap` 文本忽略孤立 `\r`，只保留 header 后的一行空行，所以是 130px。〔来源：无链接：本次浏览器验证；定位：.research/verify/user-newline-report.json 的 cases.referenceMessage；原因：.research/ 未提交〕〔来源：无链接：会话记录；定位：session-2065f120-26af-418d-88b2-a87e7b56187e 的 user/message seq 318；原因：会话文件为 zstd 压缩、无可分享链接〕

归一化的对照证据：插件开时 `textContent` 是 `"header:\n\n1. …\n\n2. fine\n\n3. …"`；关闭后原始 `textContent` 是 `"header:\n\r\n1. …\r\n\r2. fine\r\n\r3. …"`，但气泡只画 5 行。差异来自 `replace(/\r\n?/g, '\n')` 把每个孤立 `\r` 变成 `\n`，凭空多出两行；浏览器的 `pre-wrap` 不把孤立 `\r` 当换行。〔来源：[UserMarkdown.jsx:55](../../src/user-text/UserMarkdown.jsx#L55)〕〔来源：无链接：本次浏览器验证；定位：.research/verify/live-on.png、live-off.png 与 user-newline-report.json 的 cases.referenceMessage；原因：.research/ 未提交〕

块级行的证据在 DOM：标题、引用、列表项、分隔线和围栏代码都渲染为 `display:block` 的 `span`；列表项后面又跟着一个文本节点 `"\n"`。〔来源：[UserMarkdown.jsx:62-103](../../src/user-text/UserMarkdown.jsx#L62-L103)〕〔来源：[UserMarkdown.jsx:108-128](../../src/user-text/UserMarkdown.jsx#L108-L128)〕

输入框不是根因：粘贴 `"line one\r\n\r\n1. item one\r\n2. item two"` 后，插件开/关都落成同一个 TextNode，编辑器的 `getTextContent()` 也一致；插件只影响发送后的用户气泡。〔来源：无链接：本次浏览器验证；定位：.research/verify/composer-paste-on.png、composer-paste-off.png 与 user-newline-report.json 的 cases.composerPaste；原因：验证产物未提交〕

## 决策

- 根因归到用户消息渲染，不归到输入框：粘贴测试在开关前后完全一致，而气泡在开关前后差一行到四行。〔来源：无链接：本次浏览器验证；定位：见上两节；原因：验证产物未提交〕
- P0 只做显示层修复，不改写入会话的文本。插件自述“No core changes, no session writes, no model-visible input”，把 `\n\r\n` 直接改写会破坏这条边界。〔来源：[README.md:57-62](../../README.md#L57-L62)〕
- P1 的候选是修正 DSH 粘贴路径或增加显示层折叠；两者都会影响用户看到的原文或 model-visible 输入，需要用户单独拍板，不并入 P0。〔来源：无链接：DSH 0.2.1-rc.5 客户端包；定位：`app.asar` 内 `dsh-client-ui-conversation/lib/client.js` 的 `DraftEditor.paste` 调 `selection.insertText(clean)`，未按换行拆成 LineBreakNode；原因：asar 包内文件无稳定链接〕
- 用户要求“先提交、暂不合并”；实施时先处理已有未跟踪日志，再在独立分支修复，不直接合并 `main`。〔来源：无链接：用户 2026-11-02 消息；定位：本会话用户消息；原句见“目标与请求”；原因：会话无可分享链接〕

## 涉及文件

- `src/user-text/UserMarkdown.jsx`：根因所在；本轮未改，计划只在行分隔处修改。〔来源：[UserMarkdown.jsx:54-134](../../src/user-text/UserMarkdown.jsx#L54-L134)〕
- `src/client.js`：`conversation.user.text.node` 的 `text` 注册；开关切换走这里，不需要改注册。〔来源：[client.js:127-131](../../src/client.js#L127-L131)〕
- `src/settings.js`：`userMessageMarkdown` 默认 `true`，所以默认就能看到问题。〔来源：[settings.js:17-22](../../src/settings.js#L17-L22)〕
- `.research/verify/user-newline-report.json`：本轮新增的测量记录，`git` 忽略目录，不进提交。
- `docs/logs/2026-11-02-0343-user-message-extra-newline.md`：本日志。

## 未决与下一步

P0 修复步骤：

1. 把 `UserMarkdownText` 的行渲染改成“返回节点 + 是否块级”的小函数；块级行不再追加 `'\n'`，非块级行仍按行追加。围栏开始/结束行不产出分隔符，代码块整体视为块级。〔来源：[UserMarkdown.jsx:59-134](../../src/user-text/UserMarkdown.jsx#L59-L134)〕
2. 改归一化：`\r\n` → `\n`，孤立 `\r` 删除（不要再变成 `\n`），与浏览器 `pre-wrap` 的原始渲染一致；新增用例覆盖 `\n`、`\r\n`、`\r`、`\n\r\n`、`\r\n\r` 以及真正的空行。〔来源：[UserMarkdown.jsx:55](../../src/user-text/UserMarkdown.jsx#L55)〕
3. 把行规划抽成不依赖 React 的纯函数，用现有 Vitest 覆盖：两项列表不得多行；标题、引用、分隔线、围栏代码后不得多行；空行按源保留；普通多行文本每行只断一次。现有测试目录已用 Vitest，不需要新增框架。〔来源：[package.json:1-20](../../package.json#L1-L20)〕
4. 真实 GUI 验收：同一干净列表，修复后插件开的气泡高度应回到 86px；1/2/3 消息应从 218px 回到 130px 附近，且 DOM 中块级项后不再出现额外的 `"\n"` 文本节点。可复用 `scripts/verify-user-markdown.mjs` 的登录、发送、断言结构。〔来源：[verify-user-markdown.mjs:25-54](../../scripts/verify-user-markdown.mjs#L25-L54)〕
5. 跑 `npm test`、`npm run build`；刷新 GUI 后复测开关开/关；写 `docs/logs/step-13-user-newline.md` 并按用户要求提交，不合并。

P1 待定项：是否要让 `\n\r\n` 这类粘贴来源在输入阶段就归一。可选方案是改 DSH 的 `DraftEditor.paste` 为 `insertRawText` 或显式拆 LineBreakNode，或在插件显示层折叠连续空行；前者改 model-visible 文本，后者可能吞掉用户有意保留的空行，需先确认取舍。

## 来源

- [UserMarkdown.jsx:54-134](../../src/user-text/UserMarkdown.jsx#L54-L134)：行拆分、块级 span、`'\n'` 追加与围栏处理。
- [client.js:127-131](../../src/client.js#L127-L131)：用户文本槽注册。
- [settings.js:17-22](../../src/settings.js#L17-L22)：`userMessageMarkdown` 默认值。
- [README.md:57-62](../../README.md#L57-L62)：插件不写会话、不改 model-visible 输入的边界。
- [verify-user-markdown.mjs:25-54](../../scripts/verify-user-markdown.mjs#L25-L54)：现有真实 GUI 验证结构。
- [package.json:1-20](../../package.json#L1-L20)：项目已用 Vitest。
- 无链接：本次浏览器验证；定位：`.research/verify/user-newline-report.json`、`clean-list-on.png`、`clean-list-off2.png`、`live-on.png`、`live-off.png`、`composer-paste-on.png`、`composer-paste-off.png`；用途：气泡高度、DOM、输入框粘贴对照；原因：`.research/` 未提交。
- 无链接：会话记录；定位：`session-2065f120-26af-418d-88b2-a87e7b56187e` 的 `user/message` seq 318；用途：确认发送后的源文本含成对换行；原因：会话文件为 zstd 压缩、无可分享链接。
- 无链接：DSH 0.2.1-rc.5 客户端包；定位：`app.asar` 内 `dsh-client-ui-conversation/lib/client.js` 的 `DraftEditor.paste`；用途：说明粘贴走 `selection.insertText(clean)`；原因：asar 包内文件无稳定链接。
- 无链接：用户 2026-11-02 消息；用途：需求与“先提交、暂不合并”约束；原因：会话无可分享链接。
