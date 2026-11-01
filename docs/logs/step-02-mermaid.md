---
title: "Step 2 — 聊天记录 Mermaid 渲染"
created: 2026-11-01
updated: 2026-11-01
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/dsh-plugin"]
git_branch: "main"
---

# Step 2 — 聊天记录 Mermaid 渲染

## 目标

把聊天记录里的 mermaid 围栏渲染成 SVG，保留源码复制与切换，失败时保留源码；安全档位采用 strict，主题跟随 DSH token。〔来源：[implementation-plan.md:45-46](../plans/implementation-plan.md#L45-L46)〕

## 实现

- 识别不依赖代码块语言标签（`mermaid` 不在 Shiki 语言表中，聊天头部会显示“代码”）；读取首个有效行，匹配 Mermaid 11 的图类型关键字，跳过 `%%` 注释与指令。〔来源：[detect.js:48-58](../../src/mermaid/detect.js#L48-L58)〕
- 渲染前统一换行并去掉尾部空白；再交给 `mermaid.parse` 校验，解析失败不替换 DOM。〔来源：[detect.js:66-68](../../src/mermaid/detect.js#L66-L68)，[engine.js:51-54](../../src/mermaid/engine.js#L51-L54)〕
- Mermaid 模块用动态 `import()` 懒加载，首次出现图表时才执行引擎初始化。〔来源：[engine.js:13-16](../../src/mermaid/engine.js#L13-L16)〕
- 渲染串行化：一个 Promise 队列保证全局 parser 与临时 DOM 不被并发踩踏；每次用唯一 id，并在 `finally` 清理 `#d<id>` 残留。〔来源：[engine.js:27-31](../../src/mermaid/engine.js#L27-L31)，[engine.js:56-63](../../src/mermaid/engine.js#L56-L63)〕
- 安全：`securityLevel:'strict'`、`htmlLabels:false`、禁 click、`maxEdges:500`，源码上限取设置值；SVG 再经一次清洗，移除 `script`、`foreignObject`、`on*` 与 `javascript:`/`data:` 链接。〔来源：[engine.js:35-49](../../src/mermaid/engine.js#L35-L49)，[engine.js:66-90](../../src/mermaid/engine.js#L66-L90)〕
- 主题：从 14 个 `--dsw-alias-*` 语义 token 生成 `themeVariables`，并把字体与字号一并带入；缓存键包含主题快照。〔来源：[theme.js:40-52](../../src/mermaid/theme.js#L40-L52)，[theme.js:59-61](../../src/mermaid/theme.js#L59-L61)〕
- DOM 增强：MutationObserver 监听 body，250 ms 去抖；只处理 `_markdown_` 根下、非 `[data-streaming]` 中的 `.md-code-block`，按源码长度过滤。〔来源：[enhance.js:47-68](../../src/mermaid/enhance.js#L47-L68)，[enhance.js:82-98](../../src/mermaid/enhance.js#L82-L98)〕
- 渲染成功后把面板追加到 `[data-code-block-content]`，隐藏原 `<pre>`（复制按钮仍读到源码）；失败面板保留 `<pre>` 并提供重试；主题变化时清缓存、恢复源码并重扫。〔来源：[enhance.js:107-127](../../src/mermaid/enhance.js#L107-L127)，[enhance.js:142-187](../../src/mermaid/enhance.js#L142-L187)〕
- 面板带“源码/图表”切换与 `role="img"` 标签；所有颜色取自语义 token。〔来源：[enhance.js:197-225](../../src/mermaid/enhance.js#L197-L225)，[enhance.js:19-36](../../src/mermaid/enhance.js#L19-L36)〕
- `client.js` 在设置开启时启动增强器，设置关闭或插件卸载时 dispose；监听 `theme/change` 刷新主题。〔来源：[client.js:70-95](../../src/client.js#L70-L95)〕
- 构建开启压缩并保留许可证注释；产物 3388.9 KiB，gzip 0.93 MiB。〔来源：[build.mjs:31-43](../../scripts/build.mjs#L31-L43)〕〔来源：无链接：命令输出；定位：2026-11-01 `npm run build`；原因：终端输出无可分享链接〕

## 验证

真实 GUI 验证使用 `web` profile（`http://127.0.0.1:3099`）与已安装 Chrome（headless），由验证脚本执行。〔来源：[verify-web.mjs:1-145](../../scripts/verify-web.mjs#L1-L145)〕

- 页面加载后 `[data-composer-input]` 存在，控制台零错误。〔来源：无链接：浏览器验证结果；定位：`.research/verify/report.json`；原因：验证产物在 `.research/` 内，未提交〕
- 注入一个符合 ui-primitives 结构的围栏块后，`[data-dsh-chat-improve-mermaid]` 出现，SVG 14313 字节、65 个节点，原 `<pre>` 的 `display` 为 `none`，切换按钮文本为“源码”。〔来源：无链接：浏览器验证结果；定位：`.research/verify/report.json` 与 `.research/verify/mermaid-ok.png`；原因：验证产物未提交〕
- 非法图 `flowchart TD / A[Start] -->` 保留源码，显示“Mermaid 渲染失败。重试”。〔来源：无链接：浏览器验证结果；定位：`.research/verify/mermaid-error.png`；原因：验证产物未提交〕
- 设置页导航出现“聊天增强”；切换第一个复选框后 localStorage 写入 `composerLivePreview:false`，再切回。〔来源：无链接：浏览器验证结果；定位：`.research/verify/settings.png` 与 `.research/verify/report.json`；原因：验证产物未提交〕
- `npx vitest run`：3 个测试文件、23 个测试全部通过，其中 Mermaid 检测 4 个、增强器与清洗 9 个。〔来源：无链接：命令输出；定位：2026-11-01，工作目录 `E:\Repos\dsh-chat-improve`；原因：终端输出无可分享链接〕

## 问题与限制

- 🚧 验证用的是**注入的合成代码块**，不是真实模型回复；真实回复的 DOM 结构由同一 ui-primitives 生成，但仍建议在 Desktop 里发一条 mermaid 围栏确认。〔来源：无链接：验证缺口；定位：`.research/verify/report.json`；原因：验证产物未提交〕
- 🚧 Desktop 窗口没有做同样的 DOM 断言；它加载同一份 `lib/client.js`，但桌面渲染进程无法从当前会话驱动。〔来源：无链接：验证缺口；定位：本文件“验证”节；原因：会话无可分享链接〕
- ⚠️ 主题切换只由单元测试覆盖；浏览器验证未切换明暗主题后复查图。〔来源：[mermaid-enhance.test.js:150-160](../../tests/mermaid-enhance.test.js#L150-L160)〕
- ⚠️ 3.39 MiB 的客户端包在页面启动时解析，图表引擎本身延迟到首次渲染；如果后续觉得首屏变慢，再改懒加载 chunk。〔来源：[build.mjs:31-43](../../scripts/build.mjs#L31-L43)〕
- ⚠️ 识别是启发式：其他语言里以 `graph` 等关键字开头的代码块可能被误判；`mermaid.parse` 会挡掉绝大多数误判，面板也提供源码切换。〔来源：[detect.js:43-58](../../src/mermaid/detect.js#L43-L58)〕

## 下一步

Step 3：把用户消息的 `text` 节点替换为 Markdown 渲染，保留换行，开关关闭时回退原文。〔来源：[implementation-plan.md:46-47](../plans/implementation-plan.md#L46-L47)〕

## 来源

- [detect.js:48-58](../../src/mermaid/detect.js#L48-L58) 与 [detect.js:66-68](../../src/mermaid/detect.js#L66-L68)：识别与规范化。
- [engine.js:13-16](../../src/mermaid/engine.js#L13-L16)、[engine.js:27-31](../../src/mermaid/engine.js#L27-L31)、[engine.js:35-49](../../src/mermaid/engine.js#L35-L49)、[engine.js:51-63](../../src/mermaid/engine.js#L51-L63)、[engine.js:66-90](../../src/mermaid/engine.js#L66-L90)：懒加载、队列、严格渲染、清理、清洗。
- [theme.js:40-52](../../src/mermaid/theme.js#L40-L52) 与 [theme.js:59-61](../../src/mermaid/theme.js#L59-L61)：主题变量与缓存键。
- [enhance.js:19-36](../../src/mermaid/enhance.js#L19-L36)、[enhance.js:47-68](../../src/mermaid/enhance.js#L47-L68)、[enhance.js:82-98](../../src/mermaid/enhance.js#L82-L98)、[enhance.js:107-127](../../src/mermaid/enhance.js#L107-L127)、[enhance.js:142-187](../../src/mermaid/enhance.js#L142-L187)、[enhance.js:197-225](../../src/mermaid/enhance.js#L197-L225)：观察、扫描、面板、错误、主题、切换。
- [client.js:70-95](../../src/client.js#L70-L95)：增强器生命周期。
- [build.mjs:31-43](../../scripts/build.mjs#L31-L43)：压缩与外部依赖。
- [verify-web.mjs:1-145](../../scripts/verify-web.mjs#L1-L145)：真实浏览器验证脚本。
- [mermaid-enhance.test.js:150-160](../../tests/mermaid-enhance.test.js#L150-L160)：主题刷新测试。
- [implementation-plan.md:45-47](../plans/implementation-plan.md#L45-L47)：Step 2 与 Step 3 目标。
- 无链接：浏览器验证结果；定位：`.research/verify/report.json`、`mermaid-ok.png`、`mermaid-error.png`、`settings.png`；原因：验证产物未提交。
- 无链接：命令输出；定位：2026-11-01，工作目录 `E:\Repos\dsh-chat-improve`；原因：终端输出无可分享链接。
- 无链接：验证缺口；定位：本文件“问题与限制”节；原因：会话无可分享链接。


