---
title: "用户消息空行修复 Step 1：归一化与块级分隔"
created: 2026-11-02
updated: 2026-11-02
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/implementation", "topic/user-message"]
git_branch: "fix/user-message-extra-newline"
---

# 用户消息空行修复 Step 1：归一化与块级分隔

## 交接摘要

- 状态：P0 代码已改，构建与真实 GUI 复测通过，尚未加回归测试。
- 结果：干净两项列表从 108px 回到 86px；1/2/3 消息从 218px 回到 130px，与关闭插件一致。
- 关键改动：新增纯行规划器 `src/user-text/plan.js`；`UserMarkdown.jsx` 只负责把 token 映射成 JSX。
- 下一步：补 `planUserMarkdown` 单元测试，覆盖列表、标题、引用、分隔线、围栏代码、CRLF 与真正的空行。
- 约束：在 `fix/user-message-extra-newline` 分支上提交，未合并 `main`。

## 目标与请求

修掉用户消息气泡里多出的空行，保持行内 Markdown 与引用 chip 的现有行为。〔来源：无链接：用户 2026-11-02 消息；定位：本会话用户消息；原句：“Agree your plan. Fix all issues.”；原因：会话无可分享链接〕

根因有两条：块级行后又追加 `'\n'`；`replace(/\r\n?/g, '\n')` 把孤立 `\r` 也当成换行。〔来源：[2026-11-02-0343-user-message-extra-newline.md:1-20](2026-11-02-0343-user-message-extra-newline.md#L1-L20)〕

## 执行与命令

| 命令 | 工作目录 | 结果 |
| --- | --- | --- |
| `npm test` | `E:\Repos\dsh-chat-improve` | 退出码 0；6 个测试文件、45 个测试全部通过。 |
| `npm run build` | 同上 | 退出码 0；`lib/client.js` 3401.6 KiB。 |
| headless Chrome 打开 `http://127.0.0.1:12686`，只读测量历史气泡 | 同上 | 退出码 0；干净列表 86px；1/2/3 消息 130px。 |

浏览器测量结果写入 `.research/verify/user-newline-report.json` 的 `afterFix`；截图 `fixed-clean-bubble.png`、`fixed-reference-bubble.png`。〔来源：无链接：本次浏览器验证；定位：.research/verify/user-newline-report.json、fixed-clean-bubble.png、fixed-reference-bubble.png；原因：.research/ 未提交〕

## 结果与证据

- 新增 `src/user-text/plan.js`：`normalizeUserText` 先做 `\r\n` → `\n`，再删除孤立 `\r`；`planUserMarkdown` 把文本拆成 `text/heading/quote/list/rule/code`，并只在非块级项后插入 `{ kind: 'break' }`。〔来源：[plan.js:17-18](../../src/user-text/plan.js#L17-L18)〕〔来源：[plan.js:30-63](../../src/user-text/plan.js#L30-L63)〕
- `UserMarkdown.jsx` 不再自己判断 `'\n'`；遇到 `break` token 才写换行，块级 span 后不再追加分隔符。〔来源：[UserMarkdown.jsx:67-106](../../src/user-text/UserMarkdown.jsx#L67-L106)〕
- 行内样式常量仍是原来的字号、边框与颜色，视觉只少了多余空行。〔来源：[UserMarkdown.jsx:37-46](../../src/user-text/UserMarkdown.jsx#L37-L46)〕
- 修复后 1/2/3 气泡只剩 header 后的一行真实空行，列表项之间紧贴；干净列表与关闭插件时的高度完全一致。〔来源：无链接：本次浏览器验证；定位：.research/verify/user-newline-report.json 的 afterFix；原因：.research/ 未提交〕

## 问题与经验

- GUI 侧栏有一个可复用经验：当 `dsh-chat-improve` 工作区已经展开时，再点一次工作区标题会把它折叠，导致按会话标题定位超时；自动化脚本应先判断标题是否已可见，再决定是否点工作区。上一次脚本就是因此失败，改为不点工作区后通过。
- 构建产物 `lib/client.js` 必须重建后新开浏览器上下文才会加载；旧页面不会自动换新包。
- 纯函数拆分的收益在下一步体现：不引入 React 或 DSH 外部依赖，Vitest 可以直接测分隔符规则。

## 涉及文件

- `src/user-text/plan.js`：新增；归一化、行分类、break token。
- `src/user-text/UserMarkdown.jsx`：改为消费 token；抽出标题、引用、分隔线样式常量。
- `.research/verify/user-newline-report.json`：补 `afterFix` 与修复后截图索引（未提交）。

## 未决与下一步

Step 2：新增 `tests/user-markdown-plan.test.js`，覆盖干净列表、标题、引用、分隔线、围栏代码、`\r\n`、孤立 `\r`、`\r\n\r` 与真正的空行；跑 `npm test` 后单独提交。

## 来源

- [2026-11-02-0343-user-message-extra-newline.md:1-20](2026-11-02-0343-user-message-extra-newline.md#L1-L20)：根因、修复计划与修复前测量。
- 无链接：用户 2026-11-02 消息；定位：本会话用户消息；用途：需求与实施授权；原因：会话无可分享链接。
- [plan.js:17-18](../../src/user-text/plan.js#L17-L18)：CRLF 与孤立 CR 的归一化。
- [plan.js:30-63](../../src/user-text/plan.js#L30-L63)：行分类与 break token 生成。
- [UserMarkdown.jsx:67-106](../../src/user-text/UserMarkdown.jsx#L67-L106)：组件消费 token。
- [UserMarkdown.jsx:37-46](../../src/user-text/UserMarkdown.jsx#L37-L46)：块级样式常量。
- 无链接：命令输出；定位：2026-11-02 03:53，工作目录 `E:\Repos\dsh-chat-improve`，`npm test` 与 `npm run build`；用途：测试与构建结果；原因：终端输出无可分享链接。
- 无链接：本次浏览器验证；定位：`.research/verify/user-newline-report.json`、`fixed-clean-bubble.png`、`fixed-reference-bubble.png`；用途：修复后高度与 DOM；原因：`.research/` 未提交。
