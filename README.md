# PRISM

A draw-then-play physics puzzle for **js13kGames 2026** (theme: *Unicorns and Rainbows*).

You have seven colours of rainbow paint. Each colour is a different kind of physics.
Paint a path, press **Play**, and watch a very stupid unicorn walk it. Get it to the gem.

The unicorn has no controls: it walks forward, turns around at walls, and falls off
edges. All the agency is in the paint.

## How to play

1. **Draw phase** — pick a colour from the palette and draw freehand on the level.
   Each colour has an ink bar; ink drains by stroke length. Undo (↶) removes the
   last stroke, Clear (✕) removes them all. Paint cannot be drawn inside solid blocks
   (except indigo, which is meant to go through them).
2. **Paint has weight.** A stroke that does not touch the ground, a wall, or another
   supported stroke is drawn faded: when you press Play it falls until it lands on
   something. Hang shelves from walls, start ramps on the floor, and remember that
   anything resting on yellow drops when the yellow crumbles.
3. **Play** — physics starts and the unicorn walks from the start arrow. Reaching the
   gem wins. Spikes, water, leaving the world, or 25 seconds of wandering fail; the
   level snaps back to Draw with your paint intact.
4. **Rewind** at any time to go back to drawing.
5. A **★** is earned when you use at most 60 % of the level's total ink.

30 hand-made levels teach the colours one at a time. **Daily** is a new generated level
every day (same for everyone). **Online** is a best-of-three race: everyone in a room gets
the same generated level, draws at the same time, sees the others' paint as ghosts, and
the first unicorn to reach the gem wins the round; the host starts each new round on a
fresh level.

### Controls

| Input | Action |
|---|---|
| Mouse / finger / pen on the canvas | draw a stroke (Pointer Events) |
| Palette buttons or keys **1–7** | select colour |
| **Z** / **C** | undo / clear |
| **Space** | Play / Rewind |
| **Esc** | back |

Works in portrait and landscape; the world is letterboxed, the palette stays ≥ 44 px.

### The seven colours

| Colour | Glyph | Physics |
|---|---|---|
| Red — Bounce | ↑ | Landing on it launches the unicorn along the surface normal (27–30 u/s: a 9–11 unit rise; angled pads aim it). Walking onto it from level ground does nothing — you need a drop, even a tiny one. |
| Orange — Dash | ⇒ | Walk speed ×2.3 while on it; momentum carries when you leave the edge. |
| Yellow — Brittle | ✶ | Lots of ink, but each stroke crumbles 0.6 s after the unicorn first touches it. Chain short strokes, use the collapse as a trapdoor, or let it drop a bar it was holding up. |
| Green — Vine | ⋮ | The unicorn sticks to it and walks along it in any orientation — up walls, along ceilings. Off the end it is flung at 8 u/s. |
| Blue — Feather | ❋ | Never slows the unicorn down (dash speed is kept across it), and after touching it the unicorn falls slowly: a glide that carries it across gaps and down past hazards until it stands on something else. |
| Indigo — Phase | ⇢ | The only colour you can paint through solid blocks. While the unicorn is on an indigo line it walks straight through the blocks the line passes through: through walls, down through floors, up inside towers. Gates and hazards are never phased. |
| Violet — Flip | ⟳ | Touching it flips gravity for the unicorn. It re-arms once the unicorn is a unit away. |

Levels 27 and 30 add a **gate** that opens once all seven colours have been touched in one run.

### The rainbow is a scale

The seven colours are the seven notes of C major (red C, orange D, yellow E, green F,
blue G, indigo A, violet B). Picking a colour or finishing a stroke plays its note, and
when the unicorn touches a stroke that colour sounds again, so the run plays your painting
back. Underneath, a small generative backing (I–V–vi–IV on oscillators, 120 BPM) stays
calm while you draw and adds off-beats while the unicorn runs. Everything is synthesised;
there is no audio data in the zip.

## Build

```bash
npm install                      # terser, roadroller, @gfx/zopfli, playwright (dev only)
npx playwright install chromium firefox
node build.js                    # quick build (roadroller -O1)
node build.js -O2                # release build used for the submission zip
```

`build.js` concatenates `src/` in dependency order (stripping ES-module syntax), minifies
with terser (property mangling on `_`-prefixed keys), packs with Roadroller, inlines the
CSS and JS into a single `dist/index.html`, writes `dist/prism.zip` with a hand-rolled zip
container around a zopfli deflate stream, verifies it with `unzip`, prints a per-module
size table (`dist/size.txt`), and exits non-zero if the zip exceeds 13,312 bytes.

The shipped page has no external resources. The only network access is the optional
Online mode, which lazily imports PartySocket from the js13kGames server and connects to
the game's relay (`wss://relay.js13kgames.com/prism/<room>`).

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
pointer/touch input, injects the stored solution into all 30 levels, exercises fail/undo/
clear/resize, portrait and landscape phone viewports, the lobby with the network blocked,
and a two-page online race through an in-process WebSocket relay (`test/relay.js`).
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
