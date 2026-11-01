// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sanitizeSvg } from '../src/mermaid/engine.js'
import { startMermaidEnhancer } from '../src/mermaid/enhance.js'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'
const t = key => key

/** Wait for the enhancer's async mount to settle. */
async function flush() {
  await new Promise(resolve => setTimeout(resolve, 0))
  await new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Install one markdown code block in the document.
 * @param {string} source - fence content.
 * @param {{ streaming?: boolean, outside?: boolean }} options - fixture variants.
 * @returns {HTMLPreElement} the source pre.
 */
function installBlock(source, options = {}) {
  const root = options.outside === true ? '<div class="other">' : '<div class="_markdown_abc_1">'
  document.body.innerHTML = `${root}
    <div class="md-code-block">
      <div data-code-block-banner><span>代码</span></div>
      <div data-code-block-content><pre></pre></div>
    </div>
  </div>`
  const pre = document.querySelector('pre')
  pre.textContent = source
  if (options.streaming === true) {
    const streaming = document.createElement('div')
    streaming.setAttribute('data-streaming', '')
    const rootElement = document.body.firstElementChild
    document.body.append(streaming)
    streaming.append(rootElement)
  }
  return pre
}

/**
 * Start the enhancer with a stub renderer.
 * @param {{ render?: Function, maxSource?: number }} options - overrides.
 * @returns {{ controller: ReturnType<typeof startMermaidEnhancer>, render: ReturnType<typeof vi.fn> }}
 */
function start(options = {}) {
  const render = vi.fn(options.render ?? (async () => SVG))
  const controller = startMermaidEnhancer({
    t,
    getMaxSource: () => options.maxSource ?? 20_000,
    render,
  })
  return { controller, render }
}

afterEach(() => {
  document.body.innerHTML = ''
  document.getElementById('dsh-chat-improve-mermaid-style')?.remove()
})

describe('startMermaidEnhancer', () => {
  it('renders a diagram and hides the source pre', async () => {
    const pre = installBlock('flowchart TD\n  A --> B')
    const { controller, render } = start()
    controller.scanNow()
    await flush()

    const panel = document.querySelector('[data-dsh-chat-improve-mermaid]')
    expect(panel).not.toBeNull()
    expect(panel.querySelector('svg')).not.toBeNull()
    expect(pre.style.display).toBe('none')
    expect(render).toHaveBeenCalledTimes(1)
    controller.dispose()
  })

  it('skips blocks outside a markdown root', async () => {
    installBlock('flowchart TD\n  A --> B', { outside: true })
    const { controller, render } = start()
    controller.scanNow()
    await flush()
    expect(document.querySelector('[data-dsh-chat-improve-mermaid]')).toBeNull()
    expect(render).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('skips blocks while the message is streaming', async () => {
    installBlock('flowchart TD\n  A --> B', { streaming: true })
    const { controller, render } = start()
    controller.scanNow()
    await flush()
    expect(document.querySelector('[data-dsh-chat-improve-mermaid]')).toBeNull()
    expect(render).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('skips non-mermaid source and sources over the limit', async () => {
    installBlock('const x = 1')
    const first = start()
    first.controller.scanNow()
    await flush()
    expect(first.render).not.toHaveBeenCalled()
    first.controller.dispose()

    installBlock('flowchart TD\n  A --> B')
    const second = start({ maxSource: 10 })
    second.controller.scanNow()
    await flush()
    expect(second.render).not.toHaveBeenCalled()
    second.controller.dispose()
  })

  it('toggles between the diagram and the source', async () => {
    const pre = installBlock('flowchart TD\n  A --> B')
    const { controller } = start()
    controller.scanNow()
    await flush()

    const panel = document.querySelector('[data-dsh-chat-improve-mermaid]')
    const toggle = panel.querySelector('button')
    const body = panel.querySelector('.dsh-ci-mermaid-body')
    toggle.click()
    expect(pre.style.display).toBe('')
    expect(body.style.display).toBe('none')
    expect(toggle.textContent).toBe('mermaid.showDiagram')
    toggle.click()
    expect(pre.style.display).toBe('none')
    expect(toggle.textContent).toBe('mermaid.showSource')
    controller.dispose()
  })

  it('shows an error panel and retries', async () => {
    const pre = installBlock('flowchart TD\n  A --> B')
    let calls = 0
    const { controller } = start({
      render: async () => {
        calls += 1
        if (calls === 1) throw new Error('boom')
        return SVG
      },
    })
    controller.scanNow()
    await flush()

    const panel = document.querySelector('[data-dsh-chat-improve-mermaid]')
    expect(panel).not.toBeNull()
    expect(panel.textContent).toContain('mermaid.error')
    expect(pre.style.display).toBe('')

    panel.querySelector('button').click()
    await flush()
    expect(calls).toBe(2)
    expect(document.querySelector('.dsh-ci-mermaid-body svg')).not.toBeNull()
    controller.dispose()
  })

  it('re-renders after a theme change', async () => {
    installBlock('flowchart TD\n  A --> B')
    const { controller, render } = start()
    controller.scanNow()
    await flush()
    expect(render).toHaveBeenCalledTimes(1)
    controller.refreshTheme()
    await flush()
    expect(render).toHaveBeenCalledTimes(2)
    controller.dispose()
  })

  it('dispose restores the source and removes the panel', async () => {
    const pre = installBlock('flowchart TD\n  A --> B')
    const { controller } = start()
    controller.scanNow()
    await flush()
    controller.dispose()
    expect(document.querySelector('[data-dsh-chat-improve-mermaid]')).toBeNull()
    expect(pre.style.display).toBe('')
    expect(document.getElementById('dsh-chat-improve-mermaid-style')).toBeNull()
  })
})

describe('sanitizeSvg', () => {
  it('removes scripts, event handlers, and javascript URLs', () => {
    const dirty = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">'
      + '<script>alert(1)</script>'
      + '<a href="javascript:alert(1)"><text>hi</text></a>'
      + '<rect width="1" height="1" onclick="alert(2)"/>'
      + '<foreignObject><div>html</div></foreignObject>'
      + '</svg>'
    const clean = sanitizeSvg(dirty)
    expect(clean).not.toMatch(/script/i)
    expect(clean).not.toMatch(/javascript:/i)
    expect(clean).not.toMatch(/onload|onclick/i)
    expect(clean).not.toMatch(/foreignObject/i)
    expect(clean).toContain('<svg')
  })
})
