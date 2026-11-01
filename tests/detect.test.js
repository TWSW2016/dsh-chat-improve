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

  it('rejects other code that starts with a similar word', () => {
    expect(looksLikeMermaid('graphql { user { id } }')).toBe(false)
    expect(looksLikeMermaid('const graph = 1')).toBe(false)
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
