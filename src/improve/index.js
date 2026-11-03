/**
 * Registration for "Improve by AI": one tool-row button and one notice seat.
 *
 * Both slots are session-scoped and carry `useInput`/`inputActions`. Each
 * session gets its own controller so a rewritten draft in one session never
 * shows its notice, or its restore target, in another.
 */
import { createImproveButton } from './Button.jsx'
import { createImproveNotice } from './Notice.jsx'
import { createImproveControllers } from './registry.js'
import { createRewriteRequest } from './request.js'
import { ensureImproveStyles } from './styles.js'

/**
 * Register the composer button and its notice bar.
 * @param {import('@deepseek-ai/cordis').Context} ctx - client context carrying `slots`.
 * @param {(key: string) => string} t - locale bind for the `chat-improve` namespace.
 * @returns {() => void} disposer removing both slots, the stylesheet, and in-flight work.
 */
export function registerImprove(ctx, t) {
  const controllers = createImproveControllers({ request: createRewriteRequest() })
  const controllerFor = sessionId => controllers.for(sessionId)
  const Button = createImproveButton({ t, controllerFor })
  const Notice = createImproveNotice({ t, controllerFor })
  const removeStyles = ensureImproveStyles()

  const offButton = ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'chat-improve.improve',
    order: 10,
  }, Button))

  const offNotice = ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'chat-improve.improve-notice',
    order: 30,
  }, Notice))

  return () => {
    offNotice()
    offButton()
    controllers.dispose()
    removeStyles()
  }
}
