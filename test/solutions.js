// Stored solutions per level: arrays of [colourIndex, [x0,y0, x1,y1, ...]].
// Colour indices: 0 red, 1 orange, 2 yellow, 3 green, 4 blue, 5 indigo, 6 violet.
export const SOLUTIONS = [
  // 1 First Steps
  [[1, [10, 12, 22, 12]]],
  // 2 Ramp: a walkable slope from the floor up to the ledge
  [[1, [11, 14, 24, 9]]],
  // 3 Boing
  [[0, [13, 14, 16, 14]]],
  // 4 Angles
  [[0, [7, 12.5, 10, 14]]],
  // 5 Shelf: red pad hanging from the start ledge's wall, tilted to launch right
  [[0, [6.2, 8.4, 9.6, 9.6]]],
  // 6 Make a Drop: a tiny orange ramp gives the drop that makes red bounce
  [[1, [7, 14, 10.5, 12.8]], [0, [11, 14, 14, 14]]],
  // 7 Long Way
  [[2, [8, 12, 10.5, 12]], [2, [10.3, 12, 12.8, 12]], [2, [12.6, 12, 15.1, 12]], [2, [14.9, 12, 17.4, 12]],
   [2, [17.2, 12, 19.7, 12]], [2, [19.5, 12, 22, 12]], [2, [21.8, 12, 24.2, 12]]],
  // 8 Trapdoor
  [[2, [12, 9, 18, 9]]],
  // 9 Drawbridge: the bar rests only on a yellow stub; when it crumbles the bar (and unicorn) drop onto the pillars
  [[2, [4.5, 8, 6.3, 8]], [1, [6.5, 8, 19.6, 8]]],
  // 10 Momentum
  [[1, [5, 12, 10, 12]], [0, [21.5, 16, 24.5, 16]]],
  // 11 Vine
  [[3, [22, 14, 23.6, 13.5, 23.6, 5.2, 24.8, 4.6]]],
  // 12 Ceiling
  [[3, [5, 10, 5.5, 4.5, 26.5, 4.5, 27, 9]]],
  // 13 Fling
  [[3, [13, 14, 15.4, 13, 15.4, 6]]],
  // 14 Rebound: drop onto red, the bounce carries the unicorn into the wall vine, climb to the gem
  [[0, [7.5, 14, 10.5, 14]], [3, [19.75, 6, 19.75, 3.5]]],
  // 15 Feather
  [[4, [4, 6, 6, 6]]],
  // 16 Soft Landing
  [[4, [2.5, 4, 4, 4]]],
  // 17 Long Jump: orange run-up, blue at the edge keeps the speed and softens the fall
  [[1, [2, 6, 7, 6]], [4, [7, 6, 8, 6]]],
  // 18 Kite: feather armed on blue, vine fling up-right, glide to the ledge
  [[4, [4.5, 14, 7.5, 14]], [3, [7.7, 14, 7.7, 7.5, 9, 6]]],
  // 19 Through
  [[5, [12.5, 14, 19.5, 14]]],
  // 20 Basement
  [[5, [4, 8, 10, 10.5]]],
  // 21 Tower
  [[5, [8, 14, 21.5, 6]]],
  // 22 Archway: two walls need indigo; the middle one has an arch
  [[5, [7.5, 14, 10.5, 14]], [5, [23.5, 14, 26.5, 14]]],
  // 23 Flip
  [[6, [8, 14, 8, 12.5]]],
  // 24 Flip Flop
  [[6, [7, 14, 7, 12.5]], [6, [21, 3, 21, 4.5]]],
  // 25 Two Worlds
  [[6, [4, 14, 4, 12.5]], [5, [15.3, 4, 18.7, 4]], [6, [24.5, 4, 24.5, 5.5]]],
  // 26 Balloon
  [[4, [4, 14, 6, 14]], [6, [6.3, 14, 6.3, 12.5]]],
  // 27 Spectrum
  [[1, [4, 14, 5.5, 14]], [2, [6.5, 14, 8, 14]], [4, [9, 14, 10.5, 14]], [5, [11, 14, 12.5, 14]], [3, [13.2, 14, 14, 12.8]],
   [0, [15.8, 14, 17.3, 14]], [6, [21.5, 14, 21.5, 12.5]], [6, [25, 3, 25, 4.5]]],
  // 28 Pinball
  [[0, [6.2, 9.5, 9.5, 10.5]], [0, [23, 12, 25.8, 12]]],
  // 29 Free Style: violet to the ceiling, indigo through the hanging block, violet back down onto the ledge
  [[6, [4, 14, 4, 12.5]], [5, [13.5, 1.5, 16.5, 1.5]], [6, [27.5, 1.5, 27.5, 3]]],
  // 30 Prism: dash+feather over the water, phase through the wall, yellow chain over the spikes, vine up the ledge,
  // red dab, violet to the ceiling (gate opens with all 7), violet down into the gem room
  [[1, [2, 14, 5, 14]], [4, [5, 14, 6, 14]], [5, [11.5, 15, 13.5, 15]], [2, [14.8, 15, 17.3, 15]], [2, [17.1, 15, 19.6, 15]], [2, [19.4, 15, 21.3, 15]],
   [3, [21.75, 15, 21.75, 8.2, 22.6, 7.6]], [0, [23.4, 8, 24.4, 8]], [6, [24.7, 8, 24.7, 6.5]], [6, [29.5, 1.5, 29.5, 3]]],
  // 31 Cellar
  [[5, [22, 10, 26, 12.5]]],
  // 32 Return
  [[6, [17, 14, 17, 12.5]]],
  // 33 Overhang
  [[3, [11.5, 14, 11.8, 13.5, 11.8, 7.8, 12.4, 7.4]], [5, [14.6, 8, 18.5, 8]]],
  // 34 Chimney
  [[3, [11.6, 14, 11.85, 13, 11.85, 3.8, 12.6, 3.6]], [6, [20, 14, 20, 12.5]]],
  // 35 Switchyard
  [[5, [9, 14, 13.5, 14]], [3, [19.6, 14, 19.85, 13, 19.85, 3.8, 20.6, 3.6]]],
  // 36 Ceiling Gap
  [[6, [4, 14, 4, 12.5]], [2, [12, 3, 14.5, 3]], [2, [14.3, 3, 16.8, 3]], [2, [16.6, 3, 19.1, 3]], [2, [18.9, 3, 21, 3]], [6, [26, 3, 26, 4.5]]],
  // 37 Loft
  [[3, [9.6, 14, 9.85, 13, 9.85, 5.8, 10.6, 5.6]], [2, [12, 6, 14.5, 6]], [2, [14.3, 6, 16.8, 6]], [2, [16.6, 6, 19.1, 6]], [2, [18.9, 6, 20.5, 6]]],
  // 38 Trampoline
  [[1, [3, 10, 7, 10]], [4, [7, 10, 9.9, 10]], [0, [19.2, 15, 21.5, 15]]],
  // 39 Tightrope
  [[3, [5, 12, 5.5, 4.6, 25.5, 4.6, 26.5, 11]]],
  // 40 Aurora
  [[1, [2, 8, 3.5, 8]], [4, [8.4, 8, 9.9, 8]], [2, [15.5, 14, 18, 14]], [0, [18.5, 14, 20.5, 14]], [3, [20.7, 14, 20.85, 13, 20.85, 8.8, 21.4, 8.7]], [5, [22, 8.7, 25.4, 8.7]], [6, [27, 14, 27, 12.5]]],
];
