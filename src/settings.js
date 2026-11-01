/**
 * Client-side settings for dsh-chat-improve.
 *
 * The plugin row is installed through a bundle patch, so the Host settings
 * form cannot edit it (nested bundle includes are not editable through the
 * profile form). Settings therefore persist per browser origin in
 * localStorage: Desktop and the local Web GUI keep their own copy.
 */

/** Storage key; bump the suffix only for an incompatible shape. */
export const SETTINGS_KEY = 'dsh-chat-improve:settings:v1'

/** Accepted source length range for one Mermaid block. */
export const MERMAID_SOURCE_LIMITS = Object.freeze({ min: 1000, max: 200000 })

/** Defaults, also used when localStorage is unavailable or malformed. */
export const DEFAULT_SETTINGS = Object.freeze({
  composerLivePreview: true,
  mermaid: true,
  userMessageMarkdown: true,
  mermaidMaxSourceChars: 20000,
})

/**
 * Coerce an unknown stored value into a complete, in-range settings object.
 * @param {unknown} input - parsed storage value.
 * @returns {{ composerLivePreview: boolean, mermaid: boolean, userMessageMarkdown: boolean, mermaidMaxSourceChars: number }}
 */
export function sanitizeSettings(input) {
  const raw = input !== null && typeof input === 'object' ? input : {}
  const max = Number(raw.mermaidMaxSourceChars)
  return {
    composerLivePreview: typeof raw.composerLivePreview === 'boolean' ? raw.composerLivePreview : DEFAULT_SETTINGS.composerLivePreview,
    mermaid: typeof raw.mermaid === 'boolean' ? raw.mermaid : DEFAULT_SETTINGS.mermaid,
    userMessageMarkdown: typeof raw.userMessageMarkdown === 'boolean'
      ? raw.userMessageMarkdown
      : DEFAULT_SETTINGS.userMessageMarkdown,
    mermaidMaxSourceChars: Number.isFinite(max)
      ? Math.min(MERMAID_SOURCE_LIMITS.max, Math.max(MERMAID_SOURCE_LIMITS.min, Math.round(max)))
      : DEFAULT_SETTINGS.mermaidMaxSourceChars,
  }
}

/**
 * Create a settings store over one Storage-like object.
 * @param {Storage | undefined} storage - localStorage, or undefined when unavailable.
 * @returns {{
 *   getSnapshot: () => ReturnType<typeof sanitizeSettings>,
 *   subscribe: (listener: () => void) => () => void,
 *   update: (patch: Partial<ReturnType<typeof sanitizeSettings>>) => void,
 *   reset: () => void,
 * }}
 */
export function createSettingsStore(storage) {
  let value = read()
  const listeners = new Set()

  function read() {
    try {
      const raw = storage?.getItem(SETTINGS_KEY)
      return raw === null || raw === undefined ? { ...DEFAULT_SETTINGS } : sanitizeSettings(JSON.parse(raw))
    } catch {
      // A blocked or malformed storage must not break the plugin: defaults apply.
      return { ...DEFAULT_SETTINGS }
    }
  }

  function write(next) {
    try {
      storage?.setItem(SETTINGS_KEY, JSON.stringify(next))
    } catch {
      // Quota or privacy mode: the in-memory value still applies for this page.
    }
  }

  return {
    getSnapshot: () => value,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    update(patch) {
      value = sanitizeSettings({ ...value, ...patch })
      write(value)
      for (const listener of listeners) listener()
    },
    reset() {
      value = { ...DEFAULT_SETTINGS }
      try {
        storage?.removeItem(SETTINGS_KEY)
      } catch {
        // Ignore; the in-memory defaults already apply.
      }
      for (const listener of listeners) listener()
    },
  }
}

/** Page-local settings store. */
export const settingsStore = createSettingsStore(
  typeof localStorage === 'undefined' ? undefined : localStorage,
)
