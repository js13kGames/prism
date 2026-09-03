# 02 — Colours: exact mechanics

All numbers are starting values. Tune them ONLY if a level's stored solution cannot be
made to work; log every change in `DECISIONS.md` and re-run every level test after a
change, because a tweak to one colour can break earlier levels.

Units: world units (u). World is 32 × 18 u, origin top-left, y down. Gravity
`G = 40 u/s²` downward (or upward while flipped). Timestep `DT = 1/60`.

Unicorn: circle radius `R = 0.5`, walk speed `WALK = 4`, max fall speed 30.

Every stroke is a polyline of points; collision is circle-vs-segment. A stroke has a
colour index `c` (0–6) and a per-stroke state (used by Yellow and Violet).

Ink is measured as total stroke length in u. A stroke shorter than 0.3 u is discarded
(prevents accidental taps from eating ink). Points closer than 0.15 u to the previous
point are not added (keeps strokes small and stops jitter from eating ink).

## 0 — Red — Bounce  `#ff5d6c`  glyph ↑

- Solid on all sides.
- On **landing** (contact where the incoming normal velocity `vn < -3`) the unicorn
  is launched: `v = reflect(v, n)`, then the component along `n` is set to
  `min(36, max(|vn| * 1.5, 27))`. Tangential component preserved.
  27 u/s ⇒ ≥ 9 u rise from any small drop; a 22 u/s ice impact ⇒ 33 ⇒ ~13.6 u rise;
  the 36 cap (~16 u) stops the unicorn flying out of the world on big drops.
- Walking onto red from level ground (`|vn| ≤ 3`) does NOT bounce; it's a normal floor.
  This is what makes "you need a drop" a puzzle idea.
- After a bounce the unicorn is airborne and cannot re-trigger on the same stroke for
  0.1 s (prevents jitter double-bounces).
- Intro level 2. Angled red pads redirect — intro level 3.

## 1 — Orange — Dash  `#ffa64d`  glyph ⇒

- Solid on all sides, normal friction.
- While grounded on orange, walk speed target is `WALK * 2.3 = 9.2`.
- Momentum rule (applies to ALL surfaces): when the unicorn leaves the ground, its
  horizontal speed is kept. Off ordinary ground that is 4; off orange it is 9.2, so it
  jumps gaps of ~5 u when stepping off a ledge.
- When grounded on non-orange, horizontal speed eases back to `WALK` at 30 u/s².
- Intro level 1 (used as a plain bridge), first taught as a gap-jumper in level 6.

## 2 — Yellow — Brittle  `#ffe14d`  glyph ✶

- Solid, normal friction, walk speed normal.
- Ink budget for yellow in a level is typically 2–3× other colours.
- Per stroke: on the first frame the unicorn is in contact, start a 0.6 s timer. When
  it expires, the stroke is deleted (with a small crumble particle burst). The unicorn
  standing on it at that moment falls.
- Visual: after first touch, draw the stroke with dashes/cracks.
- Intro level 4 (long bridge), level 5 teaches deliberate collapse.

## 3 — Green — Vine  `#5fd68a`  glyph ⋮

- When the unicorn touches green, it enters **climb** mode: gravity off, velocity is
  along the stroke tangent at the closest point, magnitude `max(WALK, entry speed)`
  (entry speed decays to WALK at 10 u/s² while climbing), direction chosen so that it
  continues its current travel direction (dot product with previous velocity ≥ 0; if
  0, use facing direction).
- In climb mode the unicorn is positioned at `closest_point + n * R` each frame and
  advances along the polyline by `WALK * DT`. It follows curves, goes vertical, goes
  upside down.
- Leaving the end of a vine: exits climb mode with velocity = tangent × 8 u/s
  (the "fling"; a vine that ends pointing up throws the unicorn 0.8 u upward, one
  that ends pointing up-right throws it up-right). While airborne after a fling the
  unicorn ignores green for 0.15 s so it doesn't instantly re-grab the same vine end.
- If a vine touches solid geometry the unicorn stops at the solid and turns around
  along the vine (walls still reverse it).
- Red/violet/other colours touched while climbing still apply (violet flips gravity
  for after the vine; red is ignored while climbing).
- Intro level 7 (climb a wall), level 8 (ceiling walk), level 9 (fling).

## 4 — Blue — Ice  `#5db8ff`  glyph ~

- Solid, zero friction. While grounded on blue: no walking force; acceleration is the
  gravity component along the surface tangent only. Speed cap 22 u/s.
- Facing direction updates to match velocity sign so the sprite doesn't moonwalk.
- On a flat blue surface a unicorn arriving at speed keeps that speed; arriving at
  walk speed keeps 4 u/s (it doesn't stop — it glides).
- Intro level 10 (downhill launch), 11 (half-pipe), 12 (ice into red = high bounce).

## 5 — Indigo — Phase  `#7b6cff`  glyph ⇑

- One-way platform: collision is only resolved when the unicorn is moving **into** the
  surface from the stroke's "up" side. "Up" is the side facing away from gravity at
  the time the stroke is drawn... simpler and what we ship: the side of the segment
  normal with negative y (world up). When gravity is flipped, indigo is passable from
  above and solid from below — that's a feature; level 18 uses it.
- No friction change, normal walk.
- Intro level 13 (bounce up through, land on it), 14 (stacked stairs), 15 (combo).

## 6 — Violet — Flip  `#d977ff`  glyph ⟳

- Passable (not solid). Touching it toggles the unicorn's gravity sign. The stroke
  then becomes inert for that run (drawn faded) so the unicorn can't re-trigger while
  overlapping it. It re-arms after the unicorn is 1 u away from all of its points.
- On flip, vertical velocity is preserved (not zeroed) — so a unicorn walking on a
  floor floats upward and lands on the ceiling.
- Facing is unaffected. Sprite is drawn upside down while flipped.
- Intro level 16, 17 (flip twice), 18 (flip + indigo + ice).

## Gate (not a colour)

- A solid rect with a `touched` bitmask counter on the unicorn (7 bits). Each colour
  touched (contact or trigger) sets its bit. When all 7 are set, every gate rect in
  the level becomes non-solid for the rest of the run (with a sparkle).
- Reset on Rewind/Fail.
- Levels 19–20.

## Ink budgets

Per level, per colour, in u. Typical intro budget for a colour is generous (~1.5×
what the intended solution needs); later levels get tight (~1.1×). Yellow 2–3× others.
A level's total budget is the sum; the star threshold is 60% of that sum.

## Palette rendering order

Draw strokes in colour order 0→6 so violet reads on top; the unicorn draws above all
paint; hazards and geometry below paint.
