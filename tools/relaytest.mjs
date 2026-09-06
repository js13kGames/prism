// Dev helper: node tools/relaytest.mjs [dir] — real browser pages through the REAL js13kGames relay (no stubs).
// Serves `dir` (default dist) and checks, against the live relay: a room by code where the creator is the host and
// the guest joins; a quick match that pairs two strangers into a private room and starts round 1 on its own, while
// a third stays in the queue; and that the winner's replay reaches the other page. Reports every console error.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
const dir = process.argv[2] || 'dist';
const srv = spawn('node', ['dev.js', dir], { env: { ...process.env, PORT: '8096' }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 900, height: 600 } });
const pages = [], errs = [];
const newPage = async () => {
  const p = await ctx.newPage(); pages.push(p);
  p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => m.type() == 'error' && errs.push('console ' + m.text()));
  p.on('requestfailed', r => errs.push('reqfail ' + r.url())); p.on('response', r => r.status() >= 400 && errs.push(r.status() + ' ' + r.url()));
  await p.goto('http://localhost:8096/'); await wait(p, /PRISM/); await p.click('[data-a=on]');
  return p;
};
const ui = p => p.$eval('#ui', e => e.textContent);
const wait = (p, re, ms = 10000) => p.waitForFunction(re => new RegExp(re).test(document.querySelector('#ui').textContent), re.source, { timeout: ms });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg); if (!ok) errs.push(msg); };
try {
  console.log('1. room by code');
  const A = await newPage(), B = await newPage();
  await A.click('[data-a=cr]'); await wait(A, /Room/);
  const code = await A.$eval('#ui b', b => b.textContent); console.log('  room', code);
  await sleep(1500); // the creator has been in the room a while, as in real life
  await B.fill('#j', code); await B.click('[data-a=jn]');
  for (const p of [A, B]) await wait(p, /2 players/);
  check(!!await A.$('[data-a=st]') && !await B.$('[data-a=st]'), 'the creator is the host, the joiner is not');
  await A.click('[data-a=st]');
  for (const p of [A, B]) await p.waitForSelector('[data-a=p]', { timeout: 10000 });
  const names = await Promise.all([A, B].map(p => p.$eval('.h span', s => s.textContent)));
  check(names[0] == names[1], 'both got the same level (' + names[0] + ')');
  await B.click('[data-a=bk]'); // B is in the HUD: ‹ leaves the room
  await A.waitForFunction(() => !__prism.g().length, null, { timeout: 10000 }); // the relay's '-id' removed the guest
  check(true, 'the host sees the guest leave (peer list empty)');
  await A.click('[data-a=bk]');

  console.log('2. quick match');
  const C = await newPage(), D = await newPage(), E = await newPage();
  await C.click('[data-a=qk]'); await wait(C, /Looking for a rival/);
  await sleep(1500);
  check(!/Round/.test(await ui(C)), 'first in the queue waits');
  await D.click('[data-a=qk]');
  for (const p of [C, D]) await wait(p, /Round 1/);
  for (const p of [C, D]) await p.waitForSelector('[data-a=p]', { timeout: 10000 });
  const rooms = await Promise.all([C, D].map(p => p.evaluate(() => __prism.r)));
  check(rooms[0] == rooms[1] && rooms[0] != 'QUIK', 'the pair moved to the same private room (' + rooms[0] + ')');
  const n2 = await Promise.all([C, D].map(p => p.$eval('.h span', s => s.textContent)));
  check(n2[0] == n2[1] && /Round 1 · 0–0/.test(n2[0]), 'same level, round 1 tag (' + n2[0] + ')');
  await E.click('[data-a=qk]'); await wait(E, /Looking for a rival/);
  await sleep(2000);
  check(!/Round/.test(await ui(E)) && (await C.evaluate(() => __prism.g())).length == 1, 'a third player waits alone and the pair never see them');
  await E.click('[data-a=lv0]');
  // In-round presence: D learns that C is running, and nothing else.
  await C.click('[data-a=p]');
  await wait(D, /rival racing/);
  check(true, 'D sees C running (presence only, no paint: gs=' + JSON.stringify(await D.evaluate(() => __prism.g())) + ')');
} catch (e) { console.log('FAILED:', e.message.split('\n')[0]); errs.push(e.message); }
console.log('errors:', errs.length ? errs : 'none');
await b.close(); srv.kill(); process.exit(errs.length ? 1 : 0);
