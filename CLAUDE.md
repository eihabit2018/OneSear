# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"One Search" is a pure frontend search aggregator. A user types a query with `@platform` mentions, hits enter, and the app opens the corresponding search URLs in new tabs. No build tools, no frameworks — just HTML, CSS, and vanilla JS ES modules served directly from the filesystem.

## Development

Open `index.html` directly in a browser (no server needed). The app uses ES modules (`type="module"`), so it must be served over HTTP or opened from a local server — opening via `file://` will fail with CORS/module errors.

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

There are no build steps, linters, or tests.

## Architecture

### Data flow

```
user types @mention → router.js parses → app.js previews result
user submits form   → router.js parses → app.js opens tabs + saves to history.js → localStorage
```

### Module responsibilities

- **`scripts/router.js`** — The core parsing engine. Exports `PROVIDERS` (13 platform definitions), `parseMentionInput()`, and `getActiveMentionFilter()`. The `MENTION_PATTERN` regex `/@([\w一-鿿.-]+)/g` is the only place that defines mention syntax — changing it affects the entire app. `parseMentionInput()` is a pure function that returns either `{ ok: true, targets, query }` or `{ ok: false, error }` — all business logic flows through this return shape.

- **`scripts/app.js`** — The main controller. Wires DOM events, manages the mention autocomplete menu, renders search results/history, and coordinates between modules. Key design decisions:
  - `renderResult()` accepts an `{ autoOpen, saveHistory }` options bag — `autoOpen: false` is used for live preview as the user types, `autoOpen: true` on form submit.
  - History is **not** rendered on page load — it only renders when the user clicks "我查看过", keeping the UI clean by default.
  - The CSS `[hidden]` attribute is enforced via `[hidden] { display: none !important }` because `.history-panel` sets `display: flex` which overrides the native `hidden` behavior.

- **`scripts/history.js`** — localStorage CRUD with a `STORAGE_KEY = "one-search-history"`. Deduplication uses a composite key of `${query}::${providerIds}`. Max 50 items. Every history entry stores `{ id, query, providers, rawInput, createdAt }`.

- **`scripts/ticker.js`** — Subtitle rotation below the hero title. Exports `initSubtitleTicker(element)`. Shows a welcome message for 5 seconds, then cycles through rotating messages every 4.5 seconds using CSS animation classes `ticker-out`/`ticker-in`.

- **`scripts/hint-ticker.js`** — Hint text in the toolbar that changes contextually (e.g., shows different hints when the history panel is open).

### Styles

`styles/main.css` uses CSS custom properties on `:root` with a `@media (prefers-color-scheme: dark)` block for dark mode. The design language is glassmorphism: `backdrop-filter: blur()`, semi-transparent `rgba()` surfaces, and rounded corners via `--radius`. All color values reference the custom properties — never hardcode colors in new CSS.

### Adding a new search platform

Add an entry to the `PROVIDERS` array in `scripts/router.js`:

```js
{ id: "platform-id", name: "Display Name", aliases: ["alias1", "alias2"], url: (query) => `https://...` }
```

`aliases[0]` is the primary alias shown in the mention menu. The `url` function receives the user's query (with all @mentions stripped) and returns the full search URL. That's it — the mention menu, parsing, and history all derive from `PROVIDERS`.
