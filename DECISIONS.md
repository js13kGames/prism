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

## 1 Simulation & levels (Phase 1)

- **Run state is numeric** (0 play, 1 win, 2 fail) instead of the strings in
  docs/04/08 — ~30 bytes smaller and the tests compare against the numbers.
- **`levels.js` uses a named export** `LEVELS` (not `export default`) so build.js can
  strip `export ` uniformly; same effect as the docs' `const LEVELS = [...]`.
- **Ice does not get a second gravity projection.** docs/04 step 6 says to add
  `tangent·gravity` on blue, but gravity was already integrated in step 4 and the
  normal-removal keeps its tangential part; adding it again doubles gravity on
  slopes. Instead, while continuously grounded on ice the speed is rescaled each
  frame from energy conservation (`½v² − G·g·y` constant, capped at ICEMAX), which
  fixes the large energy loss the polyline projection causes at vertices (L11's
  half-pipe lost ~60% of its energy without it).
- **Paint contacts are processed before rect contacts.** A red pad drawn exactly on
  a floor line (the natural way to draw it) was otherwise resolved by the floor
  first, zeroing `vn` so red never bounced (L02/L13/L14). Strokes now sort first,
  and a stroke ground surface is not overwritten by the rect under it.
- **Wall turn-around requires `vn < -0.5`** (actually walking into it), so a unicorn
  sliding down a wall face with `vx = 0` does not flip direction every frame.
- **Climb side fallback:** if the unicorn's position on its side of the vine would
  overlap a solid, it swaps to the other side of the vine before giving up and
  reversing. This is what lets a vine drawn 0.5 u under a ceiling carry the unicorn
  along the underside (L08) and lets a vine hugging a wall pass a ledge corner (L20).
- **Red end caps are bumpers.** Walking into the rounded end of a red stroke that
  sits above the floor gives `vn ≈ −4 < −3` and launches the unicorn backwards at
  27 u/s. This follows directly from the docs/02 rule and is kept as a feature; L19's
  red dab is positioned so it is only reached from the air.
- **Stroke visual width is 0.5 u** (docs/01) not `2R` (docs/04); collision is against
  the centreline at distance R, so the unicorn sinks a quarter unit into paint.
- **Level geometry changes** (all keep the teaching intent; paper numbers were off):
  - L03 Angles: a pad rising to the right launches *left* (its normal points up-left).
    Pad is now `\`-shaped `[7,12.5,10,14]`; start ledge lowered to y=8 and far ledge
    to y=9 because an 8 u drop hits the 36 u/s cap and overshoots the world.
  - L06 Momentum: at G=40 a 9.2 u/s horizontal launch drops 5.9 u while crossing 5 u,
    so a same-height 5 u gap is impossible. Water gap is 3 u with the far platform
    2 u lower; red pad on a 2 u step at y=16; far ledge top y=8.
  - L07 Vine: solution now curves over the ledge corner `(23.6,5.2)→(24.8,4.6)`; the
    paper end point was inside the ledge (undrawable).
  - L08 Ceiling: vine ends 1 u above the far platform (else it is blocked on both
    sides); ink G34 (the paper solution itself is 31 u, paper budget was 28).
  - L11 Half-pipe: the 22 u/s ice cap limits the climb-back to ~6 u, so the far ledge
    top is y=9 (was 8), gem (30,8); an unused O4 added so the level has ≥2 colours
    as suite A requires. Same O4 red herring on L17.
  - L14 Up Well: red pad starts at x=11 (the unicorn lands at 11.3, before the paper
    pad at 12); the 27 u/s bounce peaks at y≈4.4, so the indigo shelf is at y=5 from
    x=13 (under the apex), gem (20,4).
  - L17: second violet at x=21 (at 22 the falling unicorn clipped the overhang).
  - L18: indigo bridge at y=14 (at 13.5 it was level with the unicorn's centre and
    therefore passable); first violet reaches down to 13.4.
  - L19 Spectrum: gate moved to x=27 so the unicorn dropping from the ceiling violet
    clears the block above the gate; gem (30.5,13). Verified route uses all 7 colours.
  - L20 Prism: the paper layout left a 1 u slot between ceiling (y=2) and gate top
    (y=3) that the unicorn could walk through on the ceiling, bypassing the gate. The
    ceiling is now 1.5 thick and the gate spans 1.5→14. Ink tightened to
    `R4 O4 Y8 G7 B6 I5 V4` (≥ 1.2× the verified route on every colour).
  - L15 Rebound: the slide's horizontal momentum carries the bounce straight into the
    wall vine, so the indigo shelf is optional; the stored solution is blue+red+green
    and I6 stays as an alternative.
- **Suite A additions:** a "drawable" warning (solution segments sampled every
  0.15 u must not pass through solids, mirroring the game's clip rule) and a
  `--trace` mode. `tools/try.mjs` / `tools/scan.mjs` replaced the HTML authoring
  tool for levels 15/19/20 (faster, deterministic, no browser); `tools/play.html`
  is still provided for eyeballing.
- Star sanity: 10 levels allow a star, 10 don't (suite A wants ≥12; logged as a
  warning, will revisit budgets in the polish phase if bytes allow).

## 2 Playable game (Phase 2)

- Default selected colour is the one with the largest ink budget (the level's
  "main" colour), not the first unlocked one: red is index 0 and is unlocked in
  level 1 with only 6 u, which would give a new player a half-bridge.
- Buttons use `data-a`/`data-v` attributes and one delegated click handler; keys
  1–7 / Z / C / Space / Esc map to the same actions.
- The canvas reserves 120 css px of height for the HUD bars so the world never sits
  under the palette on phones; the letterbox colour is the page background.
- Level select: 20 dots on a half-ellipse (rainbow arc) + the Daily dot inside it.
- Fail returns to Draw automatically after 0.8 s (docs/01); the unicorn is hidden and
  grey "poof" particles are spawned from the fail event.
- `window.__prism` (`toScreen`, `load`, `setStrokes`, `run`, `scr`, `strokes`) is
  always present; it is ~120 bytes minified and is what the browser suite drives.
  It is reserved from property mangling in build.js.
- The online race glue lives in main.js (lobby/ghost handling) so net.js stays a
  thin transport that can be swapped for a stub.

## 3 Build & browser tests (Phase 3)

- Zip is written by build.js itself: one deflated entry (zopfli, 500 iterations,
  falls back to zlib-9 if zopfli were larger), no extra fields, no directory
  entries. `unzip -t`/`unzip -l` verify it. A Node zip *reader* in the browser test
  inflates the artefact into a temp dir so the test exercises the real zip.
- Roadroller `-O1` is the default build (≈5 s); `node build.js -O2` is the release
  search (docs/07 says compare both — done in Phase 8).
- **Playwright's Firefox does not launch from `%LOCALAPPDATA%\ms-playwright` on this
  machine**: Windows reports `ERROR_SXS_CANT_GEN_ACTCTX` ("Dependent Assembly
  mozglue … could not be found") for both firefox-1538 and firefox_beta-1526,
  although the manifests are byte-identical to the stock Firefox 155 install, which
  runs fine. Copying the same folder to `C:\ffpw\firefox` makes it launch (so it is
  a path/policy quirk, not a corrupt download). `test/browser.test.js` falls back
  to that copy automatically (or `PRISM_FIREFOX=<path>`), so Firefox IS tested.
- Synthetic touch: chromium tests use real CDP touch events (`Input.dispatchTouchEvent`);
  Firefox has no CDP, so it dispatches `PointerEvent`s with `pointerType:'touch'`.
  `setPointerCapture` is wrapped in try/catch because synthetic pointers have no
  active pointer id (and some browsers throw on capture during a pen/touch cancel).
- The lobby can be opened before any level is loaded; render() now guards on `L`.

## Size log (dist/prism.zip)

| step | zip bytes |
|---|---|
| Phase 2 first build (core game, no sound/online/generator) | 7,981 |
| Phase 3 (test hooks, lobby guard) | 8,014 |

## 4 Sound (Phase 4)

- ZzFX micro (MIT, Frank Force) inlined in audio.js with a 10-entry table: tick
  (pitched by colour: 330·2^(c/7) Hz), play, bounce, crumble, fling, flip, fail,
  win, click, gate. Volume constant 0.3 baked in. AudioContext is created on the
  first click/pointerdown; `sfx` is a no-op until then, so nothing throws before a
  gesture and nothing autoplays. Mute flag persists in `prism26_progress.snd`.
- Cost: +670 bytes zipped.

## 5 Online (Phase 5)

- net.js keeps `NET.imp` (PartySocket URL, discovered in 0.2) and `NET.url`
  (relay URL template with `{room}`, **TODO until the user registers the game**).
  These two keys are deliberately *not* `_`-prefixed so they survive mangling and
  the browser test can point `__prism.net.url` at a local relay.
- PartySocket is `import()`ed lazily inside `join()`; if the import fails the client
  uses the native `WebSocket` on the same URL. With PartySocket the URL is rebuilt
  from `host` + `basePath` (+ `protocol`) so the relay URL is used verbatim (plus
  PartySocket's own `?_pk=` id query).
- Relay system messages (`@id`, `+id`, `-id`) from the page text are handled:
  `+id` triggers a re-hello so late joiners learn the room; `-id` is ignored
  (membership is rebuilt from hellos; a stale ghost simply stops updating).
- Host = lowest local id among known ids; only the host sees Start. Rounds use the
  generator with a random 30-bit seed sent in `["s", id, seed, round]`.
- Extra message `["f", id]` (fail) so a ghost unicorn disappears when its owner's
  run fails; not in docs/06 but 20 bytes and much clearer visually.
- Ghost sims are stepped once per animation frame (not accumulator-paced); with the
  deterministic sim this only changes pacing on non-60 Hz displays, never the result.
- Score line "you N – M them" implements best-of-3 informally (no automatic end).
- Tests: `test/relay.js` is a ~40-line dependency-free WebSocket relay (RFC 6455
  handshake + text frames, `@`/`+`/`-` system messages, `@id|` direct messages) so
  suite B's `online-race` test drives two real pages through the real transport;
  the PartySocket import is answered by a route with a stub that extends
  WebSocket and applies the same host/basePath mapping. Offline-degrade test also
  passes (status text, no console errors).
- Known limitation (logged, not fixed): if the user configures a relay URL and a
  player opens the lobby while offline, the browser itself may log a network error
  for the failed dynamic import — outside our code and only on an explicit online
  attempt without connectivity.

## 6 Generator + Daily (Phase 6)

- Segment library (all built from mechanics verified in the hand levels): orange
  bridge (4 u water), yellow chain (6 u water; single long yellow crumbles under
  the unicorn), step-up (2 u drop → red → ledge 4–5 u up, ledge starts at cx+4 which
  sits between the rise and fall x of the 27 u/s arc), wall-climb (vine 0.4 u off
  the wall, over the corner, h 3–5), flip-corridor (violet up, ceiling walk over
  water, violet down onto the next platform), one-way shelf (drop → red → through
  indigo → land → walk onto a platform at the same height), spike-run (ceiling vine
  over a spike pit, relies on the side-flip rule). Platforms are 3 u wide so three
  segments always fit in 32 u.
- Selection: never the same segment twice in a row; while fewer than 3 colours are
  required, only segments that add a new colour are eligible; loop continues until
  cx ≥ 22 and ≥ 3 colours. Result over seeds 1–40: 3–4 required colours, 5–9 s
  reference solutions, level strings 128–197 chars.
- Ink = ceil(1.4 × reference) per required colour, 3 u for the others (red
  herrings); a "shelf" also marks red as used since it needs a pad.
- No full floor: falling into water or timing out on a pit floor are the fail modes;
  suite A checks every seed's empty run fails.
- Daily = level 21 with seed = days since 2026-01-01 (UTC); the select screen shows
  the date. The Daily result is not saved (docs/05 only asks for a done flag, and
  the flag would cost more bytes than it is worth — logged as a cut).

## Size log (continued)

| step | zip bytes |
|---|---|
| Phase 4 sound | 8,684 |
| Phase 5 online (net.js + lobby glue) | 9,610 |
| Phase 6 generator | 10,214 |
| Phase 6 + ghost test hook | 10,230 |

## 7 Polish (Phase 7)

- Title unicorn drawn at 2.2× so it reads at phone size; rainbow win burst (7 small
  bursts, one per colour) instead of one random colour; gate-open sparkle is 20
  particles. Everything else on the docs' polish list (leg animation, hint timing,
  select arc, crumble/flip visuals, poof) was already in.
- Star budgets: L09 `G12 O6`, L10 `B18 O8`, L13 `I10 R6` (intro levels get a generous
  budget per docs/02) so a star is achievable on 14 levels and denied on 6 — suite
  A's ≥ 12 / ≥ 3 guidance now holds with 0 warnings.
- Daily done flag restored (`prism26_daily = seed`, ✓ on the select dot) — 60 bytes.
- Stopped adding features at 10.3 KB, well under the 12.7 KB polish ceiling; the
  remaining ~3 KB is deliberate margin for bugfix PRs during the voting period.

## 8 Verification (Phase 8)

- `node build.js -O2` vs `-O1`: 10,283 vs 10,286 bytes — -O2 kept as the release
  command (README documents both; either reproduces a valid zip).
- `unzip -l` / `unzip -t` clean; central directory has exactly one entry.
- Grep of the minified bundle: the only `http` string is the PartySocket import;
  no `localStorage.clear`, no `console.`; keys `prism26_progress`, `prism26_daily`.
  (The shipped HTML is roadroller-packed, so string checks are done on the
  pre-pack minified bundle by `tools/checks.mjs`.)
- Replay times 2.45–8.87 s across the 20 levels; the fastest (L03, L15, L10, L11,
  L12 at ~2.5 s) are single-motion slide/bounce levels — read the traces, the gem is
  not trivially reachable (empty paint fails on every level).
- Suite B run three times consecutively on the release zip (chromium + firefox);
  results appended to SUBMISSION.md.

## Size log (final)

| step | zip bytes |
|---|---|
| Phase 7 polish + daily flag | 10,246 |
| Final release build (`-O2`) | 10,283 |
