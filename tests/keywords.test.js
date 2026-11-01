// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import mermaid from 'mermaid'
import { DIAGRAM_KEYWORDS } from '../src/mermaid/detect.js'

// Mermaid registers its diagram detectors on initialize(); detectType only
// sees them after this call.
mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })

/**
 * Contract check: every keyword in the table must be a declaration the
 * installed Mermaid recognises, so a typo or a removed diagram does not leave
 * a dead entry that silently never matches.
 */
describe('DIAGRAM_KEYWORDS', () => {
  it('only lists declarations Mermaid itself recognises', () => {
    const unknown = []
    for (const keyword of DIAGRAM_KEYWORDS) {
      let type
      try {
        type = mermaid.detectType(`${keyword}\n`)
      } catch (error) {
        unknown.push(`${keyword}: ${error.message}`)
        continue
      }
      if (typeof type !== 'string' || type === '') unknown.push(keyword)
    }
    expect(unknown).toEqual([])
  })
})
