// Dev helper: scan solution parameters. The solution is a JS expression using the parameter names.
// node tools/scan.mjs '<level# or string>' '[[0,[a,12.5,a+1.5,12.5]]]' 'a=6:9:0.5' 'b=12:14:0.5' [--all]
import { parseLevel, createRun, step, mkStroke, strokeLen, TIMEOUT, DT } from '../src/sim.js';
import { LEVELS } from '../src/levels.js';
const a = process.argv.slice(2), ALL = a.includes('--all');
const L = parseLevel(/^\d+$/.test(a[0]) ? LEVELS[a[0] - 1] : a[0]);
const tmpl = a[1], ranges = a.slice(2).filter(r => r.includes('=')).map(r => { const [k, v] = r.split('='); const [lo, hi, st] = v.split(':').map(Number); return [k, lo, hi, st || 1]; });
const fn = new Function(...ranges.map(r => r[0]), 'return ' + tmpl);
let wins = 0, total = 0;
function rec(i, vals) {
  if (i == ranges.length) {
    const sol = fn(...vals), run = createRun(L, sol.map(([c, p]) => mkStroke(c, p)));
    let n = 0; while (!step(run) && n < TIMEOUT / DT + 5) n++;
    const ink = sol.reduce((t, [, p]) => t + strokeLen(p), 0); total++; if (run._state == 1) wins++;
    if (ALL || run._state == 1) console.log(`${ranges.map(([k], j) => k + '=' + vals[j]).join(' ')}  ${['play', 'WIN ', 'fail'][run._state]} t=${run._t.toFixed(2)} at ${run._u._x.toFixed(1)},${run._u._y.toFixed(1)} ink=${ink.toFixed(1)} mask=${run._u._mask}`);
    return;
  }
  const [, lo, hi, st] = ranges[i];
  for (let v = lo; v <= hi + 1e-9; v += st) rec(i + 1, [...vals, +v.toFixed(3)]);
}
rec(0, []);
console.log(`${wins}/${total} win`);
