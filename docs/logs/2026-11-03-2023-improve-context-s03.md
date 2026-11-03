---
title: "Improve 上下文修复步骤 3：路由接线"
created: 2026-11-03
updated: 2026-11-03
log_deai_profile: "agent"
log_deai_version: "1.0.0-rc.1"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/improve-by-ai"]
git_branch: "main"
---

# Improve 上下文修复步骤 3：路由接线

## 目标与范围

把步骤 1 的工作区简报接进 `POST /chat-improve/rewrite`，让 `system` 使用 `composeSystemPrompt(brief)`，同时保持协议不变：user message 仍然只有草稿，不注册工具，不写会话记录，不读历史。

## 执行

1. `src/host/rewrite.js` 引入 `buildWorkspaceBrief()` 与 `composeSystemPrompt()`。〔来源：[rewrite.js:10-14](../../src/host/rewrite.js#L10-L14)〕
2. `streamRewrite()` 增加 `brief` 参数，`system` 改为 `composeSystemPrompt(brief)`，`messages` 不变。〔来源：[rewrite.js:93-101](../../src/host/rewrite.js#L93-L101)〕
3. 在解析模型之后、启动流之前调用 `buildWorkspaceBrief(ctx, parsed.sessionId)`；无 session 或读取失败时得到 `undefined`。〔来源：[rewrite.js:175-180](../../src/host/rewrite.js#L175-L180)〕
4. 新增路由测试：有 session 时 system 含 `- project: demo` 与 `- current branch: main`，user message 仍只有 draft；无 session 时 system 不出现项目行。〔来源：[rewrite-route.test.js:176-228](../../tests/rewrite-route.test.js#L176-L228)〕
5. `npx vitest run tests/rewrite-route.test.js`：17 例通过。〔来源：无链接：本会话命令输出；定位：2026-11-03 20:22，退出码 0；原因：终端输出无可分享链接〕
6. `npm test`：16 个文件、150 例通过。〔来源：无链接：本会话命令输出；定位：2026-11-03 20:22，退出码 0；原因：终端输出无可分享链接〕

## 结果

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 路由单测 | 通过 | 17 例，退出码 0 |
| 全量单测 | 通过 | 16 文件 150 例，退出码 0 |
| system 含事实 | 通过 | 断言 `- project: demo` 与 `- current branch: main` |
| user message 不变 | 通过 | 仍然只有一条 text draft |
| 无 session 降级 | 通过 | 断言 system 不含 `- project:` |
| 协议不变 | 通过 | 响应体仍为 `{ text, model, truncated? }` |

## 问题与限制

- 简报在每次请求时同步读取几个根级文件，没有缓存；单次点击的额外 I/O 很小，但高频点击会重复读。
- 只接了 session 目录与根级文件；会话历史、git status、最近提交仍不读取，这部分按本次确认的范围排除。
- 路由测试用真实临时目录和 `.git/HEAD`，但没有启动真实 HTTP 服务器；信任栅栏、content-type、体积上限沿用原有测试。
- 真实模型输出质量仍未验证；步骤 4 会做构建与可执行的验收，真实 GUI 点击需要当前登录会话。

## 可复用经验

- 把工作区事实放在 system message，草稿继续作为唯一 user message，可以保持“草稿是 data”的边界，不引入分隔符注入面。
- 先解析模型再采集简报，可以在无模型时少做一次文件读取；简报失败也不影响 409/503 的分支。
- 路由测试要同时断言“system 多了事实”和“user message 没变”，否则容易把事实误塞进草稿。

## 涉及文件

- `src/host/rewrite.js`
- `tests/rewrite-route.test.js`
- 本日志

## 下一步

步骤 4 运行完整构建，重载 Host 半，做路由与 GUI 验收，记录真实结果与仍未覆盖的部分。

## 来源

- [rewrite.js:10-180](../../src/host/rewrite.js#L10-L180)：简报、prompt 拼接与流式调用接线。
- [rewrite-route.test.js:176-228](../../tests/rewrite-route.test.js#L176-L228)：步骤 3 的路由断言。
- 无链接：本会话命令输出；定位：2026-11-03 20:22 的 `npx vitest run tests/rewrite-route.test.js` 与 `npm test`，退出码 0；原因：终端输出无可分享链接。
