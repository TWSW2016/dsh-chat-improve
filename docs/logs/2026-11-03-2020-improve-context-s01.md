---
title: "Improve 上下文修复步骤 1：工作区简报采集"
created: 2026-11-03
updated: 2026-11-03
log_deai_profile: "agent"
log_deai_version: "1.0.0-rc.1"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/improve-by-ai"]
git_branch: "main"
---

# Improve 上下文修复步骤 1：工作区简报采集

## 目标与范围

步骤 1 只实现工作区简报的采集与格式化，不改路由、不改 system prompt。交付 `src/host/context.js` 和 18 个单测；判据是 git、非 git、worktree、detached、子目录、缺失文件、超长、读取失败都有确定结果，简报不出现 `unknown`，长度不超过 6000 字符。

## 执行

1. 新增 `resolveSessionDirectory()`：优先读取 live agent 的 `workingDirectory.get(session)`，回退 `session.header.cwd`；registry 抛错时返回 `undefined`。〔来源：[context.js:25-58](../../src/host/context.js#L25-L58)〕
2. 新增 `collectWorkspaceBrief()`：从 cwd 向上找 `.git`，读 `package.json` 的 `name`、`.git/HEAD`、根 `AGENTS.md`、`README.md` 或 `README.zh.md`；worktree 的 `.git` 文件按 `gitdir:` 解析。〔来源：[context.js:171-185](../../src/host/context.js#L171-L185)〕
3. 新增 `formatWorkspaceBrief()`：总预算 6000 字符，超限先丢 README，再截 AGENTS；缺失字段直接省略，不写 unknown。〔来源：[context.js:218-239](../../src/host/context.js#L218-L239)〕
4. 新增 `buildWorkspaceBrief()`：任何文件系统或 registry 失败都降级为无简报，不阻塞改写。〔来源：[context.js:241-250](../../src/host/context.js#L241-L250)〕
5. 新增 18 个单测，覆盖目录解析、git 事实、worktree、detached、子目录、缺失与不可读文件、截断、格式化与 session 接线。〔来源：[rewrite-context.test.js:52-207](../../tests/rewrite-context.test.js#L52-L207)〕
6. `npx vitest run tests/rewrite-context.test.js`：1 个文件、18 例通过。〔来源：无链接：本会话命令输出；定位：2026-11-03 20:20，退出码 0；原因：终端输出无可分享链接〕
7. `npm test`：16 个文件、143 例通过。〔来源：无链接：本会话命令输出；定位：2026-11-03 20:20，退出码 0；原因：终端输出无可分享链接〕

## 结果

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 新单测 | 通过 | 18 例，退出码 0 |
| 全量单测 | 通过 | 16 文件 143 例，退出码 0 |
| 非 git 分支 | 省略 | 断言不出现 `current branch:` 与 `unknown` |
| worktree | 通过 | 解析 `.git` 文件的 `gitdir:`，读到 `feature/worktree` |
| 超长截断 | 通过 | AGENTS 与 README 均不超过各自上限加截断标记 |
| 读取失败 | 通过 | 仍返回项目名与 cwd，不抛错 |

## 问题与限制

- 本仓库根目录没有 `AGENTS.md`，实际可用的是 README 摘要；全局 `~/.dsh/AGENTS.md` 未读取，避免把个人信息发给模型，也避免“始终中文”覆盖跟随草稿语言的规则。
- 分支读取只解析 `.git/HEAD`，不执行 `git` 命令；detached HEAD 只给 7 位 SHA，不尝试还原分支名。
- `findRepoRoot()` 只认 `.git`；非 git 目录把 cwd 当作 root，项目名取目录名或 `package.json` 的 `name`。
- 步骤 1 尚未接线；当前 `POST /chat-improve/rewrite` 还不会使用这份简报。

## 可复用经验

- 工作区事实按“缺失即省略”生成，不在简报层制造 `unknown`；这与模型输出侧“推不出就省略”的规则一致。
- worktree 的 `.git` 是文件而不是目录，必须解析 `gitdir:` 才能读分支。
- 用 `.git/HEAD` 读分支比 spawn `git` 更简单，跨平台且不需要额外权限；代价是 detached 只能给短 SHA。
- 先做纯函数加可注入 io，再接会话与路由，单测不需要真实 git 命令。

## 涉及文件

- `src/host/context.js`（新增）
- `tests/rewrite-context.test.js`（新增）
- 本日志

## 下一步

步骤 2 重写 `src/host/prompt.js` 的 system prompt：加入工作区事实优先级、禁止 unknown/待确认、禁止 Project/Branch 头部、补两个 few-shot，并更新 prompt 单测。

## 来源

- [context.js:25-250](../../src/host/context.js#L25-L250)：会话目录、仓库事实、格式化与降级入口。
- [rewrite-context.test.js:52-207](../../tests/rewrite-context.test.js#L52-L207)：步骤 1 的 18 个单测。
- 无链接：本会话命令输出；定位：2026-11-03 20:20 的 `npx vitest run tests/rewrite-context.test.js` 与 `npm test`，退出码 0；原因：终端输出无可分享链接。
