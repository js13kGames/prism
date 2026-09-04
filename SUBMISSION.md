# SUBMISSION.md — PRISM (js13kGames 2026), version 2

## Artefact

- `dist/prism.zip` — **11,309 bytes** (limit 13,312; 2,003 bytes of headroom).
- Built with `node build.js -O2` (roadroller thorough search).
- `unzip -l`: exactly one entry, `index.html` (15,910 bytes). `unzip -t`: OK.
  Central directory: 1 entry. CRC verified by `tools/checks.mjs`.
- No external resources; the only URL in the code is the PartySocket import
  (`https://play.js13kgames.com/2026/online/partysocket.js`), loaded lazily and only
  when the player opens the Online lobby. No `fetch`, no `XMLHttpRequest`, no
  `console.`, no `localStorage.clear`; keys `prism26_progress`, `prism26_daily`.

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

## Per-module size (minified alone; from `dist/size.txt`)

```
module        source   min  deflate
sim.js        14504   6116   3078
levels.js      3905   3389   1442
gen.js         4003   1696    921
audio.js       2635   1378    877
render.js      7796   4857   1745
net.js         2450   1288    770
ui.js          2771   1948    958
main.js       11211   5783   3100
style.css      1993   1947    795

bundle raw 48411, minified 26095, roadrolled 13736, html 15910, zip 11309 (zopfli)
```

## What was cut or changed

Nothing from the priority list was cut. All six tiers shipped: core sim + 7 colours +
30 levels + progress; title/select/hints/rewind/undo/clear; sound (ZzFX, 11 sounds);
online race; generator + daily; particles/animation/stars.

Deviations from the original spec, all logged in DECISIONS.md:
- v2 colour changes above (docs/01–05 rewritten to match).
- Bounce launch speed is effectively capped at 30 u/s by the fall-speed clamp
  (documented, not changed).
- Paint contacts resolve before rect contacts (so a pad drawn on a floor line works).
- Run state is numeric (0/1/2) instead of strings.
- The Daily "done" flag is a ✓ on the select screen (no streaks, no scores).

## Submission form description (≤ 500 chars)

> Seven colours of rainbow paint, each with its own physics: red bounces, orange
> dashes, yellow crumbles, green is climbable, blue floats you down, indigo lets you
> walk through walls, violet flips gravity — and paint that isn't propped up falls
> when you press Play. Paint a path and watch a very stupid unicorn commit to it.
> 30 hand-made levels, a daily generated level, and an online race where rivals'
> paint shows as ghosts and the first unicorn to the gem wins. Mouse, touch or pen.

(477 characters.)

## Category checklist

| Category | Status |
|---|---|
| **Desktop** | ✔ Chrome + Firefox, keyboard shortcuts (1–7, Z, C, Space, Esc), mouse drawing, resize-safe. |
| **Mobile** | ✔ Pointer Events with `touch-action:none`, no page scroll/zoom (`user-scalable=no`, `overscroll-behavior`), palette buttons 46×52 css px (≥ 44), 30-level grid fits a 390 px screen, portrait (390×844) and landscape (844×390) tested with real touch input. |
| **Online** | ✔ Race mode over the js13kGames relay via PartySocket (lazy import, native WebSocket fallback), rooms `prism26-XXXX`, shareable `#r=CODE` links, ghost paint + ghost unicorns from the deterministic sim, degrades to a status line offline. **Needs the relay URL (above).** |
| **Wavedash** | Publish the same `dist/index.html` build on Wavedash by 20 September (docs.wavedash.com; no new features or fixes allowed after the deadline). Nothing in the game depends on the host origin except `localStorage` keys prefixed `prism26_`. |

## Known limitations

- Firefox is tested with Playwright's Firefox build launched from a copied folder
  (`C:\ffpw\firefox`) because the default install location fails to launch on this
  machine (DECISIONS.md §3). A manual spot-check in the installed Firefox is
  recommended.
- If a relay URL is configured and the lobby is opened offline, the browser itself may
  log a network error for the failed dynamic import (outside our code).

## Test results (suite A: 30/30 levels solved, 30/30 empty-fail, determinism identical, 40/40 generator seeds, 0 warnings)
