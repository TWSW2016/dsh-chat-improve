// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { STYLE_ID, ensureImproveStyles } from '../src/improve/styles.js'

afterEach(() => {
  document.head.innerHTML = ''
})

describe('ensureImproveStyles', () => {
  it('inserts one stylesheet per page', () => {
    ensureImproveStyles()
    ensureImproveStyles()
    expect(document.querySelectorAll(`#${STYLE_ID}`).length).toBe(1)
    const sheet = document.getElementById(STYLE_ID)
    expect(sheet?.textContent).toContain('.dsh-ci-improve')
    expect(sheet?.textContent).toContain('--dsw-alias-brand-primary')
  })

  it('removes only the sheet it created', () => {
    const remove = ensureImproveStyles()
    const second = ensureImproveStyles()
    second()
    expect(document.getElementById(STYLE_ID)).not.toBeNull()
    remove()
    expect(document.getElementById(STYLE_ID)).toBeNull()
  })
})
