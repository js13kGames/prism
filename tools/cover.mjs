// Dev helper: node tools/cover.mjs [level# ...] — in-game cover candidates: the stored solution painted, captured
// at several seconds into play, world box only (no HUD), cropped to 16:10 → test-results/cover-L<n>-<t>s.png.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { SOLUTIONS } from '../test/solutions.js';
const levels = process.argv.slice(2).map(Number).filter(Boolean); if (!levels.length) levels.push(40, 30);
const srv = spawn('node', ['dev.js'], { env: { ...process.env, PORT: '8094' }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1700, height: 1080 }, deviceScaleFactor: 1 });
await p.goto('http://localhost:8094/'); await p.waitForTimeout(400);
for (const n of levels) {
  await p.evaluate(i => __prism.l(i), n - 1); await p.waitForSelector('[data-a=p]');
  await p.evaluate(s => __prism.s(s), SOLUTIONS[n - 1]);
  const [x0, y0] = await p.evaluate(() => __prism.t(0, 0)), [x1, y1] = await p.evaluate(() => __prism.t(32, 18));
  const h = y1 - y0, w = h * 1.6, x = x0 + (x1 - x0 - w) / 2; // 16:10 crop out of the 16:9 world box
  await p.click('[data-a=p]');
  let t = 0;
  for (const at of [1.2, 2.2, 3.2, 4.4, 6]) {
    await p.waitForTimeout((at - t) * 1000); t = at;
    await p.screenshot({ path: `test-results/cover-L${n}-${at}s.png`, clip: { x, y: y0, width: w, height: h } });
  }
}
await b.close(); srv.kill();
