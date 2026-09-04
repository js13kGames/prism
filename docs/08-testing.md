# 08 — Testing

Tests are the player while the user is away. They must actually exercise the shipped
build, not just the source. Both suites run with `npm test` and must be green before
you stop.

## A. `test/sim.test.js` (Node, no deps, runs in < 5 s)

Imports `src/sim.js`, `src/levels.js`, `src/gen.js`, `test/solutions.js`.

For each level 1–30:
1. **Solvable**: `createRun(level, solution)`, step until state ≠ 'play' or t > 25.
   Assert `state === 'win'`. Print `L07 win 6.42s`.
2. **Not trivial**: `createRun(level, [])`, same loop. Assert `state === 'fail'`.
3. **Ink legal**: per colour, sum of solution stroke lengths ≤ budget; assert each
   colour used is unlocked.
4. **Featured colour** (levels 1,2,4,7,10,13,16,19): log a warning if the solution
   does not use the featured colour (do not fail).
5. **Determinism**: run the solution twice from fresh runs and compare
   `hashState` at every 30th step. Assert identical. Also run once with
   `step` called in batches of 4 (like the rAF accumulator) and assert the final
   state matches.
6. **Budget sanity**: star threshold (60% of total) must be ≥ the solution's ink for
   at least 12 of the 20 levels (so stars are achievable), and < for at least 3
   (so stars are not free). Log, fail only if 0 stars are achievable.

Generator (if present): seeds 1..40 → solvable with its reference strokes, and
empty paint fails. Also assert no rect exceeds the world and every level has ≥ 3
distinct required colours.

Level parser: assert every level string parses, has S, G, ≥ 1 rect, and ink for ≥ 2
colours; every hint ≤ 40 chars.

## B. `test/browser.test.js` (Playwright, chromium + firefox)

Setup: `npx playwright install chromium firefox` (with `--with-deps` if the OS needs
it; if system deps cannot be installed for firefox, try `npx playwright install-deps`;
if firefox still cannot launch, document it in SUBMISSION.md as an untested browser
and mark this as the top item for the user to verify manually — do not silently skip).

Serve `dist/` (the built, roadrolled, zipped-then-unzipped output — literally unzip
`dist/prism.zip` into a temp dir and serve that, so the test covers the real
artefact) on a local port.

Console capture: attach `page.on('console')` and `page.on('pageerror')`; any message
of type `error` or any pageerror fails the test. Collect warnings and print them.

Per browser:
1. **Boot**: load `/`, wait for the title screen (`#ui` contains "PRISM"). Screenshot
   to `test-results/<browser>-title.png`.
2. **Screens**: click through Title → Select → Level 1 → Back → Select → Title →
   Online → Back. No errors.
3. **Level 1 by real input**: open level 1, click the orange palette button, drag a
   pointer from world (10,12) to (22,12) using `page.mouse` with ~10 intermediate
   points (convert world→screen using the canvas rect and the letterbox scale exposed
   as `window.__prism.toScreen(x,y)` in dev builds — expose a tiny debug hook only
   when `location.hash === '#test'`, minified away otherwise… no: keep it always
   but under a 1-char name; it's ~40 bytes). Press Play. Wait for the win overlay
   (≤ 10 s). Assert progress saved (`localStorage.prism26_progress` done[0] true).
4. **Undo/Clear/Ink**: draw a stroke, check the ink bar width decreased, Undo, check
   it restored, draw, Clear, check restored.
5. **All levels via injected solutions**: for each level, load it (through the UI or
   `window.__prism.load(n)`), inject `window.__prism.setStrokes(solution)`, press
   Play, wait for the win overlay, click Next. This proves the *shipped* sim matches
   the source sim after minify/roadroller (property mangling bugs show up here).
6. **Fail path**: level 4 (Angles, dies on spikes in 1.6 s), Play with empty paint → fail flash → back in draw phase
   with the palette enabled, no errors.
7. **Mobile portrait** (viewport 390×844, `hasTouch`, `isMobile` where supported):
   boot, open level 1, draw with `page.touchscreen` / dispatched pointer events of
   `pointerType: 'touch'`, Play, win. Assert the page did not scroll
   (`window.scrollY === 0`) and the palette buttons' bounding boxes are ≥ 44 px tall.
8. **Mobile landscape** (844×390): boot + level 2 solution.
9. **Online offline-degrade**: route all requests to external hosts to `abort`, open
   the lobby, click Create → status contains an error/offline message within 5 s, no
   console errors, Back works.
10. **Resize**: resize the viewport mid-draw-phase; canvas re-fits; no errors.
11. **Audio**: with `--autoplay-policy` defaults, clicking through the title must not
    throw on AudioContext creation (a warning is acceptable).

Screenshots for every step into `test-results/` so the user can eyeball the game
later. Print a final summary table: browser × test → pass/fail.

## C. Manual-style checks you must perform (and log in SUBMISSION.md)

- Open `dist/index.html` via `file://`? Not required by the rules (they serve it), but
  make sure nothing *needs* a server (no `fetch` of local files).
- `unzip -l dist/prism.zip` → exactly one entry, `index.html`.
- Zip opens with `unzip -t` (CRC ok).
- Read the replay logs from test A for levels 5, 9, 12, 18, 19, 20 and sanity-check
  the times are plausible (2–20 s) — a 0.3 s win means the gem is reachable trivially;
  fix the level.
- Grep the built `index.html` for `http` — the only allowed occurrence is the
  PartySocket import URL and relay host inside `net.js`.
- Grep for `localStorage.clear` → must be absent.
- Confirm no `console.` calls survive in the build (drop_console) except none needed.

## D. Regression discipline

Any change to `sim.js` or a colour constant → run suite A (all levels) before
proceeding. Any change to `build.js`, minify options, or property names → run suite
B step 5 (all levels in the shipped build). Log changes to physics constants in
`DECISIONS.md` with the levels that motivated them.
