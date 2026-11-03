/**
 * One place mapping a failure code to localized copy.
 *
 * Codes come from the Host route (src/host/rewrite.js) and from the transport
 * (src/improve/request.js); a provider message is appended, never the draft.
 */

/** Failure codes that own a localized sentence. */
const REASON_KEYS = Object.freeze({
  timeout: 'improve.reason.timeout',
  network: 'improve.reason.network',
  cancelled: 'improve.reason.cancelled',
  'no-model': 'improve.reason.noModel',
  'llm-unavailable': 'improve.reason.llmUnavailable',
  'route-unavailable': 'improve.reason.llmUnavailable',
  'llm-empty': 'improve.reason.llmEmpty',
  'llm-error': 'improve.reason.llmError',
  'bad-response': 'improve.reason.badResponse',
  'draft-too-long': 'improve.reason.draftTooLong',
  'payload-too-large': 'improve.reason.draftTooLong',
})

/** Provider text longer than this is cut before it reaches the notice. */
const MAX_DETAIL = 160

/**
 * Describe one failure for the notice bar.
 * @param {(key: string) => string} t - locale bind.
 * @param {{ code: string, message?: string }} error - failure from the transport.
 * @returns {string} localized sentence, with provider detail when present.
 */
export function describeError(t, error) {
  const key = REASON_KEYS[error.code]
  const base = t(key ?? 'improve.reason.unknown')
  const detail = typeof error.message === 'string' ? error.message.trim() : ''
  if (detail === '') return base
  const cut = detail.length > MAX_DETAIL ? `${detail.slice(0, MAX_DETAIL)}…` : detail
  return `${base} (${cut})`
}
