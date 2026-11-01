/**
 * User-message Markdown renderer.
 *
 * The `conversation.user.text.node` seat is inline, so this component keeps
 * inline formatting inline (chips stay in the same flow) and renders only
 * code fences, quotes, list lines, and rules as block-level spans.
 */
import { UserTextRun } from '@deepseek-ai/dsh-client-ui-primitives'
import { useSettings } from '../use-settings.js'
import { scanInline } from './inline.js'
import { planUserMarkdown } from './plan.js'

const codeStyle = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  background: 'var(--dsw-alias-bg-layer-2)',
  borderRadius: 4,
  padding: '1px 4px',
  fontSize: '0.92em',
}
const linkStyle = {
  color: 'var(--dsw-alias-state-business-primary)',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
}
const blockCodeStyle = {
  display: 'block',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  background: 'var(--dsw-alias-bg-layer-1)',
  border: '1px solid var(--dsw-alias-border-l1)',
  borderRadius: 6,
  padding: '6px 8px',
  margin: '4px 0',
  whiteSpace: 'pre',
  overflowX: 'auto',
  fontSize: '0.92em',
}
const headingStyle = { display: 'block', fontWeight: 600, fontSize: '1.02em' }
const quoteStyle = {
  display: 'block',
  borderLeft: '2px solid var(--dsw-alias-border-l2)',
  paddingLeft: 8,
  color: 'var(--dsw-alias-label-secondary)',
}
const ruleStyle = {
  display: 'block',
  borderTop: '1px solid var(--dsw-alias-border-l1)',
  margin: '6px 0',
}

/**
 * Render one user text run.
 * @param {{ node?: { data?: { display?: string, text?: string } }, raw?: string }} props - slot props.
 * @returns {import('react').ReactNode} the rendered run.
 */
export function UserMarkdown({ node, raw }) {
  const settings = useSettings()
  const text = node?.data?.display ?? node?.data?.text ?? raw ?? ''
  if (!settings.userMessageMarkdown) return <UserTextRun text={text} />
  return <UserMarkdownText text={text} />
}

/**
 * Render Markdown text as inline content with lightweight block spans.
 * @param {{ text: string }} props - source text.
 * @returns {import('react').ReactNode} rendered content.
 */
export function UserMarkdownText({ text }) {
  const tokens = planUserMarkdown(text)
  const output = []

  tokens.forEach((item, index) => {
    if (item.kind === 'break') {
      output.push('\n')
      return
    }
    const key = `line-${index}`
    switch (item.kind) {
      case 'heading':
        output.push(<span key={key} style={headingStyle}>{renderInline(scanInline(item.text))}</span>)
        break
      case 'quote':
        output.push(<span key={key} style={quoteStyle}>{renderInline(scanInline(item.text))}</span>)
        break
      case 'list':
        output.push(
          <span key={key} style={{ display: 'block', paddingLeft: 8 + (item.indent ?? 0) * 12 }}>
            {`${item.marker} `}
            {renderInline(scanInline(item.text))}
          </span>,
        )
        break
      case 'rule':
        output.push(<span key={key} style={ruleStyle} />)
        break
      case 'code':
        output.push(<span key={key} style={blockCodeStyle}>{item.text}</span>)
        break
      default:
        output.push(<span key={key}>{renderInline(scanInline(item.text ?? ''))}</span>)
    }
  })

  return <span style={{ whiteSpace: 'pre-wrap' }}>{output}</span>
}

/**
 * Render scanned inline nodes.
 * @param {Array<{ type: string, text?: string, children?: unknown[], url?: string }>} nodes - scanned nodes.
 * @returns {import('react').ReactNode[]} rendered nodes.
 */
function renderInline(nodes) {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'code':
        return <code key={index} style={codeStyle}>{node.text}</code>
      case 'strong':
        return <strong key={index}>{renderInline(node.children ?? [])}</strong>
      case 'em':
        return <em key={index}>{renderInline(node.children ?? [])}</em>
      case 'delete':
        return <del key={index}>{renderInline(node.children ?? [])}</del>
      case 'link':
        return (
          <span key={index} style={linkStyle} title={node.url}>
            {renderInline(node.children ?? [])}
          </span>
        )
      default:
        return node.text ?? ''
    }
  })
}
