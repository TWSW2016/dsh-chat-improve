/**
 * Browser half entry of dsh-chat-improve.
 *
 * Step 0 registers only the locale namespace so the bundle has a real apply
 * body; the composer, transcript, and settings contributions arrive in later
 * steps. Every contribution is effect-scoped so disabling the plugin leaves
 * no residue.
 */

/** @type {string[]} */
export const inject = ['locale']

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function apply(ctx) {
  ctx.effect(() => ctx.locale.register('chat-improve', 'en', {
    'meta.title': 'Chat Improve',
  }))
  ctx.effect(() => ctx.locale.register('chat-improve', 'zh', {
    'meta.title': '聊天增强',
  }))
}
