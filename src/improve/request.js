/**
 * Browser transport for the rewrite route.
 *
 * Every failure becomes a `{ ok: false, code }` value so the controller has one
 * shape to reason about; the draft never appears in a code or a message.
 */

/** Document-relative route the Host serves (see src/host/rewrite.js). */
export const REWRITE_ROUTE = 'chat-improve/rewrite'
/** Whole-request deadline: a rewrite that cannot finish in this window is abandoned. */
export const REQUEST_TIMEOUT_MS = 90_000

/**
 * Read a JSON body without failing the call on a non-JSON response.
 * @param {Response} response - fetch response.
 * @returns {Promise<any>} parsed body, or undefined.
 */
async function readJson(response) {
  try {
    return await response.json()
  } catch {
    // Swallows a non-JSON body: the status code already carries the outcome.
    return undefined
  }
}

/**
 * Build the rewrite transport over one fetch implementation.
 * @param {typeof fetch} [fetchImpl] - fetch, or a stand-in in tests.
 * @returns {(input: { draft: string, sessionId?: string, signal?: AbortSignal }) => Promise<
 *   { ok: true, text: string, truncated: boolean } | { ok: false, code: string, message?: string }>} request function.
 */
export function createRewriteRequest(fetchImpl) {
  const doFetch = fetchImpl ?? globalThis.fetch
  return async function requestRewrite({ draft, sessionId, signal }) {
    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, REQUEST_TIMEOUT_MS)
    const relay = () => controller.abort()
    if (signal !== undefined) {
      if (signal.aborted) controller.abort()
      else signal.addEventListener('abort', relay, { once: true })
    }
    try {
      const response = await doFetch(REWRITE_ROUTE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(sessionId === undefined ? { draft } : { draft, sessionId }),
        signal: controller.signal,
      })
      const payload = await readJson(response)
      if (!response.ok) {
        return { ok: false, code: payload?.code ?? `http-${response.status}`, message: payload?.message ?? '' }
      }
      if (typeof payload?.text !== 'string' || payload.text.trim() === '') {
        return { ok: false, code: 'bad-response', message: '' }
      }
      return { ok: true, text: payload.text, truncated: payload.truncated === true }
    } catch (error) {
      if (timedOut) return { ok: false, code: 'timeout', message: '' }
      if (signal?.aborted === true) return { ok: false, code: 'cancelled', message: '' }
      return { ok: false, code: 'network', message: error instanceof Error ? error.message : '' }
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', relay)
    }
  }
}
