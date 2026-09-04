# SUBMISSION.md — PRISM (js13kGames 2026), version 2.1

## Artefact

- `dist/prism.zip` — **12,134 bytes** (limit 13,312; 1,178 bytes of headroom).
- Built with `node build.js -O2` (roadroller thorough search).
- `unzip -l`: exactly one entry, `index.html` (17,029 bytes). `unzip -t`: OK.
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
browser pages through the live relay (create, join, same generated level). Races are best
of three rounds, each on a fresh level; no paint crosses the relay until someone wins it.

## Before submitting

1. Upload `dist/prism.zip` as the draft's game file, open the preview in two tabs and
   race once (Online → Create room / Join).
2. The repository is at https://github.com/Arjun0014/PRISM (readable source in
   `src/`; the build is reproducible with the commands in README.md).
3. For the Wavedash category: put the Developer Portal game ID in `wavedash.toml`, then
   `wavedash auth login`, `node build.js -O2`, `wavedash build push`, `wavedash publish <BUILD_ID>`.
   The upload is `dist/wavedash/index.html` — byte-identical to the file inside the zip.

## What changed in version 2.1 (DECISIONS.md §12–13)

- **Copy link works.** It used the Clipboard API alone, which is unavailable on a
  plain-http page and rejects asynchronously where it exists; it now copies through
  `execCommand` first, confirms with "Link copied!", and shows the URL if both fail.
- **Shared links open the room.** `/#r=(w{4})/` was a typo for `w{4}` and matched only
  the literal "wwww", so every shared link fell through to the create/join form.
- **The mute button looks muted** (🔊/🔇, dimmed) in the HUD as well as the title, and
  muting now cuts notes that were already scheduled ahead instead of letting them ring.
- **Races no longer leak the solution.** Live ghosts are gone: paint is broadcast only
  by the winner, and replays for everyone else on the result screen.
- **Rounds and matches announce themselves**: round card, HUD round/score tag, a result
  card naming winner, time and score, and Next round / Rematch / Leave.
- **Leave leaves.** The lobby button used to keep the socket open, so the next round
  dragged the player back in, and a rival's paint used to stay on screen in every level
  opened afterwards.
- **Wavedash-ready**: `wavedash.toml`, `dist/wavedash/index.html`, and a guarded
  `Wavedash.init()` that costs nothing when the platform global is absent.

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
audio.js       4649   2223   1295
render.js      7645   4857   1745
net.js         2343   1174    714
ui.js          3632   2368   1111
main.js       13886   6728   3605
style.css      2025   2001    817

bundle raw 53250, minified 28213, roadrolled 14801, html 17029, zip 12134 (zopfli)
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
| **Online** | ✔ Best-of-three race over the js13kGames relay (`wss://relay.js13kgames.com/prism/{room}`) on a plain WebSocket (no import, reconnect on unexpected close), rooms `prism26-XXXX`, shareable `#r=CODE` links, no paint shared while a round is live (the only in-round message is "started running"), the winner's run replaying from the deterministic sim on the result card, round cards and a running score, degrades to a status line offline. Verified against the live relay with two real browser pages. |
| **Wavedash** | ✔ Ready to upload: `wavedash.toml` is checked in and `build.js` writes `dist/wavedash/index.html` (the same file that ships in the zip) as the `upload_dir`. The platform injects a global `Wavedash`, so the SDK costs no bytes and no external resource: `main.js` calls `init()`/`readyForEvents()` only when that global exists. Remaining step is a game ID from the Developer Portal, then `wavedash build push` / `wavedash publish` (by 20 September; no new features or fixes after the deadline). Nothing depends on the host origin except `localStorage` keys prefixed `prism26_`. |

## Known limitations

- Firefox is tested with Playwright's Firefox build launched from a copied folder
  (`C:\ffpw\firefox`) because the default install location fails to launch on this
  machine (DECISIONS.md §3). A manual spot-check in the installed Firefox is
  recommended.
- If the lobby is opened offline, the browser itself may log a network error for the
  refused WebSocket connection (outside our code); the lobby shows a status line.

## Test results (suite A: 30/30 levels solved, 30/30 empty-fail, determinism identical, 40/40 generator seeds, 0 warnings)

Suite B against the unzipped release zip (12,134 bytes), one full run after the final build (the
two runs before it, on the build without the ghost-lifetime fix, were also 28/28 in both browsers). The live js13kGames relay was exercised separately with `tools/relaytest.mjs`.

| browser | test | result |
|---|---|---|
| chromium | boot | pass |
| chromium | screens | pass |
| chromium | level1-input | pass |
| chromium | undo-clear-ink | pass |
| chromium | all-levels | pass |
| chromium | fail-path | pass |
| chromium | mobile-portrait | pass |
| chromium | mobile-landscape | pass |
| chromium | offline-lobby | pass |
| chromium | online-race | pass |
| chromium | resize | pass |
| chromium | audio-gesture | pass |
| chromium | mute-glyph | pass |
| chromium | room-link | pass |
| firefox | boot | pass |
| firefox | screens | pass |
| firefox | level1-input | pass |
| firefox | undo-clear-ink | pass |
| firefox | all-levels | pass |
| firefox | fail-path | pass |
| firefox | mobile-portrait | pass |
| firefox | mobile-landscape | pass |
| firefox | offline-lobby | pass |
| firefox | online-race | pass |
| firefox | resize | pass |
| firefox | audio-gesture | pass |
| firefox | mute-glyph | pass |
| firefox | room-link | pass |

Totals: 28/28. No console errors or warnings.

What `online-race` now proves, per browser: two pages get the same generated level and a `Round 1` card; the
host sees `rival racing` when the guest presses Play but receives **no** stroke and **no** ghost run; a third
client's win produces the result card, the score and a running replay of that winner's paint on both pages;
the guest is told to wait while only the host gets **Next round**; a second win ends the match with
**Rematch**, the rematch resets the score to `Round 1 · 0–0`, and leaving the room for level 1 leaves no
rival paint behind.

`room-link` proves: **Copy link** puts `<url>#r=CODE` on the clipboard (read back from the clipboard in
chromium; the status line in firefox), a page opened on that link joins the room, and **Leave** disconnects —
a round the host starts afterwards does not pull the leaver back in.
