// Seeded constructive level generator (docs/05) for Daily and online races.
// Builds the solution first: walks a cursor (cx, cy) rightward placing segments whose reference strokes
// are known to work, then wraps them in a level string. gen(seed) → [levelString, referenceStrokes].
export const daySeed = () => Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 864e5);

export function gen(seed) {
  let s = seed | 0;
  const rnd = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const ri = (a, b) => a + (rnd() * (b - a + 1) | 0);
  const y0 = ri(7, 12), sol = [], need = [0, 0, 0, 0, 0, 0, 0];
  let cx = 3, cy = y0, geo = `R 0 ${y0} 3 ${18 - y0}`, last = -1, used = 0, nc = 0; // used = mask of required colours
  const R = (x, y, w, h, t = 'R') => geo += `|${t} ${x} ${y} ${w} ${h}`;
  const K = (c, p) => { sol.push([c, p]); need[c] += p.reduce((l, v, i) => i > 1 && i % 2 == 0 ? l + Math.hypot(v - p[i - 2], p[i + 1] - p[i - 1]) : l, 0); };
  // Each segment: [width, colourBit, feasible(), build()] — build() adds geometry + strokes and advances cx/cy.
  const SEG = [
    [7, 2, () => 1, () => { R(cx, 16, 4, 2, 'W'); K(1, [cx, cy, cx + 4, cy]); R(cx + 4, cy, 3, 18 - cy); cx += 7; }], // orange bridge over water
    [9, 4, () => 1, () => { // yellow chain over a wider pit (one long stroke would crumble under the unicorn)
      R(cx, 16, 6, 2, 'W'); for (let x = cx; x < cx + 6; x += 2.2) K(2, [x, cy, Math.min(x + 2.5, cx + 6.3), cy]);
      R(cx + 6, cy, 3, 18 - cy); cx += 9;
    }],
    [7, 1, () => cy > 8, () => { // step-up: 2 u drop onto a red pad, bounce onto a ledge 4–5 u higher
      const h = ri(4, 5); R(cx, cy + 2, 4, 16 - cy); K(0, [cx + .5, cy + 2, cx + 2.5, cy + 2]);
      cy -= h; R(cx + 4, cy, 3, 18 - cy); cx += 7;
    }],
    [4, 8, () => cy > 7, () => { // wall-climb: vine up the wall face and over the corner
      const h = ri(3, cy > 9 ? 5 : 3); K(3, [cx - .4, cy, cx - .4, cy - h + .2, cx + .6, cy - h - .4]);
      cy -= h; R(cx, cy, 4, 18 - cy); cx += 4;
    }],
    [7.5, 64, () => cy > 9, () => { // flip-corridor: violet up to a ceiling, walk over water, violet back down
      R(cx - 2, cy - 6, 8, 1); R(cx, 16, 4.5, 2, 'W');
      K(6, [cx - 1, cy - .5, cx - 1, cy - 1.5]); K(6, [cx + 4, cy - 5, cx + 4, cy - 4]);
      R(cx + 4.5, cy, 3, 18 - cy); cx += 7.5;
    }],
    [9.5, 32, () => cy > 8, () => { // one-way shelf: drop, red bounce up through indigo, land on it, walk onto a higher platform
      R(cx, cy + 2, 6.5, 16 - cy); K(0, [cx + .5, cy + 2, cx + 2.5, cy + 2]); K(5, [cx + 2, cy - 5, cx + 6.5, cy - 5]);
      cy -= 5; R(cx + 6.5, cy, 3, 18 - cy); cx += 9.5; used |= 1;
    }],
    [9, 8, () => cy > 6, () => { // spike-run: spikes in a pit, vine along the ceiling above it
      R(cx, cy + 1, 6, 17 - cy); R(cx, cy + .5, 6, .5, 'K'); R(cx - 1, cy - 5, 8, 1);
      K(3, [cx - 1, cy, cx - .5, cy - 3.5, cx + 6.5, cy - 3.5, cx + 7, cy - 1]);
      R(cx + 6, cy, 3, 18 - cy); cx += 9;
    }],
  ];
  while (cx < 22 || nc < 3) { // segments that fit; while fewer than 3 colours are required, only ones adding a colour
    let ok = SEG.map((g, i) => i).filter(i => i != last && cx + SEG[i][0] <= 29 && SEG[i][2]());
    if (nc < 3) ok = ok.filter(i => !(used & SEG[i][1]));
    if (!ok.length) break;
    last = ok[rnd() * ok.length | 0];
    if (!(used & SEG[last][1])) nc++;
    used |= SEG[last][1]; SEG[last][3]();
  }
  R(cx, cy, 32 - cx, 18 - cy);
  const ink = need.map((v, c) => 'ROYGBIV'[c] + (v ? Math.ceil(v * 1.4) : 3)).join(' ');
  return [`N Daily|S 1.5 ${y0} 1|G ${Math.min(cx + 2, 30.5)} ${cy - 1}|${geo}|I ${ink}`, sol];
}
