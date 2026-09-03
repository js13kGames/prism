// Appends the browser × test table from test-results/final-run-{1,2,3}.log to SUBMISSION.md. node tools/finalize.mjs
import fs from 'fs';
const runs = [1, 2, 3].map(i => fs.readFileSync(`test-results/final-run-${i}.log`, 'utf8'));
const rows = new Map();
for (const [ri, log] of runs.entries()) for (const m of log.matchAll(/^\s+(chromium|firefox) ([a-z0-9-]+): (.*)$/gm)) {
  const k = m[1] + ' ' + m[2]; if (!rows.has(k)) rows.set(k, []); rows.get(k)[ri] = /^pass/.test(m[3]) ? 'pass' : 'FAIL';
}
const exits = runs.map(l => (l.match(/exit=(\d+)/) || [])[1]), passed = runs.map(l => (l.match(/(\d+\/\d+) passed/) || [])[1]);
let t = '| browser | test | run 1 | run 2 | run 3 |\n|---|---|---|---|---|\n';
for (const [k, v] of rows) { const [b, s] = k.split(' '); t += `| ${b} | ${s} | ${v[0] || '?'} | ${v[1] || '?'} | ${v[2] || '?'} |\n`; }
t += `\nRun totals: ${passed.join(', ')} (exit codes ${exits.join(', ')}).\n`;
let sub = fs.readFileSync('SUBMISSION.md', 'utf8');
sub = sub.replace(/See below \(appended automatically after the runs\)\.\n?/, t);
fs.writeFileSync('SUBMISSION.md', sub);
console.log(t);
const bad = [...rows.values()].some(v => v.some(x => x != 'pass')) || exits.some(e => e != '0');
console.log(bad ? 'SOME RUNS FAILED' : 'all three runs green');
process.exit(bad ? 1 : 0);
