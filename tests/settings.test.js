import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SETTINGS, MERMAID_SOURCE_LIMITS, SETTINGS_KEY, createSettingsStore, sanitizeSettings,
} from '../src/settings.js'

/** Minimal Storage stand-in that keeps values in a Map. */
function memoryStorage(initial) {
  const map = new Map(initial === undefined ? [] : [[SETTINGS_KEY, initial]])
  return {
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value) },
    removeItem: key => { map.delete(key) },
    dump: () => map,
  }
}

describe('sanitizeSettings', () => {
  it('fills defaults for a non-object input', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps valid booleans and clamps the source limit', () => {
    expect(sanitizeSettings({
      composerLivePreview: false,
      mermaid: false,
      userMessageMarkdown: false,
      mermaidMaxSourceChars: 10,
    })).toEqual({
      composerLivePreview: false,
      mermaid: false,
      userMessageMarkdown: false,
      improvePrompt: true,
      mermaidMaxSourceChars: MERMAID_SOURCE_LIMITS.min,
    })
    expect(sanitizeSettings({ mermaidMaxSourceChars: 10_000_000 }).mermaidMaxSourceChars)
      .toBe(MERMAID_SOURCE_LIMITS.max)
  })

  it('rounds the source limit and rejects non-finite values', () => {
    expect(sanitizeSettings({ mermaidMaxSourceChars: 12_345.6 }).mermaidMaxSourceChars).toBe(12_346)
    expect(sanitizeSettings({ mermaidMaxSourceChars: 'nope' }).mermaidMaxSourceChars)
      .toBe(DEFAULT_SETTINGS.mermaidMaxSourceChars)
  })

  it('ignores non-boolean flags instead of coercing them', () => {
    expect(sanitizeSettings({ mermaid: 'false' }).mermaid).toBe(true)
  })
})

describe('createSettingsStore', () => {
  it('starts from defaults without storage', () => {
    const store = createSettingsStore(undefined)
    expect(store.getSnapshot()).toEqual(DEFAULT_SETTINGS)
  })

  it('persists an update and notifies subscribers once', () => {
    const storage = memoryStorage()
    const store = createSettingsStore(storage)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.update({ mermaid: false })
    expect(store.getSnapshot().mermaid).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(JSON.parse(storage.dump().get(SETTINGS_KEY)).mermaid).toBe(false)

    unsubscribe()
    store.update({ mermaid: true })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('reads a persisted value on a new store', () => {
    const storage = memoryStorage(JSON.stringify({ mermaid: false, userMessageMarkdown: false }))
    const store = createSettingsStore(storage)
    expect(store.getSnapshot()).toEqual({
      ...DEFAULT_SETTINGS,
      mermaid: false,
      userMessageMarkdown: false,
    })
  })

  it('falls back to defaults for malformed stored JSON', () => {
    const store = createSettingsStore(memoryStorage('{not json'))
    expect(store.getSnapshot()).toEqual(DEFAULT_SETTINGS)
  })

  it('reset clears storage and returns to defaults', () => {
    const storage = memoryStorage()
    const store = createSettingsStore(storage)
    store.update({ mermaid: false })
    store.reset()
    expect(store.getSnapshot()).toEqual(DEFAULT_SETTINGS)
    expect(storage.dump().has(SETTINGS_KEY)).toBe(false)
  })

  it('keeps working when storage throws', () => {
    const storage = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
      removeItem: () => { throw new Error('blocked') },
    }
    const store = createSettingsStore(storage)
    expect(store.getSnapshot()).toEqual(DEFAULT_SETTINGS)
    expect(() => store.update({ mermaid: false })).not.toThrow()
    expect(store.getSnapshot().mermaid).toBe(false)
  })
})
