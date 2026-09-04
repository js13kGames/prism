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

## Segment library (as shipped in gen.js)

Each segment lists the geometry it emits and the reference strokes. Every reference
stroke touches the world (paint needs support, docs/02).

- **orange bridge** (7 u): 4 u water, orange bridge between the platforms. Requires O 4.
- **yellow chain** (9 u): 6 u water, three overlapping 2.5 u yellow strokes. Requires Y.
- **step-up** (7 u): 2 u drop onto a red pad, bounce onto a ledge 4–5 u higher.
  Requires R 2. `cy -= 4..5`.
- **wall-climb** (4 u): vine 0.4 u off the wall face and over the corner, h 3–5.
  Requires G. `cy -= h`.
- **flip-corridor** (7.5 u): ceiling block, violet up, walk over water, violet down.
  Requires V 2.
- **wall-phase** (8 u): a wall from the ceiling down to the platform; indigo line
  through it at floor level. Requires I 4.4.
- **feather-gap** (9.5 u, only if `cy < 11`): 3 u run-up with a blue dab over the
  edge, 3.5 u of water, landing platform 4 u lower. Requires B 1.6. `cy += 4`.
- **spike-run** (9 u): spikes in a pit, ceiling block, vine along its underside.
  Requires G.

Segment picking: never the same segment twice in a row; while fewer than 3 colours
are required only segments that add a new colour are eligible; loop until `cx ≥ 22`
and ≥ 3 colours.

## Validation

`gen.js` is exercised by `sim.test.js`: for seeds 1..40, build the level, run the
reference strokes (the generator returns them in a second array when called with
`withSolution=true`), assert win; run empty paint, assert fail. Any seed that fails
is a bug in a segment template; fix the template, never special-case seeds.

## Daily UI

Level 21 in the select screen labelled "Daily" with today's date; no progress saved
beyond "done today" (`prism26_daily = seed`).
