# 03 — Levels (v2: 30 levels; v2.1 adds act 8, 40 total)

## Format

Levels live in `src/levels.js` as one string each, tokens separated by `|`, fields by
spaces. Numbers may be decimals. Keep the average level under 90 bytes of source.

```
N <name>              level name (short)
H <hint text>         hint, ≤ 40 chars, optional
S x y d               start: unicorn centre x, ground-top y (spawn centre at y-0.5), d = 1 or -1
G x y                 gem centre (gem radius 0.6)
R x y w h             solid rect (x,y = top-left)
K x y w h             spike rect (kills; counts as support for paint)
W x y w h             water rect (kills; not support)
T x y w h             gate rect (solid until all 7 colours touched this run)
I <c><n> <c><n> ...   ink: colour letter (R O Y G B I V) + budget in u; omitted = locked
```

Stored solutions live in `test/solutions.js` as arrays of strokes:
`[colourIndex, [x0,y0, x1,y1, ...]]`. A 2-point stroke is a straight line.

Every level is checked by the test suite for:
- stored solution wins within 25 s
- empty paint fails (timeout, hazard, or out of world)
- solution ink per colour ≤ budget
- solution is drawable (no segment through solids, except indigo)
- determinism (two runs and batched stepping give identical state hashes)
- (logged, not enforced) the intro level's featured colour is used by the solution

## World conventions

32 × 18 u, y down. A missing floor means falling out of the world = fail. Keep ≥ 1 u
margin from edges for gems. The unicorn spawns on a rect top. Paint that overlaps
solid rects is clipped by the drawing code (indigo excepted), so vines "up a wall"
are drawn ~0.25 u off the wall face — close enough to count as supported (0.3 u).

Paint must be supported (docs/02 "Support"): every stroke in a solution touches the
world or a supported stroke, or is meant to fall (level 9).

Physics facts used below (measured with `tools/lab.mjs`):
- walkable slope ≤ ~37°; steeper slopes slide
- bounce from any drop ≥ 0.12 u rises 9–11.25 u and drifts 6 u at walk speed
- feather glide: ~0.8 u sideways per u of drop at walk speed, ~1.8 at dash speed
- fling off a vine end: 8 u/s along the last segment
- the unicorn's centre is 0.5 u above the surface it walks on; spikes must sit
  below the walking line (a spike top level with the centre kills)

---

## Act 1 — Orange & Red, paint needs support (1–6)

1. **First Steps** — draw a bridge. `O14 R6`. Solution: orange `[10,12, 22,12]`.
2. **Ramp** — paint needs support: a slope from the floor to a ledge 5 u up. `O16 R4`.
   Solution: orange `[11,14, 24,9]` (21°).
3. **Boing** — red bounces when landed on. `R5 O6`. Red `[13,14, 16,14]` on the pit floor.
4. **Angles** — tilted red aims the bounce; the pad rests on spikes. `R8 O6`.
5. **Shelf** — floating paint falls; hang a red pad from the ledge's wall, tilted so it
   launches right over the water. `R5 O4`. Red `[6.2,8.4, 9.6,9.6]`.
6. **Make a Drop** — red needs a drop, so build one: a short orange ramp ends in the
   air; the unicorn steps off it onto red. `O7 R5`.

## Act 2 — Yellow (7–10)

7. **Long Way** — chain of 2.5 u yellow strokes over 16 u of water. `Y30 O6 R4`.
8. **Trapdoor** — a yellow bridge that crumbles under the unicorn onto a pedestal. `Y8 O4`.
9. **Drawbridge** — an orange bar rests only on a yellow stub; when the stub crumbles
   the bar (and the unicorn) drop onto two pillars over spikes, and the unicorn runs
   back under the start ledge to the gem. `Y3 O16`.
10. **Momentum** — orange speed carries across water; a red pad on a step bounces up
    to the far ledge. `O6 R5 Y10`.

## Act 3 — Green (11–14)

11. **Vine** — climb a wall and over the corner. `G14 O4`.
12. **Ceiling** — vine along the underside of a ceiling over spikes. `G34 R4`.
13. **Fling** — a vertical vine throws the unicorn into a chimney gem. `G12 O6`.
14. **Rebound** — drop onto red, bounce onto a ledge, vine up the wall. `R4 G4 O4`.

## Act 4 — Blue (15–18)

15. **Feather** — a blue dab at the edge; glide over 6 u of water. `B4 O4`.
16. **Soft Landing** — float down 6 u onto a 3 u pedestal between spikes. `B4 O4`.
17. **Long Jump** — orange run-up, blue at the edge: dash speed is kept and the fall is
    soft — 17 u across. `O8 B3`.
18. **Kite** — blue then a vine; the fling keeps the feather and glides to a ledge. `B4 G12 O4`.

## Act 5 — Indigo (19–22)

19. **Through** — indigo painted through a full-height wall. `I8 O4`.
20. **Basement** — an indigo ramp down through the upper floor into the room below. `I8 O4`.
21. **Tower** — an indigo ramp up inside a 12 × 8 block to its top. `I17 O4`.
22. **Archway** — three walls; the middle one has a 2 u arch; ink for two. `I7 O4`.

## Act 6 — Violet (23–26)

23. **Flip** — violet to the ceiling. `V4 O4`.
24. **Flip Flop** — up over spikes, down before the overhang. `V8 O4`.
25. **Two Worlds** — flip up, phase through a hanging wall on the ceiling, flip down onto
    the far platform. `V8 I6 O4`.
26. **Balloon** — feather + flip: a slow rise drifts under a hanging wall. `B3 V4 O4`.

## Act 7 — Spectrum (27–30)

27. **Spectrum** — dabs of every colour open the gate; violet up and down past it.
    `R4 O4 Y4 G4 B4 I4 V5`.
28. **Pinball** — red pads hung from both walls ping-pong the unicorn up to the far
    ledge over spikes. `R8 O4`.
29. **Free Style** — all seven colours, tight ink, many routes; the cheapest is violet
    up, indigo through the hanging block, violet down. `R3 O4 Y5 G6 B3 I4 V3`.
30. **Prism** — finale in rooms: dash + feather over water, phase through a wall,
    yellow chain over spikes, vine up a ledge, red dab, violet to the ceiling (the gate
    opens with all seven), violet down into the gem room. `R4 O6 Y10 G10 B4 I5 V5`.

## Level 31 — Daily (generated)

Seed = days since 2026-01-01. Uses the constructive generator (docs/05). Also the
online race level with the room's seed.

## Authoring tools (dev only, not shipped)

- `tools/try.mjs <level#|string> '<solution JSON>' [--trace [--every N]]` runs one
  candidate and prints the result, ink used and (with `--trace`) the trajectory.
- `tools/scan.mjs <level> '<solution template>' 'a=lo:hi:step' ...` sweeps parameters
  and prints which combinations win.
- `tools/lab.mjs` measures physics facts (slopes, glide, bounce).
- `tools/gentrace.mjs <seed>` traces a generated level's reference solution.
- `tools/play.html` is a browser authoring page (draw, Solve-check, Export).
