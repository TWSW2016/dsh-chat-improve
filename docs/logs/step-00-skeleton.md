---
title: "Step 0 — 插件骨架与首次安装"
created: 2026-11-01
updated: 2026-11-01
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/dsh-plugin"]
git_branch: "main"
---

# Step 0 — 插件骨架与首次安装

## 目标

建立单仓库插件骨架，产出可安装的 profile bundle，确认 Loader 行存在，为后续设置、Mermaid、用户消息与输入框渲染提供入口。实施计划见 [implementation-plan.md:1-60](../plans/implementation-plan.md#L1-L60)。

## 已完成

- 在 `E:\Repos\dsh-chat-improve` 执行 `git init -b main`，仓库分支为 `main`。〔来源：无链接：命令输出；定位：2026-11-01 会话；原因：终端输出无可分享链接〕
- `package.json` 声明包名 `dsh-chat-improve`、版本 `0.1.0`、`dsh.bundle.patch`、`dsh.client`（web）以及 `./client`、`./locale/*.json`、`./icon` 导出。〔来源：[package.json:1-45](../../package.json#L1-L45)〕
- `cordis.patch.yml` 插入一条 Host 行，行 id 与包名均为 `dsh-chat-improve`。〔来源：[cordis.patch.yml:5-7](../../cordis.patch.yml#L5-L7)〕
- Host 半只有空 `apply`，不注册工具、提示词或会话事件。〔来源：[index.js:11-13](../../src/index.js#L11-L13)〕
- Client 半注册 `chat-improve` 的 en/zh 文案，并全部包在 `ctx.effect` 中，禁用插件时自动撤销。〔来源：[client.js:10-23](../../src/client.js#L10-L23)〕
- 构建脚本用 esbuild 把 `src/client.js` 打成 CommonJS，再包进 `window.__ModuleLoader__.load({ id, factory(require) })`；React、ui-primitives、ui-slots、ui-conversation、Cordis 作为 shell 基线外部依赖。〔来源：[build.mjs:1-30](../../scripts/build.mjs#L1-L30)〕
- `.research/`、`node_modules/`、`lib/` 不进入版本库；`lib/` 在安装前由 `npm run build` 生成。〔来源：[.gitignore:1-5](../../.gitignore#L1-L5)〕
- 插件图标为原创 SVG，中英文案写入 `locale/en.json` 与 `locale/zh.json`。〔来源：[icon.svg:1-7](../../icon.svg#L1-L7)，[zh.json:1-5](../../locale/zh.json#L1-L5)〕

## 运行记录

- `npm install` 安装 53 个包，耗时 29 秒，退出码 0。〔来源：无链接：命令输出；定位：2026-11-01，工作目录 `E:\Repos\dsh-chat-improve`；原因：终端输出无可分享链接〕
- `npm run build` 输出 `dsh-chat-improve 0.1.0: lib/client.js 1.4 KiB`；`node --check lib/client.js` 退出码 0。〔来源：无链接：命令输出；定位：2026-11-01，工作目录 `E:\Repos\dsh-chat-improve`；原因：终端输出无可分享链接〕
- `plugin_manager install_bundle` 返回 `application: applied`、`bundle: dsh-chat-improve`、`version: 0.1.0`、`warnings: []`。〔来源：无链接：plugin_manager 工具结果；定位：2026-11-01 会话；原因：工具输出无可分享链接〕
- profile `package.json` 中出现 `dsh-chat-improve: link:E:/Repos/dsh-chat-improve`，并把它加入 `dsh.profile.bundles` 末尾；`node_modules\dsh-chat-improve` 是指向仓库的 Junction。〔来源：无链接：profile 文件；定位：`C:\Users\wxxac\.dsh\profiles\desktop\package.json` 与 `C:\Users\wxxac\.dsh\profiles\desktop\node_modules\dsh-chat-improve`；原因：材料位于仓库外〕
- `Config.listConfigs` 查询到条目 `include:dsh-chat-improve`，`status: absent`，即当前没有 Config schema。〔来源：无链接：cordis_inspect_query 结果；定位：2026-11-01 会话；原因：工具输出无可分享链接〕

## 问题与限制

- 🚧 Client 半的可视验证尚未完成。Step 0 只注册了 locale，没有可见贡献；输入框与消息侧的真实 GUI 验证留到 Step 2、Step 3。〔来源：无链接：Step 0 设计；定位：本文件“已完成”与实施计划步骤表；原因：会话无可分享链接〕
- ⚠️ `status: absent` 是预期结果，不是安装失败；Step 1 会声明 Config schema 并重新核对。〔来源：[index.js:11-13](../../src/index.js#L11-L13)〕
- ⚠️ 构建产物 `lib/` 被忽略，安装前必须执行 `npm run build`，否则 `./client` 导出缺失导致客户端行加载失败。〔来源：[package.json:7-13](../../package.json#L7-L13)，[.gitignore:1-5](../../.gitignore#L1-L5)〕
- ⚠️ 本地 profile 通过 Junction 链接仓库，改动源码后要重新构建并刷新页面；HMR 是否自动替换本次未验证。〔来源：无链接：profile 链接事实；定位：`C:\Users\wxxac\.dsh\profiles\desktop\node_modules\dsh-chat-improve` 为 Junction；原因：材料位于仓库外〕

## 下一步

Step 1：在 Host 半声明 Config（输入框渲染、Mermaid、用户消息 Markdown、Mermaid 源码上限），在 Client 半通过 `configForms` 读取并提供默认值；验证刷新后开关保持。〔来源：[implementation-plan.md:44-46](../plans/implementation-plan.md#L44-L46)〕

## 来源

- [package.json:1-45](../../package.json#L1-L45)：包名、版本、导出、`dsh.client` 与脚本。
- [cordis.patch.yml:5-7](../../cordis.patch.yml#L5-L7)：Host 行插入。
- [index.js:11-13](../../src/index.js#L11-L13)：Host 半空 apply。
- [client.js:10-23](../../src/client.js#L10-L23)：Client locale 注册。
- [build.mjs:1-30](../../scripts/build.mjs#L1-L30)：构建与外部依赖。
- [.gitignore:1-5](../../.gitignore#L1-L5)：忽略规则。
- [icon.svg:1-7](../../icon.svg#L1-L7) 与 [zh.json:1-5](../../locale/zh.json#L1-L5)：图标与文案。
- [implementation-plan.md:1-60](../plans/implementation-plan.md#L1-L60)：实施计划与步骤表。
- [implementation-plan.md:44-46](../plans/implementation-plan.md#L44-L46)：Step 1 目标。
- 无链接：命令输出；定位：2026-11-01，工作目录 `E:\Repos\dsh-chat-improve`；原因：终端输出无可分享链接。
- 无链接：plugin_manager 工具结果；定位：2026-11-01 会话；原因：工具输出无可分享链接。
- 无链接：profile 文件；定位：`C:\Users\wxxac\.dsh\profiles\desktop\package.json`；原因：材料位于仓库外。
- 无链接：cordis_inspect_query 结果；定位：2026-11-01 会话；原因：工具输出无可分享链接。
- 无链接：Step 0 设计；定位：本文件与实施计划；原因：会话无可分享链接。
- 无链接：profile 链接事实；定位：`C:\Users\wxxac\.dsh\profiles\desktop\node_modules\dsh-chat-improve` 为 Junction；原因：材料位于仓库外。
