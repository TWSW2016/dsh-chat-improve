/**
 * Return the keyboard to the composer with the caret at the end of the draft.
 *
 * The official input API has no focus seat, and a programmatic draft write
 * leaves focus on the button, so this reaches the composer's own Lexical
 * instance (the same seam src/composer/ already uses) and fails back to a
 * plain DOM focus.
 */
export function focusComposer() {
  const root = document.querySelector('[data-composer-input]')
  if (root === null || root === undefined) return
  const editor = root.__lexicalEditor
  if (editor === null || editor === undefined) {
    root.focus?.()
    return
  }
  try {
    editor.focus(undefined, { defaultSelection: 'rootEnd' })
  } catch {
    // A detached or mid-composition editor still takes a plain focus.
    root.focus?.()
  }
}
