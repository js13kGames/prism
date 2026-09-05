// Suite B — Playwright, chromium + firefox, against the UNZIPPED dist/prism.zip (the js13k competition build),
// plus dist/wavedash/index.html (the Wavedash build, `node build.js --wavedash`) for the platform tests.
// Usage: node test/browser.test.js [chromium|firefox] [--quick] [--only <test>] [--repeat N]
//   quick: skip the all-levels run; only: run one named test; repeat: run the selection N times
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import zlib from 'zlib';
import { chromium, firefox } from 'playwright';
import { SOLUTIONS } from './solutions.js';
import { startRelay } from './relay.js';
import { gen } from '../src/gen.js';

const args = process.argv.slice(2), QUICK = args.includes('--quick'), ONLY = args[args.indexOf('--only') + 1], REPEAT = +args[args.indexOf('--repeat') + 1] || 1;
const BROWSERS = args.filter(a => /^(chromium|firefox)$/.test(a));
if (!BROWSERS.length) BROWSERS.push('chromium', 'firefox');
fs.mkdirSync('test-results', { recursive: true });

// --- unzip dist/prism.zip with a minimal reader (local header + inflateRaw) into a temp dir ---
const zip = fs.readFileSync('dist/prism.zip');
if (zip.readUInt32LE(0) != 0x04034b50) throw new Error('not a zip');
const method = zip.readUInt16LE(8), csize = zip.readUInt32LE(18), nlen = zip.readUInt16LE(26), elen = zip.readUInt16LE(28);
const fname = zip.toString('utf8', 30, 30 + nlen), start = 30 + nlen + elen, body = zip.subarray(start, start + csize);
if (fname != 'index.html') throw new Error('first entry is ' + fname);
const html = method == 8 ? zlib.inflateRawSync(body) : body;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-'));
fs.writeFileSync(path.join(dir, 'index.html'), html);
// A host page that embeds the game, the way a platform (Wavedash) serves it.
const FRAME = '<!doctype html><style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style><iframe src=index.html></iframe>';
fs.writeFileSync(path.join(dir, 'frame.html'), FRAME);
console.log(`unzipped ${fname} (${html.length} bytes, method ${method}) to ${dir}`);
// The Wavedash build (node build.js --wavedash) is a separate file with the platform code in; it is served
// under /wd/ so the platform tests can run against it. Without it those tests are skipped, not failed.
const WDHTML = fs.existsSync('dist/wavedash/index.html') ? fs.readFileSync('dist/wavedash/index.html') : null;
if (WDHTML) {
  fs.mkdirSync(path.join(dir, 'wd'));
  fs.writeFileSync(path.join(dir, 'wd', 'index.html'), WDHTML);
  fs.writeFileSync(path.join(dir, 'wd', 'frame.html'), FRAME);
  console.log(`Wavedash build: dist/wavedash/index.html (${WDHTML.length} bytes) served at /wd/`);
} else console.log('no dist/wavedash/index.html — platform tests will be skipped (node build.js --wavedash)');

// --- static server ---
const srv = http.createServer((q, s) => {
  const f = path.join(dir, q.url.split('?')[0].replace(/\/$/, '/index.html').replace(/^\//, ''));
  fs.readFile(f, (e, d) => { s.writeHead(e ? 404 : 200, { 'Content-Type': 'text/html' }); s.end(e ? '404' : d); });
}).listen(0);
await new Promise(r => srv.on('listening', r));
const URL = `http://localhost:${srv.address().port}/`;

const results = [], allWarnings = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runBrowser(name) {
  const bt = name == 'chromium' ? chromium : firefox;
  let browser;
  try { browser = await bt.launch(); } catch (e) {
    // On this Windows box the Playwright Firefox build fails with a side-by-side (SxS) loader error when run from
    // %LOCALAPPDATA%\ms-playwright, but the same files run from a short path. Copy it once and retry (see DECISIONS.md).
    const alt = process.env.PRISM_FIREFOX || (process.platform == 'win32' && name == 'firefox' ? 'C:/ffpw/firefox/firefox.exe' : '');
    try {
      if (alt && !fs.existsSync(alt)) fs.cpSync(path.dirname(bt.executablePath()), path.dirname(alt), { recursive: true });
      browser = await bt.launch({ executablePath: alt });
      console.log('  (launched from fallback path ' + alt + ')');
    } catch (e2) { results.push([name, 'launch', 'FAIL: ' + e.message.split('\n')[0]]); return; }
  }
  const shots = (page, step) => page.screenshot({ path: `test-results/${name}-${step}.png` }).catch(() => { });

  // Each test gets a fresh page (and context options), console errors fail it.
  async function test(step, fn, ctxOpts = {}, route) {
    if (args.includes('--only') && step != ONLY) return;
    for (let rep = 0; rep < REPEAT; rep++) await test1(step, fn, ctxOpts, route);
  }
  async function test1(step, fn, ctxOpts, route) {
    const ctx = await browser.newContext(ctxOpts).catch(e => null);
    if (!ctx) { results.push([name, step, 'SKIP (context)']); return; }
    const page = await ctx.newPage(), errors = [];
    page.on('console', m => { if (m.type() == 'error') errors.push(m.text()); else if (m.type() == 'warning') allWarnings.push(`${name}/${step}: ${m.text()}`); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    if (route) await ctx.route('**/*', route);
    let status = 'pass';
    try { await fn(page, ctx); } catch (e) { status = 'FAIL: ' + e.message.split('\n')[0].slice(0, 160); }
    if (errors.length) status = (status == 'pass' ? 'FAIL: ' : status + ' | ') + 'console: ' + errors.join(' / ').slice(0, 300);
    await shots(page, step + '-end');
    results.push([name, step, status]);
    console.log(`  ${name} ${step}: ${status}`);
    await ctx.close();
  }
  const boot = async page => { await page.goto(URL); await page.waitForFunction(() => /PRISM/.test(document.querySelector('#ui').textContent), null, { timeout: 10000 }); };
  const openLevel = async (page, n) => { await page.click('[data-a=go]'); await page.click(`[data-a=lv][data-v="${n}"]`); await page.waitForSelector('[data-a=p]'); };
  const drag = async (page, pts, touch) => {
    const s = await Promise.all(pts.map(([x, y]) => page.evaluate(([x, y]) => __prism.toScreen(x, y), [x, y])));
    if (touch && name == 'chromium') { // real touch input through CDP
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: s[0][0], y: s[0][1] }] });
      for (const [x, y] of s.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else if (touch) { // firefox: dispatched pointer events of type touch
      await page.evaluate(pts => {
        const cv = document.querySelector('#c'), ev = (t, [x, y], extra) => cv.dispatchEvent(new PointerEvent(t, { pointerType: 'touch', pointerId: 7, isPrimary: true, bubbles: true, clientX: x, clientY: y, ...extra }));
        ev('pointerdown', pts[0], { buttons: 1 });
        for (const p of pts.slice(1)) ev('pointermove', p, { buttons: 1 });
        ev('pointerup', pts[pts.length - 1]);
      }, s);
    } else {
      await page.mouse.move(...s[0]); await page.mouse.down();
      for (const p of s.slice(1)) await page.mouse.move(...p);
      await page.mouse.up();
    }
  };
  const line = (x0, y0, x1, y1, n = 10) => [...Array(n + 1)].map((_, i) => [x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]);
  const waitWin = page => page.waitForSelector('.t h2', { timeout: 16000 });
  const inkWidth = (page, c) => page.$eval('#i' + c, b => parseFloat(b.style.width));

  await test('boot', async page => { await boot(page); await shots(page, 'title'); });

  await test('screens', async page => {
    await boot(page);
    await page.click('[data-a=go]'); await page.waitForSelector('.a'); await shots(page, 'select');
    await page.click('[data-a=lv][data-v="0"]'); await page.waitForSelector('[data-a=p]'); await shots(page, 'draw');
    await page.click('[data-a=bk]'); await page.waitForSelector('.a');
    await page.click('[data-a=bk]'); await page.waitForSelector('[data-a=go]');
    await page.click('[data-a=on]'); await page.waitForSelector('[data-a=bk]'); await shots(page, 'lobby');
    await page.click('[data-a=bk]'); await page.waitForSelector('[data-a=go]');
  });

  await test('level1-input', async page => {
    await boot(page); await openLevel(page, 0);
    await page.click('[data-a=c][data-v="1"]');
    await drag(page, line(10, 12, 22, 12));
    if (!await page.evaluate(() => __prism.strokes.length)) throw new Error('no stroke recorded');
    await page.click('[data-a=p]'); await shots(page, 'play');
    await waitWin(page);
    const prog = await page.evaluate(() => JSON.parse(localStorage.prism26_progress));
    if (!prog.done[0]) throw new Error('progress not saved: ' + JSON.stringify(prog));
    await page.click('[data-a=nx]'); await page.waitForSelector('[data-a=p]');
  });

  await test('undo-clear-ink', async page => {
    await boot(page); await openLevel(page, 0);
    await page.click('[data-a=c][data-v="1"]');
    const w0 = await inkWidth(page, 1);
    await drag(page, line(10, 12, 16, 12));
    const w1 = await inkWidth(page, 1);
    if (!(w1 < w0)) throw new Error(`ink bar did not shrink (${w0} → ${w1})`);
    await page.click('[data-a=u]'); if (await inkWidth(page, 1) != w0) throw new Error('undo did not restore ink');
    await drag(page, line(10, 12, 16, 12)); await drag(page, line(10, 11, 14, 10));
    await page.click('[data-a=x]'); if (await inkWidth(page, 1) != w0) throw new Error('clear did not restore ink');
    if (await page.evaluate(() => __prism.strokes.length)) throw new Error('clear left strokes');
  });

  if (!QUICK) await test('all-levels', async page => {
    await boot(page);
    for (let i = 0; i < SOLUTIONS.length; i++) {
      await page.evaluate(i => __prism.load(i), i);
      await page.waitForSelector('[data-a=p]');
      await page.evaluate(s => __prism.setStrokes(s), SOLUTIONS[i]);
      await page.click('[data-a=p]');
      const t0 = Date.now();
      try { await waitWin(page); } catch (e) { await shots(page, `level${i + 1}-fail`); throw new Error(`level ${i + 1} did not win`); }
      console.log(`    level ${i + 1} won in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      if (i == SOLUTIONS.length - 1) await shots(page, 'last-level-win');
    }
    const prog = await page.evaluate(() => JSON.parse(localStorage.prism26_progress));
    if (prog.done.filter(Boolean).length != SOLUTIONS.length) throw new Error('not all levels marked done');
  });

  await test('fail-path', async page => {
    await boot(page); await page.evaluate(() => __prism.load(3)); await page.waitForSelector('[data-a=p]');
    await page.click('[data-a=p]'); await page.waitForSelector('[data-a=r]');
    await page.waitForFunction(() => __prism.run && __prism.run.s === undefined ? true : true); // run object exists
    await page.waitForSelector('[data-a=p]', { timeout: 8000 }); // back in draw phase after the fail flash
    await shots(page, 'fail');
    if (!await page.$('[data-a=c]')) throw new Error('palette missing after fail');
  });

  const mobile = name == 'chromium' ? { hasTouch: true, isMobile: true } : { hasTouch: true };
  await test('mobile-portrait', async page => {
    await boot(page); await openLevel(page, 0);
    await page.click('[data-a=c][data-v="1"]');
    await drag(page, line(10, 12, 22, 12), true);
    if (!await page.evaluate(() => __prism.strokes.length)) throw new Error('touch stroke not recorded');
    await shots(page, 'mobile-draw');
    await page.click('[data-a=p]'); await waitWin(page);
    if (await page.evaluate(() => scrollY)) throw new Error('page scrolled');
    const hs = await page.$$eval('.k', bs => bs.map(b => b.getBoundingClientRect().height));
    if (hs.some(h => h < 44)) throw new Error('palette buttons < 44px: ' + hs);
  }, { viewport: { width: 390, height: 844 }, ...mobile });

  await test('mobile-landscape', async page => {
    await boot(page);
    // The level grid (8 act rows) is taller than a landscape phone. The menu has to scroll so that its Back
    // button can be reached, instead of centring and losing both ends off screen (the original bug).
    await page.click('[data-a=go]'); await page.waitForSelector('.a');
    const t = await page.evaluate(() => { const b = document.querySelector('.t [data-a=bk]'), t = document.querySelector('.t'); const r0 = b.getBoundingClientRect(); b.scrollIntoView(); const r = b.getBoundingClientRect(); return { before: r0.bottom, after: [r.top, r.bottom], scrollable: t.scrollHeight > t.clientHeight, ih: innerHeight }; });
    if (!t.scrollable) throw new Error('level grid overlay is not scrollable in landscape: ' + JSON.stringify(t));
    if (t.after[0] < 0 || t.after[1] > t.ih) throw new Error('level grid Back button unreachable in landscape: ' + JSON.stringify(t));
    await page.mouse.wheel(0, 200); await sleep(200);
    if (!await page.evaluate(() => document.querySelector('.t').scrollTop)) throw new Error('level grid did not scroll');
    await shots(page, 'mobile-landscape-select');
    await page.click('[data-a=bk]'); await page.waitForSelector('[data-a=go]');
    await page.evaluate(() => __prism.load(1)); await page.waitForSelector('[data-a=p]');
    await page.evaluate(s => __prism.setStrokes(s), SOLUTIONS[1]);
    await page.click('[data-a=p]'); await waitWin(page);
  }, { viewport: { width: 844, height: 390 }, ...mobile });

  await test('offline-lobby', async (page, ctx) => {
    await boot(page); await ctx.setOffline(true);
    await page.click('[data-a=on]'); await page.waitForSelector('[data-a=bk]');
    if (await page.$('[data-a=cr]')) await page.click('[data-a=cr]');
    await page.waitForFunction(() => /offline|unavailable|not available|failed|error|blocked|TODO|relay/i.test(document.querySelector('#ui').textContent), null, { timeout: 5000 });
    await shots(page, 'lobby-offline');
    await page.click('[data-a=bk]'); await page.waitForSelector('[data-a=go]');
  }, {}, route => { const u = route.request().url(); return u.startsWith(URL) ? route.continue() : route.abort(); });

  // Two pages race through an in-process relay (test/relay.js) so the test is hermetic; tools/relaytest.mjs hits the real one.
  await test('online-race', async (page, ctx) => {
    const relay = await startRelay();
    const page2 = await ctx.newPage();
    page2.on('pageerror', e => { throw new Error('page2 error: ' + e.message); });
    let spy;
    try {
      for (const p of [page, page2]) { await boot(p); await p.evaluate(u => __prism.net.url = u, `ws://localhost:${relay.port}/{room}`); }
      // The host has played a level before going online: the lobby must not mistake that level for a live round.
      await openLevel(page, 0); await page.click('[data-a=bk]'); await page.click('[data-a=bk]'); await page.waitForSelector('[data-a=on]');
      const at = (label, pr) => pr.catch(e => { throw new Error(label + ': ' + String(e.message).slice(0, 100)); });
      await page.click('[data-a=on]'); await page.click('[data-a=cr]');
      await at('room created', page.waitForFunction(() => /Room/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 }));
      const code = await page.$eval('#ui b', b => b.textContent);
      if (await page.$('[data-a=st]')) throw new Error('a host alone in the room can press Start');
      await page2.click('[data-a=on]'); await page2.fill('#j', code); await page2.click('[data-a=jn]');
      for (const p of [page, page2]) await at('2 players', p.waitForFunction(() => /2 players/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 }));
      await shots(page, 'lobby-2players');
      if (await page.$('[data-a=p]') || await page2.$('[data-a=p]')) throw new Error('a level HUD is showing before the host pressed Start');
      const host = await page.$('[data-a=st]') ? page : page2, guest = host == page ? page2 : page;
      if (await guest.$('[data-a=st]')) throw new Error('both pages think they are host');
      if (host != page) throw new Error('the player who created the room is not the host'); // seniority, not a random id
      await host.click('[data-a=st]');
      const txt = p => p.$eval('#ui', u => u.textContent);
      for (const p of [page, page2]) await at('round 1 card', p.waitForFunction(() => /Round 1/.test(document.querySelector('#ui').textContent), null, { timeout: 3000 }));
      if (!/First to three rounds/.test(await txt(host))) throw new Error('round 1 card does not say best of five: ' + await txt(host));
      await shots(host, 'race-round-card');
      for (const p of [page, page2]) await p.waitForSelector('[data-a=p]', { timeout: 5000 });
      const names = await Promise.all([page, page2].map(p => p.$eval('.h span', s => s.textContent)));
      if (names[0] != names[1]) throw new Error('players got different levels: ' + names);
      if (!/Round 1 · 0–0/.test(names[0])) throw new Error('HUD has no round/score tag: ' + names[0]);

      // Drawing and running must reveal nothing: the host may learn that a rival is running, never their paint.
      await guest.click('[data-a=c][data-v="1"]');
      await drag(guest, line(.5, 2, 2.5, 2)); // sky above the start platform: never geometry in generated levels
      await guest.click('[data-a=p]');
      await at('rival racing', host.waitForFunction(() => /rival racing/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 }));
      const leaked = await host.evaluate(() => __prism.gs());
      if (leaked.some(g => g[0] || g[1])) throw new Error('rival paint leaked mid-round: ' + JSON.stringify(leaked));

      // A third client wins the round. Only now may its paint arrive, and it arrives as a running replay.
      spy = new WebSocket(`ws://localhost:${relay.port}/prism26-${code}`);
      await at('spy connected', new Promise((res, rej) => { spy.onopen = res; spy.onerror = () => rej(new Error('spy socket failed')); }));
      spy.send(JSON.stringify(['w', 'zzzz', 4.25, [[1, [10, 12, 16, 12]]]])); // 'zzzz' sorts last, so the host stays host
      for (const p of [page, page2]) {
        await at('round result', p.waitForFunction(() => /Round lost/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 }));
        if (!/You 0 – 1 Rival/.test(await txt(p))) throw new Error('result screen has no score: ' + await txt(p));
        const gs = await p.evaluate(() => __prism.gs());
        if (!gs.some(g => g[0] == 1 && g[1])) throw new Error('winner replay missing: ' + JSON.stringify(gs));
      }
      if (await guest.$('[data-a=st]')) throw new Error('guest was offered the round button');
      if (!/Waiting for the host/.test(await txt(guest))) throw new Error('guest was not told to wait');
      await sleep(300); await shots(host, 'race-result');

      await host.click('[data-a=st]'); // Next round
      for (const p of [page, page2]) await at('round 2 card', p.waitForFunction(() => /Round 2/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 }));
      if (!/You 0 – 1 Rival/.test(await txt(host))) throw new Error('round 2 card lost the score: ' + await txt(host));
      for (const p of [page, page2]) await p.waitForSelector('[data-a=p]', { timeout: 5000 });

      // Best of five: a second win only makes it 0–2; the third decides the match, the card says so and offers a
      // rematch, and the rematch starts a fresh round 1 with the score back to nil on both sides.
      spy.send(JSON.stringify(['w', 'zzzz', 3.5, [[1, [10, 12, 16, 12]]]]));
      for (const p of [page, page2]) await at('round 2 result', p.waitForFunction(() => /Round lost/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 }));
      if (/take the match/.test(await txt(host))) throw new Error('two wins decided a best-of-five match');
      await host.click('[data-a=st]'); // Next round
      for (const p of [page, page2]) await at('round 3 card', p.waitForFunction(() => /Round 3/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 }));
      for (const p of [page, page2]) await p.waitForSelector('[data-a=p]', { timeout: 5000 });
      spy.send(JSON.stringify(['w', 'zzzz', 3.5, [[1, [10, 12, 16, 12]]]]));
      for (const p of [page, page2]) await at('match result', p.waitForFunction(() => /take the match/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 }));
      if (!/You 0 – 3 Rival/.test(await txt(host))) throw new Error('match card lost the score: ' + await txt(host));
      for (const p of [page, page2]) if (!await p.$('[data-a=rm]')) throw new Error('not everyone was offered a rematch: ' + await txt(p));
      await shots(host, 'race-match-end');
      // A rematch needs everyone: the guest's press only tells the others; nothing starts until the host and
      // the third player have pressed too.
      await guest.click('[data-a=rm]');
      await at('guest waits for rival', guest.waitForFunction(() => /Waiting for your rival/.test(document.querySelector('#ui').textContent), null, { timeout: 3000 }));
      await at('host told of the request', host.waitForFunction(() => /wants a rematch/.test(document.querySelector('#ui').textContent), null, { timeout: 3000 }));
      if (await guest.$('[data-a=rm]')) throw new Error('the guest can press Rematch twice');
      await host.click('[data-a=rm]');
      await sleep(600);
      if (/Round 1/.test(await txt(host))) throw new Error('the rematch started before everyone agreed');
      if (!/Waiting for your rival/.test(await txt(host))) throw new Error('host is not waiting for the third player: ' + await txt(host));
      spy.send(JSON.stringify(['r', 'zzzz']));
      for (const p of [page, page2]) await at('rematch card', p.waitForFunction(() => /Round 1/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 }));
      for (const p of [page, page2]) await p.waitForSelector('[data-a=p]', { timeout: 5000 });
      for (const p of [page, page2]) {
        const tag = await p.$eval('.h span', s => s.textContent);
        if (!/Round 1 · 0–0/.test(tag)) throw new Error('the rematch did not reset the score: ' + tag);
      }

      // Leaving the room leaves the rivals behind: their paint must not follow you into a solo level.
      await host.click('[data-a=bk]'); await host.waitForSelector('[data-a=go]', { timeout: 3000 });
      await openLevel(host, 0);
      const stowaways = await host.evaluate(() => __prism.gs());
      if (stowaways.length) throw new Error('rivals followed the player out of the room: ' + JSON.stringify(stowaways));
      await shots(host, 'after-race-solo');
    } finally { try { spy && spy.close(); } catch (e) { } relay.close(); }
  }, {}, route => route.request().url().startsWith(URL) ? route.continue() : route.abort());

  await test('quick-match', async (page, ctx) => {
    const relay = await startRelay();
    const pages = [page, await ctx.newPage(), await ctx.newPage()];
    for (const p of pages.slice(1)) p.on('pageerror', e => { throw new Error('page error: ' + e.message); });
    const txt = p => p.$eval('#ui', u => u.textContent);
    const wait = (p, re, ms = 5000) => p.waitForFunction(re => new RegExp(re).test(document.querySelector('#ui').textContent), re.source, { timeout: ms });
    try {
      for (const p of pages) { await boot(p); await p.evaluate(u => __prism.net.url = u, `ws://localhost:${relay.port}/{room}`); await p.click('[data-a=on]'); }
      const [a, b, c] = pages;
      await a.click('[data-a=qk]');
      await wait(a, /Looking for a rival/);
      if (await a.$('#ui b') || await a.$('[data-a=cp]')) throw new Error('the quick-match queue shows a room code to share');
      if (!await a.$('[data-a=lv0]')) throw new Error('no Leave button while queueing');
      await sleep(800);
      if (/Round/.test(await txt(a))) throw new Error('a round started with nobody else in the queue');
      await shots(a, 'quick-queue');
      await b.click('[data-a=qk]');
      for (const p of [a, b]) await wait(p, /Round 1/);
      for (const p of [a, b]) await p.waitForSelector('[data-a=p]', { timeout: 5000 });
      const names = await Promise.all([a, b].map(p => p.$eval('.h span', s => s.textContent)));
      if (names[0] != names[1]) throw new Error('the pair got different levels: ' + names);
      if (!/Round 1 · 0–0/.test(names[0])) throw new Error('HUD has no round tag: ' + names[0]);
      const rooms = await Promise.all([a, b].map(p => p.evaluate(() => __prism.room)));
      if (rooms[0] != rooms[1] || rooms[0] == 'QUIK') throw new Error('the pair did not move to a private room: ' + rooms);
      // The third player finds the queue empty and waits; the racing pair never hear from them.
      await c.click('[data-a=qk]');
      await wait(c, /Looking for a rival/);
      await sleep(1000);
      if (/Round/.test(await txt(c)) || await c.$('[data-a=p]')) throw new Error('a third player was pulled into the pair\'s race');
      if ((await a.evaluate(() => __prism.gs())).length != 1) throw new Error('the pair saw the third player');
      // The pair's match runs as usual: the senior of the two hosts, and the rematch needs both.
      await c.click('[data-a=lv0]');
      const spyWin = async () => { const s = new WebSocket(`ws://localhost:${relay.port}/prism26-${rooms[0]}`); await new Promise(r => s.onopen = r); return s; };
      const s = await spyWin(), win = () => s.send(JSON.stringify(['w', 'zzzz', 2, [[1, [10, 12, 16, 12]]]]));
      win();
      for (const p of [a, b]) await wait(p, /Round lost/);
      const host = await a.$('[data-a=st]') ? a : b;
      for (const r of [2, 3]) { // best of five: the third win takes it
        await host.click('[data-a=st]');
        for (const p of [a, b]) await wait(p, new RegExp('Round ' + r));
        for (const p of [a, b]) await p.waitForSelector('[data-a=p]', { timeout: 5000 });
        win();
        for (const p of [a, b]) await wait(p, r < 3 ? /Round lost/ : /take the match/);
      }
      await shots(a, 'quick-match-end');
      for (const p of [a, b]) await p.click('[data-a=rm]');
      s.send(JSON.stringify(['r', 'zzzz']));
      for (const p of [a, b]) await wait(p, /Round 1/);
      s.close();
    } finally { relay.close(); }
  }, {}, route => route.request().url().startsWith(URL) ? route.continue() : route.abort());

  // The daily is two stages: the generated level at difficulty 1, then a second at difficulty 3 behind a "Stage 2"
  // card, and only the second one marks the day done. The solutions are the generator's own reference strokes.
  await test('daily-stages', async page => {
    await boot(page);
    const seed = Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 864e5), name = () => page.$eval('.h span', s => s.textContent);
    await page.click('[data-a=dy]'); await page.waitForSelector('[data-a=p]');
    if (/Stage 2/.test(await name())) throw new Error('the daily opened on stage 2');
    await page.evaluate(s => __prism.setStrokes(s), gen(seed, 1)[1]); await page.click('[data-a=p]');
    await page.waitForFunction(() => /Stage 2/.test(document.querySelector('#ui').textContent), null, { timeout: 30000 });
    await shots(page, 'daily-stage2-card');
    await page.waitForSelector('[data-a=p]', { timeout: 5000 });
    if (!/Stage 2/.test(await name())) throw new Error('stage 2 HUD has no Stage 2 tag: ' + await name());
    if (await page.evaluate(() => localStorage.prism26_daily) == String(seed)) throw new Error('the daily was marked done after stage 1');
    await page.evaluate(s => __prism.setStrokes(s), gen(seed, 3)[1]); await page.click('[data-a=p]');
    await page.waitForFunction(() => /Daily done/.test(document.querySelector('#ui').textContent), null, { timeout: 30000 });
    if (await page.evaluate(() => localStorage.prism26_daily) != String(seed)) throw new Error('the daily was not marked done after stage 2');
    await shots(page, 'daily-done');
  });

  await test('resize', async page => {
    await boot(page); await openLevel(page, 0);
    await page.setViewportSize({ width: 500, height: 700 }); await sleep(100);
    const a = await page.evaluate(() => __prism.toScreen(32, 18));
    await page.setViewportSize({ width: 1200, height: 500 }); await sleep(100);
    const b = await page.evaluate(() => __prism.toScreen(32, 18));
    if (a[0] == b[0]) throw new Error('canvas did not re-fit');
    if (b[0] > 1200 || b[1] > 500) throw new Error('world exceeds viewport');
  });

  await test('audio-gesture', async page => {
    await boot(page); await page.click('[data-a=sn]'); await page.click('[data-a=sn]'); await page.click('[data-a=go]');
  });

  // Embedded in an iframe, with and without the Wavedash SDK global. Only on Wavedash is the frame's own
  // URL unshareable, so only there does the button copy the bare room code; js13kgames frames it too.
  // Three cases: the competition build framed plainly (Copy link); the competition build with the SDK global
  // injected, which must ignore it entirely — no init call, still Copy link — because that build carries no
  // platform code; and the Wavedash build with the global (init called, Copy code).
  await test('platform-copy', async (page, ctx) => {
    const relay = await startRelay();
    const openRoom = async p => {
      const fr = await (await p.waitForSelector('iframe')).contentFrame();
      await fr.waitForFunction(() => /PRISM/.test(document.querySelector('#ui').textContent), null, { timeout: 10000 });
      await fr.evaluate(u => __prism.net.url = u, `ws://localhost:${relay.port}/{room}`);
      await fr.click('[data-a=on]'); await fr.click('[data-a=cr]');
      await fr.waitForFunction(() => /Room/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 });
      return [fr, await fr.$eval('#ui b', b => b.textContent)];
    };
    try {
      await page.goto(URL + 'frame.html');
      const [fr, code] = await openRoom(page);
      let label = await fr.$eval('[data-a=cp]', b => b.textContent);
      if (label != 'Copy link') throw new Error('plain iframe says "' + label + '", expected Copy link');
      await fr.click('[data-a=cp]');
      await fr.waitForFunction(() => /Link copied/.test(document.querySelector('#ui').textContent), null, { timeout: 3000 });
      if (name == 'chromium') {
        const got = await fr.evaluate(() => navigator.clipboard.readText());
        if (got != URL + 'index.html#r=' + code) throw new Error(`clipboard holds "${got}", expected the frame url + #r=${code}`);
      }

      const sdk = () => { self.Wavedash = { initialized: 0, init() { this.initialized = 1; return true; }, readyForEvents() { } }; };
      const page2 = await ctx.newPage();
      page2.on('pageerror', e => { throw new Error('page2 error: ' + e.message); });
      await page2.addInitScript(sdk);
      await page2.goto(URL + 'frame.html');
      const [fr2] = await openRoom(page2);
      if (await fr2.evaluate(() => self.Wavedash.initialized)) throw new Error('the competition build called Wavedash.init() — platform code leaked into the js13k zip');
      label = await fr2.$eval('[data-a=cp]', b => b.textContent);
      if (label != 'Copy link') throw new Error('competition build with the SDK global says "' + label + '", expected Copy link (no platform code)');

      if (!WDHTML) { console.log('    (no Wavedash build: Copy code case skipped)'); return; }
      const page3 = await ctx.newPage();
      page3.on('pageerror', e => { throw new Error('page3 error: ' + e.message); });
      await page3.addInitScript(sdk);
      await page3.goto(URL + 'wd/frame.html');
      const [fr3, code3] = await openRoom(page3);
      if (!await fr3.evaluate(() => self.Wavedash.initialized)) throw new Error('the Wavedash build did not call Wavedash.init()');
      label = await fr3.$eval('[data-a=cp]', b => b.textContent);
      if (label != 'Copy code') throw new Error('on Wavedash the button says "' + label + '", expected Copy code');
      await fr3.click('[data-a=cp]');
      await fr3.waitForFunction(() => /Code copied/.test(document.querySelector('#ui').textContent), null, { timeout: 3000 });
      if (name == 'chromium') {
        const got = await fr3.evaluate(() => navigator.clipboard.readText());
        if (got != code3) throw new Error(`clipboard holds "${got}", expected the bare code ${code3}`);
      }
      await shots(page3, 'wavedash-lobby');
    } finally { relay.close(); }
  }, name == 'chromium' ? { permissions: ['clipboard-read', 'clipboard-write'] } : {},
    route => route.request().url().startsWith(URL) ? route.continue() : route.abort());

  // On Wavedash, the injected SDK carries the player's identity, their cloud save, and a win's achievements and
  // leaderboard scores. The mock behaves like @wvdsh/sdk-js where it bit us: it throws on a non-boolean where a
  // boolean is required (the number 1 silently lost every achievement and score for a week), and setAchievement
  // returns false the first time, as the real SDK does until its stats have loaded. The ids must match
  // tools/wavedash-achievements.mjs. Nothing may throw or reject (console errors). Wavedash build only.
  await test('platform-achievements', async page => {
    if (!WDHTML) { console.log('    (no Wavedash build: skipped)'); return; }
    await page.addInitScript(() => {
      const calls = [], ok = data => Promise.resolve({ success: true, data });
      const bool = (n, v) => { if (typeof v != 'boolean') throw new Error(n + ': expected boolean, got ' + typeof v); };
      let achReady = 0;
      const cloud = new TextEncoder().encode(JSON.stringify({ done: [0, 0, 1], stars: [0, 0, 1] })); // level 3 done on another device
      self.Wavedash = { calls, initialized: 0, init() { this.initialized = 1; return true; }, readyForEvents() { },
        setAchievement(id, storeNow) { bool('setAchievement.storeNow', storeNow); calls.push(['ach', id, storeNow]); return !!achReady++; },
        getOrCreateLeaderboard: (...a) => { calls.push(['lb', ...a]); return ok({ id: 'id_' + a[0] }); },
        uploadLeaderboardScore: (...a) => { bool('uploadLeaderboardScore.keepBest', a[2]); calls.push(['score', ...a]); return ok({}); },
        getUser: () => ({ id: 'u1', username: 'Tester', avatarUrl: '' }),
        updateUserPresence: (...a) => { calls.push(['pres', ...a]); return ok(null); },
        remoteFileExists: p => ok(p == 'prism/progress.json'),
        downloadRemoteFile: p => ok(p),
        readLocalFile: () => Promise.resolve(cloud),
        writeLocalFile: (p, d) => { calls.push(['write', p, new TextDecoder().decode(d)]); return Promise.resolve(true); },
        uploadRemoteFile: p => { calls.push(['upload', p]); return ok(p); } };
    });
    await page.goto(URL + 'wd/frame.html');
    const fr = await (await page.waitForSelector('iframe')).contentFrame();
    await fr.waitForFunction(() => /PRISM/.test(document.querySelector('#ui').textContent), null, { timeout: 10000 });
    // Identity on the title, and the cloud save merged into local progress (level 3 done, 1 / 40 on the title).
    await fr.waitForFunction(() => /Playing as.*Tester/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 });
    await fr.waitForFunction(() => JSON.parse(localStorage.prism26_progress || '{}').done?.[2] == 1, null, { timeout: 5000 });
    await fr.waitForFunction(() => /1 \/ 40 levels/.test(document.querySelector('#ui').textContent), null, { timeout: 3000 });
    await shots(page, 'wavedash-title');
    await fr.evaluate(() => __prism.load(0)); await fr.waitForSelector('[data-a=p]');
    await fr.evaluate(s => __prism.setStrokes(s), SOLUTIONS[0]);
    await fr.click('[data-a=p]'); await fr.waitForSelector('.t h2', { timeout: 16000 });
    // The first setAchievement returned false (SDK not ready): the retry a second later must land it.
    await fr.waitForFunction(() => self.Wavedash.calls.filter(c => c[0] == 'ach' && c[1] == 'gem').length > 1, null, { timeout: 5000 });
    // The debounced cloud save after the win must carry both devices' progress (the boot merge uploaded first).
    await fr.waitForFunction(() => self.Wavedash.calls.some(c => c[0] == 'write' && JSON.parse(c[2]).done[0] == 1), null, { timeout: 5000 });
    await fr.waitForFunction(() => self.Wavedash.calls.filter(c => c[0] == 'upload').length > 1, null, { timeout: 5000 });
    const calls = await fr.evaluate(() => self.Wavedash.calls);
    const has = (...k) => calls.some(c => k.every((v, i) => c[i] === v));
    if (!has('ach', 'gem', true)) throw new Error('setAchievement(gem, true) not called: ' + JSON.stringify(calls));
    if (!has('ach', 'solo', true)) throw new Error('setAchievement(solo) not called for a one-stroke win');
    if (!has('lb', 'levels', 1, 0) || !has('lb', 'stars', 1, 0)) throw new Error('leaderboards not created: ' + JSON.stringify(calls));
    if (!has('score', 'id_levels', 2, true)) throw new Error('levels score (cloud level 3 + level 1 = 2) not uploaded: ' + JSON.stringify(calls.filter(c => c[0] == 'score')));
    const saved = calls.filter(c => c[0] == 'write').map(c => JSON.parse(c[2]));
    if (!saved.some(p => p.done[0] == 1 && p.done[2] == 1)) throw new Error('cloud save does not hold both devices\' progress: ' + JSON.stringify(saved));
    if (!has('upload', 'prism/progress.json')) throw new Error('cloud save not uploaded');
    if (!calls.some(c => c[0] == 'pres' && /Level 1/.test(c[1].status))) throw new Error('presence not updated for the level: ' + JSON.stringify(calls.filter(c => c[0] == 'pres')));
  }, {}, route => route.request().url().startsWith(URL) ? route.continue() : route.abort());

  await test('mute-glyph', async page => {
    await boot(page);
    const glyph = () => page.$eval('[data-a=sn]', b => b.textContent);
    const t0 = await glyph(); await page.click('[data-a=sn]');
    const t1 = await glyph(); if (t0 == t1) throw new Error('title sound glyph unchanged: ' + t0);
    await openLevel(page, 0);
    const h0 = await glyph(); await shots(page, 'hud-muted'); // muted HUD: swapped glyph, dimmed button
    await page.click('[data-a=sn]');
    const h1 = await glyph(); if (h0 == h1) throw new Error('HUD sound glyph unchanged: ' + h0);
    if (h1 != t0) throw new Error(`HUD unmuted glyph ${h1} != title unmuted glyph ${t0}`);
    if (await page.evaluate(() => JSON.parse(localStorage.prism26_progress).snd) !== 1) throw new Error('mute flag not persisted');
  });

  // A shared room link has to (a) actually reach the clipboard and (b) join that room when opened.
  await test('room-link', async (page, ctx) => {
    const relay = await startRelay();
    try {
      await boot(page); await page.evaluate(u => __prism.net.url = u, `ws://localhost:${relay.port}/{room}`);
      await page.click('[data-a=on]'); await page.click('[data-a=cr]');
      await page.waitForFunction(() => /Room/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 });
      const code = await page.$eval('#ui b', b => b.textContent);
      await page.click('[data-a=cp]');
      await page.waitForFunction(() => /Link copied/.test(document.querySelector('#ui').textContent), null, { timeout: 3000 });
      if (name == 'chromium') { // only chromium can grant clipboard-read; firefox is covered by the status line
        const got = await page.evaluate(() => navigator.clipboard.readText());
        if (got != URL + '#r=' + code) throw new Error(`clipboard holds "${got}", expected "${URL}#r=${code}"`);
      }
      // Opening the link must join that room. The link auto-joins before any test hook can run, so the
      // relay URL is redirected to the in-process relay by stubbing WebSocket in an init script — the
      // recorded URL is what the game built from the #r= hash, which is what the old regex got wrong.
      const page2 = await ctx.newPage();
      page2.on('pageerror', e => { throw new Error('page2 error: ' + e.message); });
      await page2.addInitScript(port => {
        const W = self.WebSocket;
        self.WebSocket = function (u) { self.__tried = String(u); return new W(String(u).replace(/^wss:\/\/[^/]+\/prism\//, 'ws://localhost:' + port + '/')); };
      }, relay.port);
      await page2.goto(URL + '#r=' + code);
      const tried = await page2.waitForFunction(() => self.__tried, null, { timeout: 5000 }).then(h => h.jsonValue());
      if (!tried.endsWith('prism26-' + code)) throw new Error(`#r= link asked for "${tried}", expected room ${code}`);
      for (const p of [page, page2]) await p.waitForFunction(() => /2 players/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 });

      // Leave has to actually leave: a round the host starts afterwards must not drag this page back in.
      const host = await page.$('[data-a=st]') ? page : page2, guest = host == page ? page2 : page;
      if (host != page) throw new Error('the player who opened the link became the host');
      await guest.click('[data-a=lv0]');
      await guest.waitForSelector('[data-a=cr]', { timeout: 3000 });
      // ...and the host sees the room shrink (the relay's '-id' removes the peer), so Start goes away again.
      await host.waitForFunction(() => /1 player\b/.test(document.querySelector('#ui').textContent), null, { timeout: 3000 });
      if (await host.$('[data-a=st]')) throw new Error('host can Start with nobody left in the room');
      // A rejoin makes it 2 players again, then the host starts a round the leaver must not see.
      await guest.fill('#j', code); await guest.click('[data-a=jn]'); // Leave lands on the lobby's Create/Join screen
      for (const p of [page, page2]) await p.waitForFunction(() => /2 players/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 });
      await guest.click('[data-a=lv0]');
      await guest.waitForSelector('[data-a=cr]', { timeout: 3000 });
      await host.waitForFunction(() => /1 player\b/.test(document.querySelector('#ui').textContent), null, { timeout: 3000 });
      // Start needs a rival, so a spy stands in for one; the leaver must stay out.
      const spy = new WebSocket(`ws://localhost:${relay.port}/prism26-${code}`);
      await new Promise((res, rej) => { spy.onopen = res; spy.onerror = () => rej(new Error('spy socket failed')); });
      spy.send(JSON.stringify(['h', 'zzzz']));
      await host.waitForSelector('[data-a=st]', { timeout: 3000 });
      await host.click('[data-a=st]');
      await sleep(1500);
      if (await guest.$('[data-a=p]')) throw new Error('a player who left was pulled into the round');
      if (!await guest.$('[data-a=cr]')) throw new Error('a player who left did not stay out of the room');
      spy.close();
    } finally { relay.close(); }
  }, name == 'chromium' ? { permissions: ['clipboard-read', 'clipboard-write'] } : {},
    route => route.request().url().startsWith(URL) ? route.continue() : route.abort());

  await browser.close();
}

for (const b of BROWSERS) { console.log(`\n=== ${b} ===`); await runBrowser(b); }
srv.close();

console.log('\n' + '='.repeat(60));
console.log('browser   test              result');
for (const [b, t, r] of results) console.log(`${b.padEnd(10)}${t.padEnd(18)}${r}`);
if (allWarnings.length) console.log('\nwarnings:\n  ' + [...new Set(allWarnings)].join('\n  '));
const failed = results.filter(r => !/^pass/.test(r[2]));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
