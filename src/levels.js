// 40 hand-authored levels. Format in docs/03: tokens separated by '|', fields by spaces.
// N name | H hint | S x y dir | G x y | R/K/W/T x y w h (solid/spike/water/gate) | I <colour><ink>...
export const ACT = [0, 6, 10, 14, 18, 22, 26, 30], AC = [0, 2, 3, 4, 5, 6]; // act 7 and 8 mix every colour: white
export const LEVELS = [
  // Act 1 — Orange & Red, and paint that needs support
  'N First Steps|H Draw a bridge, then press Play|S 2 12 1|G 28 11|R 0 12 10 6|R 22 12 10 6|I O14 R6',
  'N Ramp|H Paint needs support. Start on the ground|S 2 14 1|G 28 8.4|R 0 14 24 4|R 24 9 8 9|I O16 R4',
  'N Boing|H Red bounces when landed on|S 2 8 1|G 28 5|R 0 8 12 10|R 12 14 6 4|R 18 6 14 12|I R5 O6',
  'N Angles|H Angled red launches sideways|S 2 8 1|G 28 8|R 0 8 6 10|R 6 14 12 4|K 8 13.5 8 .5|R 22 9 10 9|I R8 O6',
  'N Shelf|H Floating paint falls. Hang it on a wall|S 2 5 1|G 28 7|R 0 5 6 13|W 6 16 8 2|R 14 8 18 10|I R5 O4',
  'N Make a Drop|H Red needs a drop. Build one|S 2 14 1|G 19 4.6|R 0 14 32 4|I O7 R5',
  // Act 2 — Yellow
  'N Long Way|H Yellow crumbles 0.6s after touch|S 2 12 1|G 29 11|R 0 12 8 6|R 24 12 8 6|W 8 15 16 3|I Y30 O6 R4',
  'N Trapdoor|H It crumbles. Use that.|S 2 9 1|G 16 11|R 0 9 12 9|R 12 14 8 4|R 18 9 2 1|R 20 4 4 14|R 15 12 2 1|K 12 13.5 3 .5|K 17 13.5 3 .5|I Y8 O4',
  'N Drawbridge|H Yellow drops whatever it holds|S 2 8 1|G 3 13|R 0 8 6 2|R 0 14 6 4|K 6 13.5 14 .5|R 6 14 14 4|R 20 6 12 12|R 8 12 1 2|R 17 12 1 2|I Y3 O16',
  'N Momentum|H Fast unicorn, long jump|S 2 12 1|G 29 7|R 0 12 10 6|W 10 16 3 2|R 13 14 8 4|R 21 16 4 2|R 25 8 7 10|I O6 R5 Y10',
  // Act 3 — Green
  'N Vine|H Green: the unicorn climbs anything|S 6 14 1|G 26 4|R 0 14 32 4|R 0 0 4 14|R 24 5 8 9|R 28 0 4 5|I G14 O4',
  'N Ceiling|H Upside down is fine|S 2 10 1|G 29 9|R 0 10 6 8|R 26 10 6 8|K 6 12 20 6|R 0 0 32 4|R 15 6.5 2 5.5|I G34 R4',
  'N Fling|H Vines throw you off the end|S 2 14 1|G 16 4.5|R 0 14 32 4|R 12 0 3 9|R 17 0 3 9|I G12 O6',
  'N Rebound|S 2 6 1|G 18.6 3.2|R 0 6 6 12|R 6 14 6.5 4|R 12.5 6 7.5 12|R 20 0 12 18|I R4 G4 O4',
  // Act 4 — Blue
  'N Feather|H Blue: a feather-light fall|S 2 6 1|G 29 13|R 0 6 6 12|W 6 16 6 2|R 12 14 20 4|I B4 O4',
  'N Soft Landing|H Float down onto the pedestal|S 2 4 1|G 11 9.4|R 0 4 4 14|K 4 13.5 28 .5|R 4 14 28 4|R 9.5 10 3 4|I B4 O4',
  'N Long Jump|H Fast and floaty|S 2 6 1|G 29 15|R 0 6 8 12|W 8 16 16 2|R 24 16 8 2|I O8 B3',
  'N Kite|H Feather, then fling|S 2 14 1|G 29 9|R 0 14 8 4|K 8 13.5 9 .5|R 8 14 9 4|R 17 10 15 8|I B4 G12 O4',
  // Act 5 — Indigo
  'N Through|H Indigo: paint through walls|S 2 14 1|G 29 13|R 0 14 32 4|R 14 4 4 10|R 0 0 32 4|I I8 O4',
  'N Basement|H Down through the floor|S 2 8 1|G 28 13|R 0 0 32 2|R 0 8 32 2|R 0 14 32 4|R 31 2 1 12|I I8 O4',
  'N Tower|H Up through the inside|S 2 14 1|G 21 5.4|R 0 14 32 4|R 10 6 12 8|I I17 O4',
  'N Archway|S 2 14 1|G 29 13|R 0 14 32 4|R 0 0 32 3|R 8 8 2 6|R 16 3 2 9|R 24 8 2 6|I I7 O4',
  // Act 6 — Violet
  'N Flip|H Violet flips gravity|S 2 14 1|G 20 4|R 0 14 32 4|R 0 0 32 3|I V4 O4',
  'N Flip Flop|S 2 14 1|G 29 13|R 0 14 8 4|R 8 14 12 4|K 8 13.5 12 .5|R 20 14 12 4|R 0 0 32 3|R 24 3 8 6|I V8 O4',
  'N Two Worlds|H Up, along, through, down|S 2 14 1|G 29 13|R 0 14 6 4|W 6 16 18 2|R 24 14 8 4|R 0 0 32 4|R 16 4 2 5|I V8 I6 O4',
  'N Balloon|H Float up gently|S 2 14 1|G 29 2|R 0 14 32 4|R 0 0 32 1|R 8 1 2 5|I B3 V4 O4',
  // Act 7 — Spectrum
  'N Spectrum|H Touch every colour to open the gate|S 2 14 1|G 30.5 13|R 0 14 32 4|R 0 0 32 3|T 27 8 2 6|R 27 3 2 5|I R4 O4 Y4 G4 B4 I4 V5',
  'N Pinball|H Hang red from both walls|S 2 4 1|G 29 4|R 0 4 6 14|K 6 17.5 20 .5|R 26 5 6 13|I R8 O4',
  'N Free Style|S 2 14 1|G 29 3|R 0 14 32 4|R 26 4 6 1|R 12 9 8 1|R 0 0 32 1.5|R 14 1.5 2 4|K 8 13.5 6 .5|I R3 O4 Y5 G6 B3 I4 V3',
  'N Prism|S 2 14 1|G 30 7|R 0 14 6 4|W 6 16 3.5 2|R 9.5 15 2.5 3|R 12 1.5 1 13.5|R 13 15 2 3|K 15 15.5 6 .5|R 15 16 6 2|R 21 15 1 3|R 22 8 3 10|T 25 1.5 2 6.5|R 27 8 5 10|R 0 0 32 1.5|I R4 O6 Y10 G10 B4 I5 V5',
  // Act 8 — Mastery
  'N Cellar|H Down, then in|S 2 8 1|G 24 13|R 0 8 20 2|R 0 14 32 4|R 18 10 2 4|R 28 10 2 4|R 18 10 12 1|I I10 O6',
  'N Return|H It only turns at a wall|S 12 14 1|G 3 3|R 0 14 22 4|R 0 2 2 12|R 20 2 2 12|R 0 0 22 2|I V4 O4',
  'N Overhang|H Climb to where the wall is thin|S 2 14 1|G 29 13|R 0 14 32 4|R 12 8 6 6|R 16 4 2 4|I G8 I4 O4',
  'N Chimney|H Up, over, then upside down|S 2 14 1|G 29 3|R 0 14 32 4|R 12 4 4 10|R 0 0 32 2|I G12 V4 O4',
  'N Switchyard|H A different answer for each wall|S 2 14 1|G 29 13|R 0 14 32 4|R 10 8 3 6|R 20 4 3 10|I I5 G12 O4',
  'N Ceiling Gap|H The roof has a hole. Bridge it|S 2 14 1|G 29 13|R 0 14 8 4|W 8 16 16 2|R 24 14 8 4|R 0 0 12 3|R 20 0 12 3|I V6 Y12 O4',
  'N Loft|H Climb first, then chain across|S 2 14 1|G 29 5|R 0 14 32 4|R 10 6 2 8|R 20 6 12 12|I G10 Y11 O4',
  'N Trampoline|H Dash, feather, then bounce off the rock|S 2 10 1|G 29 9|R 0 10 10 8|W 10 16 14 2|R 19 15 3 3|R 24 10 8 8|I R4 B4 O6',
  'N Tightrope|H A vine is a road too|S 2 12 1|G 29 11|R 0 12 6 6|R 6 16 20 2|K 6 15.5 20 .5|R 26 12 6 6|R 0 2 32 2|I G36 O4',
  'N Aurora|H One of everything|S 2 8 1|G 30 3|R 0 8 10 10|W 10 16 5 2|R 15 14 6 4|R 21 9 4 5|R 24 2 1 7|R 25 14 7 4|R 0 0 32 2|T 28 2 1 6|I R4 O6 Y6 G8 B4 I5 V4',
];
