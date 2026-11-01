/**
 * Offset-based inline scanner for the composer.
 *
 * The composer needs source ranges (not a React tree) so it can split one
 * Lexical TextNode into styled runs while keeping every character. Block
 * prefixes (heading, list marker) are reported separately.
 */

const EMPHASIS = [
  { marker: '**', type: 'strong' },
  { marker: '__', type: 'strong' },
  { marker: '~~', type: 'delete' },
  { marker: '*', type: 'em' },
  { marker: '_', type: 'em' },
]

/**
 * Scan one composer line.
 * @param {string} text - line text.
 * @returns {{ spans: Array<{ type: string, from: number, to: number, innerFrom: number, innerTo: number }>, prefix?: { type: string, from: number, to: number, innerFrom: number, innerTo: number } }} spans and an optional block prefix.
 */
export function scanComposerLine(text) {
  const spans = []
  let index = 0
  while (index < text.length) {
    const char = text[index]
    if (char === '`') {
      const run = runLength(text, index, '`')
      const fence = '`'.repeat(run)
      const close = text.indexOf(fence, index + run)
      if (close !== -1 && close > index + run) {
        spans.push({ type: 'code', from: index, to: close + run, innerFrom: index + run, innerTo: close })
        index = close + run
        continue
      }
    }
    if (char === '[') {
      const labelEnd = text.indexOf('](', index + 1)
      if (labelEnd !== -1) {
        const urlEnd = text.indexOf(')', labelEnd + 2)
        if (urlEnd !== -1 && labelEnd > index + 1) {
          spans.push({
            type: 'link',
            from: index,
            to: urlEnd + 1,
            innerFrom: index + 1,
            innerTo: labelEnd,
          })
          index = urlEnd + 1
          continue
        }
      }
    }
    const emphasis = matchEmphasis(text, index)
    if (emphasis !== undefined) {
      spans.push({
        type: emphasis.type,
        from: index,
        to: emphasis.close + emphasis.marker.length,
        innerFrom: index + emphasis.marker.length,
        innerTo: emphasis.close,
      })
      index = emphasis.close + emphasis.marker.length
      continue
    }
    index += 1
  }
  return { spans, prefix: scanPrefix(text) }
}

/**
 * Detect a line-level heading or list marker.
 * @param {string} text - line text.
 * @returns {{ type: string, indent: number, markerFrom: number, markerTo: number, bodyFrom: number, heading?: number, ordered?: boolean } | undefined} prefix.
 */
function scanPrefix(text) {
  const heading = /^(#{1,6})\s+/u.exec(text)
  if (heading !== null) {
    return {
      type: 'heading',
      indent: 0,
      markerFrom: 0,
      markerTo: heading[1].length,
      bodyFrom: heading[0].length,
      heading: heading[1].length,
    }
  }
  const item = /^(\s*)([-*+]|\d+\.)\s+/u.exec(text)
  if (item !== null) {
    const marker = item[2]
    if (/^\d/u.test(marker)) {
      return {
        type: 'ordered',
        indent: item[1].length,
        markerFrom: item[1].length + marker.length - 1,
        markerTo: item[1].length + marker.length,
        bodyFrom: item[0].length,
        ordered: true,
      }
    }
    return {
      type: 'bullet',
      indent: item[1].length,
      markerFrom: item[1].length,
      markerTo: item[1].length + marker.length,
      bodyFrom: item[0].length,
    }
  }
  return undefined
}

/**
 * Match one emphasis marker.
 * @param {string} text - line text.
 * @param {number} index - candidate offset.
 * @returns {{ marker: string, type: string, close: number } | undefined} match.
 */
function matchEmphasis(text, index) {
  for (const candidate of EMPHASIS) {
    if (!text.startsWith(candidate.marker, index)) continue
    const from = index + candidate.marker.length
    const close = text.indexOf(candidate.marker, from)
    if (close === -1 || close === from) continue
    const inner = text.slice(from, close)
    if (inner.trim() !== inner) continue
    if (candidate.marker.length === 1 && index > 0 && /\w/u.test(text[index - 1])) continue
    if (candidate.marker.length === 1 && close + 1 < text.length && /\w/u.test(text[close + 1])) continue
    return { ...candidate, close }
  }
  return undefined
}

/**
 * Count a repeated character run.
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
