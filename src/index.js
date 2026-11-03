/**
 * Host half of dsh-chat-improve.
 *
 * The browser half owns every visible surface. This half exists for two
 * reasons: the bundle needs a Loader row, and "Improve by AI" needs a model
 * call, which only the Host can make. The route is registered behind the
 * composition's trust fence and writes nothing to the session.
 */
import { registerRewriteRoute } from './host/rewrite.js'

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  ctx.inject(['webServer', 'connection'], (scope) => {
    scope.effect(() => registerRewriteRoute(scope), 'dsh-chat-improve: POST /chat-improve/rewrite')
  })
}
