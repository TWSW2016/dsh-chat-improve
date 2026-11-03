/**
 * POST /chat-improve/rewrite — one draft in, one rewritten prompt out.
 *
 * The route sits beside the composition's own routes (no `/api` prefix, which
 * the connection service owns) and asks that service for a rejection first, so
 * the Host/Origin fence and the login cookie gate every caller. The model call
 * is one-shot: no tools, no session events, no history. Nothing here logs or
 * echoes the draft; responses carry only the rewrite and its route.
 */
import { buildWorkspaceBrief } from './context.js'
import {
  MAX_BODY_BYTES, MAX_DRAFT_CHARS, MAX_OUTPUT_TOKENS, TEMPERATURE,
  cleanRewrite, composeSystemPrompt, parseRewriteBody,
} from './prompt.js'

/** Exact route path registered on the web server. */
export const REWRITE_PATH = '/chat-improve/rewrite'

/**
 * JSON response helper.
 * @param {import('node:http').ServerResponse} res - response.
 * @param {number} status - HTTP status.
 * @param {unknown} payload - JSON body.
 */
function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

/**
 * Answer a non-POST request.
 * @param {import('node:http').ServerResponse} res - response.
 */
function sendMethodNotAllowed(res) {
  res.statusCode = 405
  res.setHeader('allow', 'POST')
  res.end()
}

/**
 * Collect a bounded request body as UTF-8 text.
 * @param {import('node:http').IncomingMessage} req - request.
 * @returns {Promise<string | null>} the body, or null past the ceiling.
 */
async function readBoundedBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.byteLength
    if (size > MAX_BODY_BYTES) {
      // Drain the remainder so the refusal is a readable response, not a socket cut.
      req.resume()
      return null
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks, size).toString('utf8')
}

/**
 * Resolve the model for one session: the model that session last requested, or
 * the deployment default when the session has not run yet.
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context.
 * @param {string | undefined} sessionId - session the draft belongs to.
 * @returns {{ provider: string, model: string } | undefined} the route to call.
 */
function resolveModel(ctx, sessionId) {
  if (typeof sessionId === 'string' && sessionId !== '') {
    const header = ctx.get('sessions')?.get?.(sessionId)?.requestHeader?.()
    const config = header?.config
    if (typeof config?.provider === 'string' && typeof config?.model === 'string') {
      return { provider: config.provider, model: config.model }
    }
  }
  const selection = ctx.get('agentDefaultModel')?.currentSelection?.()
  if (typeof selection?.provider === 'string' && typeof selection?.model === 'string') {
    return { provider: selection.provider, model: selection.model }
  }
  return undefined
}

/**
 * Stream one rewrite and collect its text.
 * @param {{ stream: (options: object) => AsyncIterable<any> }} llm - the model service.
 * @param {{ provider: string, model: string }} route - resolved model.
 * @param {string} draft - the draft to rewrite.
 * @param {string | undefined} brief - bounded workspace facts, or undefined.
 * @param {AbortSignal} signal - caller cancellation.
 * @returns {Promise<{ text: string, finish: any }>} concatenated text and the finish reason.
 */
async function streamRewrite(llm, route, draft, brief, signal) {
  let text = ''
  let finish
  const chunks = llm.stream({
    provider: route.provider,
    model: route.model,
    system: composeSystemPrompt(brief),
    messages: [{ role: 'user', content: [{ type: 'text', text: draft }] }],
    maxTokens: MAX_OUTPUT_TOKENS,
    temperature: TEMPERATURE,
    signal,
  })
  for await (const chunk of chunks) {
    if (chunk?.type === 'text-delta' && typeof chunk.text === 'string') text += chunk.text
    if (chunk?.type === 'finish') {
      finish = chunk.reason
      break
    }
  }
  return { text, finish }
}

/**
 * Handle one rewrite request. Exported for the route tests; the Loader only
 * calls {@link registerRewriteRoute}.
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context carrying webServer and connection.
 * @param {import('node:http').IncomingMessage} req - request.
 * @param {import('node:http').ServerResponse} res - response.
 */
export async function handleRewrite(ctx, req, res) {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res)
    return
  }
  const connection = ctx.get('connection')
  if (typeof connection?.requestRejection !== 'function') {
    // Without the trust fence there is no safe way to answer: fail closed.
    sendJson(res, 503, { code: 'route-unavailable', message: 'connection service is unavailable' })
    return
  }
  const rejection = connection.requestRejection(req)
  if (rejection !== undefined) {
    res.statusCode = rejection
    res.end()
    return
  }
  const essence = String(req.headers['content-type']).split(';', 1)[0]?.trim().toLowerCase()
  if (essence !== 'application/json') {
    sendJson(res, 415, { code: 'unsupported-media-type', message: 'content-type must be application/json' })
    return
  }
  let text
  try {
    text = await readBoundedBody(req)
  } catch {
    // Swallows a mid-body connection error: there is nothing left to answer precisely.
    sendJson(res, 400, { code: 'bad-request', message: 'request body unreadable' })
    return
  }
  if (text === null) {
    sendJson(res, 413, { code: 'payload-too-large', message: 'request body is too large' })
    return
  }
  const parsed = parseRewriteBody(text)
  if (!parsed.ok) {
    if (parsed.code === 'draft-too-long') {
      sendJson(res, 400, { code: parsed.code, message: `draft exceeds ${MAX_DRAFT_CHARS} characters` })
    } else {
      sendJson(res, 400, { code: parsed.code, message: 'body must be JSON with a non-empty string "draft"' })
    }
    return
  }
  const llm = ctx.get('llm')
  if (typeof llm?.stream !== 'function') {
    sendJson(res, 503, { code: 'llm-unavailable', message: 'no model service in this composition' })
    return
  }
  const route = resolveModel(ctx, parsed.sessionId)
  if (route === undefined) {
    sendJson(res, 409, { code: 'no-model', message: 'no model selected for this session' })
    return
  }
  const brief = await buildWorkspaceBrief(ctx, parsed.sessionId)
  const controller = new AbortController()
  res.on('close', () => { controller.abort() })
  let outcome
  try {
    outcome = await streamRewrite(llm, route, parsed.draft, brief, controller.signal)
  } catch (error) {
    sendJson(res, 502, { code: 'llm-error', message: error instanceof Error ? error.message : 'rewrite failed' })
    return
  }
  const reason = outcome.finish
  if (reason?.kind === 'aborted') {
    // The page went away mid-stream; there is no one left to answer.
    if (controller.signal.aborted) return
    sendJson(res, 502, { code: 'llm-error', message: 'rewrite was aborted' })
    return
  }
  if (reason?.kind === 'error') {
    sendJson(res, 502, { code: 'llm-error', message: reason.failure?.message ?? 'rewrite failed' })
    return
  }
  const rewritten = cleanRewrite(outcome.text)
  if (rewritten === undefined) {
    sendJson(res, 502, { code: 'llm-empty', message: 'model returned no prompt text' })
    return
  }
  const payload = { text: rewritten, model: { provider: route.provider, model: route.model } }
  if (reason?.kind === 'max-tokens') payload.truncated = true
  sendJson(res, 200, payload)
}

/**
 * Register the rewrite route on the composition's web server.
 * @param {import('@deepseek-ai/cordis').Context} ctx - context carrying `webServer`.
 * @returns {() => void} route disposer.
 */
export function registerRewriteRoute(ctx) {
  return ctx.webServer.register({
    kind: 'exact',
    path: REWRITE_PATH,
    handler: async (req, res) => {
      try {
        await handleRewrite(ctx, req, res)
      } catch (error) {
        if (!res.headersSent) {
          sendJson(res, 502, { code: 'llm-error', message: error instanceof Error ? error.message : 'rewrite failed' })
        } else {
          res.end()
        }
      }
    },
  })
}
