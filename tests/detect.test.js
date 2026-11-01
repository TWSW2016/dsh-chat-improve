import { describe, expect, it } from 'vitest'
import { looksLikeMermaid, normalizeMermaidSource } from '../src/mermaid/detect.js'

describe('looksLikeMermaid', () => {
  it('accepts common diagram declarations', () => {
    expect(looksLikeMermaid('flowchart TD\n  A --> B')).toBe(true)
    expect(looksLikeMermaid('graph LR; A-->B')).toBe(true)
    expect(looksLikeMermaid('sequenceDiagram\n  A->>B: hi')).toBe(true)
    expect(looksLikeMermaid('classDiagram\n  A <|-- B')).toBe(true)
    expect(looksLikeMermaid('   pie title Pets')).toBe(true)
  })

  it('accepts a leading %% directive or comment', () => {
    expect(looksLikeMermaid('%%{init: {"theme": "base"}}%%\nflowchart TD\nA-->B')).toBe(true)
    expect(looksLikeMermaid('%% a comment\ngraph TD\nA-->B')).toBe(true)
  })

  it('accepts the beta, alias and elk spellings Mermaid registers', () => {
    const samples = [
      'radar-beta\n  axis a, b',
      'treemap-beta\n  "Root"\n    "A" : 1',
      'treemap\n  "Root"\n    "A" : 1',
      'xychart\n  bar [1, 2]',
      'xychart-beta\n  bar [1, 2]',
      'sankey\n  A,B,10',
      'packet\n  0-7: "a"',
      'block\n  a',
      'architecture-beta\n  service a(server)[A]',
      'flowchart-elk\n  A --> B',
      'swimlane-beta\n  lane a',
      'venn-beta\n  set A',
      'ishikawa-beta\n  cause',
      'treeView-beta\n  a',
      'requirement\n  x',
      'wardley-beta\n  a',
      'cynefin-beta\n  a',
      'eventmodeling\n  a',
      'railroad-ebnf-beta\n  a',
    ]
    for (const sample of samples) {
      expect(looksLikeMermaid(sample), sample).toBe(true)
    }
  })

  it('rejects other code that starts with a similar word', () => {
    expect(looksLikeMermaid('graphql { user { id } }')).toBe(false)
    expect(looksLikeMermaid('const graph = 1')).toBe(false)
    expect(looksLikeMermaid('info: boot finished')).toBe(false)
    expect(looksLikeMermaid('blockchain: 50')).toBe(false)
    expect(looksLikeMermaid('radar sweep failed')).toBe(false)
    expect(looksLikeMermaid('treemapish')).toBe(false)
    expect(looksLikeMermaid('')).toBe(false)
    expect(looksLikeMermaid('   \n\n')).toBe(false)
    expect(looksLikeMermaid(null)).toBe(false)
  })
})

describe('normalizeMermaidSource', () => {
  it('normalizes line endings and trailing whitespace', () => {
    expect(normalizeMermaidSource('graph TD\r\nA-->B\r\n\r\n')).toBe('graph TD\nA-->B')
  })
})
