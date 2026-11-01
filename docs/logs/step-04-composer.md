---
title: "Step 4 — 输入框实时行内渲染"
created: 2026-11-01
updated: 2026-11-01
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/dsh-plugin"]
git_branch: "main"
---

# Step 4 — 输入框实时行内渲染

## 目标

在真实 Lexical 输入框内渲染行内 Markdown，同时保留源码、光标、输入法、引用 chip 与发送；光标所在行显示源码，失焦后恢复渲染。〔来源：[implementation-plan.md:47-48](../plans/implementation-plan.md#L47-L48)〕

## 实现

- 从 `[data-composer-input].__lexicalEditor` 取得 Lexical 实例，从实例的 `_nodes` 取 `text` 节点类；不需要替换编辑器或新增节点类型。〔来源：[index.js:1-35](../../src/composer/index.js#L1-L35)〕
- 每次编辑器更新后运行一次格式化：遍历段落，按 `linebreak` 分行，光标所在行只揭示、其余行格式化；失焦时整篇格式化。〔来源：[format.js:100-210](../../src/composer/format.js#L100-L210)〕
- 每个语法构造拆成“开标记 / 正文 / 闭标记”三个文本节点；样式里带 `--dsh-ci-run`、`--dsh-ci-kind`、`--dsh-ci-marker`、`--dsh-ci-active`，用自定义属性记录运行身份与显示状态，避免反复 setStyle 造成循环。〔来源：[format.js:33-95](../../src/composer/format.js#L33-L95)〕
- 光标行用同一套运行身份把标记 reveal（去掉 `display:none`、去掉正文视觉样式），不合并节点、不改文本、不重映射选区。〔来源：[format.js:170-215](../../src/composer/format.js#L170-L215)〕
- 支持行内代码、`**`/`__`、`*`/`_`、`~~`、`[文字](url)`、`#` 标题、`-`/`*`/`+` 无序列表与 `1.` 有序列表；列表圆点用零宽背景点，序号保留数字、只隐藏点号。〔来源：[scan.js:21-120](../../src/composer/scan.js#L21-L120)，[format.js:33-95](../../src/composer/format.js#L33-L95)〕
- 含 `@` 的行与以 `/` 开头的行跳过格式化，避免与 DSH 的引用 chip、斜杠菜单变换冲突。〔来源：[format.js:220-245](../../src/composer/format.js#L220-L245)〕
- 输入法合成期间跳过；任何异常都会注销格式化并回退纯文本（fail-open）。〔来源：[format.js:150-175](../../src/composer/format.js#L150-L175)〕
- 设置关闭时 disposer 清掉所有运行样式并恢复普通文本；重新打开时先跑一次初始 pass。〔来源：[format.js:190-215](../../src/composer/format.js#L190-L215)，[client.js:100-118](../../src/client.js#L100-L118)〕

## 验证

真实 GUI 使用 web profile（`http://127.0.0.1:3099`）与已安装 Chrome（headless）：

- 多行草稿 `**bold** and \`code\` and *em* and ~~gone~~ / - bullet item / 1. ordered item / ## heading / last line`：隐藏标记 10 个（`**`、反引号、`*`、`~~`、`.`、`##`），代码正文有等宽背景，列表圆点存在，标题字号 1.08em，粗体、斜体、删除线各就位；最后一行保持源码。〔来源：无链接：浏览器验证结果；定位：`.research/verify/composer-report.json` 与 `composer.png`；原因：验证产物未提交〕
- 点击代码正文后：代码样式与粗体、斜体、删除线消失，只隐藏 `.` 与 `##`，输入 `!` 插入到代码正文中，文本变为 `` `co!de` ``；失焦后标记重新隐藏、代码样式恢复。〔来源：无链接：浏览器验证结果；定位：`.research/verify/composer-report.json`、`composer-revealed.png`；原因：验证产物未提交〕
- 链接 `[docs](https://example.com)`：隐藏 `[` 与 `](https://example.com)`，正文有下划线；`@file` 行不被格式化。〔来源：无链接：浏览器验证结果；定位：`.research/verify/composer-report.json`；原因：验证产物未提交〕
- 中文输入法：CDP `Input.imeSetComposition` 合成“中文”后提交，文本正确，隐藏标记与代码样式不变，控制台零错误。〔来源：无链接：浏览器验证结果；定位：`.research/verify/composer-ime.mjs`；原因：验证产物未提交〕
- 撤销：多行草稿格式化后 `Ctrl+Z` 删除的是后输入的文字，格式化样式保留，未出现额外的“只撤销样式”步骤。〔来源：无链接：浏览器验证结果；定位：`.research/verify/composer-safety-report.json`；原因：验证产物未提交〕
- 发送：格式化草稿按 Enter 发送后输入框清空，消息进入会话；发送文本未受样式影响。〔来源：无链接：浏览器验证结果；定位：`.research/verify/composer-send.png`；原因：验证产物未提交〕
- 开关：关闭“在输入框内渲染 Markdown”后隐藏标记 0、代码样式 0；重新打开后恢复为隐藏 2、代码样式 1，文本始终不变。〔来源：无链接：浏览器验证结果；定位：`.research/verify/composer-toggle-report.json`；原因：验证产物未提交〕
- `npx vitest run`：5 个测试文件、39 个测试全部通过，其中扫描与分段 9 个。〔来源：[composer-scan.test.js:1-79](../../tests/composer-scan.test.js#L1-L79)〕〔来源：无链接：命令输出；定位：2026-11-01，工作目录 `E:\Repos\dsh-chat-improve`；原因：终端输出无可分享链接〕

## 问题与限制

- ⚠️ 只做行内与行级前缀：代码块、表格、图片、公式在输入框内仍为原文；围栏行不会被渲染成代码卡片。〔来源：[format.js:33-95](../../src/composer/format.js#L33-L95)〕
- ⚠️ 光标行整行显示源码；用鼠标点入已渲染行会 reveal，但方向键能否跨行移动取决于 DSH 自身的 keymap，本次未证明所有方向键路径都会触发 reveal。〔来源：[format.js:200-215](../../src/composer/format.js#L200-L215)〕
- ⚠️ 列表没有悬挂缩进：换行回到行首；无序列表圆点用背景点替换标记，序号只隐藏点号。〔来源：[format.js:33-95](../../src/composer/format.js#L33-L95)〕
- ⚠️ 含 `@` 的行与 `/` 开头的行不做格式化；这是为避免破坏引用 chip 与命令菜单的保守策略。〔来源：[format.js:220-245](../../src/composer/format.js#L220-L245)〕
- ⚠️ 依赖 Lexical 内部字段（`__lexicalEditor`、`_nodes`、`_pendingEditorState`）；版本升级可能失效，fail-open 会停止格式化而不会坏文本。〔来源：[index.js:1-35](../../src/composer/index.js#L1-L35)〕
- 🚧 长草稿性能未测量；每次更新会遍历全部文本节点，10k 字符以上需要补测。〔来源：无链接：验证缺口；定位：本文件“验证”节；原因：会话无可分享链接〕
- 🚧 Desktop 窗口未重复断言；Web GUI 与 Desktop 加载同一份 `lib/client.js`。〔来源：无链接：验证缺口；定位：本文件“验证”节；原因：会话无可分享链接〕

## 下一步

Step 5：硬化。补测长草稿性能、无障碍标签、i18n、打包与卸载残留；随后 Step 6 做安装与卸载验收并记录 Desktop 行为。〔来源：[implementation-plan.md:48-50](../plans/implementation-plan.md#L48-L50)〕

## 来源

- [index.js:1-35](../../src/composer/index.js#L1-L35)：编辑器获取与重绑。
- [scan.js:21-120](../../src/composer/scan.js#L21-L120)：行内扫描与行前缀。
- [format.js:33-95](../../src/composer/format.js#L33-L95)：分段与圆点。
- [format.js:100-215](../../src/composer/format.js#L100-L215)：更新监听、reveal、初始 pass、清理。
- [format.js:220-245](../../src/composer/format.js#L220-L245)：跳过 `@`/`/` 行。
- [client.js:100-118](../../src/client.js#L100-L118)：设置开关与生命周期。
- [composer-scan.test.js:1-79](../../tests/composer-scan.test.js#L1-L79)：扫描与分段测试。
- [implementation-plan.md:47-50](../plans/implementation-plan.md#L47-L50)：Step 4 至 Step 6 目标。
- 无链接：浏览器验证结果；定位：`.research/verify/composer-report.json`、`composer.png`、`composer-revealed.png`、`composer-send.png`、`composer-toggle-report.json`；原因：验证产物未提交。
- 无链接：命令输出；定位：2026-11-01，工作目录 `E:\Repos\dsh-chat-improve`；原因：终端输出无可分享链接。
- 无链接：验证缺口；定位：本文件“问题与限制”节；原因：会话无可分享链接。


