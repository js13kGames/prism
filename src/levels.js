// 20 hand-authored levels. Format in docs/03: tokens separated by '|', fields by spaces.
// N name | H hint | S x y dir | G x y | R/K/W/T x y w h (solid/spike/water/gate) | I <colour><ink>...
export const LEVELS = [
  'N First Steps|H Draw a bridge, then press Play|S 2 12 1|G 28 11|R 0 12 10 6|R 22 12 10 6|I O14 R6',
  'N Boing|H Red bounces when landed on|S 2 8 1|G 28 5|R 0 8 12 10|R 12 14 6 4|R 18 6 14 12|I R5 O6',
  'N Angles|H Angled red launches sideways|S 2 8 1|G 28 8|R 0 8 6 10|R 6 14 12 4|K 8 13.5 8 .5|R 22 9 10 9|I R8 O6',
  'N Long Way|H Yellow crumbles 0.6s after touch|S 2 12 1|G 29 11|R 0 12 8 6|R 24 12 8 6|W 8 15 16 3|I Y30 O6 R4',
  'N Trapdoor|H It crumbles. Use that.|S 2 9 1|G 16 11|R 0 9 12 9|R 12 14 8 4|R 18 9 2 1|R 20 4 4 14|R 15 12 2 1|K 12 13.5 3 .5|K 17 13.5 3 .5|I Y8 O4',
  'N Momentum|H Fast unicorn, long jump|S 2 12 1|G 29 7|R 0 12 10 6|W 10 16 3 2|R 13 14 8 4|R 21 16 4 2|R 25 8 7 10|I O6 R5 Y10',
  'N Vine|H Green: the unicorn climbs anything|S 6 14 1|G 26 4|R 0 14 32 4|R 0 0 4 14|R 24 5 8 9|R 28 0 4 5|I G14 O4',
  'N Ceiling|H Upside down is fine|S 2 10 1|G 29 9|R 0 10 6 8|R 26 10 6 8|K 6 12 20 6|R 0 0 32 4|R 15 6.5 2 5.5|I G34 R4',
  'N Fling|H Vines throw you off the end|S 2 14 1|G 16 4.5|R 0 14 32 4|R 12 0 3 9|R 17 0 3 9|I G10 O4',
  'N Slide|H Ice: gravity does the walking|S 2 4 1|G 29 12|R 0 4 6 14|W 6 16 18 2|R 24 13 8 5|I B18 O4',
  'N Half-pipe|H What goes down comes up|S 2 6 1|G 30 8|R 0 6 4 12|R 28 9 4 9|I B34 O4',
  'N Slingshot|H Faster in, higher out|S 2 3 1|G 22 2|R 0 3 5 15|R 12 14 8 4|R 26 1 6 17|I B14 R4 O4',
  'N Through|H Indigo: solid from above only|S 2 8 1|G 16 6|R 0 14 32 4|R 0 8 6 6|R 26 0 6 18|I I8 R5',
  'N Up Well|S 9 12 1|G 20 4|R 0 14 32 4|R 0 0 8 18|R 24 0 8 18|R 8 0 16 1|R 8 12 2 2|I I8 R4',
  'N Rebound|S 2 4 1|G 18 3|R 0 4 6 14|R 6 14 14 4|R 20 0 12 18|I B12 R4 I6 G10',
  'N Flip|H Violet flips gravity|S 2 14 1|G 20 4|R 0 14 32 4|R 0 0 32 3|I V4 O4',
  'N Flip Flop|S 2 14 1|G 29 13|R 0 14 8 4|R 8 14 12 4|K 8 13.5 12 .5|R 20 14 12 4|R 0 0 32 3|R 24 3 8 6|I V8 O4',
  'N Two Worlds|H Up, along, and back down|S 2 14 1|G 29 13|R 0 14 6 4|W 6 16 20 2|R 26 14 6 4|R 0 0 32 4|R 18 4 2 5|I V8 I22',
  'N Spectrum|H Touch every colour to open the gate|S 2 14 1|G 30.5 13|R 0 14 32 4|R 0 0 32 3|T 27 8 2 6|R 27 3 2 5|I R4 O4 Y4 G4 B4 I4 V5',
  'N Prism|S 2 14 1|G 28 2.3|R 0 14 32 4|K 10 13.5 6 .5|W 20 13 6 1|R 0 9 8 1|R 12 6 8 1|R 26 3 6 1|R 0 0 32 1.5|T 24 1.5 2 12.5|R 30 1.5 2 12.5|I R4 O4 Y8 G7 B6 I5 V4',
];
