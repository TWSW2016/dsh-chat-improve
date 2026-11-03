import { describe, expect, it } from 'vitest'
import { describeError } from '../src/improve/messages.js'

/** Translate through a fixed dictionary, echoing unknown keys. */
function makeT(dict) {
  return key => dict[key] ?? key
}

describe('describeError', () => {
  const t = makeT({
    'improve.reason.unknown': 'Rewrite failed',
    'improve.reason.timeout': 'The request timed out',
    'improve.reason.noModel': 'No model is available for this session',
    'improve.reason.llmError': 'The model call failed',
  })

  it('maps a known code to its sentence', () => {
    expect(describeError(t, { code: 'timeout' })).toBe('The request timed out')
    expect(describeError(t, { code: 'no-model' })).toBe('No model is available for this session')
  })

  it('falls back for an unknown code', () => {
    expect(describeError(t, { code: 'http-500' })).toBe('Rewrite failed')
  })

  it('appends provider detail without the draft', () => {
    expect(describeError(t, { code: 'llm-error', message: 'rate limited' }))
      .toBe('The model call failed (rate limited)')
  })

  it('cuts an overlong provider message', () => {
    const text = describeError(t, { code: 'llm-error', message: 'x'.repeat(400) })
    expect(text.endsWith('…)')).toBe(true)
    expect(text.length).toBeLessThan(200)
  })
})
