import { describe, expect, it } from 'vitest'
import { REWRITE_PATH, handleRewrite } from '../src/host/rewrite.js'

/**
 * Build a request stand-in as an async iterable of body chunks.
 * @param {unknown} body - JSON-serializable body, or a raw string.
 * @param {{ method?: string, contentType?: string }} [options] - request controls.
 * @returns {any} request stand-in.
 */
function fakeRequest(body, options = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  const bytes = Buffer.from(text, 'utf8')
  return {
    method: options.method ?? 'POST',
    headers: { 'content-type': options.contentType ?? 'application/json' },
    async *[Symbol.asyncIterator]() {
      yield bytes
    },
    resume() {},
  }
}

/** Response stand-in that records status, headers, and body. */
function fakeResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    headersSent: false,
    setHeader(name, value) {
      this.headers[name] = value
    },
    end(chunk) {
      this.body = typeof chunk === 'string' ? chunk : ''
      this.headersSent = true
    },
    on() {},
  }
}

/**
 * Build a context whose `get` reads one service table.
 * @param {Record<string, unknown>} services - service table.
 * @returns {any} context stand-in.
 */
function fakeContext(services) {
  return { get: name => services[name] }
}

/** LLM stand-in streaming the given chunks. */
function fakeLlm(chunks) {
  return {
    stream: () => (async function* generate() {
      for (const chunk of chunks) yield chunk
    })(),
  }
}

const reachable = {
  connection: { requestRejection: () => undefined },
  agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
}

describe('handleRewrite', () => {
  it('registers beside the composition routes, not under /api', () => {
    expect(REWRITE_PATH).toBe('/chat-improve/rewrite')
  })

  it('fails closed when the trust fence is missing', async () => {
    const res = fakeResponse()
    await handleRewrite(fakeContext({}), fakeRequest({ draft: 'x' }), res)
    expect(res.statusCode).toBe(503)
    expect(JSON.parse(res.body).code).toBe('route-unavailable')
  })

  it('answers the fence rejection with its status and no body', async () => {
    const res = fakeResponse()
    const ctx = fakeContext({ connection: { requestRejection: () => 401 } })
    await handleRewrite(ctx, fakeRequest({ draft: 'x' }), res)
    expect(res.statusCode).toBe(401)
    expect(res.body).toBe('')
  })

  it('rejects a non-POST method', async () => {
    const res = fakeResponse()
    await handleRewrite(fakeContext(reachable), fakeRequest('', { method: 'GET' }), res)
    expect(res.statusCode).toBe(405)
    expect(res.headers.allow).toBe('POST')
  })

  it('rejects a non-JSON media type', async () => {
    const res = fakeResponse()
    const ctx = fakeContext(reachable)
    await handleRewrite(ctx, fakeRequest({ draft: 'x' }, { contentType: 'text/plain' }), res)
    expect(res.statusCode).toBe(415)
  })

  it('rejects a body without a usable draft', async () => {
    const res = fakeResponse()
    await handleRewrite(fakeContext(reachable), fakeRequest({ draft: '  ' }), res)
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).code).toBe('bad-request')
  })

  it('reports a draft past the ceiling with its own code', async () => {
    const res = fakeResponse()
    await handleRewrite(fakeContext(reachable), fakeRequest({ draft: 'a'.repeat(20001) }), res)
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).code).toBe('draft-too-long')
  })

  it('reports a missing model service', async () => {
    const res = fakeResponse()
    await handleRewrite(fakeContext(reachable), fakeRequest({ draft: 'x' }), res)
    expect(res.statusCode).toBe(503)
    expect(JSON.parse(res.body).code).toBe('llm-unavailable')
  })

  it('reports a missing model selection', async () => {
    const res = fakeResponse()
    const ctx = fakeContext({ connection: reachable.connection, llm: fakeLlm([]) })
    await handleRewrite(ctx, fakeRequest({ draft: 'x' }), res)
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.body).code).toBe('no-model')
  })

  it('prefers the session model over the deployment default', async () => {
    const res = fakeResponse()
    const seen = []
    const ctx = fakeContext({
      connection: reachable.connection,
      llm: {
        stream: (options) => {
          seen.push(options)
          return (async function* generate() {
            yield { type: 'text-delta', index: 0, text: 'better' }
            yield { type: 'finish', reason: { kind: 'stop' } }
          })()
        },
      },
      sessions: { get: () => ({ requestHeader: () => ({ config: { provider: 'session-p', model: 'session-m' } }) }) },
      agentDefaultModel: { currentSelection: () => ({ provider: 'default-p', model: 'default-m' }) },
    })
    await handleRewrite(ctx, fakeRequest({ draft: 'fix it', sessionId: 'session-1' }), res)
    expect(res.statusCode).toBe(200)
    expect(seen[0].provider).toBe('session-p')
    expect(JSON.parse(res.body)).toEqual({ text: 'better', model: { provider: 'session-p', model: 'session-m' } })
  })

  it('falls back to the deployment default on a session without a request header', async () => {
    const res = fakeResponse()
    const ctx = fakeContext({
      connection: reachable.connection,
      llm: fakeLlm([
        { type: 'text-delta', index: 0, text: 'better' },
        { type: 'finish', reason: { kind: 'stop' } },
      ]),
      sessions: { get: () => ({ requestHeader: () => undefined }) },
      agentDefaultModel: { currentSelection: () => ({ provider: 'default-p', model: 'default-m' }) },
    })
    await handleRewrite(ctx, fakeRequest({ draft: 'fix it', sessionId: 'session-1' }), res)
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).model).toEqual({ provider: 'default-p', model: 'default-m' })
  })

  it('sends the draft verbatim as the only user message, with no tools', async () => {
    const res = fakeResponse()
    const seen = []
    const ctx = fakeContext({
      connection: reachable.connection,
      llm: {
        stream: (options) => {
          seen.push(options)
          return (async function* generate() {
            yield { type: 'text-delta', index: 0, text: 'ok' }
            yield { type: 'finish', reason: { kind: 'stop' } }
          })()
        },
      },
      agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
    })
    await handleRewrite(ctx, fakeRequest({ draft: '修复 这个 图' }), res)
    expect(seen[0].messages).toEqual([{ role: 'user', content: [{ type: 'text', text: '修复 这个 图' }] }])
    expect(seen[0].tools).toBeUndefined()
    expect(seen[0].sessionId).toBeUndefined()
  })

  it('flags a max-tokens finish as truncated', async () => {
    const res = fakeResponse()
    const ctx = fakeContext({
      connection: reachable.connection,
      llm: fakeLlm([
        { type: 'text-delta', index: 0, text: 'half a prom' },
        { type: 'finish', reason: { kind: 'max-tokens' } },
      ]),
      agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
    })
    await handleRewrite(ctx, fakeRequest({ draft: 'x' }), res)
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).truncated).toBe(true)
  })

  it('maps an empty model answer to llm-empty', async () => {
    const res = fakeResponse()
    const ctx = fakeContext({
      connection: reachable.connection,
      llm: fakeLlm([{ type: 'finish', reason: { kind: 'stop' } }]),
      agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
    })
    await handleRewrite(ctx, fakeRequest({ draft: 'x' }), res)
    expect(res.statusCode).toBe(502)
    expect(JSON.parse(res.body).code).toBe('llm-empty')
  })

  it('maps a provider failure to llm-error with its message', async () => {
    const res = fakeResponse()
    const ctx = fakeContext({
      connection: reachable.connection,
      llm: fakeLlm([{ type: 'finish', reason: { kind: 'error', failure: { message: 'rate limited', code: 'x' } } }]),
      agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
    })
    await handleRewrite(ctx, fakeRequest({ draft: 'x' }), res)
    expect(res.statusCode).toBe(502)
    expect(JSON.parse(res.body)).toMatchObject({ code: 'llm-error', message: 'rate limited' })
  })

  it('never echoes the draft in a failure body', async () => {
    const res = fakeResponse()
    const ctx = fakeContext({
      connection: reachable.connection,
      llm: { stream: () => { throw new Error('boom') } },
      agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
    })
    await handleRewrite(ctx, fakeRequest({ draft: 'secret-draft-text' }), res)
    expect(res.statusCode).toBe(502)
    expect(res.body).not.toContain('secret-draft-text')
  })
})
