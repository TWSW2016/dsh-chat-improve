---
title: "Improve 上下文修复步骤 4：构建、Host 重载与真实验收"
created: 2026-11-03
updated: 2026-11-03
log_deai_profile: "agent"
log_deai_version: "1.0.0-rc.1"
tags: ["log-deai", "project/dsh-chat-improve", "type/progress", "topic/improve-by-ai"]
git_branch: "main"
---

# Improve 上下文修复步骤 4：构建、Host 重载与真实验收

## 目标与范围

步骤 4 不改业务代码，只做构建、Host 半重载、路由与真实 GUI 验收，并把结果写进验收记录。判据是：单测与构建通过；重载后真实路由返回 200；真实 GUI 点击后草稿被替换；结果带入项目名与分支，不出现 unknown、待确认、TBD。

## 执行

1. `npm test`：16 个文件、150 例通过。〔来源：无链接：本会话命令输出；定位：2026-11-03 20:22，退出码 0；原因：终端输出无可分享链接〕
2. `npm run build`：`lib/client.js` 3415.0 KiB，退出码 0。〔来源：无链接：本会话命令输出；定位：2026-11-03 20:23，退出码 0；原因：终端输出无可分享链接〕
3. 用 `plugin_manager set_plugin target=include:dsh-chat-improve` 关→开，两次 `application: applied`、`warnings: []`，Host 半重新加载。〔来源：无链接：本会话 plugin_manager 返回值；定位：2026-11-03 20:24；原因：运行时数据无文件〕
4. 用 `dsh web` 启动日志里的 token 建立 cookie，再带 `Origin: http://127.0.0.1:3080` 调 `POST /chat-improve/rewrite`。三条草稿都返回 HTTP 200：〔来源：无链接：本会话 curl 输出；定位：2026-11-03 20:26；原因：终端输出无可分享链接〕
   - `把这个项目的 Improve 上下文补一下，当前分支上改`：结果以“在 dsh-chat-improve（仓库根目录 …，当前分支 main）上补齐 Improve by AI 的上下文”开头，未出现 unknown、待确认、TBD。
   - `只改 host，不要动 UI；改完告诉我。`：结果保留“只改 Host 侧代码，不要动 UI”和“改完后告诉我”的约束。
   - `make the settings page less confusing`：结果以“In dsh-chat-improve (branch main)”带入分支，没有 Project/Branch 头部。
5. 运行 `DSH_VERIFY_CHROME=/usr/bin/google-chrome node scripts/verify-improve.mjs`：按钮存在、改写替换、还原、失败保留草稿、关闭开关后按钮为 0；引用 chip 未能构造，确认条未触发。〔来源：[verify-improve.mjs:1-166](../../scripts/verify-improve.mjs#L1-L166)、无链接：本会话 GUI 产物；定位：`.research/verify-step4/improve-report.redacted.json`；原因：验证产物未提交〕
6. 运行真实 GUI 脚本：写入“把这个项目的 Improve 上下文补一下，当前分支上改”，点击按钮，等待“已改写”，读取草稿；结果包含 `dsh-chat-improve` 与 `main`，`badMarkers` 为空，console 无 error。〔来源：无链接：本会话真实 GUI 输出；定位：`.research/verify-step4/real-improve-output.txt`、`real-improve-ready.png`；原因：验证产物未提交〕
7. 更新 `docs/verification.md`：把四条“待交互验收”改成实际结果，新增工作区上下文、约束保留、英文草稿三行，并更新版本与分支属性。〔来源：[verification.md:48-56](../verification.md#L48-L56)〕

## 结果

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 全量单测 | 通过 | 16 文件 150 例，退出码 0 |
| 构建 | 通过 | `lib/client.js` 3415.0 KiB，退出码 0 |
| Host 重载 | 通过 | 关→开均 `application: applied`，无 warning |
| 真实路由 | 通过 | 三条草稿均 HTTP 200 |
| 工作区事实 | 通过 | 输出含 `dsh-chat-improve` 与 `main` |
| 占位行 | 未出现 | 真实输出不含 unknown、待确认、TBD |
| 约束保留 | 通过 | “只改 host，不要动 UI；改完告诉我”保留 |
| GUI 改写与还原 | 通过 | 替换、提示条、还原均正常 |
| GUI 失败回退 | 通过 | 502 时草稿不变，出现重试 |
| GUI 开关 | 通过 | 关闭后按钮数量 0 |
| 引用闸门 | 未覆盖 | composer 状态下未构造出引用 chip |

本轮验收覆盖的实现是工作区简报、prompt 契约与路由接线。〔来源：[context.js:1-250](../../src/host/context.js#L1-L250)、[prompt.js:26-81](../../src/host/prompt.js#L26-L81)、[rewrite.js:10-180](../../src/host/rewrite.js#L10-L180)〕

## 问题与限制

- 引用闸门仍未覆盖：`@` 引用 chip 在当前 headless composer 状态下没有构造出来，确认条分支没有被触发。这是既有验证缺口，不是本次改动引入的。
- GUI stub 的 console 有一条 502 error，来源是故意注入的失败响应；真实 GUI 验收的 console 没有 error。
- 真实模型输出不具确定性；本轮三条草稿都符合预期，但不能据此保证所有草稿都不出现占位行。prompt 规则与 few-shot 已尽量约束，Host 侧没有做输出后处理。
- 只验证了 Web GUI，没有断言 Desktop 窗口；两者共用同一份 `lib/client.js`，Host 半相同。
- 验收用的 token 化 URL 只从 `dsh web` 日志读取，没有写入日志或仓库；`.research/verify-step4/improve-report.json` 中的 URL 已删除 `url` 字段，保留脱敏报告。
- Host 重载通过关→开插件完成，最终状态为启用；过程中没有卸载或重装插件。

## 可复用经验

- 真实路由验证比 stub 更有价值：用 `dsh web` 日志里的 token 先请求 `/?token=…` 建立 cookie，再带 `Origin` 调 `POST`，可以直接观察模型输出。
- 真实 GUI 验证要同时检查 `badMarkers` 与 console error；只看提示条“已改写”会漏掉内容质量回归。
- 验证报告里的 token 必须脱敏；脚本默认把完整 URL 写进 JSON，验收后要删除或 `jq 'del(.url)'`。
- 插件 Host 半改完后，用 `plugin_manager` 关→开比重启 `dsh web` 影响小，也能让 Loader 重新 import。

## 涉及文件

- `docs/verification.md`
- 本日志
- 验证产物：`.research/verify-step4/`（未提交）

## 下一步

步骤 5 更新设计计划 R3/R4/R8、README 的 stateless 说明与隐私段落，补最终回归，写收尾日志并提交。

## 来源

- [verification.md:48-56](../verification.md#L48-L56)：本轮验收行与说明。
- [context.js:1-250](../../src/host/context.js#L1-L250)、[prompt.js:26-81](../../src/host/prompt.js#L26-L81)、[rewrite.js:10-180](../../src/host/rewrite.js#L10-L180)：被验收的实现。
- [verify-improve.mjs:1-166](../../scripts/verify-improve.mjs#L1-L166)：GUI 验收脚本。
- 无链接：本会话命令输出；定位：2026-11-03 20:22 至 20:23 的 `npm test` 与 `npm run build`，退出码 0；原因：终端输出无可分享链接。
- 无链接：本会话真实路由输出；定位：2026-11-03T20:26 的三次 `curl` 调用；原因：终端输出无可分享链接。
- 无链接：本会话 curl 输出；定位：2026-11-03T20:26 的三次 `POST /chat-improve/rewrite` 响应；原因：终端输出无可分享链接。
- 无链接：本会话真实 GUI 输出；定位：`.research/verify-step4/real-improve-output.txt`、`real-improve-ready.png`；原因：验证产物未提交。
- 无链接：本会话 plugin_manager 返回值；定位：2026-11-03T20:24 的关→开两次；原因：运行时数据无文件。
