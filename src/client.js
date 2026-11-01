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
  'settings.maxSource': 'Mermaid source limit (characters)',
  'settings.maxSourceHint': 'Diagrams whose source is longer stay as code blocks. Range 1000–200000.',
  'settings.reset': 'Reset to defaults',
  'mermaid.error': 'Mermaid render failed.',
  'mermaid.retry': 'Retry',
  'mermaid.showSource': 'Source',
  'mermaid.showDiagram': 'Diagram',
  'mermaid.diagram': 'Mermaid diagram',
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
  'settings.maxSource': 'Mermaid 源码上限（字符）',
  'settings.maxSourceHint': '源码超过上限的图表保持代码块显示。范围 1000–200000。',
  'settings.reset': '恢复默认值',
  'mermaid.error': 'Mermaid 渲染失败。',
  'mermaid.retry': '重试',
  'mermaid.showSource': '源码',
  'mermaid.showDiagram': '图表',
  'mermaid.diagram': 'Mermaid 图表',
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
}
