/** React binding for the page-local settings store. */
import { useSyncExternalStore } from 'react'
import { settingsStore } from './settings.js'

/**
 * Subscribe a component to the current settings snapshot.
 * @returns {ReturnType<typeof settingsStore.getSnapshot>} the current settings.
 */
export function useSettings() {
  return useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot)
}
