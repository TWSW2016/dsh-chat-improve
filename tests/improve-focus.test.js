// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { focusComposer } from '../src/improve/focus.js'

/**
 * Mount a composer stand-in.
 * @param {any} [editor] - value for `__lexicalEditor`.
 * @returns {any} the element.
 */
function mount(editor) {
  const root = document.createElement('div')
  root.setAttribute('data-composer-input', '')
  if (editor !== undefined) root.__lexicalEditor = editor
  root.focus = vi.fn()
  document.body.append(root)
  return root
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('focusComposer', () => {
  it('focuses the composer Lexical editor at the document end', () => {
    const editor = { focus: vi.fn() }
    mount(editor)
    focusComposer()
    expect(editor.focus).toHaveBeenCalledWith(undefined, { defaultSelection: 'rootEnd' })
  })

  it('falls back to DOM focus when the editor refuses', () => {
    const editor = { focus: () => { throw new Error('detached') } }
    const root = mount(editor)
    focusComposer()
    expect(root.focus).toHaveBeenCalled()
  })

  it('falls back to DOM focus without an editor', () => {
    const root = mount(undefined)
    focusComposer()
    expect(root.focus).toHaveBeenCalled()
  })

  it('is a no-op without a composer', () => {
    expect(() => focusComposer()).not.toThrow()
  })
})
