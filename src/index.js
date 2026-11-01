/**
 * Host half of dsh-chat-improve.
 *
 * The plugin is presentation-only: the browser half owns every visible
 * surface, and the Host half exists so the bundle has a Loader row and a
 * place for the plugin Config (step 1). No tool, prompt, or session event is
 * contributed.
 */

/** @param {import('@deepseek-ai/cordis').Context} _ctx */
export function apply(_ctx) {
  // Intentionally empty until the settings Config lands.
}
