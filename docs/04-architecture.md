# 04 — Architecture

## Repository layout

```
index.html            dev shell: <script type=module src=src/main.js> (NOT the shipped file)
src/
  main.js             boot, state machine, screens, HUD, input → calls into sim/render
  sim.js              PURE simulation. No DOM. Exported: parseLevel, createRun, step, hashState
  levels.js           export default [ 'N First Steps|...', ... ]  (20 strings)
  gen.js              seeded constructive level generator (docs/05)
  render.js           canvas drawing: world, paint, unicorn, particles
  audio.js            ZzFX-mini + sound table
  net.js              relay client (docs/06), optional
  ui.js               HTML overlay screens (title/select/win/lobby) as template strings
tools/play.html       level authoring page (dev only)
test/
  sim.test.js         Node: solutions, empty-paint fails, determinism, ink checks
  browser.test.js     Playwright: chromium + firefox
  solutions.js        stored solutions per level
build.js              bundle → minify → roadroller → inline → zip → size gate
dist/                 index.html, prism.zip (gitignored except in releases)
README.md  SUBMISSION.md  DECISIONS.md  CLAUDE.md  docs/
```

Plain ES modules, no bundler dependency beyond what `build.js` does itself
(concatenate in dependency order, strip `import`/`export`, wrap in an IIFE). Do not
use TypeScript, do not use a framework, do not use kontra or any library. Everything
is hand-written and small.

## Global constants (single object `C` in sim.js so terser can mangle refs)

```
W=32 H=18 G=40 DT=1/60 R=0.5 WALK=4 MAXFALL=30
DASH=2.3 BMIN=27 BMAX=36 BK=1.5 CRUMBLE=0.6 FLING=8 FEATHER=0.25 FMAX=5
PAD=0.3 PAD2=0.5 TIMEOUT=25 OUT=3
```

## Data model

```
level = { name, hint, sx, sy, sd, gx, gy, rects:[{x,y,w,h,t}] , ink:[7 numbers or 0=locked] }
  rect.t: 0 solid, 1 spike, 2 water, 3 gate
stroke = { c: 0..6, p: [x0,y0,x1,y1,...], len, touched, t /*crumble timer*/, armed, dead, sup /*supported*/, vy /*fall speed*/ }
run = { level, strokes, u:{x,y,vx,vy,dir,g:+1|-1,climb:null|{s,i,t,side,dir,spd},bcd,fcd,ph,pht,pst,pth,fe,fet,feg,mask,gr,surf}, t, state:0|1|2, ev:[], gate }
```

`createRun(level, strokes)` deep-copies strokes (so per-run state like crumble timers
and violet arming doesn't leak into the draw-phase data) and settles support.
`step(run)` advances one DT and returns the run state. `settle(run)` recomputes
support. `hashState(run)` returns a string of rounded positions (including every
stroke's y so falling paint is covered) for determinism tests.

## Simulation step (in this order)

1. `run.t += DT`; if `run.t > TIMEOUT` → fail.
2. Crumble timers: for each yellow stroke with `touched`, `t += DT`; if `t ≥ CRUMBLE`
   mark it `dead` (render layer plays a burst) and flag a re-settle.
3. Paint gravity: every live unsupported stroke gets `vy += G*DT` (≤ MAXFALL) and
   moves down `vy*DT`; if it now touches support, bisect the move (5 halvings) so it
   rests just touching, mark it supported, emit a land event and flag a re-settle.
   A stroke entirely below `H + OUT` is removed.
4. If in **climb** mode: advance along the stroke polyline by `speed*DT`; set
   position = point on polyline + normal*R. If the polyline end is passed → exit
   climb with velocity = tangent*FLING, set `fcd=0.15`. If both sides of the vine are
   blocked by solids: on the first/last segment keep advancing without moving,
   otherwise reverse. A dead or falling vine drops the unicorn. Skip to step 8.
5. Integrate: `vy += g*G*DT*(feathered ? FEATHER : 1)` (feathered = `fe` and not
   grounded), clamp `|vy| ≤ MAXFALL`, and while feathered cap the fall speed at FMAX.
   If grounded and (surface is not blue, or |vx| < WALK): ease `vx` toward
   `dir*targetSpeed` at 30 u/s² where targetSpeed is `WALK*DASH` on orange else
   `WALK`. `x += vx*DT`, `y += vy*DT`. Grounded flag cleared.
6. Collect contacts: circle vs every live **supported** stroke segment except violet
   (trigger only) and green during the fling cooldown; circle vs every solid rect
   (t=0, unless phasing and the rect is in the phase set) and un-opened gate (t=3).
   Push out along the normal by the penetration depth; iterate the whole set twice.
7. Resolve contact responses (paint before rects, deepest first):
   - Skip contacts where the unicorn moves away (`vn > 0.5`). Paint contacts set the
     colour's mask bit and the stroke's `touched`.
   - Indigo: on first contact with a stroke compute its phase set — the solid rects
     that would overlap the unicorn if it slid along the whole line at its current
     offset from it — and note the contact (`pht`).
   - Blue: note the contact (`fet`).
   - Red and `vn < -3` and `bcd ≤ 0`: launch (docs/02), `bcd = 0.1`, drop the
     feather, continue to the next contact.
   - Green: enter climb mode (docs/02), stop processing.
   - Otherwise remove the normal component of velocity. Classify: if `ny*g < -0.5`
     → **ground** contact (grounded=true, surface = paint colour or -1); else if
     `|nx| > 0.7` and `vn < -0.5` → **wall**: `dir = -dir`, `vx = 0`.
   - After the loop: `fe = 1` if blue was touched this frame, else if grounded on a
     non-blue surface for more than 9 consecutive frames `fe = 0`.
8. Triggers (no push-out): violet strokes (supported only) — if armed and circle
   overlaps any segment within R: `g = -g`, disarm, mark bit. Re-arm when distance to
   every point of the stroke > 1. Spike/water rects — overlap → fail. Gem — distance
   < R+0.6 → win. Gate — if `mask == 127` set `run.gate = 1` (gates become
   non-solid) and flag a re-settle.
9. Out of world: `x < -OUT || x > W+OUT || y < -OUT || y > H+OUT` → fail.
10. Phase timer: `ph = 6` if indigo was touched this frame; else keep it while the
    centre is within R/2 of a rect in the phase set; else `ph -= 1`. Decrement
    cooldowns. If a re-settle was flagged, `settle(run)`.

Grounded detection for "walking" (step 4) uses the previous frame's grounded flag.
Spawn: `x=sx, y=sy-R, vx=0, vy=0, dir=sd, g=1`.

Circle-vs-segment: closest point on segment, normal = (centre − closest)/dist. For
rects: closest point on the rect (clamp), same formula; when the centre is inside a
rect (rare, e.g. spawn overlap) push along the smallest axis.

Do NOT use a generic physics engine. This is ~150 lines.

## Rendering (render.js)

- One `<canvas>` sized to the window with DPR ≤ 2. World fits with letterboxing:
  `scale = min(cw/32, ch/18)`, offset to centre. All drawing uses `ctx.setTransform`.
- Layers per frame: sky gradient → rects (solid: rounded pastel blocks with a lighter
  top edge; spikes: triangles; water: two-tone wavy rect with a slow sine offset;
  gate: striped grey with 7 dots) → strokes (colour 0→6, each as a
  `lineWidth = 2R` round-capped path, plus a thinner lighter core; yellow touched:
  dashed; violet disarmed: alpha 0.4) → start pad + arrow → gem (rotated square with
  pulse) → unicorn → particles → (draw phase) the in-progress stroke.
- Unicorn: ~45 canvas calls. Outlined body/neck/head/muzzle, ear, striped horn, four
  legs on a sine trot cycle (splayed when airborne), rainbow-gradient mane and tail,
  eye with highlight, blush, a wing while gliding, 55 % alpha while phasing. Flip
  horizontally by `dir`, vertically by `g`. Climb mode: rotate to the surface tangent.
- Particles: array of `{x,y,vx,vy,life,col}` max 80, render-side only; spawned from
  sim events (`run.events` array drained each frame).
- Draw phase also renders each colour's remaining ink as the palette bars (HTML), and
  marks unsupported strokes (`_sup == 0`, computed by settling a throwaway run after
  every stroke change) at 45 % alpha.

## Input (main.js)

- `pointerdown` on canvas (draw phase, colour selected, ink > 0): start a stroke.
  `pointermove`: append world point if ≥ 0.15 u from the last; check ink; stop
  appending when ink is exhausted (stroke ends, ink bar 0). Clip: discard a point if
  the segment midpoint to the previous point is inside a solid rect.
  `pointerup`: finalize; discard if `len < 0.3`. Indigo strokes are not clipped by
  solids (they are meant to go through them).
- Palette: buttons in an HTML overlay (not canvas) for large tap targets. Selected
  colour gets a ring. Keys 1–7.
- Play / Rewind / Undo / Clear buttons + keys. Back button.

## State machine

```
TITLE → SELECT → GAME(draw) ↔ GAME(play) → GAME(win overlay) → SELECT or next level
TITLE → LOBBY → GAME(online draw) → GAME(online play) → result → LOBBY
```

Keep screens as HTML strings injected into a single `<div id=ui>`; the canvas is
always underneath. Use CSS in a single `<style>`; keep it under 1.5 KB unminified.

## Persistence

`localStorage.prism26_progress` = JSON `{ done:[bools×30], stars:[bools×30], snd:1 }`.
Wrap in try/catch (private mode). Never clear other keys.

## Audio (audio.js)

ZzFX mini (the ~1 KB version; it is public domain / MIT — credit in README). Sounds:
stroke tick (pitch by colour), play, bounce, crumble, fling, flip, fail, win, click.
AudioContext created on the first user gesture. Mute toggle persisted.
Music (same file): `note(degree, octave)` maps colour indices onto C major; `tone()`
is an oscillator + gain envelope; `tick()` (setInterval 200 ms) schedules beats
~0.35 s ahead of `ac.currentTime`; `setMusic(1|2)` picks calm/lively; `playNote(c, o)`
and `fanfare()` are called from main.js.

## Performance

60 fps on a mid phone: the sim is O(strokes × points) per frame; strokes are capped
at 30 per level by ink anyway. Render: ≤ 200 canvas ops/frame. Use
`requestAnimationFrame` with an accumulator so the sim runs at exactly DT regardless
of display refresh; cap catch-up to 4 steps/frame.
