---
title: "Step 6 — 安装、卸载与收尾"
created: 2026-11-01
updated: 2026-11-01
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/dsh-plugin"]
git_branch: "main"
---

# Step 6 — 安装、卸载与收尾

## 目标

在 `desktop` profile 上验证卸载与重装不残留，清理临时验证环境，完成最终构建与记录。〔来源：[implementation-plan.md:50-51](../plans/implementation-plan.md#L50-L51)〕

## 卸载与重装

- `plugin_manager remove_bundle` 返回 `stage: remove`、`application: applied`；profile 依赖中移除 `dsh-chat-improve`。〔来源：无链接：plugin_manager 工具结果；定位：2026-11-01 会话；原因：工具输出无可分享链接〕
- 卸载后查询 Client `Slots`：`settings.section` 的 occupants 不再含 `chat-improve`；`conversation.user.text.node` 只剩内置 `text`（priority 100），没有我们的 priority 0 项。〔来源：无链接：cordis_inspect_query 结果；定位：2026-11-01 会话；原因：工具输出无可分享链接〕
- `plugin_manager install_bundle` 重新安装，返回 `application: applied`、`bundle: dsh-chat-improve`、`version: 0.1.0`。〔来源：无链接：plugin_manager 工具结果；定位：2026-11-01 会话；原因：工具输出无可分享链接〕
- 重装后查询同一批 Slots：`settings.section` 重新出现 `chat-improve`（order 50）；`conversation.user.text.node` 出现两个 `text` occupant，我们的 priority 0 为 active，内置 priority 100 为 inactive，符合“低 priority 覆盖”的预期。〔来源：无链接：cordis_inspect_query 结果；定位：2026-11-01 会话；原因：工具输出无可分享链接〕
- 验收记录已更新卸载与重装两行。〔来源：[verification.md:40-42](../verification.md#L40-L42)〕

## 清理

- 停止临时 `web` profile 的 `3099` 服务（后台任务 `pwsh-12d3214565ef451c`），删除本次创建的 `~\.dsh\profiles\web` 目录；删除后 `profiles` 下只剩 `desktop`。〔来源：无链接：清理命令输出；定位：2026-11-01，`C:\Users\wxxac\.dsh\profiles`；原因：终端输出无可分享链接〕
- 验证期间在 `dsh-chat-improve` 工作区创建了 4 个测试会话（16:36–16:46），未删除；它们与正常会话共用会话存储，删除目录会留下投影缓存与查询索引的悬挂引用，因此留给用户按需归档。〔来源：无链接：会话目录列表；定位：`C:\Users\wxxac\.dsh\sessions\--E-Repos-dsh-chat-improve--` 中 `3bd0…`、`1a30…`、`fbdc…`、`27ff…`；原因：材料位于仓库外〕
- `.research/verify/` 中的截图与 JSON 保留为本地证据，未提交；`.research` 在 `.gitignore` 中。〔来源：[.gitignore:1-5](../../.gitignore#L1-L5)〕

## 最终检查

- `npx vitest run`：5 个测试文件、39 个测试通过。〔来源：无链接：命令输出；定位：2026-11-01，工作目录 `E:\Repos\dsh-chat-improve`；原因：终端输出无可分享链接〕
- `npm run build`：`lib/client.js` 3398.9 KiB；`node --check` 通过。〔来源：无链接：命令输出；定位：2026-11-01，工作目录 `E:\Repos\dsh-chat-improve`；原因：终端输出无可分享链接〕
- `npm pack --dry-run --json`：21 个文件，包含 `lib/client.js`、patch、icon、locale、src；不包含 `.research` 与测试产物。〔来源：无链接：命令输出；定位：2026-11-01，工作目录 `E:\Repos\dsh-chat-improve`；原因：终端输出无可分享链接〕
- GitHub 上没有提交；仓库为本地 git，分支 `main`，按 Step 0–6 分步提交。〔来源：无链接：git 状态；定位：`E:\Repos\dsh-chat-improve\.git`；原因：本地仓库无远端〕

## 问题与限制

- 🚧 Desktop 窗口没有单独的 DOM 断言；Web GUI 与 Desktop 共用 `lib/client.js`，卸载/重装的 Slot 检查在运行中的 Desktop 页面完成，说明客户端插件确实会加载与卸载。〔来源：无链接：验证缺口；定位：本文件“卸载与重装”节；原因：会话无可分享链接〕
- ⚠️ 测试会话仍在工作区；建议用户在 Desktop 侧栏归档或删除这 4 个会话。〔来源：无链接：清理说明；定位：本文件“清理”节；原因：会话无可分享链接〕
- ⚠️ 输入框一次性粘贴的多行文本可能保持原文；逐行输入与 Shift+Enter 正常，已在 README 与验收记录中标注。〔来源：[README.md:50-58](../../README.md#L50-L58)〕

## 下一步

本轮交付完成：代码、构建脚本、验证脚本、日志与验收记录都在 `E:\Repos\dsh-chat-improve`；后续可做的项包括输入框公式、代码块卡片、粘贴多行的格式化，以及“编辑并重发”的上游核心能力。〔来源：[implementation-plan.md:47-51](../plans/implementation-plan.md#L47-L51)〕

## 来源

- [verification.md:40-42](../verification.md#L40-L42)：卸载与重装结果。
- [README.md:50-58](../../README.md#L50-L58)：输入框限制。
- [.gitignore:1-5](../../.gitignore#L1-L5)：研究材料与构建产物忽略规则。
- [implementation-plan.md:47-51](../plans/implementation-plan.md#L47-L51)：后续范围。
- 无链接：plugin_manager 工具结果；定位：2026-11-01 会话；原因：工具输出无可分享链接。
- 无链接：cordis_inspect_query 结果；定位：2026-11-01 会话；原因：工具输出无可分享链接。
- 无链接：清理命令输出；定位：`C:\Users\wxxac\.dsh\profiles`；原因：终端输出无可分享链接。
- 无链接：会话目录列表；定位：`C:\Users\wxxac\.dsh\sessions\--E-Repos-dsh-chat-improve--`；原因：材料位于仓库外。
- 无链接：命令输出；定位：2026-11-01，工作目录 `E:\Repos\dsh-chat-improve`；原因：终端输出无可分享链接。
- 无链接：git 状态；定位：`E:\Repos\dsh-chat-improve\.git`；原因：本地仓库无远端。
- 无链接：验证缺口；定位：本文件“问题与限制”节；原因：会话无可分享链接。
- 无链接：清理说明；定位：本文件“清理”节；原因：会话无可分享链接。

