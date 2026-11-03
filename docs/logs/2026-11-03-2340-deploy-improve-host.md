---
title: "部署 Improve 改写指令到本机 Desktop：链接、构建与宿主重载结论"
created: 2026-11-03
updated: 2026-11-03
log_deai_profile: "agent"
log_deai_version: "0.1.4"
tags: ["log-deai", "project/dsh-chat-improve", "type/deploy", "topic/improve-by-ai"]
git_branch: "main"
---

# 部署 Improve 改写指令到本机 Desktop：链接、构建与宿主重载结论

## 交接摘要

- 现状：插件在 Desktop profile 里以 junction 方式链接本仓库，`dsh.profile.bundles` 已含 `dsh-chat-improve`；客户端 bundle 已构建；工作区干净。**只差宿主进程重载一次**。
- 关键事实：宿主进程 65716 启动于 2026-11-03 23:06:27，早于本轮改动（23:25），所以运行中的进程仍是旧 `SYSTEM_PROMPT`。
- 结论：插件开关（toggle）与 `dshmarket` 的自重启都不能可靠加载新代码——前者命中 Node ESM 缓存，后者在 Desktop 宿主上会回退到 PATH 里并不存在的 `dsh`。
- 下一步：用户关闭并重开 `DeepSeek Harness`（若最小化到托盘需从托盘退出），重开本会话后用 `Update the latest plugin` 点一次 Improve by AI 验证。
- 关键文件：`C:\Users\wxxac\.dsh\profiles\desktop\package.json`、`src\host\prompt.js`、`src\host\context.js`。

## 目标与请求

用户原话："deploy on this pc so I can test"。

目标：让本机 Desktop 里运行的 DeepSeek Harness 真正执行本轮改过的改写指令（步骤 1–4 已提交，未推送）。

## 执行与命令

1. 核对安装形态：
   - `Get-Item ~\.dsh\profiles\desktop\node_modules\dsh-chat-improve -Force` → `LinkType: Junction`、`Target: E:\Repos\dsh-chat-improve`。
   - `~\.dsh\profiles\desktop\package.json` → `dependencies."dsh-chat-improve": "link:E:/Repos/dsh-chat-improve"`，`dsh.profile.bundles` 末项为 `dsh-chat-improve`。
2. 核对构建与语法：步骤 4 已跑 `npm test`（157 例）与 `npm run build`；本轮补 `node --check` 检查 `src/host/prompt.js`、`context.js`、`rewrite.js`、`src/index.js`，全部通过。
3. 核对宿主新鲜度：
   - `netstat -ano | findstr :12447` → LISTENING 65716；`Get-Process -Id 65716` 的 `StartTime` = 2026-11-03 23:06:27。
   - `src/host/prompt.js` 与 `context.js` 的 mtime = 23:25:09 / 23:25:13。宿主早于改动 → 旧代码。
4. 评估"不重启"的替代路径（均否掉，见"决策"）：
   - `dsh --profile desktop --dump-config` → `error: profile "desktop" is managed exclusively by the Electron application`（退出码 1），无法从 CLI 重载。
   - 读取 `@deepseek-ai/dsh-base` 的 bundle patch：`hmr` 行 `config.root: []`，注释写明"module roots are opt-in"，即只监听 profile 配置、不监听插件源码；本轮改的是模块源码，不会触发 HMR。
   - 读取 `dshmarket/lib/routes.js` 的 `/dsh-market/toggle`、`/dsh-market/restart` 与 `lib/restart.js` 的 `dshArgv()`：Desktop 宿主的 `process.argv[1]` 是 `dsh-desktop-host/lib/index.js`，不匹配 `cli.js`/`bin.js` 分支，回退到 PATH 上的 `dsh`；本机已无 `dsh`（AGENTS §1.5 记录），自重启会失败。`restartReachable: true` 只是同源栅栏的预测，不代表能拉起替代进程。
5. 清理：删除本轮排查产生的 `%TEMP%\dsh-cookies-*.sqlite` 临时副本（0 个残留）。

## 结果与证据

| 项 | 结果 | 证据 |
| --- | --- | --- |
| profile 链接 | 就绪 | Junction → `E:\Repos\dsh-chat-improve` |
| bundles 注册 | 就绪 | profile `package.json` 的 `dsh.profile.bundles` |
| 客户端构建 | 就绪 | 步骤 4 的 `lib/client.js` 3415.0 KiB，退出码 0 |
| 宿主语法 | 通过 | `node --check` 四个文件，退出码 0 |
| 运行中宿主 | 旧代码 | 启动 23:06:27 < 源码 23:25:13 |
| 不重启方案 | 均不可行 | HMR `root: []`；`dshArgv()` 回退 PATH `dsh`（缺失） |
| 工作区 | 干净 | `git status --short --branch` → `main...origin/main [ahead 6]` |

## 决策

- 否掉"插件关→开"：`cordis-plugin-loader` 的 `import()` 走 Node ESM 模块缓存，同一 URL 重复导入返回旧模块；toggle 只会用旧代码重新执行 `apply()`。
- 否掉 `dshmarket` 自重启：`dshArgv()` 在 Desktop 宿主上识别不出 `index.js`，回退到 PATH 上的 `dsh`，而本机没有 `dsh`；失败时会把宿主留在恢复页，比手动重启更糟。
- 否掉"改 profile 的 hmr root 再热加载"：需要改用户的 `cordis.patch.yml`，且成功与否无法在没有鉴权的情况下验证，收益不如一次确定的重启。
- 否掉"自动重启应用"：会丢弃用户当前输入框草稿与会话窗口，且托盘常驻模式下关闭窗口未必退出；交给用户手动重启更稳。
- 不推送 origin：用户尚未要求，`main` 保持领先 6 个提交。

## 问题与限制

- 无法在会话内验证重启后的真实输出：`/chat-improve/rewrite` 需要 `dsh web` 的登录 cookie，Desktop 的 token 不落盘、不进命令行；`/dsh-market/*` 虽然无鉴权，但拿不到改写结果。
- 重启会中断当前窗口；会话记录已持久化，重开后可从历史继续。
- 若用户曾把窗口"关闭到后台"，仅点关闭按钮不会退出宿主，必须从托盘图标退出或结束进程后重开。

## 可复用经验

- 判断"改动是否已生效"只看两件事：宿主进程启动时间 vs 源码 mtime；以及 HMR 是否监听模块根（本机 `hmr.config.root: []`，不监听）。
- DSH 插件开关不等于热更新：loader 用普通 `import()`，同 URL 命中 ESM 缓存；改模块源码必须重启宿主。
- Desktop 宿主是 `dsh-desktop-host/lib/index.js`，不是 `cli.js`；`dshmarket` 的自重启逻辑识别不了它，别在 Desktop 上按"重启"按钮。
- `/dsh-market/status`、`/dsh-market/installed` 无鉴权可读，适合核对插件是否装载；`/chat-improve/rewrite` 仍受 `connection` 栅栏保护。

## 涉及文件

- `C:\Users\wxxac\.dsh\profiles\desktop\package.json`（只读核对）
- `C:\Users\wxxac\.dsh\profiles\desktop\cordis.patch.yml`（只读核对）
- `src\host\prompt.js`、`src\host\context.js`（语法检查，无改动）
- 本日志

## 未决与下一步

- 用户：退出并重新打开 `DeepSeek Harness`。
- 验证清单（重开后）：
  1. `Update the latest plugin` → 应只到"对象 + 位置 + 保留行为 + 完成标准"，不含 `First check … then …`；
  2. `只改 host，不要动 UI；改完告诉我` → 约束保留、无步骤；
  3. `make the settings page less confusing` → 不列文件、不列改法；
  4. `Translate this paragraph` → 不注入项目/分支。
- 若重开后仍是旧行为：确认宿主启动时间晚于 23:26；再检查 profile 里 `dsh-chat-improve` 是否仍在 bundles。

## 来源

- 无链接：本会话命令输出；定位：2026-11-03 23:06–23:40 的 `Get-Item`、`Get-Process`、`netstat`、`node --check`、`dsh --profile desktop --dump-config`；原因：终端输出无可分享链接。
- `E:\Repos\dsh-chat-improve\src\host\prompt.js:27-89`、`src\host\context.js:199-213`：本轮部署的代码。
- `C:\Users\wxxac\AppData\Local\Programs\DeepSeek Harness\resources\app.asar\dsh\node_modules\@deepseek-ai\dsh-base\cordis.patch.yml:27-32`：`hmr` 行与 `root: []`。
- `C:\Users\wxxac\AppData\Local\Programs\DeepSeek Harness\resources\app.asar\dsh\node_modules\@deepseek-ai\cordis-plugin-loader\lib\index.js:213-228`：`import()` 实现。
- `C:\Users\wxxac\.dsh\profiles\desktop\node_modules\dshmarket\lib\dsh-cli.js:465-485`、`lib\restart.js:653-688`：自重启回退与计划。
