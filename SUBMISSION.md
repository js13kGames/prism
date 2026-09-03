# SUBMISSION.md — PRISM (js13kGames 2026)

## Artefact

- `dist/prism.zip` — **10,283 bytes** (limit 13,312; 3,029 bytes of headroom).
- Built with `node build.js -O2` (roadroller thorough search; `-O1` gives 10,286).
- `unzip -l`: exactly one entry, `index.html` (14,536 bytes). `unzip -t`: OK.
- No external resources; the only URL in the code is the PartySocket import
  (`https://play.js13kgames.com/2026/online/partysocket.js`), loaded lazily and only
  when the player opens the Online lobby.

## **Before submitting — must do by hand**

1. **Relay URL.** Register the game as a draft on js13kgames.com (Online category)
   to get your relay URL, then set `url` in `src/net.js`:
   ```js
   export const NET = { imp: 'https://play.js13kgames.com/2026/online/partysocket.js', url: 'wss://…your relay…/{room}' };
   ```
   Keep the literal `{room}` where the room name belongs — the game replaces it with
   `prism26-XXXX`. If your relay URL has no room slot, put `{room}` wherever the
   relay expects the room (path segment or query value). Rebuild with
   `node build.js -O2`, re-run `node test/browser.test.js`, commit.
   Until this is done the lobby shows "Online is not configured (offline build)" and
   everything else works offline. The relay page could not be read without logging
   in (see DECISIONS.md 0.2), so this URL was not guessed.
2. Push the repository to GitHub (readable, unmangled source is in `src/`; the
   build is reproducible with the commands in README.md).

## Per-module size (minified alone; from `dist/size.txt`)

```
module        source   min  deflate
sim.js        10654   4742   2512
levels.js      2502   2232   1039
gen.js         3715   1620    881
audio.js       2528   1341    862
render.js      5005   3123   1320
net.js         2450   1288    770
ui.js          2901   2070   1043
main.js       10684   5641   3059
style.css      1984   1961    810

bundle raw 39576, minified 21685, roadrolled 12348, html 14536, zip 10283 (zopfli)
```

## What was cut or changed

Nothing from the priority list was cut. All six tiers shipped: core sim + 7 colours +
20 levels + progress; title/select/hints/rewind/undo/clear; sound (ZzFX, 10 sounds);
online race; generator + daily; particles/animation/stars.

Deviations from the spec, all logged in DECISIONS.md:
- Level geometry for 12 levels was nudged so the paper solutions actually work in the
  sim (the sim is the truth); teaching intent unchanged. L20's ceiling/gate gap was
  closed so the gate cannot be bypassed.
- Ice conserves energy while sliding instead of receiving a second gravity projection.
- Paint contacts resolve before rect contacts (so a pad drawn on a floor line works).
- Run state is numeric (0/1/2) instead of strings.
- The Daily "done" flag is a ✓ on the select screen (no streaks, no scores).

## Submission form description (≤ 500 chars)

> Seven colours of rainbow paint, each with its own physics: red bounces, orange
> dashes, yellow crumbles, green is climbable, blue is ice, indigo is one-way, violet
> flips gravity. Paint a path, press Play, and watch a very stupid unicorn commit to
> it. 20 hand-made levels, a daily generated level, and an online race where you see
> rivals' paint as ghosts and the first unicorn to the gem wins. Mouse, touch or pen;
> portrait or landscape.

(435 characters.)

## Category checklist

| Category | Status |
|---|---|
| **Desktop** | ✔ Chrome + Firefox, keyboard shortcuts (1–7, Z, C, Space, Esc), mouse drawing, resize-safe. |
| **Mobile** | ✔ Pointer Events with `touch-action:none`, no page scroll/zoom (`user-scalable=no`, `overscroll-behavior`), palette buttons 46×52 css px (≥ 44), portrait (390×844) and landscape (844×390) tested with real touch input. |
| **Online** | ✔ Race mode over the js13kGames relay via PartySocket (lazy import, native WebSocket fallback), rooms `prism26-XXXX`, shareable `#r=CODE` links, ghost paint + ghost unicorns from the deterministic sim, degrades to a status line offline. **Needs the relay URL (above).** |
| **Wavedash** | Publish the same `dist/index.html` build on Wavedash by 20 September (docs.wavedash.com; no new features or fixes allowed after the deadline). Nothing in the game depends on the host origin except `localStorage` keys prefixed `prism26_`. |

## Test results

Suite A (`node test/sim.test.js`): 20/20 levels win with their stored solutions, 20/20
fail with empty paint, ink within budget, determinism (per-30-step hashes and batched
stepping) identical, generator seeds 1–40 all solvable with ≥ 3 required colours and
failing empty. Replay times: 2.45–8.87 s (L03 2.45, L05 3.42, L09 5.25, L12 2.62,
L18 6.58, L19 6.60, L20 7.60) — all in the plausible 2–20 s band; the < 3 s wins are
the short slide/bounce levels where the geometry is one motion long by design.

Suite B (`node test/browser.test.js`, against the unzipped release zip), run three
times in a row — see the table at the end of this file (filled in from
`test-results/final-run-{1,2,3}.log`).

### Manual-style checks (docs/08 C)

- `unzip -l dist/prism.zip` → one entry `index.html`; `unzip -t` → no errors.
- Nothing needs a server: no `fetch`, no `XMLHttpRequest`, no relative resources;
  the page is self-contained (opening `dist/index.html` from disk works).
- `http` in the minified JS: only the PartySocket import URL.
- `localStorage.clear`: absent. Keys used: `prism26_progress`, `prism26_daily`.
- `console.`: absent (terser `drop_console`).
- Replay logs for levels 5, 9, 12, 18, 19, 20 read and sane (see Suite A above).
- Firefox note: Playwright's Firefox build refuses to start from its default
  `%LOCALAPPDATA%` location on this Windows machine (Windows SxS loader error), so the
  suite launches a copy from `C:\ffpw`. Firefox 153 (Playwright build) therefore IS
  tested; a manual spot-check in your installed Firefox 155 is still recommended.

## Browser × test (three consecutive runs of the release zip)

See below (appended automatically after the runs).
