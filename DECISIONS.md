# DECISIONS.md — judgment calls made while building PRISM

Newest entries at the bottom. Sizes in the size log are bytes of `dist/prism.zip`.

## 0.1 Environment (2026-09-04)

- Windows 11, Node v22.14.0, npm 10.9.2, git 2.46. Shell: Git Bash + PowerShell.
- Dev deps: terser 5.51, roadroller 2.1, playwright 1.62.1 (chromium + firefox
  installed via `npx playwright install chromium firefox`), `@gfx/zopfli` (WASM
  zopfli — used as the deflate for the zip).
- `advzip`/`advancecomp` is NOT available (`sudo apt-get` does not exist on
  Windows; `choco install advancecomp` has no package). `ect` is not available
  either. Per docs/07 fallback order, the zip is written by a hand-rolled zip
  container in `build.js` using zopfli deflate (many iterations), which is within a
  few bytes of advzip's output. Verified with `unzip -t` / `unzip -l`.
- `unzip` and `zip` (Info-ZIP) are present in Git Bash and used only for verification.
- `package.json` is `"type": "module"`: `src/`, `test/`, `build.js`, `dev.js` are all
  ES modules so the tests can import `src/sim.js` directly without a loader.

## 0.2 Online discovery (docs/06)

Opened `https://js13kgames.com/2026/online` with Playwright (networkidle). Findings:

- **PartySocket import URL**: `https://play.js13kgames.com/2026/online/partysocket.js`
  (page text: "You are free to import PartySocket from our server: partysocket.js
  ESM, V1.3.0 — no need to include it in your 13KB .zip"). Fetched it: HTTP 200,
  `text/javascript`, 5,908 bytes, `export { PartySocket, PartySocket as default,
  ReconnectingWebSocket as WebSocket }`; it imports `./ws.js` relative to itself.
  PartySocket builds `wss://<host>/<basePath || parties/<party>/<room>>?_pk=<id>`.
- **Relay host / room URL**: the page's "GET YOUR RELAY URL" button links to
  `https://js13kgames.com/2026/submit#registration`, which requires logging in with
  GitHub and registering the game as a draft. The relay URL is therefore
  **per-game and not publicly discoverable**. Per docs/06, `net.js` ships with
  `NET.url = 'TODO'` and SUBMISSION.md says in bold that the user must paste their
  relay URL. `NET.url` is a template: the literal `{room}` is replaced by the
  namespaced room name (`prism26-CODE`). If PartySocket cannot be imported (blocked
  network, or the URL/format differs) the client falls back to the native
  `WebSocket` on the same URL.
- **Protocol facts from the page** (used in net.js): the relay sends system messages
  `@<id>` (your id), `+<id>` (client joined), `-<id>` (client left); a message
  starting with `@<id>|` is a direct message to that client; rooms are ephemeral.
  No documented size or rate limits on the page.
- Because the relay assigns ids, our protocol's `senderId` is still generated
  locally (4 base36 chars) as docs/06 specifies, so messages are self-describing
  regardless of transport.
