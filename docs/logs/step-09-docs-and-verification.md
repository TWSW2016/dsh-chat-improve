---
title: "Step 9 — 写法速查、文档更新与逐类型验收"
created: 2026-11-01
updated: 2026-11-01
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/dsh-plugin"]
git_branch: "main"
---

# Step 9 — 写法速查、文档更新与逐类型验收

## 目标

把前两步的能力写成可查的文档，并对修复后的每种图类型逐一在真实浏览器里跑一遍，确认没有“关键字认了、解析却失败”的死角。〔来源：无链接：用户决策；定位：2026-11-01 本会话“After all are finished. Render charts for each fixed type”；原因：会话无可分享链接〕

## 文档

- 新增 `docs/mermaid-cheatsheet.md`：按类别列出全部首行关键字、timeline 的冒号限制与正确写法、gantt 的实际宽度行为、radar-beta 等新类型的 ASCII-only 限制，以及排错表。〔来源：[mermaid-cheatsheet.md:1-77](../../docs/mermaid-cheatsheet.md#L1-L77)〕
- README 增补：Mermaid 段落写明宽度切换；布局清单加入速查文档；限制清单加入「识别基于内容」「timeline 冒号」「宽图需手动切原始尺寸」三条。〔来源：[README.md:8](../../README.md#L8)，[README.md:38](../../README.md#L38)，[README.md:58-60](../../README.md#L58-L60)〕

## 验收中的两处修正

- **裸 `architecture` 去掉**：Mermaid 的检测器接受 `architecture`，但解析器只认 `architecture-beta`；留在表里只会把普通代码块变成错误面板。词表因此从 49 条回到 48 条，`scripts/check-keywords.mjs` 把它登记为有意忽略。〔来源：[detect.js:19-23](../../src/mermaid/detect.js#L19-L23)，[check-keywords.mjs:13-14](../../scripts/check-keywords.mjs#L13-L14)〕
- **gantt 宽度结论修正**：实测 800px 视口得到 760px 宽、1400px 视口得到 1360px 宽，说明 Mermaid 用页面宽度画甘特图，与任务跨度无关；先前“跨度决定宽度”的说法作废，速查文档已改正。〔来源：无链接：本地渲染结果；定位：2026-11-01 本机 Edge 两个视口的 viewBox 输出；原因：验证产物未提交〕

## 逐类型验收

在同一套插件配置（strict、htmlLabels false、DSH 主题变量）下用 Edge 渲染，全部 `foreignObject = 0`、控制台零错误：

| 类型 | 尺寸（宽×高） |
| --- | --- |
| `timeline` | 795×711 |
| `gantt` | 1560×172 |
| `radar-beta` | 700×700 |
| `treemap-beta` | 996×371 |
| `xychart` | 700×500 |
| `sankey` | 600×400 |
| `packet` | 1026×156 |
| `block` | 224×92 |
| `flowchart-elk` | 683×67 |
| `requirementDiagram` | 309×483 |
| `venn-beta` | 800×450 |
| `ishikawa-beta` | 356×186 |
| `treeView-beta` | 129×217 |
| `railroad-ebnf-beta` | 297×109 |
| `architecture-beta` | 451×452 |
| `wardley-beta` | 900×600 |

〔来源：无链接：本地渲染结果；定位：2026-11-01 本机 Edge + Playwright 的 gallery 输出，产物未进版本控制；原因：验证脚本在 `.research/` 内，未提交〕

`swimlane-beta`、`cynefin-beta`、`eventmodeling` 与 `railroad-{beta,abnf,peg}` 只在关键字层面确认可识别；本机没有可复现的语法样例，未纳入这轮逐类型验收。〔来源：[detect.js:24-79](../../src/mermaid/detect.js#L24-L79)〕

## 问题与限制

- 若干新类型在本版本只吃 ASCII 标签（`radar-beta` 的轴与曲线名、`sankey` 的节点名、`requirementDiagram` 的 `text`、`venn-beta` 的集合名、`wardley-beta` 的组件名），中文会 `Lexer error`；写图时用英文。〔来源：无链接：本地渲染结果；定位：2026-11-01 本机 Edge 渲染失败与成功的对照；原因：验证产物未提交〕
- `swimlane-beta`、`cynefin-beta`、`eventmodeling` 的语法没有本地文档可查，仍属“可识别但未验证渲染”。〔来源：[detect.js:24-79](../../src/mermaid/detect.js#L24-L79)〕
- 验收仍是本地浏览器加 DOM 单测，真实 Desktop 窗口没有逐图点过按钮。〔来源：无链接：验证缺口；定位：本文件“逐类型验收”节；原因：会话无可分享链接〕

## 下一步

在会话里把上面 16 种图各发一张，作为最终验收；之后本次修复收尾。

## 来源

- [mermaid-cheatsheet.md:1-77](../../docs/mermaid-cheatsheet.md#L1-L77)：关键字表、timeline/gantt 写法与排错。
- [README.md:8](../../README.md#L8)、[README.md:38](../../README.md#L38)、[README.md:58-60](../../README.md#L58-L60)：README 增补。
- [detect.js:19-79](../../src/mermaid/detect.js#L19-L79)：关键字表与排除项。
- [check-keywords.mjs:13-14](../../scripts/check-keywords.mjs#L13-L14)：有意忽略的首 token。
- 无链接：用户决策；定位：2026-11-01 本会话“After all are finished. Render charts for each fixed type”；原因：会话无可分享链接。
- 无链接：本地渲染结果；定位：2026-11-01 本机 Edge 与 Playwright 输出；原因：验证产物未提交。
- 无链接：验证缺口；定位：本文件“问题与限制”节；原因：会话无可分享链接。

