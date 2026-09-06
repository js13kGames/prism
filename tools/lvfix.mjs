// Dev: node tools/lvfix.mjs <level#> ['<replacement level string>'] — stored solution result + single-dab sweep per colour.
import { parseLevel, createRun, step, mkStroke, inSolid, TIMEOUT, DT } from '../src/sim.js';
import { LEVELS } from '../src/levels.js';
import { SOLUTIONS } from '../test/solutions.js';
const n = +process.argv[2], str = process.argv[3] || LEVELS[n - 1], L = parseLevel(str);
const runs = strokes => { const r = createRun(L, strokes); let k = 0; while (!step(r) && k < TIMEOUT / DT + 5) k++; return r; };
const s = runs(SOLUTIONS[n - 1].map(([c, p]) => mkStroke(c, p)));
console.log(`L${n} ${L._name}: stored solution ${['play', 'WIN', 'FAIL'][s._state]} t=${s._t.toFixed(2)}; empty ${['play', 'WIN', 'FAIL'][runs([])._state]}`);
for (const c of [0, 1, 2, 3, 4, 5, 6]) {
  if (!L._ink[c]) continue;
  let wins = 0, tot = 0, ex = [];
  const len = Math.min(2, L._ink[c]);
  for (let x = .5; x < 31.5; x += .5) for (let y = .5; y < 17.5; y += .5) for (const dy of [0, -.6, .6]) {
    const x1 = x + len, y1 = y + dy;
    if (c != 5 && (inSolid(L, x, y) || inSolid(L, x1, y1) || inSolid(L, (x + x1) / 2, (y + y1) / 2))) continue;
    tot++;
    if (runs([mkStroke(c, [x, y, x1, y1])])._state == 1) { wins++; if (ex.length < 3) ex.push([x, y, x1, y1]); }
  }
  console.log('  ' + 'ROYGBIV'[c] + ': ' + wins + '/' + tot + ' ' + JSON.stringify(ex));
}
