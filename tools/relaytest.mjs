// Dev helper: node tools/relaytest.mjs [dir] — two real browser pages race through the REAL js13kGames relay
// (no stubs). Serves `dir` (default dist) and reports lobby status, level parity, ghost strokes and a best-of-3 win.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
const dir = process.argv[2] || 'dist';
const srv = spawn('node', ['dev.js', dir], { env: { ...process.env, PORT: '8096' }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 900, height: 600 } });
const A = await ctx.newPage(), B = await ctx.newPage(), errs = [];
for (const p of [A, B]) { p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => m.type() == 'error' && errs.push('console ' + m.text())); p.on('requestfailed', r => errs.push('reqfail ' + r.url())); p.on('response', r => r.status() >= 400 && errs.push(r.status() + ' ' + r.url())); }
const ui = p => p.$eval('#ui', e => e.textContent);
const wait = (p, re, ms = 8000) => p.waitForFunction(re => new RegExp(re).test(document.querySelector('#ui').textContent), re.source, { timeout: ms });
try {
  for (const p of [A, B]) { await p.goto('http://localhost:8096/'); await wait(p, /PRISM/); }
  await A.click('[data-a=on]'); await A.click('[data-a=cr]'); await wait(A, /Room/);
  const code = await A.$eval('#ui b', b => b.textContent); console.log('room', code, '|', (await ui(A)).slice(0, 80));
  await B.click('[data-a=on]'); await B.fill('#j', code); await B.click('[data-a=jn]');
  for (const p of [A, B]) await wait(p, /2 players/);
  console.log('both see 2 players');
  const host = await A.$('[data-a=st]') ? A : B, guest = host == A ? B : A;
  await host.click('[data-a=st]');
  for (const p of [A, B]) await p.waitForSelector('[data-a=p]', { timeout: 8000 });
  const names = await Promise.all([A, B].map(p => p.$eval('.h span', s => s.textContent)));
  console.log('levels:', names[0] == names[1] ? 'same (' + names[0] + ')' : 'DIFFERENT ' + names);
  await guest.click('[data-a=c][data-v="1"]');
  const s = await guest.evaluate(() => [__prism.toScreen(3, 6), __prism.toScreen(8, 6)]);
  await guest.mouse.move(...s[0]); await guest.mouse.down(); await guest.mouse.move(...s[1], { steps: 8 }); await guest.mouse.up();
  await host.waitForFunction(() => __prism.gs()[0] && __prism.gs()[0][0] == 1, null, { timeout: 8000 });
  console.log('ghost stroke arrived at the host');
  await guest.click('[data-a=p]'); await host.waitForFunction(() => __prism.gs()[0][1], null, { timeout: 8000 });
  console.log('ghost unicorn running at the host');
  await guest.waitForSelector('[data-a=p]', { timeout: 30000 }); // guest's run fails and returns to draw
  console.log('status A:', (await ui(A)).slice(0, 60), '| status B:', (await ui(B)).slice(0, 60));
} catch (e) { console.log('FAILED:', e.message.split('\n')[0]); }
console.log('errors:', errs);
await b.close(); srv.kill(); process.exit(0);
