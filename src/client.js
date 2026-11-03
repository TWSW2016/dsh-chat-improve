/**
 * Browser half entry of dsh-chat-improve.
 *
 * Step 2 adds the transcript Mermaid enhancer. Settings and the composer
 * contribution keep their own modules; every contribution is effect-scoped so
 * disabling the plugin leaves no residue.
 */
import { SettingsPage } from './settings-page.jsx'
import { settingsStore } from './settings.js'
import { startMermaidEnhancer } from './mermaid/enhance.js'
import { startComposerFormatting } from './composer/index.js'
import { registerImprove } from './improve/index.js'
import { UserMarkdown } from './user-text/UserMarkdown.jsx'

/** @type {string[]} */
export const inject = ['locale', 'slots']

const en = {
  'settings.title': 'Chat Improve',
  'settings.description': 'Presentation settings for the chat interface. They apply to this browser profile.',
  'settings.composer': 'Render Markdown inside the composer',
  'settings.composerHint': 'Styles inline code, bold, italic, strikethrough, links, headings, and list markers while you type. The caret line keeps its source.',
  'settings.mermaid': 'Render Mermaid diagrams',
  'settings.mermaidHint': 'Fenced mermaid blocks in the transcript become diagrams with a source toggle. Invalid diagrams keep their source and show an error.',
  'settings.userMessageMarkdown': 'Render user messages as Markdown',
  'settings.userMessageMarkdownHint': 'Shows sent user messages with Markdown formatting. Copy and edit still use the original text.',
  'settings.improvePrompt': 'Improve by AI',
  'settings.improvePromptHint': 'Adds a button that asks the current model to rewrite the draft. One request is sent and billed as tokens; the result only replaces the composer text.',
  'settings.maxSource': 'Mermaid source limit (characters)',
  'settings.maxSourceHint': 'Diagrams whose source is longer stay as code blocks. Range 1000–200000.',
  'settings.reset': 'Reset to defaults',
  'improve.label': 'Improve by AI',
  'improve.hintRunning': 'Rewriting…',
  'improve.hintEmpty': 'Type a prompt first',
  'improve.hintBusy': 'Available when the composer is idle',
  'improve.ready': 'Prompt rewritten',
  'improve.restore': 'Restore original',
  'improve.restored': 'Original restored',
  'improve.dismiss': 'Dismiss',
  'improve.retry': 'Retry',
  'improve.confirmRefs': 'Rewriting clears @ references and slash commands. Continue?',
  'improve.confirm': 'Continue',
  'improve.cancel': 'Cancel',
  'improve.draftChanged': 'The draft changed while rewriting, so the result was not applied.',
  'improve.truncated': 'output limit reached; the result may be cut short',
  'improve.reason.unknown': 'Rewrite failed',
  'improve.reason.timeout': 'The request timed out',
  'improve.reason.network': 'Network error',
  'improve.reason.cancelled': 'Cancelled',
  'improve.reason.noModel': 'No model is available for this session',
  'improve.reason.llmUnavailable': 'The model service is unavailable',
  'improve.reason.llmEmpty': 'The model returned nothing',
  'improve.reason.llmError': 'The model call failed',
  'improve.reason.badResponse': 'The response was not a rewrite',
  'improve.reason.draftTooLong': 'The draft is too long',
  'mermaid.error': 'Mermaid render failed.',
  'mermaid.retry': 'Retry',
  'mermaid.showSource': 'Source',
  'mermaid.showDiagram': 'Diagram',
  'mermaid.diagram': 'Mermaid diagram',
  'mermaid.fitWidth': 'Fit width',
  'mermaid.actualSize': 'Actual size',
  'mermaid.timelinePeriodHint': 'A timeline period cannot contain a colon; move the time into the event, for example 2026-11-01 : 16:19 start.',
}

const zh = {
  'settings.title': '聊天增强',
  'settings.description': '聊天界面的呈现设置，仅作用于当前浏览器配置。',
  'settings.composer': '在输入框内渲染 Markdown',
  'settings.composerHint': '输入时样式化行内代码、粗体、斜体、删除线、链接、标题与列表标记；光标所在行保持源码。',
  'settings.mermaid': '渲染 Mermaid 图表',
  'settings.mermaidHint': '聊天记录中的 mermaid 围栏会渲染为图表，并提供源码切换；非法图表保留源码并显示错误。',
  'settings.userMessageMarkdown': '按 Markdown 渲染用户消息',
  'settings.userMessageMarkdownHint': '已发送的用户消息按 Markdown 显示；复制与编辑仍使用原文。',
  'settings.improvePrompt': 'AI 优化提示词',
  'settings.improvePromptHint': '在输入框工具栏加一个按钮，交给当前模型改写草稿。会发出一次模型请求并消耗 token；结果只写回输入框。',
  'settings.maxSource': 'Mermaid 源码上限（字符）',
  'settings.maxSourceHint': '源码超过上限的图表保持代码块显示。范围 1000–200000。',
  'settings.reset': '恢复默认值',
  'improve.label': 'AI 优化',
  'improve.hintRunning': '正在改写…',
  'improve.hintEmpty': '先写点内容',
  'improve.hintBusy': '输入框空闲时可用',
  'improve.ready': '已改写',
  'improve.restore': '还原原文',
  'improve.restored': '已还原原文',
  'improve.dismiss': '关闭',
  'improve.retry': '重试',
  'improve.confirmRefs': '改写会清空 @ 引用与命令，继续吗？',
  'improve.confirm': '继续',
  'improve.cancel': '取消',
  'improve.draftChanged': '改写期间草稿有改动，结果未应用。',
  'improve.truncated': '达到输出上限，结果可能被截断',
  'improve.reason.unknown': '改写失败',
  'improve.reason.timeout': '请求超时',
  'improve.reason.network': '网络错误',
  'improve.reason.cancelled': '已取消',
  'improve.reason.noModel': '当前会话没有可用模型',
  'improve.reason.llmUnavailable': '模型服务不可用',
  'improve.reason.llmEmpty': '模型没有返回内容',
  'improve.reason.llmError': '模型调用失败',
  'improve.reason.badResponse': '响应不是一条改写结果',
  'improve.reason.draftTooLong': '草稿过长',
  'mermaid.error': 'Mermaid 渲染失败。',
  'mermaid.retry': '重试',
  'mermaid.showSource': '源码',
  'mermaid.showDiagram': '图表',
  'mermaid.diagram': 'Mermaid 图表',
  'mermaid.fitWidth': '适合宽度',
  'mermaid.actualSize': '原始大小',
  'mermaid.timelinePeriodHint': '时间线的时间段不能含冒号；把时间写进事件，例如 2026-11-01 : 16:19 开始。',
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function apply(ctx) {
  ctx.effect(() => ctx.locale.register('chat-improve', 'en', en))
  ctx.effect(() => ctx.locale.register('chat-improve', 'zh', zh))

  const t = ctx.locale.bind('chat-improve')

  ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'chat-improve',
    order: 50,
    label: () => t('settings.title'),
    locale: 'chat-improve',
  }, SettingsPage)))

  /** @type {{ dispose: () => void, refreshTheme: () => void } | undefined} */
  let mermaid
  const syncMermaid = () => {
    const enabled = settingsStore.getSnapshot().mermaid
    if (enabled && mermaid === undefined) {
      mermaid = startMermaidEnhancer({
        t,
        getMaxSource: () => settingsStore.getSnapshot().mermaidMaxSourceChars,
      })
    } else if (!enabled && mermaid !== undefined) {
      mermaid.dispose()
      mermaid = undefined
    }
  }

  ctx.effect(() => {
    syncMermaid()
    const unsubscribe = settingsStore.subscribe(syncMermaid)
    return () => {
      unsubscribe()
      mermaid?.dispose()
      mermaid = undefined
    }
  })

  ctx.on('theme/change', () => { mermaid?.refreshTheme() })

  /** @type {(() => void) | undefined} */
  let composer
  const syncComposer = () => {
    const enabled = settingsStore.getSnapshot().composerLivePreview
    if (enabled && composer === undefined) {
      composer = startComposerFormatting()
    } else if (!enabled && composer !== undefined) {
      composer()
      composer = undefined
    }
  }

  ctx.effect(() => {
    syncComposer()
    const unsubscribe = settingsStore.subscribe(syncComposer)
    return () => {
      unsubscribe()
      composer?.()
      composer = undefined
    }
  })

  /** @type {(() => void) | undefined} */
  let improve
  const syncImprove = () => {
    const enabled = settingsStore.getSnapshot().improvePrompt
    if (enabled && improve === undefined) {
      improve = registerImprove(ctx, t)
    } else if (!enabled && improve !== undefined) {
      improve()
      improve = undefined
    }
  }

  ctx.effect(() => {
    syncImprove()
    const unsubscribe = settingsStore.subscribe(syncImprove)
    return () => {
      unsubscribe()
      improve?.()
      improve = undefined
    }
  })

  ctx.effect(() => ctx.slots.inject('conversation.user.text.node', () => ctx.slots.register({
    name: 'conversation.user.text.node',
    key: 'text',
    priority: 0,
  }, UserMarkdown)))
}
