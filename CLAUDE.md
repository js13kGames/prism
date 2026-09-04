# PRISM — js13kGames 2026 entry

Read this file first, then `docs/01` through `docs/08` in order, then `PROMPT.md`.
These documents are the spec. Where they are silent, decide and log the decision
in `DECISIONS.md`. Never stop to ask the user — they are away.

## What this is

A draw-then-play physics puzzle game for js13kGames 2026 (theme: **Unicorns and
Rainbows**). The player paints rainbow-coloured paths with 7 colours, each with its
own physics, then presses Play. A dumb unicorn walks automatically; all agency is in
the paint. 30 hand-authored levels + a seeded generator for daily/online races.

Categories targeted with the single zip: **Desktop, Mobile, Online** (and Wavedash,
which is just publishing the same build later).

## Hard constraints (from the competition rules — violation = disqualified)

1. Final zip ≤ **13,312 bytes**. Target ≤ **12,900** to keep margin for bugfix PRs.
2. Zip contains `index.html` at top level. Everything inlined. Works when unzipped and
   opened via a static server (no build step at play time).
3. **No external resources** — no CDN, no fonts, no images fetched. The ONLY allowed
   external import is PartySocket from the js13kgames server (see docs/06). The game
   must work fully offline; online is optional.
4. **Zero console errors** in latest Chrome and Firefox. Warnings are tolerated but
   should be fixed. Errors in any state (title, draw, play, win, online lobby, offline
   fallback) are release blockers.
5. localStorage keys prefixed `prism26_`. Never call `localStorage.clear()`.
6. Original content only. No clone of a known game. No copyrighted assets.
7. Readable source in the repo: `src/` unminified, `build.js` reproducible.

## Non-negotiable design rules

- The simulation is **deterministic**: fixed timestep 1/60, no `Math.random` in the
  sim, seeded PRNG (mulberry32) for the generator only. Same paint + same level ⇒
  identical result on every browser. Online depends on this.
- The sim module (`src/sim.js`) has **no DOM/canvas/audio dependencies** and runs in
  Node. Tests import it directly.
- Two strict phases: **Draw** (no physics) and **Play** (no drawing). Rewind returns
  to Draw with paint intact.
- The unicorn has no player input. Ever.
- Mobile is first-class: touch drawing, palette tap targets ≥ 44 css px, no page
  scroll/zoom, works in portrait (letterboxed) and landscape.

## Priority order when cutting for size (cut from the bottom)

1. Core sim + 7 colours + Draw/Play loop + 30 levels + win/lose + progress save
2. Title, level select, hints, rewind/undo/clear
3. Sound (ZzFX mini)
4. Online race mode via relay
5. Seeded generator + daily seed
6. Particles, animation polish, stars/ink medals

Never cut 1–2. If 3–6 don't fit, cut in reverse order and log it.

## Definition of done (all must be true before you stop)

- [ ] `node test/sim.test.js` passes: all 30 levels solved by their stored solutions;
      all 30 levels FAIL with empty paint; determinism check passes (two runs of the
      same replay produce byte-identical state hashes).
- [ ] `node test/browser.test.js` passes in **both** chromium and firefox (Playwright):
      page loads, no console errors across every screen, level 1 completed via injected
      pointer events, every level completed via injected solution, mobile viewport
      (390×844 and 844×390) loads and draws with touch events, online lobby opens and
      degrades cleanly with no network.
- [ ] `node build.js` produces `dist/index.html` and `dist/prism.zip`, prints sizes,
      and **fails** if the zip exceeds 13,312 bytes.
- [ ] `unzip -l dist/prism.zip` shows only `index.html` at the top level.
- [ ] You have personally played through every level's replay in the headless browser
      and confirmed the unicorn reaches the gem (the test does this, but read the logs).
- [ ] `README.md` explains the game, controls, colours, build, and credits.
- [ ] `SUBMISSION.md` contains: final zip size, per-module size breakdown, list of
      anything cut, description text for the submission form, and category checklist.
- [ ] `DECISIONS.md` logs every judgment call you made.

## Working style

- Commit to git after every meaningful step (`git init` if needed).
- Measure size early and often (`node build.js` after every feature). Do not wait
  until the end to discover you are 4 KB over.
- Prefer deleting features over shipping a game that is over the limit.
- When something is ambiguous, pick the option that is smaller in bytes and simpler to
  test. Log it.
- The tests are your player. If the tests pass but a level felt trivial or unfair
  when you read the replay, fix the level, then re-run.
