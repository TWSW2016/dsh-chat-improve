# dsh-chat-improve

DSH chat presentation plugin. Target: DeepSeek Harness `>= 0.2.1-rc.5`, Desktop and the local Web GUI.

## What it does

- **Composer live inline rendering** — inline code, bold/italic/strikethrough, links, headings, and list markers are rendered inside the real composer while it stays editable; the caret line keeps its source.
- **Mermaid in the transcript** — fenced `mermaid` blocks render as SVG with the DSH theme, a source/diagram toggle, and a source fallback on errors.
- **User-message Markdown** — sent user messages render as Markdown instead of literal text.
- Every feature has a setting, stored per browser origin, and can be switched off.

Not in scope: images (already native), raw HTML, LaTeX in the composer, tables/code-block cards in the composer, in-place edit-and-resend (future DSH core capability).

## Usage

Open **Settings → 聊天增强 (Chat Improve)**:

- Render Markdown inside the composer — on by default. The line containing the caret shows source; click a rendered run to reveal it; blur re-renders the whole draft.
- Render Mermaid diagrams — on by default. Each diagram has a Source/Diagram toggle; invalid diagrams keep their source and offer Retry.
- Render user messages as Markdown — on by default; copy and edit still use the original text.
- Mermaid source limit — blocks longer than the limit stay as code.

Settings are stored in `localStorage` under `dsh-chat-improve:settings:v1`; Desktop and the Web GUI keep separate copies.

## Layout

```text
src/index.js          Host row (presentation-only)
src/client.js         Browser entry: slots, observers, settings
src/settings.js       localStorage-backed settings store
src/composer/         Lexical run formatting for the composer
src/mermaid/          transcript detector, engine, enhancer
src/user-text/        user-message inline Markdown renderer
scripts/build.mjs     esbuild -> window.__ModuleLoader__.load factory
scripts/verify-*.mjs  real-browser verification scripts
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

## Known limitations

- Composer rendering is inline-level: fenced code blocks, tables, images, and math stay as source. Headings and lists are styled text, not block elements (no hanging indent).
- The caret line is intentionally raw; arrow-key reveal depends on the DSH composer keymap, while clicking a rendered run always reveals it.
- Lines containing `@` or starting with `/` are not formatted, so reference chips and the slash menu keep working.
- A single pasted multi-line block may stay raw until edited line by line.
- The composer integration uses Lexical internals (`__lexicalEditor`, `_nodes`, `_pendingEditorState`). It fails open: on error the draft stays plain and the feature stops.
- The browser bundle is ~3.4 MiB because the Mermaid engine is included; the engine itself initializes on first diagram.
- No core changes, no session writes, no model-visible input.
