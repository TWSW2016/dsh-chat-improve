/** Composer button that asks the Host to rewrite the current draft. */
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { focusComposer } from './focus.js'

/** Sparkles glyph; no icon package is a baseline dependency of this plugin. */
function Sparkles() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5l1.15 3.1L12.25 5.75 9.15 6.9 8 10l-1.15-3.1L3.75 5.75 6.85 4.6 8 1.5z" fill="currentColor" />
      <path d="M12.5 9.5l.62 1.63 1.63.62-1.63.62L12.5 14l-.62-1.63-1.63-.62 1.63-.62.62-1.63z" fill="currentColor" opacity="0.75" />
    </svg>
  )
}

/** Same glyph, rotated while a request is in flight. */
function SparklesBusy() {
  return (
    <span className="dsh-ci-improve-spin" style={{ display: 'inline-flex' }}>
      <Sparkles />
    </span>
  )
}

/**
 * Build the button component for one plugin registration.
 * @param {{ t: (key: string) => string, controllerFor: (sessionId: string) => any }} options - locale bind and per-session controller table.
 * @returns {(props: any) => import('react').ReactNode} slot component.
 */
export function createImproveButton({ t, controllerFor }) {
  return function ImproveButton({ useInput, inputActions, sessionId }) {
    const controller = controllerFor(sessionId)
    const draft = useInput(state => state.draft)
    const rev = useInput(state => state.draftRev)
    const phase = useInput(state => state.phase)
    const refs = useInput(state => state.occurrences.length)
    const status = useSyncExternalStore(controller.subscribe, controller.getSnapshot).status

    // The controller reads through this ref, so it always sees the newest
    // draft without re-binding the port on every keystroke.
    const latest = useRef({ draft, rev })
    latest.current = { draft, rev }
    useEffect(() => controller.bind({
      getInput: () => latest.current,
      setDraft: text => inputActions.setDraft(text),
      focus: focusComposer,
    }), [controller, inputActions])

    const running = status === 'running'
    const empty = draft.trim() === ''
    const locked = phase !== 'plain'
    const disabled = running || empty || locked
    const title = running
      ? t('improve.hintRunning')
      : empty
        ? t('improve.hintEmpty')
        : locked
          ? t('improve.hintBusy')
          : t('improve.label')
    const hasRefs = refs > 0 || phase === 'claimed' || /^\s*\//u.test(draft)

    return (
      <button
        type="button"
        className="dsh-ci-improve"
        data-dsh-chat-improve-improve=""
        data-busy={running ? 'true' : 'false'}
        aria-label={t('improve.label')}
        title={title}
        disabled={disabled}
        onClick={() => { void controller.click({ sessionId, hasRefs }) }}
      >
        {running ? <SparklesBusy /> : <Sparkles />}
      </button>
    )
  }
}
