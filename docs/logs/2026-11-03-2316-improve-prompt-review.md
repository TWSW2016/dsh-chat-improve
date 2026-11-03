---
title: "评审 Improve by AI 的改写请求：找出把生成 prompt 推向方案与步骤的指令行"
created: 2026-11-03
updated: 2026-11-03
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/review", "topic/improve-by-ai"]
git_branch: "main"
---

# 评审 Improve by AI 的改写请求：找出把生成 prompt 推向方案与步骤的指令行

## 交接摘要

- 现状：本轮只做只读评审与建议，未改任何代码或指令文本；工作区仅剩此前遗留的 `tests/rewrite-context.test.js` 修改与未跟踪的 2304 日志。
- 结论：生成 prompt 里的"计划/方案/操作步骤"主要来自 `prompt.js` 规则 2 第二句与第一条 few-shot；完成判据本身没问题，问题在它被规则 2 带成了"先…再…"。
- 下一步：用户确认后再改 `src/host/prompt.js:27-63` 与 `src/host/context.js:199-210`，并同步 `tests/rewrite-prompt.test.js` 与 README/计划中的契约描述。
- 关键文件：`src/host/prompt.js`、`src/host/context.js`、`tests/rewrite-prompt.test.js`、`README.md`。

## 目标与请求

用户原话（摘要）："review how the Improve by AI rewrite request is built — the instruction/system prompt plus the bounded workspace brief the composer button sends — and give me concrete advice on how to improve the generated prompt further."

约束：初始要求是 "I want a better prompt"；当前版本已比第 1 版更好（细节更多、表述更清晰准确）；仍有两个问题——(1) 生成结果含计划与方案，本应由执行该 prompt 的 agent 自行探索；(2) 甚至教执行方怎么做具体操作。要求：保留已经有效的部分（明确动作与对象、草稿与简报蕴含的细节、完成判据、原约束全部保留），保持"单次 tool-free 请求、不写会话"。**只给建议，暂不改代码与指令文本。**

## 执行与命令

1. 定位实现：`grep` "Improve by AI"，命中 `src/host/prompt.js`、`src/host/context.js`、`src/host/rewrite.js`、`src/improve/request.js`、`tests/rewrite-prompt.test.js`。
2. 逐一阅读请求构造链：
   - `src/host/rewrite.js:93-113`：`llm.stream({ system: composeSystemPrompt(brief), messages: [{ role: 'user', content: [{ type: 'text', text: draft }] }] })`，一次调用，无工具、无会话事件。
   - `src/host/prompt.js:26-64`：`SYSTEM_PROMPT` 指令常量（含 7 条规则与 2 条 few-shot）。
   - `src/host/prompt.js:71-75`：`composeSystemPrompt(brief)` 把简报追加在指令之后（末尾）。
   - `src/host/context.js:199-211`：`WORKSPACE FACTS` 块的实际渲染（项目、仓库根、分支、工作目录、AGENTS.md 摘录、README 摘录）。
   - `src/host/context.js:171-183`：`collectWorkspaceBrief` 采集范围（不读全局 AGENTS.md、不读会话历史、不读 git status）。
3. 用 node 内联脚本渲染本仓库真实简报（只读）：
   ```
   node --input-type=module -e "import { formatWorkspaceBrief, collectWorkspaceBrief } from 'file:///E:/Repos/dsh-chat-improve/src/host/context.js'; ..."
   ```
   输出长度 1773 字符，含 `E:\Repos\dsh-chat-improve` 与 `E:/Repos/dsh-chat-improve` 两种分隔符，README 摘录在末尾被截断。退出码 0。
4. `git status --short --branch` → `## main...origin/main`，`M tests/rewrite-context.test.js`、`?? docs/logs/2026-11-03-2304-rebuild-latest-plugin.md`；`git log --oneline -1` → `f754e86`。

## 结果与证据

| 项 | 结论 | 依据 |
| --- | --- | --- |
| 计划/步骤的来源 | 规则 2 第二句 "You may add investigation or verification steps that follow from the request" | `src/host/prompt.js:40-41` |
| "process detail" 的来源 | 规则 2 第一句把 "process detail" 列入可加内容 | `src/host/prompt.js:39` |
| 方案被示范 | 第一条 few-shot 的输出写了"Host 侧读取…、调整 system prompt…、完成后用草稿验证" | `src/host/prompt.js:57-59` |
| 完成判据 | 规则 3 前半句本身有效，但被规则 2 的步骤许可带成"先…再…" | `src/host/prompt.js:42`、`:33` |
| 规则内部矛盾 | 33 行的四类允许项不含 "process detail"/"investigation steps"，但规则 2 更靠后且更明确许可 | `src/host/prompt.js:33` 与 `:39-41` |
| 简报无条件注入 | 31 行 "use it as the first source" 对任何草稿都生效 | `src/host/prompt.js:31` |
| README 摘录自指 | 本仓库 README 第 10 行恰好复述了输出契约，模型会把它当模板/需求 | `README.md:10` |
| 简报重复事实 | cwd 与 root 相同却被输出两次且分隔符不一致 | 本会话 node 渲染结果 |

## 决策

- 只评审、不改代码：用户明确 "Advice only: don't change the code or the instruction text yet"。
- 优先级判断：few-shot 的影响大于规则文本（模型对示例的模仿强于对规则的服从），因此把"改第一条示例"列为第一优先，规则 2 第二优先。
- 否掉"在 `cleanRewrite` 里用正则删步骤句"：会误伤合法约束句，且属于输出后处理兜底，不解决指令层面的许可问题。
- 否掉"加第二次审稿调用/加工具"：违反用户"单次 tool-free 请求、不写会话"的约束。
- 否掉核对"日志是否要写全档"：本轮无发布/部署/破坏性操作，按日常档落盘。

## 涉及文件

- 只读：`src/host/prompt.js`、`src/host/context.js`、`src/host/rewrite.js`、`src/improve/request.js`、`tests/rewrite-prompt.test.js`、`README.md`、`docs/plans/2026-11-03-improve-by-ai.md`。
- 新建：本日志。
- 未改动任何源码与指令文本。

## 未决与下一步

- 待用户确认建议后，才改 `SYSTEM_PROMPT` 规则 2/3 与第一条 few-shot；如需第三条示例，同步 `tests/rewrite-prompt.test.js:43-44` 的 `^Draft:` 计数断言。
- 简报侧待定：README 摘录是否降额（1500 → ~400 或只留标题/定位/Not in scope）、简报是否前移到规则之前、示例 facts 行与真实块形状统一。
- 文档同步：`README.md:10` 与 `docs/plans/2026-11-03-improve-by-ai.md:129-140` 的契约描述需随指令改动一起更新。

## 来源

- `E:\Repos\dsh-chat-improve\src\host\prompt.js:26-64`：`SYSTEM_PROMPT` 全文（规则 1–7、2 条 few-shot）。
- `E:\Repos\dsh-chat-improve\src\host\prompt.js:71-75`：`composeSystemPrompt` 追加简报。
- `E:\Repos\dsh-chat-improve\src\host\context.js:199-211`：简报渲染格式。
- `E:\Repos\dsh-chat-improve\src\host\rewrite.js:93-113`：system/messages 组装与单次调用。
- `E:\Repos\dsh-chat-improve\tests\rewrite-prompt.test.js:6-58`：被测试锚定的指令原句。
- 无链接：本会话命令输出；定位：2026-11-03 23:14–23:16 的 `git status`、`Get-Date`、node 内联渲染；原因：终端输出无可分享链接。
