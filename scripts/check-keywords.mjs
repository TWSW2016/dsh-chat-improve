/**
 * Compare DIAGRAM_KEYWORDS with the detector regexes of the installed Mermaid
 * build, so a Mermaid upgrade cannot silently leave a diagram type unmatched.
 *
 * Usage: node scripts/check-keywords.mjs
 * Exit code 1 means the table is missing a first token Mermaid accepts.
 */
import { readFile } from 'node:fs/promises'
import { DIAGRAM_KEYWORDS } from '../src/mermaid/detect.js'

/** First tokens Mermaid accepts but this plugin intentionally ignores. */
const IGNORED = new Set(['info', 'architecture'])

const distPath = new URL('../node_modules/mermaid/dist/mermaid.core.mjs', import.meta.url)
const source = await readFile(distPath, 'utf8')

const accepted = new Set()
const detector = /\^\\s\*([^/]+?)\/[a-z]*\.test\(/g
for (const match of source.matchAll(detector)) {
  for (const alternative of match[1].split('|')) {
    for (const variant of expandOptional(alternative)) {
      const token = /^[A-Za-z][A-Za-z0-9-]*/.exec(variant.replace(/\\b/g, ''))?.[0]
      if (token !== undefined && token !== '') accepted.add(token)
    }
  }
}

/**
 * Expand an optional group such as `(-beta)?` into both spellings.
 * @param {string} text - regex fragment.
 * @returns {string[]} fragment variants.
 */
function expandOptional(text) {
  const optional = /\(([^()]*)\)\?/.exec(text)
  if (optional === null) return [text]
  const withPart = text.replace(optional[0], optional[1])
  const withoutPart = text.replace(optional[0], '')
  return [...expandOptional(withPart), ...expandOptional(withoutPart)]
}

const known = new Set(DIAGRAM_KEYWORDS)
const missing = [...accepted].filter(token => !known.has(token) && !IGNORED.has(token)).sort()
// Mermaid detectors are prefix regexes, so a keyword is covered when some
// accepted first token is a prefix of it (for example treemap-beta over
// treemap).
const extra = [...known]
  .filter(token => ![...accepted].some(base => token === base || token.startsWith(base)))
  .sort()

console.log(`mermaid detectors: ${accepted.size} first tokens`)
console.log(`plugin keywords:   ${known.size}`)
console.log(`missing: ${missing.length === 0 ? 'none' : missing.join(', ')}`)
console.log(`not in mermaid: ${extra.length === 0 ? 'none' : extra.join(', ')}`)
if (missing.length > 0) process.exitCode = 1
