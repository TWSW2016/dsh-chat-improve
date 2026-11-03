/** Notice bar above the composer: confirm, failure, rewritten, restored. */
import { useEffect, useSyncExternalStore } from 'react'
import { describeError } from './messages.js'

/** How long a settled notice stays before it clears itself. */
const DISMISS_MS = 8000

/**
 * Build the dock notice component for one plugin registration.
 * @param {{ t: (key: string) => string, controller: ReturnType<typeof import('./store.js').createImproveController> }} options - locale bind and shared controller.
 * @returns {(props: any) => import('react').ReactNode} slot component.
 */
export function createImproveNotice({ t, controller }) {
  return function ImproveNotice({ sessionId, useInput }) {
    const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
    const draft = useInput(input => input.draft)
    const phase = useInput(input => input.phase)
    const refs = useInput(input => input.occurrences.length)

    const settled = state.status === 'ready' || state.notice !== null
    useEffect(() => {
      if (!settled) return undefined
      const timer = setTimeout(() => controller.dismiss(), DISMISS_MS)
      return () => clearTimeout(timer)
    }, [settled, state.status, state.notice])

    const hasRefs = refs > 0 || phase === 'claimed' || /^\s*\//u.test(draft)
    const action = (label, onClick) => (
      <button type="button" className="dsh-ci-improve-notice-action" onClick={onClick}>{label}</button>
    )

    if (state.confirm) {
      return (
        <div className="dsh-ci-improve-notice" role="status" data-dsh-chat-improve-notice="confirm">
          <span className="dsh-ci-improve-notice-text">{t('improve.confirmRefs')}</span>
          {action(t('improve.confirm'), () => { void controller.confirm() })}
          {action(t('improve.cancel'), () => controller.cancel())}
        </div>
      )
    }
    if (state.status === 'error') {
      return (
        <div className="dsh-ci-improve-notice" role="status" data-tone="error" data-dsh-chat-improve-notice="error">
          <span className="dsh-ci-improve-notice-text">{describeError(t, state.error ?? { code: 'unknown', message: '' })}</span>
          {action(t('improve.retry'), () => { void controller.click({ sessionId, hasRefs }) })}
          {action(t('improve.dismiss'), () => controller.dismiss())}
        </div>
      )
    }
    if (state.status === 'ready') {
      return (
        <div className="dsh-ci-improve-notice" role="status" data-dsh-chat-improve-notice="ready">
          <span className="dsh-ci-improve-notice-text">
            {t('improve.ready')}
            {state.truncated ? <span className="dsh-ci-improve-notice-detail"> · {t('improve.truncated')}</span> : null}
          </span>
          {action(t('improve.restore'), () => controller.restore())}
          {action(t('improve.dismiss'), () => controller.dismiss())}
        </div>
      )
    }
    if (state.notice === 'restored') {
      return (
        <div className="dsh-ci-improve-notice" role="status" data-dsh-chat-improve-notice="restored">
          <span className="dsh-ci-improve-notice-text">{t('improve.restored')}</span>
        </div>
      )
    }
    if (state.notice === 'draft-changed') {
      return (
        <div className="dsh-ci-improve-notice" role="status" data-tone="warn" data-dsh-chat-improve-notice="stale">
          <span className="dsh-ci-improve-notice-text">{t('improve.draftChanged')}</span>
          {action(t('improve.dismiss'), () => controller.dismiss())}
        </div>
      )
    }
    return null
  }
}
