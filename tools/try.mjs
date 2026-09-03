// Dev helper: node tools/try.mjs <level#|'level string'> '<solution JSON>' [--trace] [--every N]
import { parseLevel, createRun, step, mkStroke, strokeLen, TIMEOUT, DT } from '../src/sim.js';
import { LEVELS } from '../src/levels.js';
const a = process.argv.slice(2), TR = a.includes('--trace'), every = +(a[a.indexOf('--every') + 1]) || 6;
const L = parseLevel(/^\d+$/.test(a[0]) ? LEVELS[a[0] - 1] : a[0]);
const sol = JSON.parse(a[1] || '[]');
const run = createRun(L, sol.map(([c, p]) => mkStroke(c, p)));
let n = 0;
while (!step(run) && n < TIMEOUT / DT + 5) {
  n++; const u = run._u;
  if (TR && n % every == 0) console.log(`t=${run._t.toFixed(2)} x=${u._x.toFixed(2)} y=${u._y.toFixed(2)} vx=${u._vx.toFixed(1)} vy=${u._vy.toFixed(1)} d=${u._dir} g=${u._g}${u._climb ? ' climb' : ''}${u._gr ? ' gr' + u._surf : ''} m=${u._mask}`);
  for (const e of run._ev.splice(0)) if (TR) console.log(`  ev ${['touch','trigger','fling','crumble','fail','win','gate'][e[0]]} c${e[1]} @${e[2].toFixed(1)},${e[3].toFixed(1)}`);
}
const ink = [0,0,0,0,0,0,0]; for (const [c,p] of sol) ink[c] += strokeLen(p);
console.log(`${['play','WIN','FAIL'][run._state]} t=${run._t.toFixed(2)} at ${run._u._x.toFixed(2)},${run._u._y.toFixed(2)} ink=${ink.map((v,i)=>v?'ROYGBIV'[i]+v.toFixed(1):'').filter(Boolean).join(' ')} budget=${L._ink.map((v,i)=>v?'ROYGBIV'[i]+v:'').filter(Boolean).join(' ')}`);
