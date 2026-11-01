---
title: "Step 12 — 技能示例与同步 hook 验收"
created: 2026-11-02
updated: 2026-11-02
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/dsh-plugin"]
git_branch: "main"
---

# Step 12 — 技能示例与同步 hook 验收

## 交接摘要

- 当前状态：技能、junction、pre-push hook 已落盘；示例 parse、插件测试、关键字检查和 hook 端到端测试均通过。
- 下一步：在真实 `my-skills` 创建 `skill/dsh-mermaid-charts` 并提交，然后切回原分支。
- 阻塞：无。
- 关键文件：`skills/dsh-mermaid-charts/SKILL.md`、`scripts/git-hooks/pre-push`、`docs/logs/step-12-skill-validation.md`。
- 真实 `my-skills` 与 remote 未被本步改动。

## 目标与请求

验证 `SKILL.md` 的 Mermaid 示例能 parse，插件测试与关键字检查不回退，并用临时 `my-skills` 仓库和本地 bare remote 跑通 pre-push hook。〔来源：[SKILL.md:400-432](../../skills/dsh-mermaid-charts/SKILL.md#L400-L432)〕

## 执行与命令

工作目录均为 `E:\Repos\dsh-chat-improve`，时间为 2026-11-02。

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `node .research/validate-skill.mjs "skills\dsh-mermaid-charts\SKILL.md"` | 0 | 17 条 `OK`，`failures=0` |
| `node scripts/check-keywords.mjs` | 0 | `missing: none`、`not in mermaid: none` |
| `npm test` | 0 | 6 个测试文件、45 条测试通过 |
| `npm run build` | 0 | `lib/client.js` 3401.1 KiB |
| `pwsh -File .research/test-hook.ps1` | 1 | hook 两轮通过；脚本最后的空状态 `.Trim()` 报错 |

〔来源：无链接：命令输出；定位：2026-11-02 的上述命令；原因：终端输出无可分享链接〕

## 结果与证据

- `SKILL.md` 内 17 条 `mermaid` 围栏逐条 `mermaid.parse`，全部 `OK`，`failures=0`。〔来源：无链接：命令输出；定位：2026-11-02 运行 `node .research/validate-skill.mjs`；原因：终端输出无可分享链接〕
- 关键字检查：Mermaid detector 48 个首 token，插件表 48 条，`missing: none`、`not in mermaid: none`。〔来源：无链接：命令输出；定位：2026-11-02 运行 `node scripts/check-keywords.mjs`；原因：终端输出无可分享链接〕
- 插件测试：6 个文件、45 条通过。〔来源：无链接：命令输出；定位：2026-11-02 运行 `npm test`；原因：终端输出无可分享链接〕
- 构建：`lib/client.js` 3401.1 KiB。〔来源：无链接：命令输出；定位：2026-11-02 运行 `npm run build`；原因：终端输出无可分享链接〕
- hook 第一次运行退出码 0；分支为 `skill/dsh-mermaid-charts`；源与目标 `SKILL.md` 哈希一致；bare remote 出现同名分支。〔来源：无链接：命令输出；定位：2026-11-02 运行 `.research/test-hook.ps1`；原因：终端输出无可分享链接〕
- hook 第二次运行输出 `skill-sync: no changes`，提交数保持 2，没有空提交。〔来源：无链接：命令输出；定位：同上；原因：终端输出无可分享链接〕
- 技能路径脏时 hook 退出 1，输出 `uncommitted changes under skills/dsh-mermaid-charts`。〔来源：无链接：命令输出；定位：同上；原因：终端输出无可分享链接〕
- 临时 `my-skills` 脏时 hook 退出 1，输出 `my-skills has uncommitted changes`。〔来源：无链接：命令输出；定位：同上；原因：终端输出无可分享链接〕
- 真实 `my-skills` 未被改动：`git status --porcelain` 为空，分支仍是 `skill/video-dl`，`skills/dsh-mermaid-charts` 不存在。〔来源：无链接：命令输出；定位：2026-11-02 检查 `E:\repos\my-skills`；原因：终端输出无可分享链接〕

## 问题与限制

- 验证脚本最后一行对空 `git status` 调用 `.Trim()`，触发 `不能对值为 Null 的表达式调用方法`，使脚本退出 1；hook 本身的两轮测试在报错前都已通过。后续检查空输出前先判 `$null`。〔来源：无链接：命令输出；定位：2026-11-02 `.research/test-hook.ps1` 第 59 行；原因：终端输出无可分享链接〕
- hook 用 `rm -rf` 替换生成副本；已有 `case` 限制目标必须在 `my-skills/skills` 下，但“删除源文件后同步删除目标”没有单独测试。〔来源：[pre-push:17-21](../../scripts/git-hooks/pre-push#L17-L21)〕
- hook 只在推送当前分支时同步；推其它分支或 tag 会跳过，避免把工作区分支内容同步出去。〔来源：[pre-push:23-32](../../scripts/git-hooks/pre-push#L23-L32)〕
- hook 要求 `my-skills` 工作区干净；这对“生成副本”是保护，但也意味着并行编辑其它技能时要先提交或 stash。〔来源：[pre-push:38-41](../../scripts/git-hooks/pre-push#L38-L41)〕
- 真实 remote 没有推送；本步只验证本地 bare remote。〔来源：无链接：命令输出；定位：2026-11-02 的 remote 检查；原因：终端输出无可分享链接〕
- Git 提示 `SKILL.md` 的 LF 会在下次 checkout 时变 CRLF；DSH 能读 CRLF，hook 安装时只保证 hook 自身是 LF。〔来源：无链接：命令输出；定位：2026-11-02 的 Git 警告；原因：终端输出无可分享链接〕

## 可复用经验

- 用临时 bare remote + 临时 clone 测跨仓 hook，不碰真实 remote；用 `git rev-list --count` 证明第二次运行没有空提交。〔来源：无链接：命令输出；定位：2026-11-02 的 `.research/test-hook.ps1`；原因：终端输出无可分享链接〕
- 用未跟踪文件分别测“技能路径脏”和“目标仓库脏”两个 guard，比只读代码可靠。〔来源：无链接：命令输出；定位：同上；原因：终端输出无可分享链接〕
- 同步后用 `Get-FileHash` 对比源与目标，能同时发现复制失败和换行与编码差异。〔来源：[README.md:39-47](../../skills/README.md#L39-L47)〕
- 技能示例的 parse 检查应作为交付前固定动作；渲染验收仍引用 Step 9 的 16 类结果，不重复跑浏览器。〔来源：[SKILL.md:400-432](../../skills/dsh-mermaid-charts/SKILL.md#L400-L432)〕

## 决策

- 用临时 bare remote 和临时 `my-skills` 克隆验证 hook，不碰真实 remote；真实仓库留到 Step 13。〔来源：无链接：命令输出；定位：2026-11-02 的 `.research/test-hook.ps1`；原因：终端输出无可分享链接〕
- 真实 `my-skills` 在 Step 13 从 `main` 创建 `skill/dsh-mermaid-charts`，完成后切回 `skill/video-dl`，避免改变用户当前工作分支。〔来源：[README.md:32-37](../../skills/README.md#L32-L37)〕
- 按 2026-11-02 更新的全局 AGENTS.md §4.1，补日志的交接摘要、执行命令、决策和涉及文件；Step 10/11 日志同步补齐。〔来源：无链接：全局指令；定位：`~/.dsh/AGENTS.md` 的会话日志一节；原因：全局指令不在项目仓库内〕

## 涉及文件

- `skills/dsh-mermaid-charts/SKILL.md`：技能正文，本步未改。
- `scripts/git-hooks/pre-push`：同步 hook，本步未改。
- `scripts/setup-skill-sync.ps1`：安装脚本，本步未改。
- `docs/logs/step-12-skill-validation.md`：本日志新增。
- `docs/logs/step-10-skill-authoring.md`、`docs/logs/step-11-skill-install-sync.md`：补齐日志结构。

## 未决与下一步

Step 13：在真实 `my-skills` 从 `main` 创建 `skill/dsh-mermaid-charts`，复制技能并提交；切回 `skill/video-dl`；写 Step 13 日志并在 project 提交。不推送 remote。〔来源：[README.md:32-37](../../skills/README.md#L32-L37)〕

## 来源

- [SKILL.md:400-432](../../skills/dsh-mermaid-charts/SKILL.md#L400-L432)：parse 与插件回归命令。
- [pre-push:17-41](../../scripts/git-hooks/pre-push#L17-L41)：目标路径限制、当前分支判断、两处脏工作区 guard。
- [README.md:32-47](../../skills/README.md#L32-L47)：两仓契约与手工哈希检查。
- 无链接：命令输出；定位：2026-11-02 的 `validate-skill.mjs`、`check-keywords.mjs`、`npm test`、`npm run build`、`.research/test-hook.ps1`；原因：终端输出无可分享链接。
- 无链接：全局指令；定位：`~/.dsh/AGENTS.md` 的会话日志一节；原因：全局指令不在项目仓库内。
