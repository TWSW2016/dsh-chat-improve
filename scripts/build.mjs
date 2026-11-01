/**
 * Build the browser half into the Loader's lazy-CJS factory format.
 *
 * The browser module system executes a plugin bundle as a factory call:
 *
 *   window.__ModuleLoader__.load({ id, factory(require) { ... } })
 *
 * so the compiled CommonJS body is wrapped in that factory, with `require`
 * resolving the shell's shared module table (React, Cordis, ui-primitives,
 * ui-slots).
 */
import { build } from 'esbuild'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'

const PACKAGE_NAME = 'dsh-chat-improve'
const OUT_DIR = 'lib'
const OUT_FILE = `${OUT_DIR}/client.js`

/** Modules the web shell seeds into its frozen module table. */
const BASELINE = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-conversation',
]

const result = await build({
  entryPoints: ['src/client.js'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  external: BASELINE,
  write: false,
  minify: true,
  legalComments: 'eof',
  logLevel: 'warning',
})

const body = result.outputFiles[0]?.text ?? ''
if (body === '') throw new Error('esbuild produced an empty bundle')

const wrapped = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(PACKAGE_NAME)},
  factory(require) {
    var module = { exports: {} };
    var exports = module.exports;
${body}
    return module.exports;
  },
});
`

await mkdir(OUT_DIR, { recursive: true })
await writeFile(OUT_FILE, wrapped, 'utf8')

const bytes = (await stat(OUT_FILE)).size
const manifest = JSON.parse(await readFile('package.json', 'utf8'))
console.log(`${manifest.name} ${manifest.version}: ${OUT_FILE} ${(bytes / 1024).toFixed(1)} KiB`)
