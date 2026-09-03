# 05 — Seeded generator (Daily + Online)

Priority 5 — implement only after core, levels, sound and online are done and under
size. Budget: ≤ 900 bytes minified before compression. If it does not fit, cut the
generator AND the Daily/online-race level, and make online use a fixed rotation of
levels 1–20 chosen by seed (still a race). Log the decision.

## Why constructive, not random-and-solve

There is no room for a solver. Instead the generator *builds the solution first* and
then places geometry around it, so every generated level is solvable by construction
and needs specific colours.

## PRNG

mulberry32(seed) → `rnd()` in [0,1). Seed is a 32-bit int. Daily seed =
`floor((Date.now() - Date.UTC(2026,0,1)) / 864e5)`. Online seed = hash of room code
XOR host-chosen salt (docs/06). `rndi(a,b)` inclusive ints.

## Algorithm

1. Start with a floor `R 0 14 32 4` and a start pad on a left platform
   `R 0 y0 4 (18-y0)` with `y0 = rndi(6,12)`, `S 2 y0 1`.
2. Walk a cursor `(cx, cy) = (4, y0)` rightward, placing 3–4 **segments** chosen from
   the segment library until `cx ≥ 24`. Each segment consumes horizontal space and
   may change `cy`. Each segment records (a) the geometry it adds, (b) the ink it
   requires per colour, (c) the reference solution strokes (used only in tests, not
   shipped — but the *ink budget* it implies is shipped).
3. End with a goal platform `R cx cyG (32-cx) (18-cyG)` and `G (cx+3) (cyG-1)`.
4. Ink per colour = 1.4 × required, rounded up; colours not required by any segment
   get 3 u (so all seven are drawable, some are red herrings).
5. Emit as the same level-string format so `parseLevel` is reused.

## Segment library (each 6–10 u wide)

Each segment lists the geometry it emits and the reference strokes (relative to
`cx, cy`). Colour indices: R0 O1 Y2 G3 B4 I5 V6.

- **gap(w=4..7)**: water `W cx 16 w 2`, then a platform at the same `cy`.
  Ref: yellow chain or orange bridge. Requires Y or O (`w` u). Picks Y if w > 5.
- **step-up(h=4..7)**: a ledge `R (cx+3) (cy-h) ...` reachable by red: a 2 u drop
  first `R cx (cy+2) 3 ...` then red pad. Requires R 3 u. `cy -= h`.
- **long-drop-bounce**: platform far below (`cy+8`), red pad, land on a higher ledge.
  Requires R 3.
- **wall-climb(h=5..8)**: wall + ledge on top, vine up. Requires G (h+1). `cy -= h`.
- **spike-run(w=6)**: spikes on the floor for `w`, ceiling block above; vine along the
  ceiling. Requires G (w+8).
- **slide-jump**: current platform is high (needs `cy ≤ 8`, else skip); water gap 10;
  blue ramp with lip. Requires B 14. `cy += 6`.
- **one-way-shelf**: gem-side platform above; indigo shelf + red pad from a 2 u drop.
  Requires I 6, R 3. `cy -= 5`.
- **flip-corridor**: ceiling block over this span with a hanging wall at the end;
  two violets. Requires V 3. Only if `cy ≥ 10` (so the ceiling has room).

Segment picking: weighted random, never the same segment twice in a row, and the
level must include at least 3 distinct colours.

## Validation

`gen.js` is exercised by `sim.test.js`: for seeds 1..40, build the level, run the
reference strokes (the generator returns them in a second array when called with
`withSolution=true`), assert win; run empty paint, assert fail. Any seed that fails
is a bug in a segment template; fix the template, never special-case seeds.

## Daily UI

Level 21 in the select screen labelled "Daily" with today's date; no progress saved
beyond "done today" (`prism26_daily = seed`).
