// Dev: for each level, can a single short red (or any single-colour) dab win it? Sweeps position + tilt.
import { parseLevel, createRun, step, mkStroke, inSolid, TIMEOUT, DT } from '../src/sim.js';
import { LEVELS } from '../src/levels.js';
const ONLY = process.argv[2] ? +process.argv[2] : 0;
const runs = (L, strokes) => { const r = createRun(L, strokes); let n = 0; while (!step(r) && n < TIMEOUT / DT + 5) n++; return r._state == 1; };
for (let i = 0; i < LEVELS.length; i++) {
  if (ONLY && ONLY != i + 1) continue;
  const L = parseLevel(LEVELS[i]);
  const res = {};
  for (const c of [0, 1, 2, 3, 4, 5, 6]) {
    if (!L._ink[c]) continue;
    let wins = 0, tot = 0, first = null;
    const len = Math.min(2, L._ink[c]);
    for (let x = .5; x < 31.5; x += .5) for (let y = .5; y < 17.5; y += .5) for (const dy of [0, -.6, .6]) {
      const x1 = x + len, y1 = y + dy;
      if (c != 5 && (inSolid(L, x, y) || inSolid(L, x1, y1) || inSolid(L, (x + x1) / 2, (y + y1) / 2))) continue;
      tot++;
      if (runs(L, [mkStroke(c, [x, y, x1, y1])])) { wins++; if (!first) first = [x, y, x1, y1]; }
    }
    if (wins) res['ROYGBIV'[c]] = wins + '/' + tot + ' e.g.' + JSON.stringify(first);
  }
  console.log((i + 1) + ' ' + L._name.padEnd(12) + ' ' + (Object.keys(res).length ? Object.entries(res).map(([k, v]) => k + ':' + v).join('  ') : '-'));
}
