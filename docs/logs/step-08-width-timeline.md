---
title: "Step 8 — 宽图切换与 timeline 提示"
created: 2026-11-01
updated: 2026-11-01
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/dsh-plugin"]
git_branch: "main"
---

# Step 8 — 宽图切换与 timeline 提示

## 目标

解决两个可用性问题：gantt 这类宽图被 `max-width:100%` 压进列宽、字缩到看不清；timeline 解析失败时只显示“Mermaid 渲染失败”，用户不知道是时间段里的冒号导致的。〔来源：无链接：用户决策；定位：2026-11-01 本会话“render timeline and gantt”；原因：会话无可分享链接〕

## 实现

- 面板新增第二个按钮「原始大小 / 适合宽度」：仅当 SVG 的 viewBox 宽度大于内容区 `clientWidth` 时出现；切到原始大小时把 `max-width` 设为 `none` 并写入 viewBox 宽高，容器既有 `overflow-x:auto` 负责横向滚动；切回时还原 `max-width` 与 `width`/`height` 原值。〔来源：[enhance.js:270-311](../../src/mermaid/enhance.js#L270-L311)〕
- 测量发生在面板插入之后；`clientWidth` 为 0（列被隐藏或尚未布局）时按“溢出”处理，宁可多给一个按钮也不漏掉宽图。〔来源：[enhance.js:272-277](../../src/mermaid/enhance.js#L272-L277)〕
- viewBox 用属性字符串解析，不依赖 `SVGSVGElement.viewBox`，这样 jsdom 里也能测。〔来源：[enhance.js:240-250](../../src/mermaid/enhance.js#L240-L250)〕
- timeline 提示：源码以 `timeline` 开头，且某行 `: ` 分隔符之前出现 `H:MM` 时，在错误面板追加一句可执行的改法。〔来源：[enhance.js:313-321](../../src/mermaid/enhance.js#L313-L321)，[enhance.js:161-166](../../src/mermaid/enhance.js#L161-L166)〕
- 文案沿用插件既有 i18n：`mermaid.fitWidth`、`mermaid.actualSize`、`mermaid.timelinePeriodHint` 各中英一条。〔来源：[client.js:34-36](../../src/client.js#L34-L36)，[client.js:56-58](../../src/client.js#L56-L58)〕
- 提示样式复用语义 token，字号与错误行一致。〔来源：[enhance.js:36](../../src/mermaid/enhance.js#L36)〕

## 测试

- `tests/mermaid-enhance.test.js` 增 4 条：宽图出现切换按钮并能在 `maxWidth: none` 与原值之间来回、窄图只有源码按钮、timeline 冒号写法出现提示、非 timeline 失败不出现提示。〔来源：[mermaid-enhance.test.js:192-254](../../tests/mermaid-enhance.test.js#L192-L254)〕
- 全量 `npm test`：6 个文件、45 条测试通过（新增 4 条）。〔来源：无链接：命令输出；定位：2026-11-01 22:52 工作目录 E:\Repos\dsh-chat-improve 的 `npm test`，退出码 0；原因：终端输出无可分享链接〕
- `npm run build`：`lib/client.js` 3401.1 KiB（+2.0 KiB）。〔来源：无链接：命令输出；定位：2026-11-01 22:52 的 `npm run build`，退出码 0；原因：终端输出无可分享链接〕

## 真实浏览器验证

用一个 600px 宽的假列 + 1600×400 的 SVG 桩，把构建后的 `startMermaidEnhancer` 挂进 Edge（Playwright，headless），验证按钮与尺寸：

- 初始：SVG 渲染宽 600（被 `max-width:100%` 夹住），按钮为“源码 / 原始大小”。
- 点“原始大小”：SVG 宽 1600，容器 `scrollWidth` 1600 大于 `clientWidth` 600，按钮变“适合宽度”、`aria-pressed=true`。
- 再点“适合宽度”：回到 600，`max-width` 还原为空。
- 全过程控制台零错误。〔来源：无链接：本地 Edge 宽度验证结果；定位：2026-11-01 本地 Playwright 脚本输出 `PASS`，产物未进版本控制；原因：验证脚本在 `.research/` 内，未提交〕

## 问题与限制

- 按钮是否出现依赖 `clientWidth` 测量；列被隐藏（宽度 0）时任何有 viewBox 的图都会得到按钮，属于可接受的误报。
- 宽度切换是每张图独立的瞬时状态，刷新后回到“适合宽度”，不写入设置。
- timeline 提示只认「`: ` 之前含 `H:MM`」这一种写法；其他非法 timeline 仍只有通用错误文案。
- 真实 GUI 里没有点过这两个按钮，只验证了同一条代码路径在 Edge 中的行为；Desktop 侧留待手工冒烟。

## 下一步

Step 9：补 `docs/mermaid-cheatsheet.md`（首行关键字、timeline 时间写法、gantt 宽度约定）并更新 README，然后按修复后的类型逐一出图验收。

## 来源

- [enhance.js:36](../../src/mermaid/enhance.js#L36)：提示样式。
- [enhance.js:161-166](../../src/mermaid/enhance.js#L161-L166)：错误面板追加提示。
- [enhance.js:240-321](../../src/mermaid/enhance.js#L240-L321)：viewBox 解析、宽度切换、timeline 判定。
- [client.js:34-36](../../src/client.js#L34-L36) 与 [client.js:56-58](../../src/client.js#L56-L58)：中英文案。
- [mermaid-enhance.test.js:192-254](../../tests/mermaid-enhance.test.js#L192-L254)：新增四条测试。
- 无链接：用户决策；定位：2026-11-01 本会话“render timeline and gantt”；原因：会话无可分享链接。
- 无链接：命令输出；定位：2026-11-01 22:52 的 `npm test` / `npm run build`；原因：终端输出无可分享链接。
- 无链接：本地 Edge 宽度验证结果；定位：2026-11-01 本地 Playwright 输出；原因：验证产物未提交。
