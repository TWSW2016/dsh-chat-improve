/** Attach composer formatting to the current Lexical editor. */
import { attachComposerFormatting } from './format.js'

/**
 * Watch the composer root and bind formatting to whichever editor is current.
 * @returns {() => void} disposer.
 */
export function startComposerFormatting() {
  let editor
  let detach

  const attach = () => {
    const root = document.querySelector('[data-composer-input]')
    const next = root?.__lexicalEditor
    if (next === editor) return
    detach?.()
    detach = undefined
    editor = next
    if (editor !== undefined && editor !== null) detach = attachComposerFormatting(editor)
  }

  attach()
  const onFocus = () => attach()
  const onInput = () => attach()
  document.addEventListener('focusin', onFocus, true)
  document.addEventListener('input', onInput, true)

  return () => {
    document.removeEventListener('focusin', onFocus, true)
    document.removeEventListener('input', onInput, true)
    detach?.()
    detach = undefined
    editor = undefined
  }
}
