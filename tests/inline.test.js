import { describe, expect, it } from 'vitest'
import { scanInline } from '../src/user-text/inline.js'

/** Flatten a node tree into a readable shape for assertions. */
function shape(nodes) {
  return nodes.map(node => {
    if (node.type === 'text') return node.text
    if (node.children !== undefined) return { type: node.type, children: shape(node.children) }
    return { type: node.type, text: node.text }
  })
}

describe('scanInline', () => {
  it('keeps plain text as one node', () => {
    expect(shape(scanInline('hello world'))).toEqual(['hello world'])
  })

  it('scans inline code and leaves unmatched backticks literal', () => {
    expect(shape(scanInline('use `pnpm run build` now'))).toEqual([
      'use ',
      { type: 'code', text: 'pnpm run build' },
      ' now',
    ])
    expect(shape(scanInline('a `b'))).toEqual(['a `b'])
  })

  it('scans strong, emphasis, and strikethrough', () => {
    expect(shape(scanInline('**bold** and *em* and ~~gone~~'))).toEqual([
      { type: 'strong', children: ['bold'] },
      ' and ',
      { type: 'em', children: ['em'] },
      ' and ',
      { type: 'delete', children: ['gone'] },
    ])
  })

  it('does not treat a multiplication sign as emphasis', () => {
    expect(shape(scanInline('2*3*4'))).toEqual(['2*3*4'])
  })

  it('parses a link and keeps its label inline', () => {
    expect(shape(scanInline('see [the docs](https://example.com/a)'))).toEqual([
      'see ',
      { type: 'link', children: ['the docs'] },
    ])
  })

  it('supports escaped markers', () => {
    expect(shape(scanInline('literal \\*star\\*'))).toEqual(['literal *star*'])
  })

  it('nests inline code inside strong', () => {
    expect(shape(scanInline('**use `x`**'))).toEqual([
      { type: 'strong', children: ['use ', { type: 'code', text: 'x' }] },
    ])
  })
})
