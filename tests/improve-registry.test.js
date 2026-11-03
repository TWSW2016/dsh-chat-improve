import { describe, expect, it, vi } from 'vitest'
import { createImproveControllers } from '../src/improve/registry.js'

/** Transport stand-in that keeps the draft. */
const request = async ({ draft }) => ({ ok: true, text: draft.toUpperCase(), truncated: false })

/**
 * Bind a minimal port to one controller and run it once.
 * @param {any} controller - controller to drive.
 * @param {string} draft - draft to rewrite.
 * @returns {Promise<string>} the written draft.
 */
async function run(controller, draft) {
  const input = { draft, rev: 1 }
  const writes = []
  controller.bind({
    getInput: () => input,
    setDraft: text => { writes.push(text) },
    focus: () => {},
  })
  await controller.click({ hasRefs: false })
  return writes[0]
}

describe('createImproveControllers', () => {
  it('gives one controller per session', () => {
    const controllers = createImproveControllers({ request })
    expect(controllers.for('a')).toBe(controllers.for('a'))
    expect(controllers.for('a')).not.toBe(controllers.for('b'))
    expect(controllers.size()).toBe(2)
  })

  it('keeps session state apart', async () => {
    const controllers = createImproveControllers({ request })
    await run(controllers.for('a'), 'first')
    expect(controllers.for('a').getSnapshot().original).toBe('first')
    expect(controllers.for('b').getSnapshot().status).toBe('idle')
  })

  it('disposes every controller and starts fresh afterwards', async () => {
    const controllers = createImproveControllers({ request })
    const first = controllers.for('a')
    await run(first, 'first')
    controllers.dispose()
    expect(controllers.size()).toBe(0)
    expect(first.getSnapshot().status).toBe('idle')
    const next = controllers.for('a')
    expect(next).not.toBe(first)
    expect(next.getSnapshot().status).toBe('idle')
  })

  it('does not create controllers for sessions that never render', () => {
    const controllers = createImproveControllers({ request: vi.fn() })
    expect(controllers.size()).toBe(0)
  })
})
