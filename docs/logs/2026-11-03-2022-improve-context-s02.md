---
title: "Improve 上下文修复步骤 2：重写 system prompt"
created: 2026-11-03
updated: 2026-11-03
log_deai_profile: "agent"
log_deai_version: "1.0.0-rc.1"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/improve-by-ai"]
git_branch: "main"
---

# Improve 上下文修复步骤 2：重写 system prompt

## 目标与范围

步骤 2 只改 `src/host/prompt.js` 的改写契约，不接路由。目标是：有工作区事实时优先使用；推不出的信息直接省略；不出现 `unknown` / `TBD` / `待确认`；不添加 Project/Branch/Context 头部；补两个 few-shot；保留原约束、代码、路径、数字和语气。

## 执行

1. 替换 `SYSTEM_PROMPT`：新增工作区事实优先级、`materially better` 质量门槛、七条规则、两个示例；删除旧的四条规则与 `（待确认：…）` 指令。〔来源：[prompt.js:26-69](../../src/host/prompt.js#L26-L69)〕
2. 新增 `composeSystemPrompt()`：无简报时返回基础 prompt；有简报时在空行后追加并 `trim()`。〔来源：[prompt.js:71-81](../../src/host/prompt.js#L71-L81)〕
3. 更新 prompt 单测：事实优先级、禁止未知占位、禁止元数据头部、输出契约、草稿为 data、禁止通用流程套话、两个示例、简报拼接。〔来源：[rewrite-prompt.test.js:6-56](../../tests/rewrite-prompt.test.js#L6-L56)〕
4. `npx vitest run tests/rewrite-prompt.test.js`：20 例通过。〔来源：无链接：本会话命令输出；定位：2026-11-03 20:21，退出码 0；原因：终端输出无可分享链接〕
5. `npm test`：16 个文件、149 例通过。〔来源：无链接：本会话命令输出；定位：2026-11-03 20:22，退出码 0；原因：终端输出无可分享链接〕

## 结果

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| prompt 单测 | 通过 | 20 例，退出码 0 |
| 全量单测 | 通过 | 16 文件 149 例，退出码 0 |
| 旧占位指令 | 已删除 | 断言不出现 `（待确认：…）` 与 `(To confirm:` |
| 事实优先级 | 已写入 | 断言包含 `WORKSPACE FACTS` 与 `first source` |
| 元数据头部 | 已禁止 | 断言包含 `Do not add a Project/Branch/Context metadata header` |
| 示例数量 | 2 个 | `Draft:` 行计数为 2 |

## 问题与限制

- 步骤 2 只改 prompt 文本；路由还没有把工作区简报传给模型，所以真实点击仍会走无事实路径，直到步骤 3 接线完成。
- 两个 few-shot 是按当前需求手写的，没有经过真实模型 A/B 测试；它们只约束风格与结构，不证明模型一定不输出占位行。
- `SYSTEM_PROMPT` 从约 1.3 KB 增加到 3192 字符，单次请求的输入 token 会增加；仍在原有输出上限与请求体上限内，未改 `MAX_OUTPUT_TOKENS`。
- 规则要求“推不出就省略”，但没有在 Host 侧做输出后处理；如果模型仍偶发输出占位，需要后续加一次修正或精确过滤。

## 可复用经验

- “不要输出 unknown”不能只靠一句禁止；同时给出“缺什么就省略”的替代动作，并给示例，模型才有可执行的下一步。
- 禁止元数据头部要和“自然带入事实”的示例一起给，否则模型容易把事实堆成 `Project/Branch` 列表。
- 把“允许补调查/验证步骤”和“禁止通用流程套话”分开写，能避免模型用 `run the tests` 之类的内容填充长度。
- 新契约要配可断言的关键句测试，避免后续改 prompt 时把旧占位规则带回来。

## 涉及文件

- `src/host/prompt.js`
- `tests/rewrite-prompt.test.js`
- 本日志

## 下一步

步骤 3 把 `buildWorkspaceBrief()` 接进 `src/host/rewrite.js` 的 `streamRewrite()`，让 `system` 使用 `composeSystemPrompt(brief)`，并补路由测试。

## 来源

- [prompt.js:26-81](../../src/host/prompt.js#L26-L81)：新 system prompt 与 `composeSystemPrompt()`。
- [rewrite-prompt.test.js:6-56](../../tests/rewrite-prompt.test.js#L6-L56)：步骤 2 的 prompt 与拼接单测。
- 无链接：本会话命令输出；定位：2026-11-03 20:21 至 20:22 的 `npx vitest run tests/rewrite-prompt.test.js` 与 `npm test`，退出码 0；原因：终端输出无可分享链接。
