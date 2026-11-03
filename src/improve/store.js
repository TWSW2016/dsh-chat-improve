/**
 * Client state machine for one "Improve by AI" request.
 *
 * It owns no DOM and no transport: components bind a port (read the draft,
 * write the draft, return focus) and the route call is injected, so the whole
 * flow runs in tests without React or a browser.
 */

/** One idle, empty state. Spread this so every transition starts complete. */
const EMPTY = Object.freeze({
  status: 'idle',
  confirm: false,
  truncated: false,
  error: null,
  notice: null,
  original: null,
  rewritten: null,
})

/**
 * @typedef {{ draft: string, rev: number }} ImproveInput
 * @typedef {{
 *   getInput: () => ImproveInput,
 *   setDraft: (text: string) => void,
 *   focus: () => void,
 * }} ImprovePort
 * @typedef {{
 *   ok: true, text: string, truncated?: boolean,
 * } | {
 *   ok: false, code: string, message?: string,
 * }} ImproveResult
 */

/**
 * Create the controller one mounted composer uses.
 * @param {{ request: (input: { draft: string, sessionId?: string, signal: AbortSignal }) => Promise<ImproveResult> }} options - injected transport.
 * @returns {{
 *   getSnapshot: () => typeof EMPTY,
 *   subscribe: (listener: () => void) => () => void,
 *   bind: (port: ImprovePort) => () => void,
 *   click: (request: { sessionId?: string, hasRefs: boolean }) => Promise<void> | undefined,
 *   confirm: () => Promise<void> | undefined,
 *   cancel: () => void,
 *   restore: () => void,
 *   dismiss: () => void,
 *   dispose: () => void,
 * }} the controller.
 */
export function createImproveController({ request }) {
  if (typeof request !== 'function') throw new TypeError('createImproveController needs a request function')
  let state = EMPTY
  const listeners = new Set()
  let port
  let pending
  let inflight
  let token = 0
  let disposed = false

  /** Publish one complete state. */
  const emit = next => {
    state = Object.freeze(next)
    for (const listener of listeners) listener()
  }

  /**
   * Run one request against a snapshot of the draft.
   * @param {string} draft - draft the rewrite is based on.
   * @param {number} rev - editor revision at click time.
   * @param {string | undefined} sessionId - owning session.
   */
  const start = async (draft, rev, sessionId) => {
    const mine = ++token
    const controller = new AbortController()
    inflight = controller
    emit({ ...EMPTY, status: 'running' })
    let result
    try {
      result = await request({ draft, sessionId, signal: controller.signal })
    } catch (error) {
      result = { ok: false, code: 'network', message: error instanceof Error ? error.message : '' }
    }
    // A disposed controller or a newer click owns the state now.
    if (disposed || mine !== token) return
    inflight = undefined
    if (!result.ok) {
      if (result.code === 'cancelled') {
        emit(EMPTY)
        return
      }
      emit({ ...EMPTY, status: 'error', error: { code: result.code, message: result.message ?? '' } })
      return
    }
    const latest = port?.getInput()
    if (latest !== undefined && latest.rev !== rev) {
      // The author kept typing: never overwrite that.
      emit({ ...EMPTY, notice: 'draft-changed' })
      return
    }
    port?.setDraft(result.text)
    port?.focus()
    emit({
      ...EMPTY,
      status: 'ready',
      original: draft,
      rewritten: result.text,
      truncated: result.truncated === true,
    })
  }

  return {
    getSnapshot: () => state,

    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },

    bind(nextPort) {
      port = nextPort
      return () => { if (port === nextPort) port = undefined }
    },

    click({ sessionId, hasRefs }) {
      if (disposed || state.status === 'running' || state.confirm) return undefined
      const input = port?.getInput()
      if (input === undefined || input.draft.trim() === '') return undefined
      if (hasRefs) {
        pending = { draft: input.draft, rev: input.rev, sessionId }
        emit({ ...EMPTY, confirm: true })
        return undefined
      }
      return start(input.draft, input.rev, sessionId)
    },

    confirm() {
      if (disposed || pending === undefined) return undefined
      const next = pending
      pending = undefined
      return start(next.draft, next.rev, next.sessionId)
    },

    cancel() {
      pending = undefined
      if (state.confirm) emit(EMPTY)
    },

    restore() {
      if (disposed || state.original === null) return
      const latest = port?.getInput()
      if (latest !== undefined && latest.draft !== state.rewritten) {
        emit({ ...EMPTY, notice: 'draft-changed' })
        return
      }
      port?.setDraft(state.original)
      port?.focus()
      emit({ ...EMPTY, notice: 'restored' })
    },

    dismiss() {
      if (state.status === 'running') return
      emit(EMPTY)
    },

    dispose() {
      disposed = true
      inflight?.abort()
      inflight = undefined
      pending = undefined
      listeners.clear()
      state = EMPTY
    },
  }
}
