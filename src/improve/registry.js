/**
 * One controller per session.
 *
 * Both slots are session-scoped, and a single shared controller would show one
 * session's "rewritten" state — and its restore target — in every other open
 * session. Controllers live for the plugin lifetime; switching sessions keeps
 * each one's last state until it is dismissed or replaced.
 */
import { createImproveController } from './store.js'

/**
 * Build the per-session controller table.
 * @param {{ request: (input: { draft: string, sessionId?: string, signal: AbortSignal }) => Promise<any> }} options - injected transport.
 * @returns {{ for: (sessionId: string) => ReturnType<typeof createImproveController>, dispose: () => void, size: () => number }} the table.
 */
export function createImproveControllers({ request }) {
  const controllers = new Map()
  return {
    for(sessionId) {
      let controller = controllers.get(sessionId)
      if (controller === undefined) {
        controller = createImproveController({ request })
        controllers.set(sessionId, controller)
      }
      return controller
    },
    dispose() {
      for (const controller of controllers.values()) controller.dispose()
      controllers.clear()
    },
    size: () => controllers.size,
  }
}
