---
title: "用户消息空行修复 Step 4：文档收尾与验收"
created: 2026-11-02
updated: 2026-11-02
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/verification", "topic/user-message"]
git_branch: "fix/user-message-extra-newline"
---

# 用户消息空行修复 Step 4：文档收尾与验收

## 交接摘要

- 状态：P0 全部完成；文档、验收记录与测试已更新。
- 结果：`npm test` 57 个测试通过；`npm run build` 3401.6 KiB；真实 GUI 复测 86px/130px，块后 0 个换行。
- 分支：`fix/user-message-extra-newline`；未合并 `main`。
- P1 结论：本 bug 不需要 P1；P0 已消掉孤立 `\r` 造出的空行，剩余的空行是源文本真实存在的。
- 下一步：交付；若用户要求连源文本自带的空行也去掉，再单独做输入侧归一。

## 目标与请求

收尾 P0：更新 README 与验收记录，跑最终测试与构建，确认单步提交完整，且不合并 `main`。〔来源：无链接：用户 2026-11-02 消息；定位：本会话用户消息；原句：“Fix all issues. After each step is finished, write log ... also commit to git after each step”；原因：会话无可分享链接〕

## 执行与命令

| 命令 | 工作目录 | 结果 |
| --- | --- | --- |
| `npm test` | `E:\Repos\dsh-chat-improve` | 退出码 0；7 个测试文件、57 个测试全部通过。 |
| `npm run build` | 同上 | 退出码 0；`lib/client.js` 3401.6 KiB。 |
| `git log --oneline` | 同上 | 分支上有 baseline、P0 代码、单元测试、GUI 验证四次提交。 |

## 结果与证据

- README 的用户消息条目改为实际行为：列表、标题、引用、分隔线、代码块不再追加空行；CRLF 只算一次换行。〔来源：[README.md:9](../../README.md#L9)〕
- README 的限制条目补上两条边界：源文本真实存在的空行保留；孤立 `\r` 按 `pre-wrap` 的浏览器行为忽略。〔来源：[README.md:57](../../README.md#L57)〕
- 验收表新增“用户消息空行”一行：干净列表 86px、2 个块、块后 0 换行；1/2/3 消息 130px、3 个块、块后 0 换行。〔来源：[verification.md:31](../verification.md#L31)〕
- 验收限制补上“有意空行不被折叠”，并指向 `plan.js` 的归一化实现。〔来源：[verification.md:49](../verification.md#L49)〕
- 可复用验证脚本 `scripts/verify-user-newline.mjs` 已提交；它按块级 span 的 `nextSibling` 是否是非空 `'\n'` 判定，不对 `innerText` 做脆弱的行数比较。〔来源：[verify-user-newline.mjs:86-105](../../scripts/verify-user-newline.mjs#L86-L105)〕

## 问题与经验

- 修复后 1/2/3 气泡仍保留 header 后的一行空行，这是源文本真实存在的空行；把它也删掉会改变用户内容。P0 的边界是“不再额外造空行”，不是“删除所有空行”。
- 单步提交的顺序有效：baseline 日志 → 代码 → 单元测试 → GUI 验证 → 文档；每一步都能独立回滚。
- 每个 step 日志都跑 `check_sources.py --mode write --require-version`，四次均为 0 项错误；`check_density.py` 只把 YAML 前导的硬换行和技术斜杠当提示，未据此删事实。
- 真实 GUI 验证依赖本地 cookie；脚本只从 `DSH_VERIFY_COOKIE` 读取，报告里不落 cookie 值，避免把本机凭据写进仓库。

## 涉及文件

- `README.md`：用户消息行为说明与限制。
- `docs/verification.md`：新增空行验收行、限制与来源。
- `scripts/verify-user-newline.mjs`：Step 3 已提交的只读验证脚本。
- `src/user-text/plan.js`、`src/user-text/UserMarkdown.jsx`：Step 1 已提交的修复。
- `tests/user-markdown-plan.test.js`：Step 2 已提交的 12 条测试。

## 未决与下一步

- P0 完成，交付。
- P1（可选）：如果用户要求连源文本自带的空行也去掉，再讨论改 DSH `DraftEditor.paste` 或显示层折叠；这会改 model-visible 输入或有意空行，需要单独确认。
- 合并：按用户要求暂不合并 `main`。

## 来源

- [README.md:9](../../README.md#L9)：用户消息不再追加空行的行为说明。
- [README.md:57](../../README.md#L57)：有意空行保留与 CRLF/孤立 CR 的边界。
- [verification.md:31](../verification.md#L31)：用户消息空行验收结果。
- [verification.md:49](../verification.md#L49)：有意空行与归一化限制。
- [verify-user-newline.mjs:86-105](../../scripts/verify-user-newline.mjs#L86-L105)：块后换行判定。
- 无链接：用户 2026-11-02 消息；定位：本会话用户消息；用途：实施与单步提交要求；原因：会话无可分享链接。
- 无链接：命令输出；定位：2026-11-02 03:58，工作目录 `E:\Repos\dsh-chat-improve`，`npm test` 与 `npm run build`；用途：57 个测试通过与构建大小；原因：终端输出无可分享链接。
- 无链接：命令输出；定位：2026-11-02 04:00，`git log --oneline`；用途：本分支四次提交；原因：终端输出无可分享链接。
