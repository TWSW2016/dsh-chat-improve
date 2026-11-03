/**
 * Registration for "Improve by AI": one tool-row button and one notice seat.
 *
 * Both slots are session-scoped and carry `useInput`/`inputActions`; the shared
 * controller is created here so the two entries see one state, and the whole
 * registration is one disposer.
 */
import { createImproveButton } from './Button.jsx'
import { createImproveNotice } from './Notice.jsx'
import { createRewriteRequest } from './request.js'
import { createImproveController } from './store.js'
import { ensureImproveStyles } from './styles.js'

/**
 * Register the composer button and its notice bar.
 * @param {import('@deepseek-ai/cordis').Context} ctx - client context carrying `slots`.
 * @param {(key: string) => string} t - locale bind for the `chat-improve` namespace.
 * @returns {() => void} disposer removing both slots, the stylesheet, and in-flight work.
 */
export function registerImprove(ctx, t) {
  const controller = createImproveController({ request: createRewriteRequest() })
  const Button = createImproveButton({ t, controller })
  const Notice = createImproveNotice({ t, controller })
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
    controller.dispose()
    removeStyles()
  }
}
