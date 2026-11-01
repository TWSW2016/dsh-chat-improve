/**
 * Pure Mermaid source detection.
 *
 * DSH renders a fenced block's language in its banner only when the grammar
 * is known to Shiki; `mermaid` is not, so the banner shows the localized
 * "Code" label. Detection therefore reads the first meaningful line and lets
 * `mermaid.parse` reject false positives before anything is replaced.
 */

/** Diagram declarations accepted by Mermaid 11. */
export const DIAGRAM_KEYWORDS = Object.freeze([
  'graph',
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'classDiagram-v2',
  'stateDiagram',
  'stateDiagram-v2',
  'erDiagram',
  'journey',
  'gantt',
  'pie',
  'quadrantChart',
  'requirementDiagram',
  'gitGraph',
  'mindmap',
  'timeline',
  'sankey-beta',
  'xychart-beta',
  'block-beta',
  'packet-beta',
  'architecture-beta',
  'kanban',
  'radar',
  'treemap',
  'C4Context',
  'C4Container',
  'C4Component',
  'C4Dynamic',
  'C4Deployment',
])

/**
 * Whether the first meaningful line declares a Mermaid diagram.
 * @param {string} code - fenced block content.
 * @returns {boolean} true when the source starts with a diagram keyword.
 */
export function looksLikeMermaid(code) {
  if (typeof code !== 'string') return false
  const lines = code.replace(/\r\n?/g, '\n').split('\n')
  for (const line of lines) {
    const text = line.trim()
    if (text === '' || text.startsWith('%%')) continue
    return DIAGRAM_KEYWORDS.some(keyword => text === keyword || text.startsWith(`${keyword} `)
      || text.startsWith(`${keyword}\t`))
  }
  return false
}

/**
 * Normalize source before handing it to Mermaid: CRLF to LF and no trailing
 * blank lines.
 * @param {string} code - fenced block content.
 * @returns {string} normalized source.
 */
export function normalizeMermaidSource(code) {
  return code.replace(/\r\n?/g, '\n').replace(/\s+$/u, '')
}
