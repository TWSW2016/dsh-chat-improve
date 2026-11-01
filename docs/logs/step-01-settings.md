---
title: "Step 1 — 设置管道与设置页"
created: 2026-11-01
updated: 2026-11-01
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/dsh-plugin"]
git_branch: "main"
---

# Step 1 — 设置管道与设置页

## 目标

为输入框渲染、Mermaid、用户消息 Markdown 提供可持久化的开关，并在 Settings 里提供可操作的页面。〔来源：[implementation-plan.md:44-46](../plans/implementation-plan.md#L44-L46)〕

## 实现

- 设置存储改为浏览器本地：键 `dsh-chat-improve:settings:v1`，默认输入框渲染开、Mermaid 开、用户消息 Markdown 开、Mermaid 源码上限 20000。〔来源：[settings.js:10-22](../../src/settings.js#L10-L22)〕
- `sanitizeSettings` 只接受布尔开关，源码上限夹在 1000–200000 并取整；localStorage 不可用或 JSON 非法时回退默认值。〔来源：[settings.js:29-43](../../src/settings.js#L29-L43)〕
- 存储对象提供 `getSnapshot`、`subscribe`、`update`、`reset`，写入失败只保留内存值，不抛错。〔来源：[settings.js:44-102](../../src/settings.js#L44-L102)〕
- 设置页用 `Checkbox`、`Button` 与原生数字输入，全部颜色取自 `--dsw-alias-*` 语义 token。〔来源：[settings-page.jsx:25-83](../../src/settings-page.jsx#L25-L83)〕
- 通过 `ctx.slots.inject('settings.section', …)` 注册 `chat-improve` 页，`order` 50，`label` 用 locale thunk。〔来源：[client.js:44-55](../../src/client.js#L44-L55)〕
- Vitest 只收集 `tests/**/*.test.js`，排除 `.research`，避免把 DSH 源码树的测试卷进来。〔来源：[vitest.config.mjs:1-8](../../vitest.config.mjs#L1-L8)〕

## 与计划的偏差

Host Config 方案不可用：本插件的条目 id 是 `include:dsh-chat-improve`，属于嵌套 include；`dsh-settings` 明确说明嵌套 include 的配置不能通过 profile 表单编辑。因此改为每个浏览器源各自保存 localStorage，Desktop 与 Web 各一份，不做跨端同步。〔来源：无链接：dsh-settings README；定位：`C:\Users\wxxac\AppData\Local\Programs\DeepSeek Harness\resources\app.asar\dsh\node_modules\@deepseek-ai\dsh-settings\README.md` 第 73 行；原因：材料位于 app.asar 内〕〔来源：无链接：Config.listConfigs 结果；定位：条目 `include:dsh-chat-improve`，`status: absent`；原因：工具输出无可分享链接〕

## 验证

- `npx vitest run`：3 个测试文件、23 个测试全部通过（含本步 10 个设置测试）。〔来源：无链接：命令输出；定位：2026-11-01，工作目录 `E:\Repos\dsh-chat-improve`；原因：终端输出无可分享链接〕
- `Slots.listSubTree` 查询 `settings.section`，occupants 中出现 `id: chat-improve`、`order: 50`、`active: true`；说明 Client 半已加载并完成注册。〔来源：无链接：cordis_inspect_query 结果；定位：2026-11-01 会话；原因：工具输出无可分享链接〕

## 问题与限制

- 🚧 设置页尚未在真实 GUI 中打开验证；当前只确认了插槽注册。需要打开 Settings 查看“聊天增强”页，并切换一次开关确认持久化。〔来源：无链接：验证缺口；定位：本文件“验证”节；原因：会话无可分享链接〕
- ⚠️ localStorage 按源隔离：Desktop 的 `dsh-app://` 与 Web 的 `http://127.0.0.1` 不共享开关。〔来源：[settings.js:1-8](../../src/settings.js#L1-L8)〕
- ⚠️ 设置页的数字输入没有做失焦钳制以外的提示；超出范围会由 `sanitizeSettings` 夹紧，但输入框在输入过程中可能短暂显示越界值。〔来源：[settings.js:38-40](../../src/settings.js#L38-L40)〕

## 下一步

Step 2：实现聊天记录 Mermaid 增强器，加入检测、严格渲染、主题跟随、缓存与失败回退，并在真实 GUI 验证四个样例。〔来源：[implementation-plan.md:45-46](../plans/implementation-plan.md#L45-L46)〕

## 来源

- [settings.js:10-22](../../src/settings.js#L10-L22)：存储键与默认值。
- [settings.js:29-43](../../src/settings.js#L29-L43)：输入清洗与范围钳制。
- [settings.js:44-102](../../src/settings.js#L44-L102)：存储对象与重置。
- [settings-page.jsx:25-83](../../src/settings-page.jsx#L25-L83)：设置页。
- [client.js:44-55](../../src/client.js#L44-L55)：设置页注册。
- [vitest.config.mjs:1-8](../../vitest.config.mjs#L1-L8)：测试收集范围。
- [implementation-plan.md:44-46](../plans/implementation-plan.md#L44-L46)：Step 1 与 Step 2 目标。
- 无链接：dsh-settings README；定位：`C:\Users\wxxac\AppData\Local\Programs\DeepSeek Harness\resources\app.asar\dsh\node_modules\@deepseek-ai\dsh-settings\README.md` 第 73 行；原因：材料位于 app.asar 内。
- 无链接：Config.listConfigs 结果；定位：条目 `include:dsh-chat-improve`；原因：工具输出无可分享链接。
- 无链接：命令输出；定位：2026-11-01，工作目录 `E:\Repos\dsh-chat-improve`；原因：终端输出无可分享链接。
- 无链接：cordis_inspect_query 结果；定位：2026-11-01 会话；原因：工具输出无可分享链接。
- 无链接：验证缺口；定位：本文件“验证”节；原因：会话无可分享链接。
