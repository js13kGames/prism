import { chromium } from 'playwright';
import { spawn } from 'child_process';
const srv = spawn('node', ['dev.js'], { env: { ...process.env, PORT: '8091' }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 520 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() == 'error' && errs.push(m.text()));
await p.goto('http://localhost:8091/tools/uni.html#' + (process.argv[2] || '0.1')); await p.waitForTimeout(400);
await p.screenshot({ path: 'test-results/uni.png' });
console.log('errors:', errs); await b.close(); srv.kill();
