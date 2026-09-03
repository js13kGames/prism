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
DASH=2.3 BOUNCE_MIN=27 BOUNCE_MAX=36 BOUNCE_K=1.5 CRUMBLE=0.6 FLING=8 ICE_MAX=22
TIMEOUT=25 OUT=3
```

## Data model

```
level = { name, hint, sx, sy, sd, gx, gy, rects:[{x,y,w,h,t}] , ink:[7 numbers or 0=locked] }
  rect.t: 0 solid, 1 spike, 2 water, 3 gate
stroke = { c: 0..6, p: [x0,y0,x1,y1,...], len, touched:false, t:0 /*crumble timer*/, armed:true }
run = { level, strokes, u:{x,y,vx,vy,dir,g:+1|-1,climb:null|{s,i,t},bounceCd,flingCd,mask}, t, state:'play'|'win'|'fail', particles?:no — particles are render-side }
```

`createRun(level, strokes)` deep-copies strokes (so per-run state like crumble timers
and violet arming doesn't leak into the draw-phase data). `step(run)` advances one
DT and returns the run state. `hashState(run)` returns a string of rounded positions
for determinism tests.

## Simulation step (in this order)

1. `run.t += DT`; if `run.t > TIMEOUT` → fail.
2. Crumble timers: for each yellow stroke with `touched`, `t += DT`; if `t ≥ CRUMBLE`
   remove the stroke (mark `dead`; render layer plays a burst).
3. If in **climb** mode: advance along the stroke polyline by `speed*DT`; set
   position = point on polyline + normal*R (normal on the side the unicorn was on when
   it grabbed). If the polyline end is passed → exit climb with velocity =
   tangent*FLING, set `flingCd=0.15`. If a solid rect or a wall segment blocks the
   climb → reverse climb direction (and `dir`). Skip to step 7.
4. Integrate: `vy += g*G*DT` (g is ±1); clamp `|vy| ≤ MAXFALL`. If grounded on a
   non-ice surface: ease `vx` toward `dir*targetSpeed` at 30 u/s² where targetSpeed
   is `WALK*DASH` on orange else `WALK`. On ice: `vx` unchanged (gravity along the
   tangent was already applied by the surface projection in step 6). `x += vx*DT`,
   `y += vy*DT`. Grounded flag cleared.
5. Collect contacts: circle vs every solid rect (t=0 and un-opened gates t=3), circle
   vs every live stroke segment except violet (trigger only) and indigo when moving
   away from / below its top side. For each contact with penetration depth d>0, push
   out along the normal by d and record the contact (normal, colour or -1 for rect,
   stroke ref). Iterate the whole set twice (cheap, stable enough).
6. Resolve contact responses (for each contact, processed with the most-penetrating
   first):
   - Compute `vn = vx*nx + vy*ny`. Only consider contacts where the unicorn moves into
     the surface (`vn < 0`) or is resting (`|vn| < 0.5`).
   - Red and `vn < -3` and `bounceCd ≤ 0`: launch (docs/02), `bounceCd = 0.1`, mark
     colour bit, emit event, continue to the next contact.
   - Green and `flingCd ≤ 0`: enter climb mode (docs/02), mark bit, stop processing.
   - Otherwise remove the normal component of velocity (`vx -= vn*nx; vy -= vn*ny`).
   - Classify: if `ny*g < -0.5` (normal points against gravity) → **ground** contact:
     grounded=true, surface = colour; if surface is blue apply `v += tangent * (tangent·gravity) * DT`
     projection (i.e. keep tangential velocity, add gravity's tangential component)
     and set `dir = sign(vx)` if `|vx|>0.3`. Else if `|nx| > 0.7` → **wall**: `dir = -dir`,
     `vx = 0`. (Ceilings: just velocity removal.)
   - Yellow touched → `stroke.touched = true`. Any colour touched → set `mask` bit.
7. Triggers (no push-out): violet strokes — if armed and circle overlaps any segment
   within R: `g = -g`, disarm, mark bit. Re-arm when distance to every point of the
   stroke > 1. Spike/water rects — overlap → fail. Gem — distance < R+0.6 → win.
   Gate — if `mask == 127` set `level.gateOpen = true` (gates become non-solid).
8. Out of world: `x < -OUT || x > W+OUT || y < -OUT || y > H+OUT` → fail.
9. Decrement cooldowns.

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
- Unicorn: 12–20 canvas calls. Body ellipse `rx .55 ry .38`, head circle `r .28` at
  the front, horn triangle, mane as 3 coloured arcs, legs two rects toggling 6 fps
  when moving. Flip horizontally by `dir`, vertically by `g`. Climb mode: rotate to
  the surface tangent.
- Particles: array of `{x,y,vx,vy,life,col}` max 80, render-side only; spawned from
  sim events (`run.events` array drained each frame).
- Draw phase also renders each colour's remaining ink as the palette bars (HTML).

## Input (main.js)

- `pointerdown` on canvas (draw phase, colour selected, ink > 0): start a stroke.
  `pointermove`: append world point if ≥ 0.15 u from the last; check ink; stop
  appending when ink is exhausted (stroke ends, ink bar 0). Clip: discard a point if
  the segment midpoint to the previous point is inside a solid rect.
  `pointerup`: finalize; discard if `len < 0.3`.
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

`localStorage.prism26_progress` = JSON `{ done:[bools×20], stars:[bools×20], snd:1 }`.
Wrap in try/catch (private mode). Never clear other keys.

## Audio (audio.js)

ZzFX mini (the ~1 KB version; it is public domain / MIT — credit in README). Sounds:
stroke tick (pitch by colour), play, bounce, crumble, fling, flip, fail, win, click.
AudioContext created on the first user gesture. Mute toggle persisted.

## Performance

60 fps on a mid phone: the sim is O(strokes × points) per frame; strokes are capped
at 30 per level by ink anyway. Render: ≤ 200 canvas ops/frame. Use
`requestAnimationFrame` with an accumulator so the sim runs at exactly DT regardless
of display refresh; cap catch-up to 4 steps/frame.
