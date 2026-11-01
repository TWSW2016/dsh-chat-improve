---
title: "Step 10 — dsh-mermaid-charts 技能初稿"
created: 2026-11-02
updated: 2026-11-02
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/dsh-plugin"]
git_branch: "main"
---

# Step 10 — dsh-mermaid-charts 技能初稿

## 目标

在项目内建立 `skills/dsh-mermaid-charts/SKILL.md`，把 Mermaid 写作规则、16 类成功模板、边界案例、插件开发附录和验证方法写成一个可被 DSH 项目技能根加载的单文件技能。〔来源：[SKILL.md:1-19](../../skills/dsh-mermaid-charts/SKILL.md#L1-L19)〕

## 实现

- `SKILL.md` 共 464 行，包含 10 个小节；顺序按“成功模板 → 边界案例 → 插件附录”。〔来源：[SKILL.md:21-464](../../skills/dsh-mermaid-charts/SKILL.md#L21-L464)〕
- 首行关键字表覆盖 48 个关键字，并明确排除 `info` 与裸 `architecture`。〔来源：[SKILL.md:43-58](../../skills/dsh-mermaid-charts/SKILL.md#L43-L58)〕
- 16 条成功模板来自本插件逐类型验收的 `.mmd` 文件；模板内容与验收尺寸对应。〔来源：[step-09-docs-and-verification.md:29-50](step-09-docs-and-verification.md#L29-L50)〕
- 边界案例写入 timeline period 冒号、gantt 页面宽度、中文引号矩阵、裸 `architecture`、strict/sanitize、源码上限、state label 和 `%%{init}%%` 配色。〔来源：[SKILL.md:281-353](../../skills/dsh-mermaid-charts/SKILL.md#L281-L353)〕
- 插件开发附录记录 DOM 缝、关键字检查脚本、`mermaid.initialize`/`parse`/`render` 的配置、主题缓存、宽度切换和新增类型清单。〔来源：[SKILL.md:361-399](../../skills/dsh-mermaid-charts/SKILL.md#L361-L399)〕
- 新增 `skills/README.md`，记录项目技能根不是 `./skills`、junction 方案和两仓契约。〔来源：[README.md:1-47](../../skills/README.md#L1-L47)〕

## 验证

- 用 jsdom + Mermaid 11.17.2 提取 `SKILL.md` 中全部 `mermaid` 围栏并逐条 `mermaid.parse`：17 条全部 `OK`，退出码 0。〔来源：无链接：命令输出；定位：2026-11-02 在 `E:\Repos\dsh-chat-improve` 运行 `node .research/validate-skill.mjs "skills\dsh-mermaid-charts\SKILL.md"`；原因：终端输出无可分享链接〕
- 坏例使用 `text` 围栏，不进入 parse 统计；好例使用 `mermaid` 围栏，保证验证脚本只检查应通过的源。〔来源：[SKILL.md:283-305](../../skills/dsh-mermaid-charts/SKILL.md#L283-L305)〕
- 中文矩阵的结论来自当前 11.17.2 的复测：`requirement`/`venn`/`wardley`/`xychart` 加引号通过，`radar`/`sankey` 加不加都失败。〔来源：无链接：复测输出；定位：2026-11-02 运行 `.research/parse-matrix.mjs`，Mermaid 11.17.2；原因：终端输出无可分享链接〕
- 既有 16 类验收的尺寸和 `foreignObject=0` 见 Step 9 表；本步没有重新跑浏览器 gallery。〔来源：[step-09-docs-and-verification.md:29-50](step-09-docs-and-verification.md#L29-L50)〕

## 问题与限制

- 第一次验证命令用 PowerShell 反引号包路径，输出为空且退出码 1；改成普通双引号后 17 条全部通过。后续命令不要用反引号包 Windows 路径。〔来源：无链接：命令输出；定位：2026-11-02 首次运行 `validate-skill.mjs`；原因：终端输出无可分享链接〕
- `xychart` 的中文 title/categories 必须加引号；不加引号会 parse 失败，虽然最终模板只用了英文 categories。〔来源：[SKILL.md:314-329](../../skills/dsh-mermaid-charts/SKILL.md#L314-L329)〕
- `radar-beta` 的 axis/curve 和 `sankey` 的节点名即使加引号也不接受中文；这条比 Step 9 的“全部 ASCII”更窄，也比“引号可救所有类型”更准确。〔来源：[SKILL.md:314-329](../../skills/dsh-mermaid-charts/SKILL.md#L314-L329)〕
- `%%{init}%%` 的 `plotColorPalette` 没有生效，根因仍未定位；技能里只写成“不要依赖，先真实 render”，没有写成可用方案。〔来源：[SKILL.md:350-353](../../skills/dsh-mermaid-charts/SKILL.md#L350-L353)〕
- 16 类模板只验证了 parse，没有重新跑 Edge 渲染；视觉质量仍按 Step 9 的已知限制处理。〔来源：[step-09-docs-and-verification.md:54-58](step-09-docs-and-verification.md#L54-L58)〕

## 可复用经验

- 验证技能里的 Mermaid 示例时，只提取 `mermaid` 围栏；坏例改用 `text`，否则“故意失败”的示例会污染结果。〔来源：[SKILL.md:283-305](../../skills/dsh-mermaid-charts/SKILL.md#L283-L305)〕
- 用 `.research/figure/final/*.mmd` 作为模板源，逐条复制而不是凭记忆重写；模板已经过插件的 strict 配置验收。〔来源：[step-09-docs-and-verification.md:29-50](step-09-docs-and-verification.md#L29-L50)〕
- 中文标签矩阵按“类型 + 字段 + 是否加引号”记录，比“某类型支持中文”更可执行。〔来源：[SKILL.md:314-329](../../skills/dsh-mermaid-charts/SKILL.md#L314-L329)〕

## 下一步

Step 11：新增 `scripts/setup-skill-sync.ps1` 和 `scripts/git-hooks/pre-push`，建 `.dsh/skills` junction，更新 `.gitignore`，然后提交并写 Step 11 日志。〔来源：[README.md:12-37](../../skills/README.md#L12-L37)〕

## 来源

- [SKILL.md:1-464](../../skills/dsh-mermaid-charts/SKILL.md#L1-L464)：技能正文、关键字表、模板、边界案例、插件附录、验证和限制。
- [README.md:1-47](../../skills/README.md#L1-L47)：项目技能目录、junction 与两仓契约。
- [step-09-docs-and-verification.md:29-50](step-09-docs-and-verification.md#L29-L50)：16 类验收尺寸与渲染结果。
- [step-09-docs-and-verification.md:54-58](step-09-docs-and-verification.md#L54-L58)：Desktop/视觉验收限制。
- 无链接：命令输出；定位：2026-11-02 的 `validate-skill.mjs` 运行，17 条 OK，退出码 0；原因：终端输出无可分享链接。
- 无链接：复测输出；定位：2026-11-02 的 `.research/parse-matrix.mjs`，Mermaid 11.17.2；原因：终端输出无可分享链接。
