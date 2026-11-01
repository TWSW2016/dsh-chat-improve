---
title: "Step 13 — 发布到 my-skills 与 no-diff 推送修复"
created: 2026-11-02
updated: 2026-11-02
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/dsh-plugin"]
git_branch: "main"
---

# Step 13 — 发布到 my-skills 与 no-diff 推送修复

## 交接摘要

- 当前状态：技能已在真实 `my-skills` 的 `skill/dsh-mermaid-charts` 分支提交；`my-skills` 工作区已切回 `skill/video-dl` 且干净。
- 下一步：用户推送 project 时，pre-push hook 会同步并推送 my-skills 分支；remote 尚未推送。
- 阻塞：无。
- 关键文件：`scripts/git-hooks/pre-push`、`docs/logs/step-13-publish.md`、`E:\repos\my-skills\skills\dsh-mermaid-charts\SKILL.md`。
- 本步修复了“无文件差异时提前退出、导致首次远端分支不被创建”的 hook 缺陷。

## 目标与请求

把技能发布到真实 `my-skills`，同时验证 hook 的首次推送路径；用户要求两边都维护，并在 project push 时自动同步并推送 my-skills。〔来源：[README.md:32-37](../../skills/README.md#L32-L37)〕

## 执行与命令

工作目录为 `E:\Repos\dsh-chat-improve` 与 `E:\repos\my-skills`，时间为 2026-11-02。

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `git -C E:\repos\my-skills switch -c skill/dsh-mermaid-charts main` | 0 | 从 `main` 创建分支 |
| `Copy-Item -Recurse -Force skills\dsh-mermaid-charts ...` | 0 | 复制技能 |
| `git -C E:\repos\my-skills commit` | 0 | `6d101d7`，1 个文件，464 行 |
| `git -C E:\repos\my-skills switch skill/video-dl` | 0 | 切回用户原分支 |
| `pwsh -File .research/test-hook.ps1` | 0 | 首次/二次运行均 0；脏路径测试均 1 |

〔来源：无链接：命令输出；定位：2026-11-02 的上述命令；原因：终端输出无可分享链接〕

## 结果与证据

- 发布副本对应 `skills/dsh-mermaid-charts/SKILL.md` 的 v0.1.0 frontmatter；副本与源文件哈希一致。〔来源：[SKILL.md:1-19](../../skills/dsh-mermaid-charts/SKILL.md#L1-L19)〕
- 发布前真实 `my-skills` 干净，分支 `skill/video-dl`；`skills/dsh-mermaid-charts` 不存在。〔来源：无链接：命令输出；定位：2026-11-02 的 `git status`/`Test-Path`；原因：终端输出无可分享链接〕
- 从 `main` 创建 `skill/dsh-mermaid-charts`，复制后提交 `6d101d7`；提交只含 `skills/dsh-mermaid-charts/SKILL.md`，464 行。〔来源：无链接：命令输出；定位：2026-11-02 的 `git log`/`git show --stat`；原因：终端输出无可分享链接〕
- 切换回 `skill/video-dl` 前，源与目标 `SKILL.md` 的 `Get-FileHash` 一致；切换后工作区干净，分支列表含 `main`、`skill/dsh-mermaid-charts`、`skill/video-dl`。〔来源：无链接：命令输出；定位：2026-11-02 的哈希与分支检查；原因：终端输出无可分享链接〕
- hook 修复后重测：首次运行退出 0，分支 `skill/dsh-mermaid-charts`，bare remote 有同名分支，哈希一致；第二次运行退出 0，`commitCount=2`，没有空提交。〔来源：无链接：命令输出；定位：2026-11-02 重跑 `.research/test-hook.ps1`；原因：终端输出无可分享链接〕
- 脏技能路径与脏 `my-skills` 两个 guard 仍分别退出 1；真实 `my-skills` 状态长度 0，分支 `skill/video-dl`。〔来源：无链接：命令输出；定位：同上；原因：终端输出无可分享链接〕

## 问题与限制

- 发现 hook 缺陷：原逻辑在 `git diff --cached --quiet` 为真时直接 `exit 0`，只复制不推送；如果分支只存在于本地、远端还没有，第一次 push 永远不会创建远端分支。修复为“无差异也继续 `git push -u`”。〔来源：[pre-push:54-61](../../scripts/git-hooks/pre-push#L54-L61)〕
- 修复后每次 project push 都会对 `my-skills` 执行一次 push；无差异时是 no-op，但网络失败会阻止 project push。这是有意为之，避免两边不一致。〔来源：[pre-push:61](../../scripts/git-hooks/pre-push#L61)〕
- 真实 remote 没有推送；`skill/dsh-mermaid-charts` 目前只在本地 `my-skills`。用户下一次 push project 时 hook 才会推送该分支。〔来源：无链接：命令输出；定位：2026-11-02 的 `git status --branch`；原因：终端输出无可分享链接〕
- 发布后切回 `skill/video-dl`，所以工作区当前看不到 `skills/dsh-mermaid-charts`；它在技能分支上，不在 `video-dl` 分支。这是避免改变用户当前分支的取舍。〔来源：无链接：命令输出；定位：2026-11-02 的分支切换；原因：终端输出无可分享链接〕
- hook 会切换 `my-skills` 到 `skill/dsh-mermaid-charts` 并在推送后停留在该分支；用户下次在 `my-skills` 工作时需要自己切回目标分支。当前没有自动切回，避免 push 失败时状态不一致。〔来源：[pre-push:37-53](../../scripts/git-hooks/pre-push#L37-L53)〕
- 原 README 的手工哈希检查假设 `my-skills` 已在技能分支；切回 `skill/video-dl` 后该路径不存在。README 已补分支切换说明和 `git show` 读取方式。〔来源：[README.md:36-49](../../skills/README.md#L36-L49)〕

## 可复用经验

- 跨仓 hook 要同时验证“有差异”和“无差异”两条路径；只在有差异时测，会漏掉首次建远端分支的场景。〔来源：无链接：命令输出；定位：2026-11-02 的两轮 hook 测试；原因：终端输出无可分享链接〕
- 发布后切回用户原分支，避免把用户的 `my-skills` 工作区留在技能分支；技能分支的提交仍在。〔来源：无链接：命令输出；定位：2026-11-02 的 `git switch skill/video-dl`；原因：终端输出无可分享链接〕
- 用 `git show --stat <branch>` 核对提交只包含技能路径，避免把其它技能文件混进提交。〔来源：无链接：命令输出；定位：2026-11-02 的 `git show --stat`；原因：终端输出无可分享链接〕

## 决策

- 真实 `my-skills` 只做本地提交，不推送 remote；用户明确要求“commit to git”，没有要求本步 push，且 hook 会在下一次 project push 时推送。〔来源：[README.md:32-37](../../skills/README.md#L32-L37)〕
- 发布分支用 `skill/dsh-mermaid-charts`，从 `main` 创建；不把 `skill/video-dl` 的提交带进来。〔来源：[pre-push:43-47](../../scripts/git-hooks/pre-push#L43-L47)〕
- 修复 no-diff 提前退出，而不是在 setup 脚本里手动 push 一次；这样首次远端建分支和后续同步走同一条路径。〔来源：[pre-push:54-61](../../scripts/git-hooks/pre-push#L54-L61)〕

## 涉及文件

- `scripts/git-hooks/pre-push`：移除 no-diff 提前退出，改为无差异也 push。
- `skills/README.md`：补充分支切换与 `git show` 读取说明。
- `docs/logs/step-13-publish.md`：本日志。
- `E:\repos\my-skills\skills\dsh-mermaid-charts\SKILL.md`：发布副本，提交 `6d101d7`。
- `E:\repos\my-skills` 分支：新增 `skill/dsh-mermaid-charts`；工作区切回 `skill/video-dl`。
- project remote：未推送。

## 未决与下一步

- 用户下一次 `git push` project 时，hook 会同步并 `git push -u origin skill/dsh-mermaid-charts`；如果 my-skills 有未提交改动或网络失败，project push 会被阻止。
- 若要让远端在无 project push 时也更新，需要 GitHub Actions + cross-repo token；当前不做。
- 一周验收按计划跑 5 个 prompt，有技能 vs 无技能；记录在 `docs/logs/step-10-skill-eval.md` 或后续日志。

## 来源

- [pre-push:37-61](../../scripts/git-hooks/pre-push#L37-L61)：分支创建/切换、复制、提交、no-diff push 修复。
- [README.md:32-37](../../skills/README.md#L32-L37)：两仓契约。
- [SKILL.md:1-19](../../skills/dsh-mermaid-charts/SKILL.md#L1-L19)：技能 frontmatter 与版本。
- 无链接：命令输出；定位：2026-11-02 的 `git switch`、`Copy-Item`、`git commit`、`Get-FileHash`、`.research/test-hook.ps1`；原因：终端输出无可分享链接。
