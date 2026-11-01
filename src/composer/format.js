/**
 * Composer formatting through the instance Lexical editor.
 *
 * Each formatted construct is split into an opening marker, a styled body,
 * and a closing marker. Runs carry their id, kind, and reveal state in CSS
 * custom properties, so the line containing the caret can be revealed without
 * merging nodes or remapping the selection.
 */
import { scanComposerLine } from './scan.js'

const RUN = '--dsh-ci-run:'
const KIND = '--dsh-ci-kind:'
const MARKER = '--dsh-ci-marker:1'
const ACTIVE = '--dsh-ci-active:'

const VISUAL = {
  code: 'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:var(--dsw-alias-bg-layer-2);border-radius:4px;padding:0 2px',
  strong: 'font-weight:600',
  em: 'font-style:italic',
  delete: 'text-decoration:line-through',
  link: 'color:var(--dsw-alias-state-business-primary);text-decoration:underline',
  heading: 'font-weight:600;font-size:1.08em',
}
const BULLET = 'display:inline-block;width:0.45em;height:0.45em;border-radius:50%;background:currentColor;color:transparent;overflow:hidden;margin-right:0.45em;vertical-align:middle'

/**
 * Build styled segments for one line.
 * @param {string} text - line text.
 * @param {() => string} nextId - run-id allocator.
 * @returns {Array<{ text: string, style: string }>} segments.
 */
export function buildComposerSegments(text, nextId) {
  const { spans, prefix } = scanComposerLine(text)
  const segments = []
  const push = (value, style) => {
    if (value !== '') segments.push({ text: value, style })
  }
  const body = (id, kind) => `${RUN}${id};${KIND}${kind};${ACTIVE}0;${VISUAL[kind]}`
  const marker = (id, kind) => `${RUN}${id};${KIND}${kind};${MARKER};${ACTIVE}0;${kind === 'bullet' ? BULLET : 'display:none'}`

  let cursor = 0
  if (prefix !== undefined) {
    if (prefix.type === 'heading') {
      push(text.slice(0, prefix.markerFrom), '')
      push(text.slice(prefix.markerFrom, prefix.markerTo), marker(nextId(), 'heading'))
      push(text.slice(prefix.markerTo), body(nextId(), 'heading'))
      return segments
    }
    if (prefix.type === 'bullet') {
      push(text.slice(0, prefix.markerFrom), '')
      push(text.slice(prefix.markerFrom, prefix.markerTo), marker(nextId(), 'bullet'))
      push(text.slice(prefix.markerTo, prefix.bodyFrom), '')
      cursor = prefix.bodyFrom
    }
    if (prefix.type === 'ordered') {
      push(text.slice(0, prefix.markerFrom), '')
      push(text.slice(prefix.markerFrom, prefix.markerTo), marker(nextId(), 'ordered'))
      push(text.slice(prefix.markerTo, prefix.bodyFrom), '')
      cursor = prefix.bodyFrom
    }
  }

  for (const span of spans) {
    if (span.from < cursor) continue
    if (span.from > cursor) push(text.slice(cursor, span.from), '')
    const id = nextId()
    push(text.slice(span.from, span.innerFrom), marker(id, span.type))
    push(text.slice(span.innerFrom, span.innerTo), body(id, span.type))
    push(text.slice(span.innerTo, span.to), marker(id, span.type))
    cursor = span.to
  }
  if (cursor < text.length) push(text.slice(cursor), '')
  return segments
}

/**
 * Attach formatting to one Lexical editor.
 * @param {any} editor - the composer's Lexical editor instance.
 * @returns {() => void} disposer that restores raw text.
 */
export function attachComposerFormatting(editor) {
  const TextNode = editor?._nodes?.get?.('text')?.klass
  if (typeof TextNode !== 'function') return () => {}
  let applying = false
  let disposed = false
  let sequence = 0
  const nextId = () => String(++sequence)

  /**
   * Run one formatting pass.
   * @param {boolean} focused - whether the composer owns focus.
   */
  const runPass = focused => {
    if (applying || disposed) return
    applying = true
    try {
      editor.update(() => {
        const state = editor._pendingEditorState ?? editor.getEditorState()
        const selection = state._selection
        const root = state._nodeMap.get('root')
        if (root === undefined || root === null) return
        for (const paragraph of root.getChildren()) {
          formatParagraph(paragraph, {
            TextNode,
            nextId,
            focused,
            anchorKey: selection?.anchor?.key,
            focusKey: selection?.focus?.key,
          })
        }
      }, { tag: 'dsh-ci-format' })
    } catch (error) {
      // Fail open: leave the draft as typed and stop mutating it.
      disposed = true
      console.warn('[dsh-chat-improve] composer formatting disabled:', error)
    } finally {
      applying = false
    }
  }

  const listener = editor.registerUpdateListener(() => {
    if (applying || disposed || editor.isComposing()) return
    const rootElement = editor.getRootElement?.()
    const focused = rootElement !== null && rootElement !== undefined
      && (rootElement === document.activeElement || rootElement.contains(document.activeElement))
    runPass(focused)
  })

  const rootElement = editor.getRootElement?.()
  const onFocusOut = () => {
    queueMicrotask(() => {
      if (!disposed) runPass(false)
    })
  }
  rootElement?.addEventListener('focusout', onFocusOut)
  runPass(rootElement !== null && rootElement !== undefined
    && (rootElement === document.activeElement || rootElement.contains(document.activeElement)))

  return () => {
    disposed = true
    listener?.()
    rootElement?.removeEventListener('focusout', onFocusOut)
    try {
      editor.update(() => {
        const state = editor.getEditorState()
        for (const node of state._nodeMap.values()) {
          if (node.getType?.() !== 'text') continue
          if (parseRun(node.getStyle()) !== undefined) node.setStyle('')
        }
      }, { tag: 'dsh-ci-restore' })
    } catch {
      // The editor may already be detached; the draft text is unaffected.
    }
  }
}

/**
 * Format one paragraph: reveal the caret's line, format every other line.
 * @param {any} paragraph - Lexical paragraph node.
 * @param {{ TextNode: any, nextId: () => string, anchorKey?: string, focusKey?: string }} context - formatting context.
 */
function formatParagraph(paragraph, context) {
  const lines = [[]]
  const keyLine = new Map()
  for (const child of paragraph.getChildren()) {
    const key = child.getKey()
    keyLine.set(key, lines.length - 1)
    if (child.getType() === 'linebreak') {
      lines.push([])
      continue
    }
    lines[lines.length - 1].push(child)
  }

  const active = context.focused === false
    ? -1
    : keyLine.get(context.anchorKey) ?? keyLine.get(context.focusKey) ?? -1
  lines.forEach((nodes, lineIndexValue) => {
    const isActive = lineIndexValue === active
    const textNodes = nodes.filter(node => node.getType() === 'text')

    // Existing runs: reveal on the caret's line, render on every other line.
    for (const node of textNodes) {
      const run = parseRun(node.getStyle())
      if (run === undefined) continue
      if (run.active === isActive) continue
      node.setStyle(runStyle(run, isActive))
    }
    if (isActive) return

    const lineText = textNodes.map(node => node.getTextContent()).join('')
    if (lineText.includes('@') || lineText.trimStart().startsWith('/')) return

    for (const node of textNodes) {
      if (node.getStyle() !== '') continue
      const key = node.getKey()
      if (key === context.anchorKey || key === context.focusKey) continue
      splitNode(node, context)
    }
  })
}

/**
 * Split one unstyled text node into styled runs.
 * @param {any} node - Lexical text node.
 * @param {{ TextNode: any, nextId: () => string }} context - formatting context.
 */
function splitNode(node, context) {
  const text = node.getTextContent()
  if (text === '') return
  const segments = buildComposerSegments(text, context.nextId)
  if (segments.length <= 1) return
  const created = segments.map(segment => {
    const next = new context.TextNode(segment.text)
    if (segment.style !== '') next.setStyle(segment.style)
    return next
  })
  node.replace(created[0])
  let previous = created[0]
  for (const next of created.slice(1)) {
    previous.insertAfter(next)
    previous = next
  }
}

/**
 * Parse a formatted run from its style string.
 * @param {string} style - inline style.
 * @returns {{ id: string, kind: string, marker: boolean, active: boolean } | undefined} run, or undefined.
 */
function parseRun(style) {
  if (typeof style !== 'string' || !style.includes(RUN)) return undefined
  const id = new RegExp(`${RUN}(\\d+)`).exec(style)?.[1]
  if (id === undefined) return undefined
  return {
    id,
    kind: new RegExp(`${KIND}([a-z]+)`).exec(style)?.[1] ?? 'code',
    marker: style.includes(MARKER),
    active: style.includes(`${ACTIVE}1`),
  }
}

/**
 * Build the style for one run in the requested visibility.
 * @param {{ id: string, kind: string, marker: boolean }} run - run identity.
 * @param {boolean} active - whether the caret's line is revealing source.
 * @returns {string} inline style.
 */
function runStyle(run, active) {
  if (active) {
    return `${RUN}${run.id};${KIND}${run.kind};${run.marker ? `${MARKER};` : ''}${ACTIVE}1`
  }
  if (run.marker) {
    const visual = run.kind === 'bullet' ? BULLET : 'display:none'
    return `${RUN}${run.id};${KIND}${run.kind};${MARKER};${ACTIVE}0;${visual}`
  }
  return `${RUN}${run.id};${KIND}${run.kind};${ACTIVE}0;${VISUAL[run.kind] ?? ''}`
}





