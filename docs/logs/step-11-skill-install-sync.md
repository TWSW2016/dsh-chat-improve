---
title: "Step 11 — 项目技能激活与自动同步"
created: 2026-11-02
updated: 2026-11-02
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/dsh-plugin"]
git_branch: "main"
---

# Step 11 — 项目技能激活与自动同步

## 目标

让 `skills/dsh-mermaid-charts/SKILL.md` 在不安装到全局的前提下被本项目的 DSH 发现，并建立 project 到 `my-skills` 的自动同步入口。〔来源：[README.md:5-37](../../skills/README.md#L5-L37)〕

## 实现

- 新增 `scripts/setup-skill-sync.ps1`，负责创建 `.dsh/skills/dsh-mermaid-charts` 目录 junction，并把 hook 安装到 `.git/hooks/pre-push`。〔来源：[setup-skill-sync.ps1:1-55](../../scripts/setup-skill-sync.ps1#L1-L55)〕
- 新增 `scripts/git-hooks/pre-push`，在推送当前分支时把技能复制到 `my-skills`，切到 `skill/dsh-mermaid-charts`，只提交该路径并推送。〔来源：[pre-push:1-62](../../scripts/git-hooks/pre-push#L1-L62)〕
- `.gitignore` 增加 `.dsh/skills/`；真实技能文件仍在 `skills/`，junction 不入库。〔来源：[.gitignore:6](../../.gitignore#L6)〕
- 你没有指定分支；`my-skills` 当前在 `skill/video-dl`，hook 默认使用独立的 `skill/dsh-mermaid-charts`，避免混到其它技能分支。〔来源：[pre-push:7](../../scripts/git-hooks/pre-push#L7)〕

## 验证

- 第一次运行 setup：创建 junction，安装 hook。〔来源：无链接：命令输出；定位：2026-11-02 运行 `pwsh -File scripts/setup-skill-sync.ps1`；原因：终端输出无可分享链接〕
- 第二次运行 setup：输出 `junction already present`，没有重复创建；脚本幂等。〔来源：无链接：命令输出；定位：2026-11-02 第二次运行同一脚本；原因：终端输出无可分享链接〕
- `Get-Item` 显示 `LinkType: Junction`、`Target: E:\Repos\dsh-chat-improve\skills\dsh-mermaid-charts`；通过 junction 读取 `SKILL.md` 返回 `True`。〔来源：无链接：命令输出；定位：2026-11-02 的 `Get-Item` 与 `Test-Path`；原因：终端输出无可分享链接〕
- hook 文件为 LF：`CR=0`、`LF=62`；用 Git Bash 执行 `bash -n`，退出码 0。〔来源：无链接：命令输出；定位：2026-11-02 检查 `.git/hooks/pre-push`；原因：终端输出无可分享链接〕
- 本会话的 DSH 可用技能列表出现 `dsh-mermaid-charts`，说明项目根发现生效，无需全局安装。〔来源：无链接：会话技能目录；定位：2026-11-02 本会话的 available_skills；原因：会话内部列表无可分享链接〕

## 问题与限制

- 你说“soft link”；Windows 的符号链接需要 `SeCreateSymbolicLinkPrivilege` 或开发者模式，本机 AGENTS.md 记录为不可用。实际用的是目录 junction，DSH 会跟随，效果对加载相同。〔来源：无链接：本机权限记录；定位：`~/.dsh/AGENTS.md` 的链接权限一节；原因：全局指令不在项目仓库内〕
- hook 尚未做端到端推送测试；本步只验证安装、幂等、LF 和语法。真实 `my-skills` 和 remote 未改动。〔来源：[pre-push:1-62](../../scripts/git-hooks/pre-push#L1-L62)〕
- `my-skills` 当前在 `skill/video-dl`；hook 第一次运行会从 `main` 创建 `skill/dsh-mermaid-charts`，不会把视频技能分支带进来。〔来源：[pre-push:44-53](../../scripts/git-hooks/pre-push#L44-L53)〕
- hook 会在 `my-skills` 有未提交改动、技能路径有未提交改动或 `my-skills` push 失败时阻止 project push；紧急情况用 `git push --no-verify`。〔来源：[pre-push:29-42](../../scripts/git-hooks/pre-push#L29-L42)〕

## 可复用经验

- 项目技能发现路径是 `<project>/.dsh/skills` 和 `<project>/.agents/skills`；`./skills` 只适合做源目录，不能单独被 DSH 加载。〔来源：[README.md:5-10](../../skills/README.md#L5-L10)〕
- 目录 junction 用 `mklink /J`，不需要管理员；用 `Get-Item` 的 `LinkType`/`Target` 验证，不要只看 `Test-Path`。〔来源：[setup-skill-sync.ps1:24-42](../../scripts/setup-skill-sync.ps1#L24-L42)〕
- hook 文件必须是 LF；安装脚本读入后统一 `\r\n` 为 `\n`，再用 UTF-8 无 BOM 写入。〔来源：[setup-skill-sync.ps1:45-55](../../scripts/setup-skill-sync.ps1#L45-L55)〕
- 用 Git for Windows 的 `bash -n` 检查 hook；系统自带的 `bash.exe` 是 WSL，路径解析不同。〔来源：无链接：命令输出；定位：2026-11-02 的 `Get-Command bash.exe` 与 Git Bash 语法检查；原因：终端输出无可分享链接〕

## 下一步

Step 12：用临时 bare remote + 临时 `my-skills` 克隆做 hook 端到端测试，再跑 `SKILL.md` 的 17 条 parse、`npm test` 和 `check-keywords`；记录失败并修复。〔来源：[SKILL.md:400-432](../../skills/dsh-mermaid-charts/SKILL.md#L400-L432)〕

## 来源

- [setup-skill-sync.ps1:1-55](../../scripts/setup-skill-sync.ps1#L1-L55)：junction 创建、幂等检查、hook 安装和 LF 归一化。
- [pre-push:1-62](../../scripts/git-hooks/pre-push#L1-L62)：同步路径、分支、脏工作区检查、提交和推送。
- [.gitignore:6](../../.gitignore#L6)：忽略 `.dsh/skills/`。
- [README.md:5-37](../../skills/README.md#L5-L37)：项目技能根、setup 与两仓契约。
- [SKILL.md:400-432](../../skills/dsh-mermaid-charts/SKILL.md#L400-L432)：parse 与插件回归命令。
- 无链接：命令输出；定位：2026-11-02 的 setup 两次运行、`Get-Item`、`Test-Path`、`bash -n`；原因：终端输出无可分享链接。
- 无链接：会话技能目录；定位：2026-11-02 本会话 available_skills 出现 `dsh-mermaid-charts`；原因：会话内部列表无可分享链接。
- 无链接：本机权限记录；定位：`~/.dsh/AGENTS.md` 链接权限一节；原因：全局指令不在项目仓库内。
