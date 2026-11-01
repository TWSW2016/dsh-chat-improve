---
title: "Step 7 — Mermaid 关键字表补齐"
created: 2026-11-01
updated: 2026-11-01
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/dsh-plugin"]
git_branch: "main"
---

# Step 7 — Mermaid 关键字表补齐

## 目标

修掉「有些 Mermaid 图类型永远不渲染」的问题：`radar-beta`、`treemap-beta` 以及 mermaid 认、但关键字表里没有的写法（`xychart`、`sankey`、`packet`、`block`、`architecture`、`flowchart-elk`、各 `-beta` 家族）都要能被识别。〔来源：无链接：用户决策；定位：2026-11-01 本会话“fix the invalid key words”；原因：会话无可分享链接〕

## 问题根因

DSH 的代码块 DOM 里拿不到语言标签：`md-code-block` 只有 `data-line-numbers` / `data-code-wrap`，banner 的 `infostring` 渲染的是已本地化的“代码”，`pre` 内也没有 `language-*` class。识别只能靠首行内容，于是 `DIAGRAM_KEYWORDS` 成了 Mermaid 检测器正则的手抄快照。〔来源：[detect.js:1-9](../../src/mermaid/detect.js#L1-L9)；无链接：DSH 代码块组件；定位：app.asar 内 `dsh-client-ui-primitives` 的 `children:t??""` 与 `data-code-block-content` 片段；原因：asar 包内文件无稳定链接〕

`radar` 与 `treemap` 两条最能说明问题：Mermaid 认的是 `radar-beta` 与 `treemap-beta`，旧表只有无后缀的家族名，`radar` 永远匹配不到（`treemap` 只是恰好能蒙混过关）。〔来源：无链接：mermaid 11.17.2 detector 正则；定位：`node_modules/mermaid/dist/mermaid.core.mjs` 中 `return /^\s*radar-beta/` 与 `/^\s*treemap/`；原因：依赖包内文件无稳定链接〕

## 实现

- 关键字表从 29 条扩到 49 条，覆盖 C4 五种、`flowchart-elk`、`swimlane-beta`、`requirement`/`requirementDiagram`、`xychart(-beta)`、`sankey(-beta)`、`treemap(-beta)`、`radar-beta`、`block(-beta)`、`packet(-beta)`、`architecture(-beta)`、`venn-beta`、`ishikawa(-beta)`、`wardley-beta`、`cynefin-beta`、`treeView-beta`、`railroad-*` 与 `eventmodeling`。〔来源：[detect.js:23-79](../../src/mermaid/detect.js#L23-L79)〕
- 匹配逻辑不动：仍取首个有效行、跳过空行与 `%%` 注释，要求整词或后接空格/制表符，因此 `radar-beta` 不会误配 `radar`。〔来源：[detect.js:86-97](../../src/mermaid/detect.js#L86-L97)〕
- 故意不收 `info`：它的图体只是版本横幅，而首词是极常见的日志前缀，误判成本高于收益；理由写在常量注释里。〔来源：[detect.js:19-21](../../src/mermaid/detect.js#L19-L21)〕
- 不做 `-beta` 后缀归一化：`graph-beta` 这类不存在的写法会被放过，反而制造误判；保持精确词表，升级时靠检查脚本补。〔来源：无链接：实现决策；定位：2026-11-01 本步取舍，理由见 detect.js 注释；原因：会话无可分享链接〕
- 新增 `scripts/check-keywords.mjs`：从 Mermaid 的 detector 正则抽出首 token，与本表比对，缺词时退出码 1；本次输出 `missing: none` / `not in mermaid: none`（48 个首 token 对 49 条关键字）。〔来源：[check-keywords.mjs:1-54](../../scripts/check-keywords.mjs#L1-L54)〕

## 测试

- `tests/detect.test.js` 增加 19 条正例（`radar-beta`、`treemap-beta`、`xychart`、`sankey`、`packet`、`block`、`architecture`、`flowchart-elk`、`swimlane-beta`、`venn-beta`、`ishikawa-beta`、`treeView-beta`、`requirement`、`wardley-beta`、`cynefin-beta`、`eventmodeling`、`railroad-ebnf-beta` 等）与 4 条负例（`info:`、`blockchain:`、`radar sweep`、`treemapish`）。〔来源：[detect.test.js:18-57](../../tests/detect.test.js#L18-L57)〕
- 新增契约测试 `tests/keywords.test.js`：逐条调用 `mermaid.detectType`，保证表里没有 Mermaid 不认的死条目。〔来源：[keywords.test.js:15-27](../../tests/keywords.test.js#L15-L27)〕
- 全量 `npm test`：6 个文件、41 条测试全部通过（新增 18 条）。〔来源：无链接：命令输出；定位：2026-11-01 22:47 工作目录 E:\Repos\dsh-chat-improve 的 `npm test`，退出码 0；原因：终端输出无可分享链接〕
- `npm run build`：`lib/client.js` 3399.2 KiB，较上一步 +0.3 KiB。〔来源：无链接：命令输出；定位：2026-11-01 22:48 的 `npm run build`，退出码 0；原因：终端输出无可分享链接〕

## 真实浏览器验证

用本地 Edge（Playwright，headless）+ 与插件相同的 `securityLevel: 'strict'`、`htmlLabels: false`、DSH 主题变量渲染了两类代表图：

- `radar-beta`：700×700，`foreignObject = 0`，坐标轴与曲线名必须是 ASCII（中文会让 lexer 直接报 `unexpected character`），标题可以中文。〔来源：无链接：本地 Edge 渲染结果；定位：2026-11-01 本地 gallery 输出，产物未进版本控制；原因：验证脚本产物在 `.research/` 内，未提交〕
- `treemap-beta`：996×371，`foreignObject = 0`。〔来源：无链接：本地 Edge 渲染结果；定位：同上；原因：验证产物未提交〕

## 问题与限制

- `mermaid.detectType` 在 `mermaid.initialize()` 之前看不到任何检测器，未初始化时每个关键字都会抛 `UnknownDiagramError`；契约测试因此在模块顶层先 initialize。〔来源：无链接：实测报错；定位：2026-11-01 契约测试首次运行的 `No diagram type detected`；原因：本地测试输出无可分享链接〕
- `radar-beta` 的轴名与曲线名是 ASCII-only，中文会解析失败；写图时要避开。〔来源：无链接：本地 Edge 渲染结果；定位：同一批 gallery 输出里中文轴名的 `Lexer error`；原因：验证产物未提交〕
- 关键字表仍是人工维护，Mermaid 升级后可能再漂移；`scripts/check-keywords.mjs` 只能事后发现，未接入 CI，需手动运行。〔来源：[detect.js:14-17](../../src/mermaid/detect.js#L14-L17)〕

## 下一步

Step 8：宽图「适应宽度 / 原始大小」切换与 timeline 解析失败提示，解决 gantt 被压扁、timeline 报错无指引的问题。

## 来源

- [detect.js:1-97](../../src/mermaid/detect.js#L1-L97)：DOM 限制说明、关键字表、注释与匹配逻辑。
- [detect.test.js:18-57](../../tests/detect.test.js#L18-L57)：正例与负例。
- [keywords.test.js:15-27](../../tests/keywords.test.js#L15-L27)：`detectType` 契约测试。
- [check-keywords.mjs:1-54](../../scripts/check-keywords.mjs#L1-L54)：关键字漂移检查脚本。
- 无链接：用户决策；定位：2026-11-01 本会话“fix the invalid key words”；原因：会话无可分享链接。
- 无链接：DSH 代码块组件；定位：app.asar 内 `dsh-client-ui-primitives` 的 `children:t??""` 与 `data-code-block-content` 片段；原因：asar 包内文件无稳定链接。
- 无链接：mermaid 11.17.2 detector 正则；定位：`node_modules/mermaid/dist/mermaid.core.mjs`；原因：依赖包内文件无稳定链接。
- 无链接：实现决策；定位：2026-11-01 本步取舍；原因：会话无可分享链接。
- 无链接：命令输出；定位：2026-11-01 22:47–22:48 的 `npm test` / `npm run build`；原因：终端输出无可分享链接。
- 无链接：本地 Edge 渲染结果；定位：2026-11-01 本地 gallery 输出；原因：验证产物未提交。
- 无链接：实测报错；定位：2026-11-01 契约测试首次运行；原因：本地测试输出无可分享链接。
