# SUBMISSION.md — PRISM (js13kGames 2026), version 2.3

## Artefact

- `dist/prism.zip` — **12,983 bytes** (limit 13,312; 329 bytes of headroom).
- Built with `node build.js -O2` (roadroller thorough search). This is the **competition
  build**: it carries no Wavedash code at all (DECISIONS.md §18).
- The **Wavedash build** is separate: `node build.js -O2 --wavedash` →
  `dist/wavedash/index.html` (18656 bytes; not size-limited, never submitted to the form).
- `unzip -l`: exactly one entry, `index.html` (18,324 bytes). `unzip -t`: OK.
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
3. For the Wavedash category: `wavedash.toml` already points at the PRISM game
   (`j97ddpqsg8v73xn49hp7pqfx0x8dr30z`, team CommendableBard71). Set `WAVEDASH_TOKEN` to your
   API key, then `node build.js -O2 --wavedash`, `wavedash build push`, `wavedash publish <BUILD_ID>`.
   The upload is `dist/wavedash/index.html` — the Wavedash build (platform SDK init,
   achievements, leaderboards), which is **not** the file inside the zip. **Version 2.3 has not
   been published yet**; the releases below are the 2.2.1 build and need replacing before the
   Wavedash deadline (20 September).
   **Published 2026-09-04**: build `mn7577vh48yny89ksk45b7xczh8dsh28`, release `rx73968cghm4kb05dbyaxbnp158ds0e4`,
   https://wavedash.com/games/prism (superseded by the 2.2.1 release below; the same build as `dist/prism.zip`).
   **2.2.1 published 2026-09-04**: build `mn7771r796s8xbcsde1pffjsz18drmv2`, release `rx76wcagkakyc2h31z6bexwd5s8drj2n` —
   the 13,209-byte build that is `dist/prism.zip`.

## What changed in version 2.3 (DECISIONS.md §18)

- **The level grid's Back button is reachable on a landscape phone.** The menu overlay
  centred its content and could not scroll, so the eight-row grid lost its heading and its
  Back button off both ends of a 390 px-tall screen. Menus now scroll when taller than the
  screen (auto-margin centring, `overflow:auto`), `touch-action:none` moved from `body` to
  the canvas so WebKit lets the list scroll, and the mobile-landscape test opens the grid,
  scrolls it and presses Back.
- **Two builds.** All Wavedash code lives in `src/wavedash.js`; the competition build swaps
  in a no-op stub that terser folds away (the build fails if the string `Wavedash` survives),
  and `node build.js --wavedash` writes the platform build to `dist/wavedash/index.html`
  alone. The competition zip shrank by 226 bytes. The suite tests the competition build with
  the SDK global injected (it must ignore it) and the Wavedash build with the same global (it
  must call `init()`, say Copy code, and post achievements and scores).

## What changed in version 2.2 (DECISIONS.md §17)

- **Vines never go back.** Hand-drawn vines (dozens of short, jittered segments) used to
  turn around at any point where both sides of the unicorn were blocked, and the grab
  direction came from one jittered segment plus the frame's gravity increment — so a vine
  starting on a floor could oscillate forever or be climbed downwards first. A blocked
  position now holds still and creeps; the direction ignores anything within 53° of
  perpendicular; stroke points are clipped out of solids as well as midpoints.
- **Online rooms no longer start on join.** A host who had played any level before going
  Online was shown that level's HUD the moment a guest joined (the lobby never cleared the
  loaded level), while the guest waited for Start forever. Reported from Wavedash; the race
  test now plays a level before creating the room.
- **Aurora's gate really needs all seven colours** (it was 2 tall and a gravity flip flew
  around it; now 6 tall), and its stored solution touches every colour.
- **The crumble and paint-landing sounds** are quiet low crackles instead of full-volume
  noise bursts (peak halved, harshness cut 4×, measured offline).
- **Music: the paint is the score.** The strokes on the canvas loop as the melody in draw
  order; notes pan to where they were painted / where the unicorn touches them; a
  dotted-eighth feedback echo; kick, hat and a high off-beat chord tone in Play; the key
  rises a fifth every five levels; the win fanfare replays the colours the run touched.
- **Wavedash achievements (9) and leaderboards** (`levels`, `stars`, `daily-<seed>`
  times) in the same zip, through the platform's injected SDK global, fully guarded.
- **Bytes** recovered to stay under the limit: palette tooltips, the cloud shadow band, the
  start marker's flag, the async-clipboard fallback, the primary button's press shadow,
  `overscroll-behavior`, the dated Daily button on the level grid (its ✓ moved to the
  title's Daily button).

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
- **Act 8 — Mastery**: ten new levels (31–40) that combine the verbs the first seven acts
  teach, ending on Aurora, which needs one stroke of every colour to open its gate.
- **Continue** on the title jumps to the first unfinished level, and the level grid is one
  row per act, dotted in the colour that act teaches.
- **Title screen**: full-bleed animated backdrop — the rainbow paints itself in and the
  unicorn walks it on a 10 s loop — a vignette instead of a flat wash, progress on the
  front page, and a primary Play button (DECISIONS.md §14).
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

## Per-module size (competition build, minified alone; from `dist/size.txt`)

```
js13k competition build (roadroller -O2)
module              source   min  deflate
sim.js              14406   5999   3042
levels.js            5223   4638   1905
gen.js               3932   1696    921
audio.js             6803   2836   1577
render.js            7373   4671   1702
net.js               2308   1174    714
wavedash.js (stub)     37     30     22
ui.js                3871   2471   1163
main.js             15581   7416   3905
style.css            2802   2394    988

bundle raw 59552, minified 30304, roadrolled 15703, html 18324, zip 12983 (zopfli)
```

## What was cut or changed

Nothing from the priority list was cut. All six tiers shipped: core sim + 7 colours +
40 levels + progress; title/select/hints/rewind/undo/clear; sound (ZzFX, 13 sounds);
online race; generator + daily; particles/animation/stars; generative music with the
painting as the melody.

Deviations from the original spec, all logged in DECISIONS.md:
- v2 colour changes above (docs/01–05 rewritten to match).
- Bounce launch speed is effectively capped at 30 u/s by the fall-speed clamp
  (documented, not changed).
- Paint contacts resolve before rect contacts (so a pad drawn on a floor line works).
- Run state is numeric (0/1/2) instead of strings.
- The Daily "done" flag is a ✓ on the title's Daily button (no streaks; the Wavedash build posts the time to the `daily` leaderboard).

## Submission form description (≤ 500 chars)

> Seven colours of rainbow paint, each with its own physics: red bounces, orange
> dashes, yellow crumbles, green is climbable, blue floats you down, indigo walks
> through walls, violet flips gravity — and unsupported paint falls when you press
> Play. The rainbow is also a scale: every colour is a note, your strokes loop as the
> melody, and the unicorn plays your painting as it runs. 40 hand-made levels, a daily
> generated level, and an online best-of-three race. Mouse, touch or pen.

(480 characters.)

## Category checklist

| Category | Status |
|---|---|
| **Desktop** | ✔ Chrome + Firefox, keyboard shortcuts (1–7, Z, C, Space, Esc), mouse drawing, resize-safe. |
| **Mobile** | ✔ Pointer Events with `touch-action:none` on the canvas, no page scroll/zoom (`user-scalable=no`, `overflow:hidden`, `pan-y` on the overlay), palette buttons 46×52 css px (≥ 44), the 40-level grid scrolls when it is taller than the screen (landscape), portrait (390×844) and landscape (844×390) tested with real touch input. |
| **Online** | ✔ Best-of-three race over the js13kGames relay (`wss://relay.js13kgames.com/prism/{room}`) on a plain WebSocket (no import, reconnect on unexpected close), rooms `prism26-XXXX`, shareable `#r=CODE` links, no paint shared while a round is live (the only in-round message is "started running"), the winner's run replaying from the deterministic sim on the result card, round cards and a running score, degrades to a status line offline. Verified against the live relay with two real browser pages. |
| **Wavedash** | ✔ A separate build: `node build.js -O2 --wavedash` writes `dist/wavedash/index.html` (the `upload_dir` in the checked-in `wavedash.toml`) — the competition game plus `src/wavedash.js`, not size-limited. The platform injects a global `Wavedash`, so the SDK is no external resource: that module calls `init()`/`readyForEvents()` only when the global exists, and the same guarded path posts nine achievements (created on the portal by `tools/wavedash-achievements.mjs`) and three leaderboards (`levels`, `stars`, `daily` best time; SDK-created boards start hidden, `tools/wavedash-leaderboards.mjs` names them and makes them visible). The competition zip has none of this code. Published with `wavedash build push` / `wavedash publish` (deadline 20 September; no new features or fixes after it). Nothing depends on the host origin except `localStorage` keys prefixed `prism26_`. |

## Known limitations

- Firefox is tested with Playwright's Firefox build launched from a copied folder
  (`C:\ffpw\firefox`) because the default install location fails to launch on this
  machine (DECISIONS.md §3). A manual spot-check in the installed Firefox is
  recommended.
- If the lobby is opened offline, the browser itself may log a network error for the
  refused WebSocket connection (outside our code); the lobby shows a status line.

## Test results (suite A: 40/40 levels solved, 40/40 empty-fail, determinism identical, 40/40 generator seeds, 0 warnings)

Suite B against the unzipped release zip (12,983 bytes) plus the Wavedash build (`dist/wavedash/index.html`,
18,656 bytes, served under `/wd/` for the two platform tests), one full run after the final `-O2` builds:
32/32 in chromium and firefox, all 40 levels won in both. The live js13kGames relay was exercised separately
with `tools/relaytest.mjs`; the Wavedash SDK calls are exercised against a recording mock
(`platform-achievements`) because the real sandbox needs an interactive login. The competition build is
also run with the SDK global injected and must ignore it (`platform-copy`).

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
| chromium | platform-copy | pass |
| chromium | platform-achievements | pass |
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
| firefox | platform-copy | pass |
| firefox | platform-achievements | pass |
| firefox | mute-glyph | pass |
| firefox | room-link | pass |

Totals: 32/32. No console errors or warnings.
