/**
 * Small inline Markdown scanner shared by the user-message renderer.
 *
 * A full GFM pipeline is not used here: the user text slot renders inside an
 * inline run, so block elements must stay lightweight. The scanner returns
 * nested inline nodes (code, emphasis, strikethrough, links) and leaves
 * everything else as literal text.
 */

const MAX_DEPTH = 4

/**
 * Scan one line of Markdown into inline nodes.
 * @param {string} text - source line.
 * @param {number} [depth] - recursion guard for nested emphasis.
 * @returns {Array<{ type: string, text?: string, children?: unknown[], url?: string }>} inline nodes.
 */
export function scanInline(text, depth = 0) {
  if (typeof text !== 'string' || text === '') return []
  const nodes = []
  let plain = ''
  let index = 0

  const flush = () => {
    if (plain !== '') {
      nodes.push({ type: 'text', text: plain })
      plain = ''
    }
  }

  while (index < text.length) {
    const char = text[index]

    if (char === '\\' && index + 1 < text.length) {
      plain += text[index + 1]
      index += 2
      continue
    }

    if (char === '`') {
      const run = runLength(text, index, '`')
      const fence = '`'.repeat(run)
      const close = text.indexOf(fence, index + run)
      if (close !== -1) {
        flush()
        nodes.push({ type: 'code', text: text.slice(index + run, close) })
        index = close + run
        continue
      }
    }

    if (char === '[') {
      const labelEnd = text.indexOf('](', index + 1)
      if (labelEnd !== -1) {
        const urlEnd = text.indexOf(')', labelEnd + 2)
        if (urlEnd !== -1) {
          flush()
          const label = text.slice(index + 1, labelEnd)
          nodes.push({
            type: 'link',
            url: text.slice(labelEnd + 2, urlEnd),
            children: depth < MAX_DEPTH ? scanInline(label, depth + 1) : [{ type: 'text', text: label }],
          })
          index = urlEnd + 1
          continue
        }
      }
    }

    const emphasis = matchEmphasis(text, index)
    if (emphasis !== undefined) {
      flush()
      const inner = text.slice(index + emphasis.marker.length, emphasis.close)
      nodes.push({
        type: emphasis.type,
        children: depth < MAX_DEPTH
          ? scanInline(inner, depth + 1)
          : [{ type: 'text', text: inner }],
      })
      index = emphasis.close + emphasis.marker.length
      continue
    }

    plain += char
    index += 1
  }

  flush()
  return nodes
}

/**
 * Match one emphasis marker at `index`.
 * @param {string} text - source line.
 * @param {number} index - candidate offset.
 * @returns {{ marker: string, type: string, close: number } | undefined} match.
 */
function matchEmphasis(text, index) {
  const candidates = [
    { marker: '**', type: 'strong' },
    { marker: '__', type: 'strong' },
    { marker: '~~', type: 'delete' },
    { marker: '*', type: 'em' },
    { marker: '_', type: 'em' },
  ]
  for (const candidate of candidates) {
    if (!text.startsWith(candidate.marker, index)) continue
    const from = index + candidate.marker.length
    const close = text.indexOf(candidate.marker, from)
    if (close === -1 || close === from) continue
    const inner = text.slice(from, close)
    if (inner.trim() !== inner) continue
    // A single `*`/`_` must not open inside a word (2*3 stays literal).
    if (candidate.marker.length === 1 && index > 0 && /\w/u.test(text[index - 1])) continue
    if (candidate.marker.length === 1 && close + 1 < text.length && /\w/u.test(text[close + 1])) continue
    return { ...candidate, close }
  }
  return undefined
}

/**
 * Count a repeated character run at `index`.
 * @param {string} text - source.
 * @param {number} index - start offset.
 * @param {string} char - repeated character.
 * @returns {number} run length.
 */
function runLength(text, index, char) {
  let length = 0
  while (text[index + length] === char) length += 1
  return length
}
