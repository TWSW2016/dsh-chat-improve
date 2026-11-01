# dsh-chat-improve

DSH chat presentation plugin. Target: DeepSeek Harness `>= 0.2.1-rc.5`, Desktop and the local Web GUI.

## What it does

- **Composer live inline rendering** — inline code, bold/italic/strikethrough, links, headings, and list markers are rendered inside the real composer while it stays editable; the caret line keeps its source.
- **Mermaid in the transcript** — fenced `mermaid` blocks render as SVG with the DSH theme, a source/diagram toggle, and a source fallback on errors.
- **User-message Markdown** — sent user messages render as Markdown instead of literal text.
- Every feature has a setting, persists in the Host settings document, and can be switched off.

Not in scope: images (already native), raw HTML, LaTeX in the composer, tables/code-block cards in the composer, in-place edit-and-resend (future DSH core capability).

## Layout

```text
src/index.js          Host row (presentation-only)
src/client.js         Browser entry: slots, observers, settings
scripts/build.mjs     esbuild -> window.__ModuleLoader__.load factory
locale/*.json         Plugin Manager title/description
docs/logs/            Implementation log per step
docs/verification.md  Real-GUI acceptance record
```

## Build and install

```sh
npm install
npm run build
```

Install the directory as a profile bundle with `plugin_manager install_bundle`, or with the DSH CLI (`dsh plugin --profile <profile> add <path>`). The browser bundle is `lib/client.js`; the Host row resolves `src/index.js` directly.

## Notes

- No core changes, no session writes, no model-visible input.
- The composer integration uses Lexical's editor instance exposed on the composer root DOM node; it is version-sensitive and fails open (no transform, no visual change) when the API is absent.
