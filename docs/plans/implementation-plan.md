---
title: "dsh-chat-improve 实施计划"
created: 2026-11-01
updated: 2026-11-01
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/decision", "topic/dsh-plugin"]
git_branch: "main"
---

# dsh-chat-improve 实施计划

## 目标

在 DSH 0.2.1-rc.5 及以上的 Desktop 与本机 Web GUI 上，不改 core、不改模型输入、不写会话数据，提升聊天界面的呈现。交付一个可安装、可卸载的 profile 插件，包含输入框实时行内渲染、聊天记录 Mermaid、用户消息 Markdown 与三个开关。〔来源：无链接：用户决策；定位：2026-11-01 本会话批准消息；原因：会话无可分享链接〕

## 范围

| 项 | 内容 |
| --- | --- |
| S1 输入框 | 行内代码、粗体、斜体、删除线、链接、标题文字级样式、无序与有序列表标记；光标行显示源码；输入法合成期跳过；异常 fail-open。〔来源：无链接：用户决策；定位：2026-11-01“agree with option a ... not require table and code block”；原因：会话无可分享链接〕 |
| S2 聊天记录 | Mermaid 围栏渲染为 SVG，strict 安全、跟随主题、源码切换、失败回退、缓存。〔来源：无链接：用户决策；定位：2026-11-01 第 2 批问题 4A；原因：会话无可分享链接〕 |
| S3 用户消息 | 用户消息按 Markdown 渲染，保留换行，可关闭。〔来源：无链接：用户决策；定位：2026-11-01“6. option b. can be turn on / off in the setting”；原因：会话无可分享链接〕 |
| S4 设置 | 输入框渲染、Mermaid、用户消息 Markdown 三个开关，默认开启，Host 持久化。〔来源：无链接：用户决策；定位：2026-11-01 第 2 批问题 6A；原因：会话无可分享链接〕 |
| S5 交付 | 单仓库、profile bundle、图标、中英文案、卸载无残留。〔来源：无链接：用户决策；定位：2026-11-01“just use this project to develop”；原因：会话无可分享链接〕 |

不做：图片内联（已原生）、raw HTML、输入框内 LaTeX、表格与代码块卡片、撤回并重发、Agents Anywhere 适配、npm 发布。〔来源：无链接：用户决策；定位：2026-11-01“formula is also planned in the future”“not core change right now”；原因：会话无可分享链接〕

## 关键决策

- 仓库就用当前目录 `E:\Repos\dsh-chat-improve`，`.research/` 不提交。〔来源：无链接：用户决策；定位：2026-11-01“just use this project to develop”；原因：会话无可分享链接〕
- 输入框采用 Lexical 内部变换，不接管编辑器、不加第二面板；失败则只交付消息侧。〔来源：无链接：用户决策；定位：2026-11-01“option a”；原因：会话无可分享链接〕
- Mermaid 采用最严安全档位：`securityLevel:'strict'`、`htmlLabels:false`、禁 click、拒绝图内远程图片、大小与边数上限。〔来源：无链接：用户决策；定位：2026-11-01 第 2 批问题 4A；原因：会话无可分享链接〕
- 撤回并重发留给未来 DSH 核心能力，不用 fork 模拟。〔来源：无链接：用户决策；定位：2026-11-01“This requirement should be implemented in the future version of dsh”；原因：会话无可分享链接〕

## 实施步骤

| 步 | 内容 | 完成判据 |
| --- | --- | --- |
| 0 | 仓库骨架、manifest、patch、图标、文案、构建脚本、首次安装 | 插件行存在、Host 侧可查询、构建产物可解析 |
| 1 | 设置管道：Config、客户端读取、默认值 | 开关持久化，刷新后生效 |
| 2 | Mermaid：识别、校验、渲染、主题、缓存、错误回退 | 真实 GUI 四个样例通过 |
| 3 | 用户消息 Markdown，含换行与开关 | 真实 GUI 显示正确，关闭还原 |
| 4 | 输入框 spike：行内代码，再粗斜/链接/标题/列表 | 中文输入法、光标、撤销、chip、斜杠菜单、发送不回归 |
| 5 | 硬化：长草稿性能、无障碍、i18n、打包检查 | 长草稿无可感卡顿，控制台零错误 |
| 6 | 安装与卸载验收，Desktop 与 Web 记录 | 验收清单全绿，卸载后 UI 还原 |

步骤 4 失败时的回退：不交付输入框渲染，只保留消息侧，并把上游 seam 需求写入文档。〔来源：无链接：用户决策；定位：2026-11-01“spike 失败就只交付消息侧”；原因：会话无可分享链接〕

## 主要风险

- Lexical 内部 API 随版本变化，变换可能破坏光标或输入法；用开关与 fail-open 控制影响。〔来源：[README.md:36-37](../../README.md#L36-L37)〕
- Mermaid 引擎体积约 3.6 MB，可能拖慢首屏；先内联并测量，超阈值改懒加载。〔来源：无链接：mermaid 发行包；定位：`C:\Users\wxxac\.dsh\profiles\desktop\node_modules\mermaid\dist\mermaid.min.js`，3572661 字节；原因：材料位于仓库外〕
- 聊天 DOM 结构在升级中变化会导致 Mermaid 不渲染；选择器限定在 `_markdown_` 根与 `.md-code-block`，失败时 no-op。〔来源：无链接：用户决策；定位：2026-11-01 第 2 批问题 3A；原因：会话无可分享链接〕

## 来源

- 无链接：用户决策；定位：2026-11-01 本会话消息；原因：会话无可分享链接。
- [README.md:1-37](../../README.md#L1-L37)：插件结构、构建与安装说明。
- 无链接：mermaid 发行包；定位：`C:\Users\wxxac\.dsh\profiles\desktop\node_modules\mermaid\dist\mermaid.min.js`，3572661 字节；原因：材料位于仓库外。
