---
title: "用户消息空行修复 Step 3：构建与真实 GUI 复测"
created: 2026-11-02
updated: 2026-11-02
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/verification", "topic/user-message"]
git_branch: "fix/user-message-extra-newline"
---

# 用户消息空行修复 Step 3：构建与真实 GUI 复测

## 交接摘要

- 状态：构建通过，真实 GUI 两例复测通过，新增可复用的只读验证脚本。
- 结果：干净两项列表 86px、2 个块、块后 0 个换行；1/2/3 消息 130px、3 个块、块后 0 个换行。
- 脚本：`scripts/verify-user-newline.mjs`，只读打开现有会话，不发消息。
- 下一步：更新 README 的已知限制，写最终日志并提交；不合并 `main`。
- 约束：分支 `fix/user-message-extra-newline`。

## 目标与请求

用真实 GUI 证明 Step 1 的修复在浏览器里生效，并把测量固化成可复用的脚本。〔来源：[2026-11-02-0354-user-newline-fix-s01.md:1-20](2026-11-02-0354-user-newline-fix-s01.md#L1-L20)〕

## 执行与命令

| 命令 | 工作目录 | 结果 |
| --- | --- | --- |
| `npm run build` | `E:\Repos\dsh-chat-improve` | 退出码 0；`lib/client.js` 3401.6 KiB。 |
| `node scripts/verify-user-newline.mjs`（干净列表） | 同上 | 退出码 0；`pass: true`，86px，2 个块，块后 0 个换行。 |
| 同上（`DSH_VERIFY_TITLE='Input prompt extra newline bug fix plan'`、`DSH_VERIFY_NEEDLE='You can use this as a reference'`、`DSH_VERIFY_MAX_HEIGHT=150`） | 同上 | 退出码 0；`pass: true`，130px，3 个块，块后 0 个换行。 |

两次运行都用本地签发的 `dsh-auth-*` cookie 通过 Web GUI 认证；cookie 只放在环境变量里，未写入仓库。〔来源：无链接：本次浏览器验证；定位：.research/verify/user-newline-verify.json、user-newline-verify.png；原因：.research/ 未提交〕

## 结果与证据

- 脚本接受 `DSH_VERIFY_URL`、可选的 `DSH_VERIFY_COOKIE`、会话标题、气泡关键词与最大高度；没有 cookie 时按已认证 URL 处理。〔来源：[verify-user-newline.mjs:20-45](../../scripts/verify-user-newline.mjs#L20-L45)〕
- 会话定位先看标题是否已可见，避免点击已选中的工作区导致列表折叠；需要时再点“加载更早”。〔来源：[verify-user-newline.mjs:64-80](../../scripts/verify-user-newline.mjs#L64-L80)〕
- 判定不是看 `innerText`（块级元素本身会贡献换行），而是看每个块级 span 的 `nextSibling` 是否是非空文本 `'\n'`；这个指标直接对应当前 bug。〔来源：[verify-user-newline.mjs:86-105](../../scripts/verify-user-newline.mjs#L86-L105)〕
- 干净列表 HTML 中两个 `display:block` span 直接相邻，中间没有 `'\n'` 文本节点；1/2/3 消息的三个列表项同样相邻，header 后保留源文本自带的一行空行。〔来源：无链接：本次浏览器验证；定位：.research/verify/user-newline-verify.json；原因：.research/ 未提交〕

## 问题与经验

- 首次运行报 `TypeError: URL is not a constructor`：脚本把环境变量命名成 `URL`，遮蔽了 Node 的全局 `URL`，随后 `new URL(TARGET_URL)` 失败。改为 `TARGET_URL` 后通过。写 Node 脚本时不要用 `URL`、`fetch` 这类全局名做局部常量。
- 第一版判定统计“相邻两个块”的数量，会把修复后的两个相邻列表项误判成问题；正确做法是检查每个块级 span 后面是否紧跟 `'\n'` 文本节点。指标要对着 bug 的因果，而不是对着 DOM 的形状。
- 脚本只读，不创建会话、不发消息；适合在已有验证会话上重复跑，代价低。
- 认证 cookie 只从环境变量进入，验证报告里不保存 cookie 值。

## 涉及文件

- `scripts/verify-user-newline.mjs`：新增只读 GUI 验证脚本。
- `.research/verify/user-newline-verify.json`、`user-newline-verify.png`：验证输出（未提交）。

## 未决与下一步

Step 4：更新 README 的已知限制（说明块级行不再追加空行、孤立 CR 的处理），补最终日志，跑一次 `npm test` 与 `npm run build` 后提交；不合并 `main`。

## 来源

- [2026-11-02-0354-user-newline-fix-s01.md:1-20](2026-11-02-0354-user-newline-fix-s01.md#L1-L20)：Step 1 实现与本轮验证目标。
- [verify-user-newline.mjs:20-45](../../scripts/verify-user-newline.mjs#L20-L45)：URL、cookie 与输出目录。
- [verify-user-newline.mjs:64-80](../../scripts/verify-user-newline.mjs#L64-L80)：会话定位与“加载更早”。
- [verify-user-newline.mjs:86-105](../../scripts/verify-user-newline.mjs#L86-L105)：块后换行指标与 pass 判定。
- 无链接：命令输出；定位：2026-11-02 03:56，工作目录 `E:\Repos\dsh-chat-improve`，`npm run build` 与两次 `node scripts/verify-user-newline.mjs`；用途：构建与 GUI 验证结果；原因：终端输出无可分享链接。
- 无链接：本次浏览器验证；定位：`.research/verify/user-newline-verify.json`、`user-newline-verify.png`；用途：86px/130px、块数与块后换行；原因：`.research/` 未提交。
