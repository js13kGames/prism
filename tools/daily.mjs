// Dev helper: screenshot the Daily level and a few seeds. node tools/daily.mjs
import { chromium } from 'playwright';
import { spawn } from 'child_process';
const srv = spawn('node', ['dev.js'], { env: { ...process.env, PORT: '8091' }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 900, height: 600 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() == 'error' && errs.push(m.text()));
await p.goto('http://localhost:8091/'); await p.click('[data-a=dy]'); await p.waitForSelector('[data-a=p]');
await p.screenshot({ path: 'test-results/dev-daily.png' });
console.log('daily hud:', await p.$eval('.h span', s => s.textContent), 'errors:', errs);
await b.close(); srv.kill();
