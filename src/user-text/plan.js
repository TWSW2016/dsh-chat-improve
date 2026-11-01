/**
 * Pure line planner for user-message Markdown.
 *
 * The `conversation.user.text.node` seat is inline, so the renderer keeps
 * inline lines inline and marks headings, quotes, list items, rules, and
 * fenced code as block-level spans. This module only describes each rendered
 * line; it has no React or DSH imports, which keeps the line-break rules
 * unit-testable.
 */

/**
 * Normalize line endings the way a `white-space: pre-wrap` text node renders
 * them: CRLF is one line break and a lone CR is not a break.
 * @param {string} text - source text.
 * @returns {string} text with `\n` as its only line separator.
 */
export function normalizeUserText(text) {
  return String(text).replace(/\r\n/g, '\n').replace(/\r/g, '')
}

/**
 * Plan one user message as an ordered list of renderable blocks and breaks.
 *
 * A break token is emitted only after an inline block; a block-level span
 * already ends its own line, so adding a break there would create a blank
 * line in the pre-wrap bubble.
 * @param {string} text - source text.
 * @returns {Array<{ kind: string, block?: boolean, text?: string, indent?: number, marker?: string }>} planned blocks and break tokens.
 */
export function planUserMarkdown(text) {
  const lines = normalizeUserText(text).split('\n')
  const items = []
  let fence = null

  for (const line of lines) {
    const trimmed = line.trimStart()
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      if (fence === null) {
        fence = []
      } else {
        items.push({ kind: 'code', block: true, text: fence.join('\n') })
        fence = null
      }
      continue
    }
    if (fence !== null) {
      fence.push(line)
      continue
    }
    items.push(planLine(line))
  }

  if (fence !== null) items.push({ kind: 'code', block: true, text: fence.join('\n') })

  const tokens = []
  items.forEach((item, index) => {
    tokens.push(item)
    if (!item.block && index < items.length - 1) tokens.push({ kind: 'break' })
  })
  return tokens
}

/**
 * Plan one non-fenced line.
 * @param {string} line - line text without a line separator.
 * @returns {{ kind: string, block: boolean, text?: string, indent?: number, marker?: string }} planned block.
 */
function planLine(line) {
  const heading = /^(#{1,6})\s+(.*)$/u.exec(line)
  if (heading !== null) return { kind: 'heading', block: true, text: heading[2] }

  const quote = /^>\s?(.*)$/u.exec(line)
  if (quote !== null) return { kind: 'quote', block: true, text: quote[1] }

  const item = /^(\s*)([-*+]|\d+\.)\s+(.*)$/u.exec(line)
  if (item !== null) {
    return {
      kind: 'list',
      block: true,
      text: item[3],
      indent: item[1].length,
      marker: /^\d/u.test(item[2]) ? item[2] : '•',
    }
  }

  if (/^(-{3,}|\*{3,}|_{3,})$/u.test(line)) return { kind: 'rule', block: true }
  return { kind: 'text', block: false, text: line }
}
