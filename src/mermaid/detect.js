/**
 * Pure Mermaid source detection.
 *
 * DSH renders a fenced block's language in its banner only when the grammar
 * is known to Shiki; `mermaid` is not, so the banner shows the localized
 * "Code" label and the original language is not in the DOM. Detection
 * therefore reads the first meaningful line and lets `mermaid.parse` reject
 * false positives before anything is replaced.
 */

/**
 * First-line declarations accepted by Mermaid 11.17.
 *
 * Source of truth: the `detector` regexes of the installed
 * `mermaid/dist/mermaid.core.mjs` (one per registered diagram type). Run
 * `node scripts/check-keywords.mjs` after upgrading Mermaid to list any first
 * token this table is missing.
 *
 * Deliberately excluded: `info`. Its only diagram body is a version banner and
 * its first token is a common log prefix, so the false positive rate is worse
 * than the value.
 */
export const DIAGRAM_KEYWORDS = Object.freeze([
  // C4
  'C4Context',
  'C4Container',
  'C4Component',
  'C4Dynamic',
  'C4Deployment',
  // flow
  'graph',
  'flowchart',
  'flowchart-elk',
  'swimlane-beta',
  // structure
  'sequenceDiagram',
  'classDiagram',
  'classDiagram-v2',
  'stateDiagram',
  'stateDiagram-v2',
  'erDiagram',
  'journey',
  'requirement',
  'requirementDiagram',
  // planning and narrative
  'gantt',
  'timeline',
  'kanban',
  'mindmap',
  'gitGraph',
  'eventmodeling',
  // data and charts
  'pie',
  'quadrantChart',
  'xychart',
  'xychart-beta',
  'sankey',
  'sankey-beta',
  'treemap',
  'treemap-beta',
  'radar-beta',
  'block',
  'block-beta',
  'packet',
  'packet-beta',
  'architecture',
  'architecture-beta',
  'venn-beta',
  'ishikawa',
  'ishikawa-beta',
  'wardley-beta',
  'cynefin-beta',
  // trees and grammars
  'treeView-beta',
  'railroad-beta',
  'railroad-ebnf-beta',
  'railroad-abnf-beta',
  'railroad-peg-beta',
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
