# 02 — Colours: exact mechanics (v2)

All numbers are starting values. Tune them ONLY if a level's stored solution cannot be
made to work; log every change in `DECISIONS.md` and re-run every level test after a
change, because a tweak to one colour can break earlier levels.

Units: world units (u). World is 32 × 18 u, origin top-left, y down. Gravity
`G = 40 u/s²` downward (or upward while flipped). Timestep `DT = 1/60`.

Unicorn: circle radius `R = 0.5`, walk speed `WALK = 4`, max fall (and rise) speed 30.

Every stroke is a polyline of points; collision is circle-vs-segment. A stroke has a
colour index `c` (0–6) and per-run state (touched, crumble timer, armed, supported).

Ink is measured as total stroke length in u. A stroke shorter than 0.3 u is discarded
(prevents accidental taps from eating ink). Points closer than 0.15 u to the previous
point are not added (keeps strokes small and stops jitter from eating ink).

## Support — paint has weight

When Play starts, every stroke is either **supported** or **falling**:

- A stroke is supported if any point along it (sampled every 0.3 u) is within
  `PAD = 0.3` u of a solid block, a spike block or a closed gate (water is not
  support), or within `PAD2 = 0.5` u of a supported stroke (transitively).
- Unsupported strokes fall at `G` (capped at 30 u/s), translating straight down, and
  are **inert** while falling (no collision, no trigger). They land the moment they
  touch support (the landing is bisected so they rest just touching) and become
  ordinary supported paint. A stroke that leaves the world is removed.
- Support is recomputed whenever a stroke lands, a yellow stroke crumbles or the gate
  opens. A shelf resting on a yellow strut therefore drops when the strut goes.
- In the draw phase unsupported strokes render at 45 % alpha so the player sees what
  will fall before pressing Play.

Falling strokes never collide with the unicorn.

## 0 — Red — Bounce  `#ff5d6c`  glyph ↑

- Solid on all sides.
- On **landing** (contact where the incoming normal velocity `vn < -3`) the unicorn
  is launched: `v = reflect(v, n)`, then the component along `n` is set to
  `min(36, max(|vn| * 1.5, 27))`. Tangential component preserved. Because the
  integrator clamps `|vy| ≤ 30`, the effective rise is 9–11.25 u.
- Walking onto red from level ground (`|vn| ≤ 3`) does NOT bounce; it's a normal floor
  (and still counts as "touched" for the gate). A drop of ~0.12 u is enough to bounce.
- After a bounce the unicorn cannot re-trigger on the same stroke for 0.1 s, and any
  feather is dropped.
- Intro level 3. Angled red pads redirect — level 4. Level 6 asks the player to build
  the drop.

## 1 — Orange — Dash  `#ffa64d`  glyph ⇒

- Solid on all sides, normal friction.
- While grounded on orange, walk speed target is `WALK * 2.3 = 9.2`.
- Momentum rule (applies to ALL surfaces): when the unicorn leaves the ground, its
  horizontal speed is kept. On non-orange, non-blue ground, horizontal speed eases
  back to `WALK` at 30 u/s².
- Intro level 1 (a plain bridge), first taught as a gap-jumper in level 10.

## 2 — Yellow — Brittle  `#ffe14d`  glyph ✶

- Solid, normal friction, walk speed normal.
- Per stroke: on the first frame the unicorn is in contact, start a 0.6 s timer. When
  it expires, the stroke is deleted (crumble burst) and support is recomputed.
- Visual: after first touch, draw the stroke dashed.
- Intro level 7 (chain of short bridges), 8 (deliberate collapse), 9 (a bar resting on
  a yellow stub drops onto pillars when the stub crumbles).

## 3 — Green — Vine  `#5fd68a`  glyph ⋮

- When the unicorn touches green, it enters **climb** mode: gravity off, velocity is
  along the stroke tangent at the closest point, magnitude `max(WALK, entry speed)`
  (entry speed decays to WALK at 10 u/s² while climbing). Direction along the polyline:
  the travel direction if the velocity is within ~53° of the segment tangent; otherwise
  the facing direction if the segment is flat enough (|dx| > 0.6·len); otherwise up
  (down under flipped gravity). Hand-drawn segments are short and jittered, so neither a
  segment's stray sideways component nor the per-frame gravity increment may decide.
- In climb mode the unicorn is positioned at `closest_point + n * R` each frame and
  advances along the polyline. It follows curves, goes vertical, goes upside down.
- Leaving the end of a vine: exits climb mode with velocity = tangent × 8 u/s
  (the "fling"). While airborne after a fling the unicorn ignores green for 0.15 s.
- If the unicorn's position on its side of the vine overlaps solid geometry it swaps
  to the other side; if both sides are blocked it holds still and keeps advancing along
  the vine until a side is free (so vines may start on a floor and end over a ledge
  corner). A climb never turns around: a vine always carries the unicorn to one end.
- A vine that loses support (its yellow strut crumbled) drops the unicorn.
- Intro level 11 (climb a wall), 12 (ceiling walk), 13 (fling), 14 (bounce into a vine).

## 4 — Blue — Feather  `#5db8ff`  glyph ❋

- Solid. Blue never brakes: the walking force only accelerates the unicorn up to
  WALK and never slows it, so dash speed is kept across a blue strip.
- Touching blue arms the **feather**. While airborne with the feather, gravity is
  ¼ (`FEATHER = .25`) and the fall speed is capped at `FMAX = 5` u/s: a glide that
  travels ~0.8 u horizontally per u of drop at walk speed (~1.8 at dash speed).
- The feather is dropped after the unicorn has stood on any non-blue surface for
  9 consecutive frames (so an edge corner or a short scuff does not lose it), and
  on any red bounce. Vines and violet do not drop it.
- Sprite shows a small wing while gliding.
- Intro level 15 (glide over water), 16 (float down onto a pedestal), 17 (dash +
  feather long jump), 18 (feather + vine fling), 26 (feather + flip = slow float up).

## 5 — Indigo — Phase  `#7b6cff`  glyph ⇢

- The only colour that can be painted **through solid blocks** (the drawing clip
  ignores solids for indigo).
- Solid to the unicorn like any paint. While the unicorn touches an indigo stroke it
  is **phasing**: the solid blocks that stroke leads into are ignored, so the unicorn
  walks along the line through walls, down ramps through floors, and up ramps inside
  towers. "Leads into" = the set of blocks that would overlap the unicorn if it slid
  along the whole line at its current offset from it (computed once per stroke on
  first contact). Gates, spikes and water are never phased.
- Phasing lasts 6 frames after the last indigo contact (so the unicorn can sink onto a
  descending ramp) and as long as its centre is deep inside one of those blocks.
- The unicorn is drawn at 55 % alpha while phasing.
- Intro level 19 (wall), 20 (down through a floor), 21 (up inside a tower), 22 (three
  walls, one has an arch — ink for two).

## 6 — Violet — Flip  `#d977ff`  glyph ⟳

- Passable (not solid). Touching it toggles the unicorn's gravity sign. The stroke
  then becomes inert for that run (drawn faded) so the unicorn can't re-trigger while
  overlapping it. It re-arms after the unicorn is 1 u away from all of its points.
- On flip, vertical velocity is preserved (not zeroed).
- Facing is unaffected. Sprite is drawn upside down while flipped.
- Intro level 23, 24 (flip twice), 25 (flip + phase on the ceiling), 26 (flip + feather).

## Gate (not a colour)

- A solid rect with a `touched` bitmask counter on the unicorn (7 bits). Each colour
  touched (contact or trigger) sets its bit. When all 7 are set, every gate rect in
  the level becomes non-solid for the rest of the run (with a sparkle) and support is
  recomputed. Indigo cannot phase a gate.
- Reset on Rewind/Fail.
- Levels 27 and 30.

## Ink budgets

Per level, per colour, in u. Typical intro budget for a colour is generous (~1.5×
what the intended solution needs); later levels get tight (~1.1×). Yellow 2–3× others.
A level's total budget is the sum; the star threshold is 60% of that sum.

## Palette rendering order

Draw strokes in colour order 0→6 so violet reads on top; the unicorn draws above all
paint; hazards and geometry below paint. Unsupported/falling strokes and spent violet
render at 45 % alpha.
