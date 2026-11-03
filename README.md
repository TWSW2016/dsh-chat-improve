# dsh-chat-improve

DSH chat presentation plugin. Target: DeepSeek Harness `>= 0.2.1-rc.5`, Desktop and the local Web GUI.

## What it does

- **Composer live inline rendering** — inline code, bold/italic/strikethrough, links, headings, and list markers are rendered inside the real composer while it stays editable; the caret line keeps its source.
- **Mermaid in the transcript** — fenced `mermaid` blocks render as SVG with the DSH theme, a source/diagram toggle, and a source fallback on errors. Diagrams wider than the column get an Actual size / Fit width toggle.
- **User-message Markdown** — sent messages render lists, headings, quotes, rules, and code blocks; block lines do not add an extra blank line, and CRLF input keeps a single line break.
- **Improve by AI** — a composer button sends the current draft plus a bounded workspace brief to the session's model in one tool-free request and replaces it with a clearer prompt: explicit action and object, the details the draft and brief imply, a completion criterion, and every original constraint kept — with no plan, no approach, and no step-by-step operations, because the agent that runs the prompt decides those. A restore entry appears for a few seconds. This is the plugin's only model call, and it writes nothing to the session.
- Every feature has a setting, stored per browser origin, and can be switched off.

Not in scope: images (already native), raw HTML, LaTeX in the composer, tables/code-block cards in the composer, in-place edit-and-resend (future DSH core capability), streaming rewrites, and keeping `@` references or slash commands through a rewrite.

## Usage

Open **Settings → 聊天增强 (Chat Improve)**:

- Render Markdown inside the composer — on by default. The line containing the caret shows source; click a rendered run to reveal it; blur re-renders the whole draft.
- Render Mermaid diagrams — on by default. Each diagram has a Source/Diagram toggle; invalid diagrams keep their source and offer Retry.
- Render user messages as Markdown — on by default; copy and edit still use the original text.
- Improve by AI — on by default. Sends the draft and a bounded workspace brief to the current session model and replaces the composer text; the notice above the composer offers 还原原文 / Restore original for a few seconds.
- Mermaid source limit — blocks longer than the limit stay as code.

Settings are stored in `localStorage` under `dsh-chat-improve:settings:v1`; Desktop and the Web GUI keep separate copies.

## Layout

```text
src/index.js          Host row: the rewrite route behind the connection trust fence
src/host/             Workspace brief, prompt text, body validation, output cleanup, route handler
src/client.js         Browser entry: slots, observers, settings
src/settings.js       localStorage-backed settings store
src/composer/         Lexical run formatting for the composer
src/improve/          Improve by AI: controller, transport, button, notice
src/mermaid/          transcript detector, engine, enhancer
src/user-text/        user-message inline Markdown renderer
scripts/build.mjs     esbuild -> window.__ModuleLoader__.load factory
scripts/verify-*.mjs  real-browser verification scripts
locale/*.json         Plugin Manager title/description
docs/logs/            Implementation log per step
docs/mermaid-cheatsheet.md  Supported diagram keywords and syntax traps
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
- A blank line that is actually present in a sent message is preserved; the renderer does not collapse intentional blank lines. The transcript reader treats CRLF as one break and ignores a lone CR, matching `white-space: pre-wrap`.
- The composer integration uses Lexical internals (`__lexicalEditor`, `_nodes`, `_pendingEditorState`). It fails open: on error the draft stays plain and the feature stops.
- Detection is content-based because DSH does not expose the fence language in the DOM; a keyword table decides what renders (see `docs/mermaid-cheatsheet.md`). `node scripts/check-keywords.mjs` reports entries the installed Mermaid accepts but the table lacks.
- Mermaid's timeline grammar cannot parse a period containing a colon (`2026-11-01 16:19`); the error panel explains the workaround.
- Wide diagrams keep their natural size only after the Actual size toggle; the default is still fit-to-column.
- The browser bundle is ~3.4 MiB because the Mermaid engine is included; the engine itself initializes on first diagram.
- Improve by AI sends the draft and a bounded workspace brief (cwd, project, branch, root AGENTS.md/README excerpts) to the model provider configured for the session. Neither the draft nor the brief is written to the session log, stored in localStorage, or logged; turning the setting off registers neither slot, so no request can happen.
- A rewrite replaces the whole draft, so `@` references and slash commands are cleared. When the draft contains one, the button asks first instead of silently dropping it.
- Only one level of restore exists, and only while the draft still equals the rewritten text; the notice clears itself after about 8 seconds.
- There is no streaming: the button spins until the model finishes (90-second deadline), then the draft is replaced once.
- A rewrite needs a session model or a deployment default; with neither, the notice says the model is missing and no request is made.
- The rewrite is stateless with respect to the conversation: it sees the draft plus a bounded workspace brief, not the conversation, not git status, not the selected text. The brief is capped at 6000 characters and is omitted when it cannot be read.
- No core changes, no session writes; the one model call is not part of the conversation log.
