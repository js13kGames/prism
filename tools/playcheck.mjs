import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
const srv = spawn('node', ['dev.js'], { env: { ...process.env, PORT: '8093' }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 900, height: 600 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() == 'error' && errs.push(m.text()));
await p.goto('http://localhost:8093/tools/play.html#19'); await p.waitForTimeout(500);
await p.click('#solve'); await p.waitForTimeout(200);
console.log('play.html status:', await p.$eval('#st', s => s.textContent), '| errors:', errs);
// file:// check of the shipped page
const p2 = await b.newPage(); const e2 = []; p2.on('pageerror', e => e2.push(e.message)); p2.on('console', m => m.type() == 'error' && e2.push(m.text()));
await p2.goto('file:///' + path.resolve('dist/index.html').split(path.sep).join('/')); await p2.waitForTimeout(500);
await p2.click('[data-a=go]'); await p2.click('[data-a=lv][data-v="0"]'); await p2.waitForSelector('[data-a=p]');
console.log('file:// boot + level 1 open ok | errors:', e2);
await b.close(); srv.kill();
