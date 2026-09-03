# 03 — Levels

## Format

Levels live in `src/levels.js` as one string each, tokens separated by `|`, fields by
spaces. Numbers may be decimals. Keep the average level under 70 bytes of source.

```
N <name>              level name (short)
H <hint text>         hint, ≤ 40 chars, optional
S x y d               start: unicorn centre x, ground-top y (spawn centre at y-0.5), d = 1 or -1
G x y                 gem centre (gem radius 0.6)
R x y w h             solid rect (x,y = top-left)
K x y w h             spike rect (kills)
W x y w h             water rect (kills)
T x y w h             gate rect (solid until all 7 colours touched this run)
I <c><n> <c><n> ...   ink: colour letter (R O Y G B I V) + budget in u; omitted = locked
```

Example (level 1):
```
N First Steps|H Draw a bridge, then press Play|S 2 12 1|G 28 11|R 0 12 10 6|R 22 12 10 6|I O14 R6
```

Coordinates below are **design targets**, reasoned on paper. The sim is the truth.
After implementing the sim, build each level, run its solution, and nudge **geometry
and ink** (not colour physics) until the stored solution passes and the empty-paint
run fails. Keep each level's *teaching intent* intact. Where a paper solution is
marked "author in tool", use `tools/play.html` (see bottom) to find a working one.

Stored solutions live in `test/solutions.js` as arrays of strokes:
`[colourIndex, [x0,y0, x1,y1, ...]]`. A 2-point stroke is a straight line.

Every level is checked by the test suite for:
- stored solution wins within 25 s
- empty paint fails (timeout, hazard, or out of world)
- solution ink per colour ≤ budget
- (logged, not enforced) the intro level's featured colour is used by the solution

## World conventions

32 × 18 u, y down. A missing floor means falling out of the world = fail. Keep ≥ 1 u
margin from edges for gems. The unicorn spawns on a rect top. Paint that overlaps
solid rects is clipped by the drawing code, so vines "up a wall" are drawn ~0.4 u off
the wall face.

---

## Act 1 — Orange & Red

### 1 · First Steps — teaches: draw, play
- Geometry: `R 0 12 10 6 | R 22 12 10 6 | S 2 12 1 | G 28 11`
- Ink: `O14 R6`
- Solution: orange `[10,12, 22,12]` (12 u).
- Empty run: walks off at x=10 → out of world → fail.
- Hint: "Draw a bridge, then press Play"

### 2 · Boing — teaches: red bounces when *landed on*
- Geometry: `R 0 8 12 10 | R 12 14 6 4 | R 18 6 14 12 | S 2 8 1 | G 28 5`
  (high platform top y=8 to x=12; low floor 12–18 at y=14; ledge top y=6 from x=18)
- Ink: `R5 O6`
- Solution: red `[13,14, 16,14]`. Unicorn drops 6 u onto it, bounces ≥ 9 u while
  drifting right at 4 u/s, lands on the ledge. If it lands short, the stored solution
  tilts the pad: `[13,14.2, 16,13.6]`.
- Empty run: drops to the low floor, paces between x=12 wall and x=18 wall → timeout.
- Hint: "Red bounces when landed on"

### 3 · Angles — teaches: tilted red aims the bounce
- Geometry: `R 0 6 6 12 | R 6 14 12 4 | K 8 13.5 8 .5 | R 22 7 10 11 | S 2 6 1 | G 28 6`
  (spikes on the pit floor 8–16; a red pad drawn over them shields them)
- Ink: `R8 O6`
- Solution: red `[6.5,14, 9.5,12.5]` (tilted up-right). Unicorn falls 8 u onto it and
  launches up-right to the far ledge. Tune the angle in the tool.
- Empty run: lands on spikes → fail.
- Hint: "Angled red launches sideways"

## Act 2 — Yellow

### 4 · Long Way — teaches: yellow has lots of ink but crumbles 0.6 s after touch
- Geometry: `R 0 12 8 6 | R 24 12 8 6 | W 8 15 16 3 | S 2 12 1 | G 29 11`
- Ink: `Y30 O6 R4`
- The trap: one 16 u yellow bridge takes 4 s to cross at 4 u/s but crumbles 0.6 s
  after first touch → the unicorn drowns. The lesson: crumbling is **per stroke**, so
  chain short strokes. Each stroke only needs to survive 0.6 s ≈ 2.4 u of walking.
- Solution: seven yellow strokes of ~2.4 u with 0.2 u overlaps:
  `[8,12,10.5,12] [10.3,12,12.8,12] [12.6,12,15.1,12] [14.9,12,17.4,12] [17.2,12,19.7,12] [19.5,12,22,12] [21.8,12,24.2,12]`.
  Alternative the player may find: orange run-up so the crossing is faster.
- Hint: "Yellow crumbles 0.6s after touch"

### 5 · Trapdoor — teaches: the crumble is a tool (timing)
- Geometry: `R 0 9 12 9 | R 12 14 8 4 | R 18 9 2 1 | R 20 4 4 14 | R 15 12 2 1 | K 12 13.5 3 .5 | K 17 13.5 3 .5 | S 2 9 1 | G 16 11`
  (left platform top y=9 to x=12; a chamber 12–20 with spikes on its floor and a safe
  pedestal 15–17 at y=12; a small shelf 18–20 at y=9; wall 20–24)
- Ink: `Y8 O4`
- Solution: yellow `[12,9, 18,9]`. The unicorn steps on at x=12; 0.6 s later it is at
  x≈14.4 and the bridge crumbles; it falls onto the pedestal (15–17) → gem.
  The exact drop point depends on the crumble timer, so the pedestal is 2 u wide.
- Empty run: walks off at x=12 → spikes → fail.
- Hint: "It crumbles. Use that."

### 6 · Momentum — teaches: orange speed carries off a ledge
- Geometry: `R 0 12 10 6 | W 10 16 5 2 | R 15 12 6 6 | R 21 14 5 4 | R 26 6 6 12 | S 2 12 1 | G 29 5`
  (floor to x=10; 5 u water gap; floor 15–21 at y=12; step down to y=14 at 21–26;
  ledge top y=6 from x=26)
- Ink: `O6 R5 Y10`
- Solution: orange `[5,12, 10,12]` → leaves the edge at 9.2 u/s, clears 5 u. Walks on,
  drops 2 u at x=21 (vn ≈ 12.6 > 3, triggers red) onto red `[22,14, 25,14]` → bounce
  ≥ 9 u, drifts right, lands on the ledge at 26.
- Empty run: falls into water → fail.
- Hint: "Fast unicorn, long jump"

## Act 3 — Green

### 7 · Vine — teaches: green is climbable in any direction
- Geometry: `R 0 14 32 4 | R 0 0 4 14 | R 24 5 8 9 | R 28 0 4 5 | S 6 14 1 | G 26 4`
  (floor at 14; right ledge top y=5 from x=24 with a lip wall above it at 28)
- Ink: `G14 O4`
- Solution: green `[22,14, 23.6,13.5, 23.6,6, 24.5,5]` — the unicorn walks into the
  vine, climbs the wall face, exits at the top onto the ledge.
- Empty run: paces the floor → timeout.
- Hint: "Green: the unicorn climbs anything"

### 8 · Ceiling — teaches: vines work upside down
- Geometry: `R 0 10 6 8 | R 26 10 6 8 | K 6 12 20 6 | R 0 0 32 4 | R 15 6.5 2 5.5 | S 2 10 1 | G 29 9`
  (spike pit 6–26; ceiling block down to y=4; a wall in the middle of the pit from
  y=6.5 to the spikes so a floor-level bridge is blocked)
- Ink: `G28 R4`
- Solution: green `[5,10, 5.5,4.5, 26.5,4.5, 27,10]` — up, along the ceiling (unicorn
  centre at y=5, bottom at 5.5, clears the wall top 6.5), down to the right platform.
- Empty run: spikes → fail.
- Hint: "Upside down is fine"

### 9 · Fling — teaches: a vine's end throws you (exit speed 8 u/s)
- Geometry: `R 0 14 32 4 | R 12 0 3 9 | R 17 0 3 9 | S 2 14 1 | G 16 4.5`
  (two pillars from the top down to y=9 forming a chimney 15–17 wide; the gem is
  inside the chimney at y=4.5, above the top of a vine the player can afford)
- Ink: `G10 O4`
- Solution: green `[13,14, 15.4,13, 15.4,7]` — the unicorn climbs to y=7 and is
  thrown straight up at 8 u/s (rise 0.8 u) → overlaps the gem at 4.5? No: 7 − 0.8 =
  6.2 centre, gem at 4.5 needs centre ≤ 5.6. Extend the vine to `15.4,6` (10 u total)
  → apex 5.2 ✔ overlaps. Budget 10 is exact on purpose (star impossible = fine).
- Empty run: paces → timeout.
- Hint: "Vines throw you off the end"

## Act 4 — Blue

### 10 · Slide — teaches: ice turns height into speed
- Geometry: `R 0 4 6 14 | W 6 16 18 2 | R 24 13 8 5 | S 2 4 1 | G 29 12`
- Ink: `B18 O4`
- Solution: blue `[6,4, 15,11, 18,11]` — a 45° slide that ends in a 3 u flat lip so the
  unicorn exits horizontally at ~20 u/s from (18,11), flies ~6 u and lands on the
  platform (top y=13). Tune the lip position in the tool.
- Empty run: walks off at x=6 → water → fail.
- Hint: "Ice: gravity does the walking"

### 11 · Half-pipe — teaches: ice keeps speed uphill
- Geometry: `R 0 6 4 12 | R 28 8 4 10 | S 2 6 1 | G 30 7` (no floor)
- Ink: `B34`
- Solution: blue U `[4,6, 8,12, 16,14, 24,12, 28,8.5]`. Energy is conserved on ice so it
  climbs back to nearly y=6; the ledge top is 8.
- Empty run: out of world → fail.
- Hint: "What goes down comes up"

### 12 · Slingshot — teaches: bounce height scales with impact speed
- Geometry: `R 0 3 5 15 | R 12 14 8 4 | R 26 1 6 17 | S 2 3 1 | G 22 2`
  (gem 12 u above the floor — a from-rest bounce (9 u) can't reach it)
- Ink: `B14 R4 O4`
- Solution: blue `[5,3, 13,13.5]`, red `[13,14, 17,13.6]` (slightly tilted right).
  Impact ~22 u/s × 1.5 = 33 ⇒ 13.6 u rise → reaches the gem.
- Empty run: falls, lands on the floor from 11 u (no red) → paces → timeout.
- Hint: "Faster in, higher out"

## Act 5 — Indigo

### 13 · Through — teaches: indigo is one-way (solid from above only)
- Geometry: `R 0 14 32 4 | R 0 8 6 6 | R 26 0 6 18 | S 2 8 1 | G 16 6`
- Ink: `I8 R5`
- Solution: red `[7,14, 10,14]`, indigo `[13,6.5, 19,6.5]`. Drop 6 u → bounce ≥ 9 u
  (apex y≈5) passes *up through* the indigo, comes down and lands on it, walks to the
  gem. With any solid colour the unicorn would hit it from below and fall back.
- Empty run: paces → timeout.
- Hint: "Indigo: solid from above only"

### 14 · Up Well — teaches: put the landing where you want it
- Geometry: `R 0 14 32 4 | R 0 0 8 18 | R 24 0 8 18 | R 8 0 16 1 | R 8 12 2 2 | S 9 12 1 | G 20 3`
  (a well 8–24 with a ceiling at y=1; a 2 u step for the drop)
- Ink: `I8 R4`
- Solution: red `[12,14, 16,14]`, indigo `[17,3.5, 23,3.5]`. Unicorn drops 2 u onto red,
  bounces ≥ 9 u, drifts right through the indigo, bumps the ceiling, falls back, lands
  on the indigo, walks right to the gem.
- Empty run: paces the well → timeout.
- Hint: none

### 15 · Rebound — teaches: combos
- Geometry: `R 0 4 6 14 | R 6 14 14 4 | R 20 0 12 18 | S 2 4 1 | G 18 3`
- Ink: `B12 R4 I6 G10`
- Solution: blue `[6,4, 12,13.5]`, red `[12,14, 15,14]`, indigo `[13,8, 19,8]`,
  green `[19.4,8, 19.4,3.5]` up the right wall face. Author in tool.
- Hint: none

## Act 6 — Violet

### 16 · Flip — teaches: violet flips gravity
- Geometry: `R 0 14 32 4 | R 0 0 32 3 | S 2 14 1 | G 20 4`
- Ink: `V4 O4`
- Solution: violet `[8,13.5, 8,12]`. Unicorn walks into it, floats up, lands on the
  ceiling (bottom y=3), keeps walking right to the gem.
- Empty run: paces → timeout.
- Hint: "Violet flips gravity"

### 17 · Flip Flop — teaches: flip back
- Geometry: `R 0 14 8 4 | R 8 14 12 4 | K 8 13.5 12 .5 | R 20 14 12 4 | R 0 0 32 3 | R 24 3 8 6 | S 2 14 1 | G 29 13`
  (spikes 8–20 on the floor; an overhang 24–32 from y=3 to 9 blocks the ceiling route)
- Ink: `V8`
- Solution: violet `[7,13.5, 7,12]` (up), violet `[22,3.5, 22,5]` (touched on the
  ceiling → falls to the floor at x≈22, walks to the gem).
- Empty run: spikes → fail.
- Hint: none

### 18 · Two Worlds — teaches: indigo under both gravities
- Geometry: `R 0 14 6 4 | W 6 16 20 2 | R 26 14 6 4 | R 0 0 32 4 | R 18 4 2 5 | S 2 14 1 | G 29 13`
  (water 6–26; ceiling bottom y=4; a hanging wall 18–20 blocks the ceiling route)
- Ink: `V8 I22`
- Solution: indigo bridge `[6,13.5, 26,13.5]`, violet `[8,13, 8,11.5]` (on the bridge),
  violet `[16,4.5, 16,6]` (on the ceiling). The unicorn walks onto the bridge, flips up
  at x=8 (rising away from the indigo is free), walks the ceiling to x=16, flips back,
  lands on the same indigo from above, walks right off it onto the floor → gem.
- Empty run: water → fail.
- Hint: "Up, along, and back down"

## Act 7 — Spectrum

### 19 · Spectrum — teaches: the gate opens when all seven colours are touched
- Geometry: `R 0 14 32 4 | R 0 0 32 3 | T 24 8 2 6 | R 24 3 2 5 | S 2 14 1 | G 29 13`
- Ink: `R4 O4 Y4 G4 B4 I4 V5`
- Solution: author in tool. Design guidance: dabs of ~1.5 u each; violet twice
  (up then down, 1.5 u each fits in 5); red needs a drop — a short green vine flings
  the unicorn 8 u/s upward, and it lands on a red dab; indigo dab as a landing shelf;
  blue dab on the floor is touched simply by walking over it. Budgets may be raised
  to ≥ 1.3× whatever the verified solution uses.
- Empty run: hits the gate, paces → timeout.
- Hint: "Touch every colour to open the gate"

### 20 · Prism — finale: everything, tight ink, many routes
- Geometry (starting point):
  `R 0 14 32 4 | K 10 13.5 6 .5 | W 20 13 6 1 | R 0 9 8 1 | R 12 6 8 1 | R 26 3 6 1 | R 0 0 32 2 | T 24 3 2 11 | R 30 3 2 11 | S 2 14 1 | G 28 2`
  (three tiers; spikes and water on the floor; gate 24–26 from y=3 to the floor; the
  gem sits on the top-right tier behind the gate)
- Ink: `R5 O5 Y10 G8 B8 I6 V4`
- Solution: author in tool; it must exist and be verified. Adjust ink to ≥ 1.2× the
  verified solution.
- Hint: none.

## Level 21 — Daily (generated)

Seed = days since 2026-01-01. Uses the constructive generator (docs/05). Always all 7
colours. Also the online race level with the room's seed.

## Authoring tool (dev only, not shipped)

`tools/play.html`: loads `src/*.js` unbundled via `<script type=module>`, adds a level
string textarea + Load button, a Solve-check button that runs the current strokes
headlessly and reports win/fail/time, and an Export button that prints the strokes in
`test/solutions.js` format. Use it for every level whose paper solution fails, and
for 15, 19, 20. Always confirm exported strokes in the Node test before committing.
