import { describe, expect, it } from 'vitest'
import { normalizeUserText, planUserMarkdown } from '../src/user-text/plan.js'

const kinds = tokens => tokens.map(token => token.kind)

describe('normalizeUserText', () => {
  it('turns CRLF into one LF', () => {
    expect(normalizeUserText('a\r\nb')).toBe('a\nb')
  })

  it('drops a lone CR instead of turning it into a line break', () => {
    expect(normalizeUserText('a\r\n\rb')).toBe('a\nb')
    expect(normalizeUserText('a\rb')).toBe('ab')
  })

  it('keeps genuine blank lines', () => {
    expect(normalizeUserText('a\n\nb')).toBe('a\n\nb')
  })
})

describe('planUserMarkdown', () => {
  it('does not add a break after a list item', () => {
    const tokens = planUserMarkdown('intro\n1. one\n2. two')
    expect(kinds(tokens)).toEqual(['text', 'break', 'list', 'list'])
  })

  it('does not add a break after a heading, quote, or rule', () => {
    expect(kinds(planUserMarkdown('# heading\nbody'))).toEqual(['heading', 'text'])
    expect(kinds(planUserMarkdown('> quote\nbody'))).toEqual(['quote', 'text'])
    expect(kinds(planUserMarkdown('---\nbody'))).toEqual(['rule', 'text'])
  })

  it('keeps a break between inline lines', () => {
    expect(kinds(planUserMarkdown('one\ntwo'))).toEqual(['text', 'break', 'text'])
  })

  it('preserves one genuine blank line', () => {
    const tokens = planUserMarkdown('a\n\nb')
    expect(kinds(tokens)).toEqual(['text', 'break', 'text', 'break', 'text'])
    expect(tokens[2].text).toBe('')
  })

  it('does not invent a blank line from CRLF plus a lone CR', () => {
    const tokens = planUserMarkdown('1. one\r\n\r2. two')
    expect(kinds(tokens)).toEqual(['list', 'list'])
  })

  it('keeps a fenced code block as one block without delimiter breaks', () => {
    const tokens = planUserMarkdown('intro\n```js\nconst a = 1\n\nconst b = 2\n```\nend')
    expect(kinds(tokens)).toEqual(['text', 'break', 'code', 'text'])
    expect(tokens[2].text).toBe('const a = 1\n\nconst b = 2')
  })

  it('keeps an unclosed fence as one code block', () => {
    const tokens = planUserMarkdown('```js\nconst a = 1')
    expect(kinds(tokens)).toEqual(['code'])
    expect(tokens[0].text).toBe('const a = 1')
  })

  it('keeps list indentation and ordered markers', () => {
    const unordered = planUserMarkdown('  - item')[0]
    expect(unordered).toMatchObject({ kind: 'list', indent: 2, marker: '•', text: 'item' })
    const ordered = planUserMarkdown('1. item')[0]
    expect(ordered).toMatchObject({ kind: 'list', indent: 0, marker: '1.', text: 'item' })
  })

  it('handles empty text', () => {
    expect(planUserMarkdown('')).toEqual([{ kind: 'text', block: false, text: '' }])
  })
})
