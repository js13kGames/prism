// Dev helper: node tools/shots.mjs — screenshots of the select grid and several levels (draw phase with the
// stored solution injected, then 1.2 s into play) into test-results/v2-*.png. Serves the repo root (unbundled src).
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { SOLUTIONS } from '../test/solutions.js';
const srv = spawn('node', ['dev.js'], { env: { ...process.env, PORT: '8093' }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1100, height: 700 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => (m.type() == 'error' || m.type() == 'warning') && errs.push(m.type() + ': ' + m.text()));
await p.goto('http://localhost:8093/'); await p.waitForTimeout(400);
await p.screenshot({ path: 'test-results/v2-title.png' });
await p.evaluate(() => localStorage.prism26_progress = JSON.stringify({ done: Array(12).fill(1), stars: [1, 0, 1, 1], snd: 1 }));
await p.reload(); await p.waitForTimeout(300);
await p.click('[data-a=go]'); await p.waitForTimeout(200); await p.screenshot({ path: 'test-results/v2-select.png' });
for (const n of (process.argv[2] || '5,9,18,21,26,30').split(',').map(Number)) {
  await p.evaluate(i => __prism.load(i), n - 1); await p.waitForTimeout(100);
  await p.evaluate(s => __prism.setStrokes(s), SOLUTIONS[n - 1]); await p.waitForTimeout(100);
  await p.screenshot({ path: `test-results/v2-L${n}-draw.png` });
  await p.click('[data-a=p]'); await p.waitForTimeout(+(process.argv[3] || 1200));
  await p.screenshot({ path: `test-results/v2-L${n}-play.png` });
  await p.waitForTimeout(6000);
  await p.screenshot({ path: `test-results/v2-L${n}-end.png` });
}
console.log('errors:', errs); await b.close(); srv.kill();
