# PRISM

A draw-then-play physics puzzle for **js13kGames 2026** (theme: *Unicorns and Rainbows*).

You have seven colours of rainbow paint. Each colour is a different kind of physics.
Paint a path, press **Play**, and watch a very stupid unicorn walk it. Get it to the gem.

The unicorn has no controls: it walks forward, turns around at walls, and falls off
edges. All the agency is in the paint.

## How to play

1. **Draw phase** — pick a colour from the palette and draw freehand on the level.
   Each colour has an ink bar; ink drains by stroke length. Undo (↶) removes the
   last stroke, Clear (✕) removes them all, and the eraser (⌫) removes whichever
   stroke you tap. Paint cannot be drawn inside solid blocks (except indigo, which
   is meant to go through them).
2. **Paint has weight.** A stroke that does not touch the ground, a wall, or another
   supported stroke is drawn faded: when you press Play it falls until it lands on
   something. Hang shelves from walls, start ramps on the floor, and remember that
   anything resting on yellow drops when the yellow crumbles.
3. **Play** — physics starts and the unicorn walks from the start arrow. Reaching the
   gem wins. Spikes, water, leaving the world, or 25 seconds of wandering fail; the
   level snaps back to Draw with your paint intact.
4. **Rewind** at any time to go back to drawing.
5. A **★** is earned when you use at most 60 % of the level's total ink.

40 hand-made levels in eight acts teach the colours one at a time, then combine them. A level
unlocks when the one before it *or the one before that* is done, so a level that has you stuck
can be skipped with the HUD's **Skip ›** button or from the grid (just not two in a row); **Continue** on the title picks up past your furthest
gem. **Daily** is two generated
levels every day (same for everyone), the second one tighter. **Online** is a best-of-five race with the levels
getting harder each round: everyone in a room gets
the same generated level and draws at the same time, and the first unicorn to reach the
gem wins the round. Nobody sees anybody else's paint while the round is live — copying is
the whole reason that would be a bad idea — but the winner's run replays for everyone on
the result screen. **Quick match** pairs you with whoever is waiting and starts on its own;
**Create room** gives you a code or link to send to someone. The room's creator starts each
round, and a rematch needs both players to press Rematch.

### Controls

| Input | Action |
|---|---|
| Mouse / finger / pen on the canvas | draw a stroke (Pointer Events) |
| Palette buttons or keys **1–7** | select colour |
| ⌫ button or key **8**, then tap a stroke | eraser: remove that stroke |
| **Z** / **C** | undo / clear |
| **Space** | Play / Rewind |
| **Esc** | back |
| **Skip ›** in the HUD | skip this level (when the one before it is done) |

Works in portrait and landscape; the world is letterboxed, the palette stays ≥ 44 px.

### The seven colours

| Colour | Glyph | Physics |
|---|---|---|
| Red — Bounce | ↑ | Landing on it launches the unicorn along the surface normal (27–30 u/s: a 9–11 unit rise; angled pads aim it). Walking onto it from level ground does nothing — you need a drop, even a tiny one. |
| Orange — Dash | ⇒ | Walk speed ×2.3 while on it; momentum carries when you leave the edge. |
| Yellow — Brittle | ✶ | Lots of ink, but each stroke crumbles 0.6 s after the unicorn first touches it. Chain short strokes, use the collapse as a trapdoor, or let it drop a bar it was holding up. |
| Green — Vine | ⋮ | The unicorn sticks to it and walks along it in any orientation — up walls, along ceilings — always to one end, where it is flung off at 8 u/s. |
| Blue — Feather | ❋ | Never slows the unicorn down (dash speed is kept across it), and after touching it the unicorn falls slowly: a glide that carries it across gaps and down past hazards until it stands on something else. |
| Indigo — Phase | ⇢ | The only colour you can paint through solid blocks. While the unicorn is on an indigo line it walks straight through the blocks the line passes through: through walls, down through floors, up inside towers. Gates and hazards are never phased. |
| Violet — Flip | ⟳ | Touching it flips gravity for the unicorn. It re-arms once the unicorn is a unit away. |

Levels 27 and 30 add a **gate** that opens once all seven colours have been touched in one run.

### The rainbow is a scale

The seven colours are the seven degrees of a major scale (red is the tonic, violet the
seventh), which makes the paint the sheet music and the unicorn the playhead:

- Picking a colour or finishing a stroke plays its note, panned to where you drew it.
- **The strokes on the canvas are the melody.** A sequencer loops them, in the order you
  drew them, four to the bar over an I–V–vi–IV pad and bass — so every level's soundtrack
  is the player's own painting, and it changes with every undo. An empty canvas gets a
  plain chord arpeggio.
- When the unicorn touches a stroke that colour sounds again, from where the unicorn is.
  A soft kick and hat come in while it runs.
- Reaching the gem replays the colours the run touched, in order, resolved onto the tonic.
- The key rises a fifth every five levels (C, G, D, A, E, B, F♯, C♯); daily and race levels
  take their key from the seed.
- One effect — a dotted-eighth feedback echo through a darkening filter — turns the sparse
  notes into an ambient bed.

Everything is synthesised with Web Audio oscillators and ZzFX; there is no audio data in
the zip.

## Build

```bash
npm install                      # terser, roadroller, @gfx/zopfli, playwright (dev only)
npx playwright install chromium firefox
node build.js                    # js13k competition build (roadroller -O1): dist/index.html + dist/prism.zip
node build.js -O2                # the same, with the slow roadroller search — this is the submission zip
node build.js -O2 --wavedash     # the Wavedash build: dist/wavedash/index.html (see below)
npm run release                  # both release builds, one after the other
```

There are **two builds from one source tree**. The competition build is what goes in
`dist/prism.zip` and is held to the 13,312-byte limit; in it, `src/wavedash.js` is replaced
by a stub whose exports are no-ops, which terser folds away, so the zip carries no platform
code at all. The Wavedash build includes that module (SDK init, achievements, leaderboards)
and is not size-limited — it only ever goes to Wavedash, never to the competition form.

`build.js` concatenates `src/` in dependency order (stripping ES-module syntax), minifies
with terser (property mangling on `_`-prefixed keys), packs with Roadroller, inlines the
CSS and JS into a single `dist/index.html`, writes `dist/prism.zip` with a hand-rolled zip
container around a zopfli deflate stream, verifies it with `unzip`, prints a per-module
size table (`dist/size.txt`), and exits non-zero if the zip exceeds 13,312 bytes.

The shipped page has no external resources — no CDN, no fonts, no imports. The only network
access is the optional Online mode, which opens a plain WebSocket to the js13kGames relay
(`wss://relay.js13kgames.com/prism/<room>`) when you create or join a room.

### Publishing on Wavedash

`node build.js --wavedash` writes `dist/wavedash/index.html` — the Wavedash build, alone in
its own folder, which is what `upload_dir` in [wavedash.toml](wavedash.toml) points at. It is
the competition game plus the platform integration in `src/wavedash.js`; nothing else differs.
Put the game ID from the Developer Portal in that file, then:

```bash
wavedash auth login
node build.js -O2 --wavedash
wavedash build push -m "js13k 2026 entry"
wavedash publish <BUILD_ID>
```

Wavedash injects a global `Wavedash` object before the game boots, so the SDK is not a file
we ship: `src/wavedash.js` calls `init()`/`readyForEvents()` only if that global exists, and
the Wavedash build also runs unchanged offline. The competition build ignores that global
entirely (the suite injects it into both builds and checks that only the Wavedash one reacts).

The Wavedash build also keeps a **cloud save** (`prism/progress.json` in the player's Wavedash
storage: levels done and stars, merged with the device's own progress on boot, uploaded after
every save), shows who is signed in on the title ("Playing as …"), and updates the player's
**presence** for their friends (which level, the daily, or an online race). All of it lives
in `src/wavedash.js`; the SDK type-checks every argument, so booleans must be real booleans —
the `1` that used to stand in for `true` silently lost every achievement and score
(DECISIONS.md §22).

The Wavedash build reports **achievements** and **leaderboards** through that global:

| Achievement | Unlocked by |
|---|---|
| First Gem | clearing any level |
| One Stroke | clearing a level with a single stroke |
| Full Spectrum | opening a rainbow gate (all seven colours in one run) |
| Halfway Over the Rainbow / Prism | 20 / 40 levels cleared |
| Ink Saver / Not a Drop Wasted | 10 / 40 ink stars |
| Daily Rainbow | clearing a daily level |
| Photo Finish | winning a round of an online race |

Leaderboards: `levels` and `stars` (counts, descending) after every level win, and
`daily` (the unicorn's best daily time in milliseconds, ascending). The achievements are
created on the portal by `node tools/wavedash-achievements.mjs` (needs `WAVEDASH_TOKEN`).
Leaderboards are created by the game on first use, **hidden**: run
`node tools/wavedash-leaderboards.mjs` once after each board's first score to name it and
make it visible on the game page (`levels` and `stars` are done; `daily` needs one daily clear
on Wavedash first).

## Tests

```bash
node test/sim.test.js            # suite A: every level's stored solution wins, empty paint fails,
                                 #   ink budgets, drawability, determinism, 40 generator seeds (< 10 s, no deps)
node test/browser.test.js        # suite B: Playwright, chromium + firefox, against the UNZIPPED zip
node test/browser.test.js chromium --quick   # one browser, skip the all-levels run
npm test                         # both
node dev.js                      # dev server on :8080 serving the unbundled source (index.html)
```

Suite B boots the real artefact, clicks through every screen, completes level 1 with real
pointer/touch input, injects the stored solution into all 40 levels, exercises fail/undo/
clear/resize, portrait and landscape phone viewports, the lobby with the network blocked,
two-page online races through an in-process WebSocket relay (`test/relay.js`) — a room
by code and a three-page quick match — and the shared-link flow.
Any console error or page error fails the test. Screenshots land in `test-results/`.

Authoring helpers (dev only): `tools/try.mjs` replays a level with a solution and a
trace, `tools/scan.mjs` sweeps solution parameters, `tools/lab.mjs` measures physics
facts, `tools/gentrace.mjs` traces a generated level, `tools/shots.mjs` screenshots
levels, `tools/uni.html` previews the unicorn sprite, `tools/play.html` is a browser
authoring page.

## Layout

```
src/sim.js      pure deterministic simulation (fixed 1/60 step, no DOM) — the truth
src/levels.js   30 level strings        src/gen.js     seeded constructive generator
src/render.js   canvas drawing          src/audio.js   ZzFX micro + sound table
src/net.js      relay transport         src/ui.js      HTML screens
src/main.js     state machine, HUD, input, loop, online glue
test/           sim + browser suites, stored solutions, mini relay
docs/           the design spec         DECISIONS.md   every judgment call, with sizes
```

## Credits

- Design, code, levels: Arjun Vinod, with Claude (Anthropic) as the build agent.
- Sound effects: [ZzFX](https://github.com/KilledByAPixel/ZzFX) micro by Frank Force (MIT). Music: Web Audio oscillators, generated at run time.
- Packing: [Roadroller](https://github.com/lifthrasiir/roadroller) by Kang Seonghoon; terser; zopfli.
- Everything drawn is procedural canvas; the font is the system UI font.

License: MIT.
