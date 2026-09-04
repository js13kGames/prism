// Plays level 1 inside the Wavedash sandbox SDK (`wavedash dev`) with Playwright and prints everything the
// page and the SDK log, so the achievement / leaderboard calls can be checked against the real SDK before
// publishing. Needs dist/wavedash/index.html (node build.js) and WAVEDASH_TOKEN in the environment.
//   node tools/wavedash-sandbox.mjs
import { spawn } from 'child_process';
import { chromium } from 'playwright';
import { SOLUTIONS } from '../test/solutions.js';

const dev = spawn('wavedash', ['dev', '--no-open'], { shell: true });
const url = await new Promise((res, rej) => {
  let out = '';
  dev.stdout.on('data', d => { out += d; const m = out.match(/https?:\/\/localhost:\d+/); if (m) res(m[0]); });
  dev.stderr.on('data', d => process.stderr.write(d));
  setTimeout(() => rej(new Error('wavedash dev printed no URL:\n' + out)), 20000);
});
console.log('sandbox at', url);
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', m => console.log(`  [${m.type()}] ${m.text().slice(0, 300)}`));
page.on('pageerror', e => console.log('  [pageerror] ' + e.message));
try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'test-results/wavedash-sandbox-boot.png' });
  // The game may be the page itself or inside an iframe; find whichever frame has the #ui element.
  let fr;
  for (let i = 0; i < 40 && !fr; i++) { for (const f of page.frames()) if (await f.$('#ui').catch(() => null)) fr = f; if (!fr) await new Promise(r => setTimeout(r, 500)); }
  if (!fr) throw new Error('game frame not found; frames: ' + page.frames().map(f => f.url()).join(', '));
  console.log('game frame:', fr.url());
  await fr.waitForFunction(() => /PRISM/.test(document.querySelector('#ui').textContent), null, { timeout: 15000 });
  console.log('SDK present in frame:', await fr.evaluate(() => typeof self.Wavedash + ' initialized=' + (self.Wavedash && self.Wavedash.initialized)));
  await fr.evaluate(() => __prism.load(0)); await fr.waitForSelector('[data-a=p]');
  await fr.evaluate(s => __prism.setStrokes(s), SOLUTIONS[0]);
  await fr.click('[data-a=p]'); await fr.waitForSelector('.t h2', { timeout: 16000 });
  console.log('level 1 won');
  await new Promise(r => setTimeout(r, 2500));
  console.log('achievement gem on SDK:', await fr.evaluate(() => { try { return self.Wavedash.getAchievement('gem'); } catch (e) { return 'err ' + e.message; } }));
  console.log('leaderboards:', await fr.evaluate(async () => { try { const r = await self.Wavedash.getLeaderboard('levels'); return JSON.stringify(r).slice(0, 300); } catch (e) { return 'err ' + e.message; } }));
  console.log('my entries:', await fr.evaluate(async () => { try { const l = await self.Wavedash.getLeaderboard('levels'); const r = await self.Wavedash.getMyLeaderboardEntries(l.data.id); return JSON.stringify(r).slice(0, 300); } catch (e) { return 'err ' + e.message; } }));
  await page.screenshot({ path: 'test-results/wavedash-sandbox-win.png' });
} catch (e) { console.log('FAILED: ' + e.message); }
await browser.close();
dev.kill(); process.exit(0);
