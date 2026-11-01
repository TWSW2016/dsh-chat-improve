---
title: "用户消息空行修复 Step 2：行规划回归测试"
created: 2026-11-02
updated: 2026-11-02
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/testing", "topic/user-message"]
git_branch: "fix/user-message-extra-newline"
---

# 用户消息空行修复 Step 2：行规划回归测试

## 交接摘要

- 状态：行规划器已有 12 条单元测试，全部通过。
- 结果：`npm test` 7 个测试文件、57 个测试通过。
- 覆盖：列表/标题/引用/分隔线后不追加 break；围栏代码只产出一个块；CRLF 与孤立 CR 不造空行；真正的空行保留。
- 下一步：构建并用真实 GUI 复测，再把验证脚本与结果写进 Step 3。
- 约束：分支 `fix/user-message-extra-newline`，未合并 `main`。

## 目标与请求

把 Step 1 的分隔符规则固化成可回归的单元测试，防止以后把 `'\n'` 加回块级行后。〔来源：[2026-11-02-0354-user-newline-fix-s01.md:1-20](2026-11-02-0354-user-newline-fix-s01.md#L1-L20)〕

## 执行与命令

| 命令 | 工作目录 | 结果 |
| --- | --- | --- |
| `npm test` | `E:\Repos\dsh-chat-improve` | 退出码 0；7 个测试文件、57 个测试全部通过，其中新增 12 条。 |

新增文件 `tests/user-markdown-plan.test.js`，只导入纯函数 `normalizeUserText` 与 `planUserMarkdown`，不依赖 React 或 DSH 外部包。〔来源：[user-markdown-plan.test.js:1-6](../../tests/user-markdown-plan.test.js#L1-L6)〕

## 结果与证据

- 列表：`intro\n1. one\n2. two` 的 token 序列是 `text, break, list, list`，列表项后没有 break。〔来源：[user-markdown-plan.test.js:21-25](../../tests/user-markdown-plan.test.js#L21-L25)〕
- 标题、引用、分隔线：都只留下块级 token，后面不追加 break。〔来源：[user-markdown-plan.test.js:27-31](../../tests/user-markdown-plan.test.js#L27-L31)〕
- 围栏代码：开始/结束标记不产出行 token，代码体是一个 `code` 块；未闭合围栏也能收尾。〔来源：[user-markdown-plan.test.js:48-60](../../tests/user-markdown-plan.test.js#L48-L60)〕
- 换行：`1. one\r\n\r2. two` 只得到 `list, list`；`a\n\nb` 保留一个真正的空行；`a\r\n\rb` 归一化为 `a\nb`。〔来源：[user-markdown-plan.test.js:33-46](../../tests/user-markdown-plan.test.js#L33-L46)〕
- 空输入返回单个空 `text` token；列表缩进与有序标记都有断言。〔来源：[user-markdown-plan.test.js:62-69](../../tests/user-markdown-plan.test.js#L62-L69)〕

## 问题与经验

- 纯函数拆分的价值在这里兑现：测试不需要 jsdom、React 或 DSH 运行环境，执行时间约 11ms。
- token 里直接带 `{ kind: 'break' }` 比在组件里重复判断 `!item.block && index < ...` 更容易测，也更难回退。
- 围栏代码测试特意包含空行，确认 `fence.join('\n')` 内部空行不会被外层分隔逻辑吞掉。

## 涉及文件

- `tests/user-markdown-plan.test.js`：新增 12 条回归测试。
- `src/user-text/plan.js`：被测纯函数，本轮未改。

## 未决与下一步

Step 3：`npm run build` 后用真实 GUI 复测 86px/130px，补可复用的 `scripts/verify-user-newline.mjs`，记录验证结果并单独提交。

## 来源

- [2026-11-02-0354-user-newline-fix-s01.md:1-20](2026-11-02-0354-user-newline-fix-s01.md#L1-L20)：Step 1 实现与测量。
- [user-markdown-plan.test.js:1-6](../../tests/user-markdown-plan.test.js#L1-L6)：测试导入与分组。
- [user-markdown-plan.test.js:21-69](../../tests/user-markdown-plan.test.js#L21-L69)：列表、块级、围栏、换行与空输入断言。
- 无链接：命令输出；定位：2026-11-02 03:55，工作目录 `E:\Repos\dsh-chat-improve`，`npm test`；用途：57 个测试通过；原因：终端输出无可分享链接。
