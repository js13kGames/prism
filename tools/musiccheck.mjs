// Dev helper: node tools/musiccheck.mjs — boots the built page, plays level 1, and reports audio-node activity + errors.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
const srv = spawn('node', ['dev.js', process.argv[2] || 'dist'], { env: { ...process.env, PORT: '8097' }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }), p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => (m.type() == 'error' || m.type() == 'warning') && errs.push(m.type() + ': ' + m.text()));
await p.addInitScript(() => { window.__osc = 0; const o = AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator = function () { window.__osc++; return o.call(this); }; });
await p.goto('http://localhost:8097/'); await p.waitForTimeout(300);
await p.click('[data-a=go]'); await p.waitForTimeout(1500);
const calm = await p.evaluate(() => __osc);
await p.click('[data-a=lv][data-v="0"]'); await p.evaluate(() => __prism.setStrokes([[1, [10, 12, 22, 12]]])); await p.click('[data-a=p]');
await p.waitForTimeout(2000); const lively = await p.evaluate(() => __osc) - calm;
await p.waitForSelector('.t h2', { timeout: 10000 }); await p.waitForTimeout(300);
console.log(`oscillators in 1.5 s calm: ${calm}, in 2 s lively: ${lively}, total: ${await p.evaluate(() => __osc)}, ctx state: ${await p.evaluate(() => typeof AudioContext)} | errors:`, errs);
await b.close(); srv.kill();
