// Dev helper: node tools/gentrace.mjs <seed> [--every N] — run a generated level's reference solution with a trace.
import { parseLevel, createRun, step, mkStroke, TIMEOUT, DT } from '../src/sim.js';
import { gen } from '../src/gen.js';
const a = process.argv.slice(2), seed = +a[0], every = +(a[a.indexOf('--every') + 1]) || 10;
const [str, sol] = gen(seed), L = parseLevel(str);
console.log(str); console.log(JSON.stringify(sol));
const run = createRun(L, sol.map(([c, p]) => mkStroke(c, p)));
console.log('supported:', run._s.map(s => s._sup).join(''));
let n = 0;
while (!step(run) && n < TIMEOUT / DT + 5) {
  n++; const u = run._u;
  if (n % every == 0) console.log(`t=${run._t.toFixed(2)} x=${u._x.toFixed(2)} y=${u._y.toFixed(2)} vx=${u._vx.toFixed(1)} vy=${u._vy.toFixed(1)} d=${u._dir} g=${u._g}${u._climb ? ' climb' : ''}${u._gr ? ' gr' + u._surf : ''} fe=${u._fe} ph=${u._ph}`);
  for (const e of run._ev.splice(0)) console.log(`  ev ${['touch','trigger','fling','crumble','fail','win','gate','land'][e[0]]} c${e[1]} @${e[2].toFixed(1)},${e[3].toFixed(1)}`);
}
console.log(['play', 'WIN', 'FAIL'][run._state], 't=' + run._t.toFixed(2), 'at', run._u._x.toFixed(2), run._u._y.toFixed(2));
