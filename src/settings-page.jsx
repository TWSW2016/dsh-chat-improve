/** Settings page for dsh-chat-improve. */
import { Button, Checkbox } from '@deepseek-ai/dsh-client-ui-primitives'
import { MERMAID_SOURCE_LIMITS, settingsStore } from './settings.js'
import { useSettings } from './use-settings.js'

const page = { display: 'grid', gap: 18, maxWidth: 680, padding: '4px 0' }
const row = { display: 'grid', gap: 4 }
const hint = { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, lineHeight: 1.5 }
const label = { color: 'var(--dsw-alias-label-primary)', fontSize: 13, fontWeight: 500 }
const input = {
  width: 160,
  padding: '6px 8px',
  borderRadius: 6,
  border: '1px solid var(--dsw-alias-border-l2)',
  background: 'var(--dsw-alias-bg-layer-2)',
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 13,
}

/**
 * Render the plugin settings page.
 * @param {{ t: (key: string, params?: Record<string, unknown>) => string }} props - locale seat.
 * @returns {import('react').ReactNode} the page.
 */
export function SettingsPage({ t }) {
  const settings = useSettings()
  return (
    <div style={page}>
      <p style={{ ...hint, margin: 0 }}>{t('settings.description')}</p>

      <div style={row}>
        <Checkbox
          checked={settings.composerLivePreview}
          onChange={value => settingsStore.update({ composerLivePreview: value })}
          label={t('settings.composer')}
        />
        <div style={hint}>{t('settings.composerHint')}</div>
      </div>

      <div style={row}>
        <Checkbox
          checked={settings.mermaid}
          onChange={value => settingsStore.update({ mermaid: value })}
          label={t('settings.mermaid')}
        />
        <div style={hint}>{t('settings.mermaidHint')}</div>
      </div>

      <div style={row}>
        <Checkbox
          checked={settings.userMessageMarkdown}
          onChange={value => settingsStore.update({ userMessageMarkdown: value })}
          label={t('settings.userMessageMarkdown')}
        />
        <div style={hint}>{t('settings.userMessageMarkdownHint')}</div>
      </div>

      <div style={row}>
        <label style={label} htmlFor="dsh-chat-improve-mermaid-max">{t('settings.maxSource')}</label>
        <input
          id="dsh-chat-improve-mermaid-max"
          type="number"
          style={input}
          min={MERMAID_SOURCE_LIMITS.min}
          max={MERMAID_SOURCE_LIMITS.max}
          step={1000}
          value={settings.mermaidMaxSourceChars}
          onChange={event => {
            const next = Number(event.target.value)
            if (Number.isFinite(next)) settingsStore.update({ mermaidMaxSourceChars: next })
          }}
        />
        <div style={hint}>{t('settings.maxSourceHint')}</div>
      </div>

      <div>
        <Button variant="outline" size="sm" onClick={() => settingsStore.reset()}>
          {t('settings.reset')}
        </Button>
      </div>
    </div>
  )
}
