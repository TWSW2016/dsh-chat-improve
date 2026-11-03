/**
 * One stylesheet for the Improve by AI button and notice.
 *
 * Tokens only (the Theme contract), injected once per page and removed by the
 * registration that created it, matching src/mermaid/enhance.js.
 */

export const STYLE_ID = 'dsh-chat-improve-improve-styles'

const CSS = `
.dsh-ci-improve {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.dsh-ci-improve:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
}
.dsh-ci-improve:disabled { opacity: 0.45; cursor: default; }
.dsh-ci-improve:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dsh-ci-improve-spin { animation: dsh-ci-improve-spin 0.9s linear infinite; }
@keyframes dsh-ci-improve-spin { to { transform: rotate(360deg); } }
.dsh-ci-improve-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  padding: 6px 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  line-height: 1.45;
}
.dsh-ci-improve-notice[data-tone="error"] { border-color: var(--dsw-alias-state-error-primary); }
.dsh-ci-improve-notice[data-tone="warn"] { border-color: var(--dsw-alias-state-warn-primary); }
.dsh-ci-improve-notice-text { min-width: 0; }
.dsh-ci-improve-notice-detail { color: var(--dsw-alias-label-secondary); }
.dsh-ci-improve-notice-action {
  flex: none;
  padding: 2px 6px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--dsw-alias-brand-primary);
  font-size: 12px;
  cursor: pointer;
}
.dsh-ci-improve-notice-action:hover { background: var(--dsw-alias-bg-layer-1); }
.dsh-ci-improve-notice-action:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
`

/**
 * Insert the stylesheet unless it is already present.
 * @returns {() => void} disposer removing the sheet only when this call created it.
 */
export function ensureImproveStyles() {
  if (document.getElementById(STYLE_ID) !== null) return () => {}
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.append(style)
  return () => { style.remove() }
}
