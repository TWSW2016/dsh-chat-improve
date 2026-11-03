import { describe, expect, it, vi } from 'vitest'
import { createImproveController } from '../src/improve/store.js'

/**
 * Build a controller over a fake port and a controllable request.
 * @param {{ draft?: string, rev?: number, request?: any, result?: any }} [options] - bench setup.
 * @returns {any} bench handles.
 */
function bench(options = {}) {
  const input = { draft: options.draft ?? 'fix this', rev: options.rev ?? 1 }
  const writes = []
  let focused = 0
  const port = {
    getInput: () => input,
    setDraft: text => { writes.push(text); input.draft = text },
    focus: () => { focused += 1 },
  }
  const request = options.request ?? vi.fn(async () => options.result ?? { ok: true, text: 'fixed', truncated: false })
  const controller = createImproveController({ request })
  controller.bind(port)
  return { controller, input, writes, request, focusCount: () => focused }
}

describe('createImproveController', () => {
  it('does nothing without a draft', async () => {
    const { controller, request } = bench({ draft: '   ' })
    await controller.click({ hasRefs: false })
    expect(request).not.toHaveBeenCalled()
    expect(controller.getSnapshot().status).toBe('idle')
  })

  it('runs one request and replaces the draft', async () => {
    const { controller, writes, focusCount } = bench({ draft: 'fix 这个', rev: 7 })
    const pending = controller.click({ sessionId: 'session-1', hasRefs: false })
    expect(controller.getSnapshot().status).toBe('running')
    await pending
    const state = controller.getSnapshot()
    expect(state.status).toBe('ready')
    expect(state.original).toBe('fix 这个')
    expect(state.rewritten).toBe('fixed')
    expect(writes).toEqual(['fixed'])
    expect(focusCount()).toBe(1)
  })

  it('passes the draft and session to the transport', async () => {
    const { controller, request } = bench({ draft: 'draft text' })
    await controller.click({ sessionId: 'session-9', hasRefs: false })
    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0][0]).toMatchObject({ draft: 'draft text', sessionId: 'session-9' })
  })

  it('discards the result when the author kept typing', async () => {
    const { controller, input, writes } = bench({ draft: 'fix this', rev: 3 })
    const pending = controller.click({ hasRefs: false })
    input.rev = 4
    input.draft = 'fix this properly'
    await pending
    expect(writes).toEqual([])
    expect(controller.getSnapshot()).toMatchObject({ status: 'idle', notice: 'draft-changed' })
  })

  it('reports a failure without touching the draft', async () => {
    const { controller, writes } = bench({ result: { ok: false, code: 'timeout', message: '' } })
    await controller.click({ hasRefs: false })
    expect(writes).toEqual([])
    expect(controller.getSnapshot()).toMatchObject({ status: 'error', error: { code: 'timeout' } })
  })

  it('treats a cancelled request as idle', async () => {
    const { controller, writes } = bench({ result: { ok: false, code: 'cancelled' } })
    await controller.click({ hasRefs: false })
    expect(writes).toEqual([])
    expect(controller.getSnapshot()).toEqual({
      status: 'idle', confirm: false, truncated: false, error: null, notice: null, original: null, rewritten: null,
    })
  })

  it('asks before dropping references, then runs on confirm', async () => {
    const { controller, request } = bench()
    await controller.click({ sessionId: 's', hasRefs: true })
    expect(request).not.toHaveBeenCalled()
    expect(controller.getSnapshot().confirm).toBe(true)
    await controller.confirm()
    expect(request).toHaveBeenCalledTimes(1)
    expect(controller.getSnapshot().status).toBe('ready')
  })

  it('cancel returns to idle without a request', async () => {
    const { controller, request } = bench()
    await controller.click({ hasRefs: true })
    controller.cancel()
    expect(request).not.toHaveBeenCalled()
    expect(controller.getSnapshot().confirm).toBe(false)
  })

  it('keeps one request in flight', async () => {
    let release
    const request = vi.fn(() => new Promise(resolve => { release = resolve }))
    const { controller } = bench({ request })
    const first = controller.click({ hasRefs: false })
    const second = controller.click({ hasRefs: false })
    expect(second).toBeUndefined()
    release({ ok: true, text: 'done', truncated: false })
    await first
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('restores the original draft', async () => {
    const { controller, writes } = bench({ draft: 'original' })
    await controller.click({ hasRefs: false })
    controller.restore()
    expect(writes).toEqual(['fixed', 'original'])
    expect(controller.getSnapshot().notice).toBe('restored')
  })

  it('refuses to restore over later edits', async () => {
    const { controller, writes, input } = bench({ draft: 'original' })
    await controller.click({ hasRefs: false })
    input.draft = 'fixed and edited'
    controller.restore()
    expect(writes).toEqual(['fixed'])
    expect(controller.getSnapshot().notice).toBe('draft-changed')
  })

  it('aborts in-flight work on dispose and ignores the late answer', async () => {
    let release
    let receivedSignal
    const request = vi.fn(input => {
      receivedSignal = input.signal
      return new Promise(resolve => { release = resolve })
    })
    const { controller, writes } = bench({ request })
    const pending = controller.click({ hasRefs: false })
    controller.dispose()
    expect(receivedSignal.aborted).toBe(true)
    release({ ok: true, text: 'late', truncated: false })
    await pending
    expect(writes).toEqual([])
  })

  it('dismiss clears a settled notice', async () => {
    const { controller } = bench()
    await controller.click({ hasRefs: false })
    controller.dismiss()
    expect(controller.getSnapshot()).toMatchObject({ status: 'idle', original: null, rewritten: null })
  })

  it('stops reading input once the port is unbound', async () => {
    const { controller, request, input } = bench()
    // The bench binds once; a second bind returns its own disposer.
    const unbind = controller.bind({ getInput: () => input, setDraft: () => {}, focus: () => {} })
    unbind()
    await controller.click({ hasRefs: false })
    expect(request).not.toHaveBeenCalled()
    expect(controller.getSnapshot().status).toBe('idle')
  })

  it('requires a request function', () => {
    expect(() => createImproveController({})).toThrow(TypeError)
  })
})
