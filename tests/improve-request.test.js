import { afterEach, describe, expect, it, vi } from 'vitest'
import { REQUEST_TIMEOUT_MS, REWRITE_ROUTE, createRewriteRequest } from '../src/improve/request.js'

/**
 * Build a fetch stand-in answering one canned response.
 * @param {number} status - HTTP status.
 * @param {unknown} body - JSON body, or a value that fails `json()`.
 * @param {boolean} [broken] - make `json()` reject.
 * @returns {any} fetch stand-in.
 */
function fakeFetch(status, body, broken = false) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (broken) throw new Error('not json')
      return body
    },
  }))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('createRewriteRequest', () => {
  it('posts the draft to the document-relative route', async () => {
    const fetchImpl = fakeFetch(200, { text: 'better', model: { provider: 'p', model: 'm' } })
    const request = createRewriteRequest(fetchImpl)
    const result = await request({ draft: 'fix this', sessionId: 'session-1' })
    expect(result).toEqual({ ok: true, text: 'better', truncated: false })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe(REWRITE_ROUTE)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ draft: 'fix this', sessionId: 'session-1' })
    expect(init.credentials).toBe('same-origin')
  })

  it('omits an absent session id', async () => {
    const fetchImpl = fakeFetch(200, { text: 'better' })
    await createRewriteRequest(fetchImpl)({ draft: 'x' })
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ draft: 'x' })
  })

  it('carries the truncated flag', async () => {
    const fetchImpl = fakeFetch(200, { text: 'cut', truncated: true })
    expect(await createRewriteRequest(fetchImpl)({ draft: 'x' })).toEqual({ ok: true, text: 'cut', truncated: true })
  })

  it('propagates the route failure code and message', async () => {
    const fetchImpl = fakeFetch(409, { code: 'no-model', message: 'no model selected' })
    expect(await createRewriteRequest(fetchImpl)({ draft: 'x' }))
      .toEqual({ ok: false, code: 'no-model', message: 'no model selected' })
  })

  it('falls back to the status when the body is not JSON', async () => {
    const fetchImpl = fakeFetch(500, undefined, true)
    expect(await createRewriteRequest(fetchImpl)({ draft: 'x' })).toEqual({ ok: false, code: 'http-500', message: '' })
  })

  it('rejects a successful response without text', async () => {
    const fetchImpl = fakeFetch(200, { text: '   ' })
    expect(await createRewriteRequest(fetchImpl)({ draft: 'x' })).toEqual({ ok: false, code: 'bad-response', message: '' })
  })

  it('reports a transport failure as network', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('offline') })
    expect(await createRewriteRequest(fetchImpl)({ draft: 'x' })).toEqual({ ok: false, code: 'network', message: 'offline' })
  })

  it('reports an already-cancelled call as cancelled', async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      if (init.signal.aborted) throw new Error('aborted')
      throw new Error('unexpected')
    })
    const outer = new AbortController()
    outer.abort()
    expect(await createRewriteRequest(fetchImpl)({ draft: 'x', signal: outer.signal }))
      .toEqual({ ok: false, code: 'cancelled', message: '' })
  })

  it('gives up at the deadline', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')))
    }))
    const pending = createRewriteRequest(fetchImpl)({ draft: 'x' })
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1)
    expect(await pending).toEqual({ ok: false, code: 'timeout', message: '' })
  })
})
