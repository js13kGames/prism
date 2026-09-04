# SUBMISSION.md — PRISM (js13kGames 2026), version 2

## Artefact

- `dist/prism.zip` — **11,661 bytes** (limit 13,312; 1,651 bytes of headroom).
- Built with `node build.js -O2` (roadroller thorough search).
- `unzip -l`: exactly one entry, `index.html` (16,373 bytes). `unzip -t`: OK.
  Central directory: 1 entry. CRC verified by `tools/checks.mjs`.
- No external resources and no external scripts; the only network endpoint in the
  code is the relay `wss://relay.js13kgames.com/prism/{room}`, opened only when the
  player creates or joins a room. No `fetch`, no `XMLHttpRequest`, no `console.`,
  no `localStorage.clear`; keys `prism26_progress`, `prism26_daily`.

## Online relay

`src/net.js` connects to `wss://relay.js13kgames.com/prism/{room}` with `{room}` =
`prism26-CODE`. Probed with `tools/relayprobe.mjs`: the relay accepts any sub-path as
an isolated room (a message sent in `/prism/prism26-AAAA` reached only the other
client in that room, not `/prism/prism26-BBBB` nor the base `/prism`), sends `@id` on
connect and `+id` when another client joins. `tools/relaytest.mjs` drives two real
browser pages through the live relay (create, join, same level, ghost stroke, ghost
unicorn). Races are best of three rounds, each on a fresh generated level.

## Before submitting

1. Upload `dist/prism.zip` as the draft's game file, open the preview in two tabs and
   race once (Online → Create room / Join).
2. The repository is at https://github.com/Arjun0014/PRISM (readable source in
   `src/`; the build is reproducible with the commands in README.md).

## What changed in version 2 (DECISIONS.md §9)

- **Paint has weight**: unsupported strokes fall on Play and land on whatever they
  touch; yellow crumbling drops what rested on it; unsupported paint is drawn faded
  while drawing.
- **Blue is Feather** (was Ice): never brakes, and arms a slow glide.
- **Indigo is Phase** (was one-way platform): painted through blocks; the unicorn
  walks through the blocks the line passes through.
- **30 levels** (was 20) in seven acts, grid level select.
- **New unicorn sprite** (outlined cartoon, rainbow mane/tail, trot cycle, wing,
  ghost alpha).
- Generator segments updated (wall-phase, feather-gap); 40/40 seeds verified.
- **Music**: the rainbow is a C-major scale; drawing and the unicorn's touches play
  notes over a generated backing (DECISIONS.md §11).

## Per-module size (minified alone; from `dist/size.txt`)

```
module        source   min  deflate
sim.js        14228   6116   3078
levels.js      3864   3389   1442
gen.js         3946   1696    921
audio.js       4522   2166   1269
render.js      7645   4857   1745
net.js         2343   1174    714
ui.js          2771   1948    958
main.js       11628   6046   3253
style.css      1970   1947    795

bundle raw 50034, minified 27072, roadrolled 14199, html 16373, zip 11661 (zopfli)
```

## What was cut or changed

Nothing from the priority list was cut. All six tiers shipped: core sim + 7 colours +
30 levels + progress; title/select/hints/rewind/undo/clear; sound (ZzFX, 11 sounds);
online race; generator + daily; particles/animation/stars; generative music.

Deviations from the original spec, all logged in DECISIONS.md:
- v2 colour changes above (docs/01–05 rewritten to match).
- Bounce launch speed is effectively capped at 30 u/s by the fall-speed clamp
  (documented, not changed).
- Paint contacts resolve before rect contacts (so a pad drawn on a floor line works).
- Run state is numeric (0/1/2) instead of strings.
- The Daily "done" flag is a ✓ on the select screen (no streaks, no scores).

## Submission form description (≤ 500 chars)

> Seven colours of rainbow paint, each with its own physics: red bounces, orange
> dashes, yellow crumbles, green is climbable, blue floats you down, indigo walks
> through walls, violet flips gravity — and unsupported paint falls when you press
> Play. The rainbow is also a scale: every colour is a note, and the unicorn plays
> your painting as it runs. 30 hand-made levels, a daily generated level, and an
> online best-of-three race with rivals' paint as ghosts. Mouse, touch or pen.

(482 characters.)

## Category checklist

| Category | Status |
|---|---|
| **Desktop** | ✔ Chrome + Firefox, keyboard shortcuts (1–7, Z, C, Space, Esc), mouse drawing, resize-safe. |
| **Mobile** | ✔ Pointer Events with `touch-action:none`, no page scroll/zoom (`user-scalable=no`, `overscroll-behavior`), palette buttons 46×52 css px (≥ 44), 30-level grid fits a 390 px screen, portrait (390×844) and landscape (844×390) tested with real touch input. |
| **Online** | ✔ Best-of-three race over the js13kGames relay (`wss://relay.js13kgames.com/prism/{room}`) via PartySocket (lazy import, native WebSocket fallback), rooms `prism26-XXXX`, shareable `#r=CODE` links, ghost paint + ghost unicorns from the deterministic sim, degrades to a status line offline. Verified against the live relay with two real browser pages. |
| **Wavedash** | Publish the same `dist/index.html` build on Wavedash by 20 September (docs.wavedash.com; no new features or fixes allowed after the deadline). Nothing in the game depends on the host origin except `localStorage` keys prefixed `prism26_`. |

## Known limitations

- Firefox is tested with Playwright's Firefox build launched from a copied folder
  (`C:\ffpw\firefox`) because the default install location fails to launch on this
  machine (DECISIONS.md §3). A manual spot-check in the installed Firefox is
  recommended.
- If the lobby is opened offline, the browser itself may log a network error for the
  failed PartySocket import (outside our code); the lobby shows a status line.

## Test results (suite A: 30/30 levels solved, 30/30 empty-fail, determinism identical, 40/40 generator seeds, 0 warnings)

Suite B against the unzipped release zip (11,661 bytes), two consecutive full runs after the final build. (A first run on the same zip was 23/24: the hermetic online-race test drew its ghost stroke at a spot that a wall covers on some generated seeds; the test now draws in the sky above the start platform, and passed 6/6 repeats before these runs.) The live js13kGames relay was exercised separately with `tools/relaytest.mjs`: two real pages, create/join, same level, ghost stroke and ghost unicorn, zero console errors.

| browser | test | run 1 | run 2 |
|---|---|---|---|
| chromium | boot | pass | pass |
| chromium | screens | pass | pass |
| chromium | level1-input | pass | pass |
| chromium | undo-clear-ink | pass | pass |
| chromium | all-levels | pass | pass |
| chromium | fail-path | pass | pass |
| chromium | mobile-portrait | pass | pass |
| chromium | mobile-landscape | pass | pass |
| chromium | offline-lobby | pass | pass |
| chromium | online-race | pass | pass |
| chromium | resize | pass | pass |
| chromium | audio-gesture | pass | pass |
| firefox | boot | pass | pass |
| firefox | screens | pass | pass |
| firefox | level1-input | pass | pass |
| firefox | undo-clear-ink | pass | pass |
| firefox | all-levels | pass | pass |
| firefox | fail-path | pass | pass |
| firefox | mobile-portrait | pass | pass |
| firefox | mobile-landscape | pass | pass |
| firefox | offline-lobby | pass | pass |
| firefox | online-race | pass | pass |
| firefox | resize | pass | pass |
| firefox | audio-gesture | pass | pass |

Totals: 24/24, 24/24. No console errors or warnings in either run.
