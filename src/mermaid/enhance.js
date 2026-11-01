/**
 * Transcript Mermaid enhancer.
 *
 * DSH renders fenced blocks through ui-primitives, which has no plugin-level
 * fence renderer seam. This module watches settled markdown roots for
 * `.md-code-block` elements, validates the source as a Mermaid diagram, and
 * adds a sibling diagram while keeping the original `<pre>` (so copy, source
 * toggle, and error fallback keep working).
 */
import { looksLikeMermaid, normalizeMermaidSource } from './detect.js'
import { renderDiagram } from './engine.js'
import { readThemeVariables, themeKey } from './theme.js'

const MARKER = 'data-dsh-chat-improve-mermaid'
const STYLE_ID = 'dsh-chat-improve-mermaid-style'
const CACHE_LIMIT = 40
const DEBOUNCE_MS = 250

const CSS = `
[${MARKER}] { margin: 6px 0; min-width: 0; }
[${MARKER}] .dsh-ci-mermaid-bar { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 4px; }
[${MARKER}] .dsh-ci-mermaid-bar button {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 12px;
  cursor: pointer;
}
[${MARKER}] .dsh-ci-mermaid-bar button:hover { color: var(--dsw-alias-label-primary); }
[${MARKER}] .dsh-ci-mermaid-body { overflow-x: auto; }
[${MARKER}] .dsh-ci-mermaid-body svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
[${MARKER}] .dsh-ci-mermaid-error { color: var(--dsw-alias-state-error-primary); font-size: 12px; margin: 4px 0; }
[${MARKER}] .dsh-ci-mermaid-error button { margin-left: 8px; }
`

/**
 * Start watching the transcript.
 * @param {{
 *   t: (key: string) => string,
 *   getMaxSource: () => number,
 *   render?: (request: { code: string, variables: Record<string, string>, maxTextSize: number }) => Promise<string>,
 * }} options - locale, limits, and an optional renderer (tests inject a stub).
 * @returns {{ dispose: () => void, refreshTheme: () => void, scanNow: () => void }} controller.
 */
export function startMermaidEnhancer({ t, getMaxSource, render = renderDiagram }) {
  /** @type {WeakSet<Element>} blocks with a diagram or an error panel owned by us */
  let claimed = new WeakSet()
  /** @type {Map<Element, { container: Element, pre: HTMLElement, source: string }>} */
  const rendered = new Map()
  /** @type {Map<string, string>} */
  const cache = new Map()
  let timer
  let disposed = false

  injectStyle()

  const observer = new MutationObserver(schedule)
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-streaming'],
  })

  schedule()

  /**
   * Debounced rescan; a streaming reply mutates the DOM many times per second.
   */
  function schedule() {
    if (disposed) return
    clearTimeout(timer)
    timer = setTimeout(scan, DEBOUNCE_MS)
  }

  /**
   * Render every eligible block that has not been claimed yet.
   */
  function scan() {
    if (disposed) return
    for (const block of document.querySelectorAll('div.md-code-block')) {
      if (claimed.has(block)) continue
      if (block.closest(`[${MARKER}]`) !== null) continue
      if (block.closest('[data-streaming]') !== null) continue
      if (block.closest('[class*="_markdown_"]') === null) continue
      const content = block.querySelector('[data-code-block-content]')
      const pre = content?.querySelector('pre')
      if (content === null || content === undefined || pre === null || pre === undefined) continue
      const source = normalizeMermaidSource(pre.textContent ?? '')
      if (source.length === 0 || source.length > getMaxSource()) continue
      if (!looksLikeMermaid(source)) continue
      claimed.add(block)
      void mount(block, content, pre, source)
    }
  }

  /**
   * Compute the SVG and insert the diagram panel.
   * @param {Element} block - `.md-code-block`.
   * @param {Element} content - `[data-code-block-content]`.
   * @param {HTMLElement} pre - the source `<pre>`.
   * @param {string} source - normalized fence content.
   */
  async function mount(block, content, pre, source) {
    const variables = readThemeVariables(block)
    const key = `${themeKey(variables)}\u0000${source}`
    try {
      let svg = cache.get(key)
      if (svg === undefined) {
        svg = await render({ code: source, variables, maxTextSize: getMaxSource() })
        cache.set(key, svg)
        if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value)
      }
      if (disposed || !block.isConnected) return
      const container = buildPanel({ t, svg, source, pre })
      content.append(container)
      pre.style.display = 'none'
      rendered.set(block, { container, pre, source })
    } catch (error) {
      claimed.delete(block)
      if (disposed || !block.isConnected) return
      showError({ t, block, content, pre, source, retry: () => retry(block) })
    }
  }

  function retry(block) {
    if (disposed) return
    const record = rendered.get(block)
    if (record !== undefined) {
      record.container.remove()
      record.pre.style.display = ''
      rendered.delete(block)
    }
    for (const node of block.querySelectorAll(`[${MARKER}]`)) node.remove()
    claimed.delete(block)
    scan()
  }

  function showError({ block, content, pre, source, retry: run }) {
    pre.style.display = ''
    for (const node of content.querySelectorAll(`[${MARKER}]`)) node.remove()
    const panel = document.createElement('div')
    panel.setAttribute(MARKER, '')
    const message = document.createElement('div')
    message.className = 'dsh-ci-mermaid-error'
    message.textContent = t('mermaid.error')
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = t('mermaid.retry')
    button.addEventListener('click', event => {
      event.preventDefault()
      run()
    })
    message.append(button)
    panel.append(message)
    content.append(panel)
    claimed.add(block)
  }

  function refreshTheme() {
    if (disposed) return
    cache.clear()
    claimed = new WeakSet()
    for (const [block, record] of rendered) {
      record.container.remove()
      record.pre.style.display = ''
      rendered.delete(block)
    }
    for (const node of document.querySelectorAll(`[${MARKER}]`)) node.remove()
    scan()
  }

  function dispose() {
    disposed = true
    clearTimeout(timer)
    observer.disconnect()
    for (const record of rendered.values()) {
      record.container.remove()
      record.pre.style.display = ''
    }
    rendered.clear()
    for (const node of document.querySelectorAll(`[${MARKER}]`)) node.remove()
    document.getElementById(STYLE_ID)?.remove()
  }

  return { dispose, refreshTheme, scanNow: scan }
}

/**
 * Build the diagram panel with a source/diagram toggle.
 * @param {{ t: (key: string) => string, svg: string, source: string, pre: HTMLElement }} input - panel data.
 * @returns {HTMLElement} the panel.
 */
function buildPanel({ t, svg, pre }) {
  const panel = document.createElement('div')
  panel.setAttribute(MARKER, '')

  const bar = document.createElement('div')
  bar.className = 'dsh-ci-mermaid-bar'
  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.textContent = t('mermaid.showSource')
  bar.append(toggle)

  const body = document.createElement('div')
  body.className = 'dsh-ci-mermaid-body'
  body.setAttribute('role', 'img')
  body.setAttribute('aria-label', t('mermaid.diagram'))
  body.innerHTML = svg

  let showingSource = false
  toggle.addEventListener('click', event => {
    event.preventDefault()
    showingSource = !showingSource
    body.style.display = showingSource ? 'none' : ''
    pre.style.display = showingSource ? '' : 'none'
    toggle.textContent = showingSource ? t('mermaid.showDiagram') : t('mermaid.showSource')
  })

  panel.append(bar, body)
  return panel
}

function injectStyle() {
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.append(style)
}
