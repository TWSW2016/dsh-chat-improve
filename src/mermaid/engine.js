/**
 * Mermaid engine wrapper: lazy module load, serialized rendering, output
 * sanitization, and scratch-node cleanup.
 */

let modulePromise

/**
 * Load the Mermaid ESM module once. The bundle contains it, but evaluation is
 * deferred until the first diagram so ordinary sessions pay no init cost.
 * @returns {Promise<any>} the Mermaid module.
 */
export function loadMermaid() {
  modulePromise ??= import('mermaid').then(module => module.default ?? module)
  return modulePromise
}

let queue = Promise.resolve()
let counter = 0

/**
 * Render one diagram after every earlier render settles (Mermaid keeps global
 * parser and DOM scratch state).
 * @param {{ code: string, variables: Record<string, string>, maxTextSize: number }} request - render input.
 * @returns {Promise<string>} sanitized SVG markup.
 */
export function renderDiagram({ code, variables, maxTextSize }) {
  const job = queue.then(() => renderNow({ code, variables, maxTextSize }))
  queue = job.then(() => undefined, () => undefined)
  return job
}

async function renderNow({ code, variables, maxTextSize }) {
  const mermaid = await loadMermaid()
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    htmlLabels: false,
    fontFamily: variables.fontFamily,
    themeVariables: variables,
    maxTextSize: Math.max(maxTextSize, 1000),
    maxEdges: 500,
    flowchart: { htmlLabels: false, curve: 'basis' },
    sequence: { htmlLabels: false },
    class: { htmlLabels: false },
    state: { htmlLabels: false },
    er: { htmlLabels: false },
  })

  const parsed = await mermaid.parse(code, { suppressErrors: true }).catch(() => false)
  if (parsed === false || parsed === undefined || parsed === null) {
    throw new Error('Mermaid parse failed')
  }

  const id = `dsh-chat-improve-mermaid-${++counter}`
  try {
    const result = await mermaid.render(id, code)
    return sanitizeSvg(result.svg)
  } finally {
    // Mermaid may leave its scratch element behind when parsing or layout fails.
    for (const node of document.querySelectorAll(`#d${id}, #${id}`)) node.remove()
  }
}

/**
 * Strip active content from Mermaid's SVG before it enters the document.
 * @param {string} svg - raw SVG markup.
 * @returns {string} sanitized SVG markup.
 */
export function sanitizeSvg(svg) {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const root = doc.documentElement
  if (root === null || root.nodeName.toLowerCase() !== 'svg') throw new Error('Mermaid returned no SVG')
  for (const node of root.querySelectorAll('script, foreignObject, iframe, object, embed')) node.remove()
  for (const element of [root, ...root.querySelectorAll('*')]) {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase()
      if (name.startsWith('on')) {
        element.removeAttribute(attribute.name)
        continue
      }
      if ((name === 'href' || name === 'xlink:href')
        && /^\s*(javascript|vbscript|data):/i.test(attribute.value)) {
        element.removeAttribute(attribute.name)
      }
    }
  }
  return new XMLSerializer().serializeToString(root)
}
