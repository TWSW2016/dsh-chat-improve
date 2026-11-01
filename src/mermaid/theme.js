/**
 * Theme bridge between DSH semantic tokens and Mermaid's `base` theme.
 */

/** DSH token -> Mermaid theme variable. */
const TOKENS = {
  background: '--dsw-alias-bg-base',
  primaryColor: '--dsw-alias-bg-layer-2',
  primaryTextColor: '--dsw-alias-label-primary',
  primaryBorderColor: '--dsw-alias-border-l2',
  secondaryColor: '--dsw-alias-bg-layer-1',
  secondaryTextColor: '--dsw-alias-label-primary',
  secondaryBorderColor: '--dsw-alias-border-l1',
  tertiaryColor: '--dsw-alias-bg-base',
  tertiaryTextColor: '--dsw-alias-label-secondary',
  tertiaryBorderColor: '--dsw-alias-border-l1',
  lineColor: '--dsw-alias-border-l2',
  textColor: '--dsw-alias-label-primary',
  mainBkg: '--dsw-alias-bg-layer-2',
  nodeBorder: '--dsw-alias-border-l2',
  clusterBkg: '--dsw-alias-bg-layer-1',
  clusterBorder: '--dsw-alias-border-l1',
  titleColor: '--dsw-alias-label-primary',
  edgeLabelBackground: '--dsw-alias-bg-base',
  errorBkgColor: '--dsw-alias-state-error-primary',
  errorTextColor: '--dsw-alias-label-primary',
  noteBkgColor: '--dsw-alias-bg-layer-1',
  noteTextColor: '--dsw-alias-label-primary',
  noteBorderColor: '--dsw-alias-border-l2',
  activationBkgColor: '--dsw-alias-bg-layer-2',
  activationBorderColor: '--dsw-alias-border-l2',
  labelBackgroundColor: '--dsw-alias-bg-base',
}

/**
 * Read the active theme tokens from one element's computed style.
 * @param {Element | null} element - element that inherits the theme tokens.
 * @returns {Record<string, string>} Mermaid theme variables.
 */
export function readThemeVariables(element) {
  const style = globalThis.getComputedStyle(element ?? document.documentElement)
  const variables = {}
  for (const [name, token] of Object.entries(TOKENS)) {
    const value = style.getPropertyValue(token).trim()
    if (value !== '') variables[name] = value
  }
  const family = style.fontFamily.trim()
  if (family !== '') variables.fontFamily = family
  const size = style.fontSize.trim()
  if (size !== '') variables.fontSize = size
  return variables
}

/**
 * Stable cache key for one theme snapshot.
 * @param {Record<string, string>} variables - theme variables.
 * @returns {string} key.
 */
export function themeKey(variables) {
  return JSON.stringify(variables)
}
