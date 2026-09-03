// Suite A — Node, no deps. Usage:
//   node test/sim.test.js            run everything
//   node test/sim.test.js 7 9        run only levels 7 and 9
//   node test/sim.test.js 7 --trace  print the unicorn trajectory every 10 frames
import { parseLevel, createRun, step, hashState, mkStroke, strokeLen, inSolid, TIMEOUT, DT } from '../src/sim.js';
import { LEVELS } from '../src/levels.js';
import { SOLUTIONS } from './solutions.js';

const args = process.argv.slice(2), TRACE = args.includes('--trace');
const only = args.filter(a => /^\d+$/.test(a)).map(Number);
let fails = 0, warns = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('  FAIL ' + msg); } };
const warn = msg => { warns++; console.log('  warn ' + msg); };
const FEATURED = { 1: 1, 2: 0, 4: 2, 7: 3, 10: 4, 13: 5, 16: 6 };
const NAMES = 'red orange yellow green blue indigo violet'.split(' ');
const strokes = sol => sol.map(([c, p]) => mkStroke(c, p));

// Run until the state changes or the timeout passes; returns the run.
export function play(L, sol, trace) {
  const run = createRun(L, strokes(sol));
  let n = 0;
  while (!step(run) && n < TIMEOUT / DT + 5) {
    n++;
    if (trace && n % 10 == 0) {
      const u = run._u;
      console.log(`    t=${run._t.toFixed(2)} x=${u._x.toFixed(2)} y=${u._y.toFixed(2)} vx=${u._vx.toFixed(1)} vy=${u._vy.toFixed(1)} dir=${u._dir} g=${u._g}${u._climb ? ' climb' : ''}${u._gr ? ' gr' + u._surf : ''} mask=${u._mask}`);
    }
  }
  return run;
}

// Player-drawn strokes cannot pass through solids; sample each segment every 0.15 u.
function drawable(L, sol) {
  for (const [, p] of sol) for (let i = 2; i < p.length; i += 2) {
    const n = Math.ceil(strokeLen(p.slice(i - 2, i + 2)) / .15) || 1;
    for (let k = 0; k <= n; k++) if (inSolid(L, p[i - 2] + (p[i] - p[i - 2]) * k / n, p[i - 1] + (p[i + 1] - p[i - 1]) * k / n)) return 0;
  }
  return 1;
}

const starCount = { yes: 0, no: 0 };
const summary = [];
for (let i = 0; i < LEVELS.length; i++) {
  const n = i + 1;
  if (only.length && !only.includes(n)) continue;
  const L = parseLevel(LEVELS[i]), sol = SOLUTIONS[i] || [];
  console.log(`L${String(n).padStart(2, '0')} ${L._name}`);
  ok(L._rects.length >= 1 && L._ink.filter(Boolean).length >= 2, 'parse: needs ≥1 rect and ≥2 ink colours');
  ok(L._hint.length <= 40, 'hint > 40 chars');
  // 1 solvable
  const r = play(L, sol, TRACE);
  ok(r._state == 1, `solution did not win (state ${r._state}, t=${r._t.toFixed(2)}, x=${r._u._x.toFixed(1)}, y=${r._u._y.toFixed(1)})`);
  summary.push(`L${String(n).padStart(2, '0')} ${r._state == 1 ? 'win ' : 'FAIL'} ${r._t.toFixed(2)}s`);
  if (r._state == 1 && r._t < 1) warn('wins in < 1 s — trivially reachable gem?');
  // 2 not trivial
  const e = play(L, []);
  ok(e._state == 2, `empty paint did not fail (state ${e._state})`);
  // 3 ink legal
  const used = [0, 0, 0, 0, 0, 0, 0];
  for (const [c, p] of sol) used[c] += strokeLen(p);
  used.forEach((v, c) => { if (v) { ok(L._ink[c] > 0, `${NAMES[c]} used but locked`); ok(v <= L._ink[c] + 1e-9, `${NAMES[c]} ink ${v.toFixed(2)} > budget ${L._ink[c]}`); } });
  if (!drawable(L, sol)) warn('solution passes through solid geometry (player could not draw it)');
  // 4 featured colour
  if (FEATURED[n] != null && !used[FEATURED[n]]) warn(`featured colour ${NAMES[FEATURED[n]]} unused`);
  // 5 determinism
  const a = createRun(L, strokes(sol)), b = createRun(L, strokes(sol));
  let same = true;
  for (let k = 0; k < 1600 && !a._state; k++) { step(a); step(b); if (k % 30 == 0 && hashState(a) != hashState(b)) same = false; }
  ok(same && hashState(a) == hashState(b), 'determinism: two runs differ');
  const c4 = createRun(L, strokes(sol));
  while (!c4._state) for (let k = 0; k < 4; k++) step(c4);
  ok(hashState(c4) == hashState(a), 'determinism: batched stepping differs');
  // 6 star sanity
  const total = L._ink.reduce((s, v) => s + v, 0), ink = used.reduce((s, v) => s + v, 0);
  if (ink <= total * .6) starCount.yes++; else starCount.no++;
  console.log(`  ink ${ink.toFixed(1)}/${total} (${(100 * ink / total).toFixed(0)}%)${ink <= total * .6 ? ' ★' : ''}  ${r._state == 1 ? 'win' : 'fail'} at ${r._t.toFixed(2)}s, empty ${e._state == 2 ? 'fails' : 'WINS'} at ${e._t.toFixed(2)}s`);
}
if (!only.length) {
  console.log(`stars achievable on ${starCount.yes} levels, not on ${starCount.no}`);
  ok(starCount.yes > 0, 'no level can earn a star');
  if (starCount.yes < 12) warn('fewer than 12 levels can earn a star');
  if (starCount.no < 3) warn('fewer than 3 levels deny a star');
}

// Generator (optional module)
if (!only.length) try {
  const { gen } = await import('../src/gen.js');
  let gfails = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const [str, sol] = gen(seed, 1), L = parseLevel(str);
    const r = play(L, sol), e = play(L, []);
    const cols = new Set(sol.map(s => s[0]));
    const inWorld = L._rects.every(q => q._x >= 0 && q._y >= 0 && q._x + q._w <= 32 && q._y + q._h <= 18);
    const bad = r._state != 1 || e._state != 2 || cols.size < 3 || !inWorld || !drawable(L, sol);
    if (bad) { gfails++; console.log(`  gen seed ${seed}: win=${r._state == 1} (${r._t.toFixed(2)}s) emptyFails=${e._state == 2} colours=${cols.size} inWorld=${inWorld} drawable=${drawable(L, sol)}\n    ${str}`); }
    else if (TRACE) console.log(`  gen seed ${seed}: win ${r._t.toFixed(2)}s, ${cols.size} colours, ${str.length} chars`);
  }
  ok(!gfails, `${gfails} generator seeds failed`);
  console.log(`generator: 40 seeds${gfails ? ', ' + gfails + ' failed' : ' ok'}`);
} catch (e) { if (e.code != 'ERR_MODULE_NOT_FOUND') throw e; console.log('generator: not present'); }

console.log('\n' + summary.join('\n'));
console.log(`\n${fails} failures, ${warns} warnings`);
process.exit(fails ? 1 : 0);
