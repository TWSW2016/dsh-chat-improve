import { describe, expect, it } from 'vitest'
import { buildComposerSegments } from '../src/composer/format.js'
import { scanComposerLine } from '../src/composer/scan.js'

/** Run a segment builder with predictable ids. */
function segments(text) {
  let id = 0
  return buildComposerSegments(text, () => String(++id)).map(segment => ({
    text: segment.text,
    kind: /--dsh-ci-kind:([a-z]+)/.exec(segment.style)?.[1] ?? null,
    marker: segment.style.includes('--dsh-ci-marker:1'),
    hidden: segment.style.includes('display:none'),
    bullet: segment.style.includes('background:currentColor'),
  }))
}

describe('scanComposerLine', () => {
  it('reports inline ranges with inner spans', () => {
    const { spans } = scanComposerLine('say `code` and **bold**')
    expect(spans.map(span => span.type)).toEqual(['code', 'strong'])
    expect(spans[0]).toMatchObject({ from: 4, to: 10, innerFrom: 5, innerTo: 9 })
  })

  it('reports a heading prefix', () => {
    expect(scanComposerLine('## Title').prefix).toMatchObject({ type: 'heading', markerTo: 2, bodyFrom: 3 })
  })

  it('reports list prefixes', () => {
    expect(scanComposerLine('  - item').prefix).toMatchObject({ type: 'bullet', indent: 2, markerFrom: 2, markerTo: 3 })
    expect(scanComposerLine('1. item').prefix).toMatchObject({ type: 'ordered', markerFrom: 1, markerTo: 2 })
  })
})

describe('buildComposerSegments', () => {
  it('keeps source text and hides inline-code backticks', () => {
    const result = segments('say `code` now')
    expect(result.map(segment => segment.text).join('')).toBe('say `code` now')
    const code = result.filter(segment => segment.kind === 'code')
    expect(code.map(segment => segment.text)).toEqual(['`', 'code', '`'])
    expect(code[0].marker).toBe(true)
    expect(code[0].hidden).toBe(true)
    expect(code[1].marker).toBe(false)
  })

  it('marks bold markers hidden and the body as strong', () => {
    const result = segments('**bold**')
    expect(result.map(segment => segment.text).join('')).toBe('**bold**')
    expect(result[0]).toMatchObject({ text: '**', kind: 'strong', marker: true, hidden: true })
    expect(result[1]).toMatchObject({ text: 'bold', kind: 'strong', marker: false })
    expect(result[2]).toMatchObject({ text: '**', kind: 'strong', marker: true, hidden: true })
  })

  it('hides a link target and keeps the label', () => {
    const result = segments('see [docs](https://example.com)')
    expect(result.map(segment => segment.text).join('')).toBe('see [docs](https://example.com)')
    expect(result.find(segment => segment.text === 'docs')).toMatchObject({ kind: 'link', marker: false })
    expect(result.some(segment => segment.text === '](https://example.com)')).toBe(true)
  })

  it('renders a bullet marker as a dot and keeps the item text', () => {
    const result = segments('- item')
    expect(result.map(segment => segment.text).join('')).toBe('- item')
    expect(result[0]).toMatchObject({ text: '-', kind: 'bullet', marker: true, bullet: true })
    expect(result[1]).toMatchObject({ text: ' ', kind: null })
    expect(result[2]).toMatchObject({ text: 'item', kind: null })
  })

  it('renders a heading body with a hidden hash prefix', () => {
    const result = segments('## Title')
    expect(result.map(segment => segment.text).join('')).toBe('## Title')
    expect(result[0]).toMatchObject({ text: '##', kind: 'heading', marker: true, hidden: true })
    expect(result[1]).toMatchObject({ text: ' Title', kind: 'heading', marker: false })
  })

  it('leaves plain text and multiplication alone', () => {
    expect(segments('2*3*4').map(segment => segment.text).join('')).toBe('2*3*4')
    expect(segments('plain text')).toHaveLength(1)
  })
})
