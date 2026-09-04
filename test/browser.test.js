// Suite B — Playwright, chromium + firefox, against the UNZIPPED dist/prism.zip.
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
console.log(`unzipped ${fname} (${html.length} bytes, method ${method}) to ${dir}`);

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
    await boot(page); await page.evaluate(() => __prism.load(1)); await page.waitForSelector('[data-a=p]');
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
      const at = (label, pr) => pr.catch(e => { throw new Error(label + ': ' + String(e.message).slice(0, 100)); });
      await page.click('[data-a=on]'); await page.click('[data-a=cr]');
      await at('room created', page.waitForFunction(() => /Room/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 }));
      const code = await page.$eval('#ui b', b => b.textContent);
      await page2.click('[data-a=on]'); await page2.fill('#j', code); await page2.click('[data-a=jn]');
      for (const p of [page, page2]) await at('2 players', p.waitForFunction(() => /2 players/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 }));
      await shots(page, 'lobby-2players');
      const host = await page.$('[data-a=st]') ? page : page2, guest = host == page ? page2 : page;
      if (await guest.$('[data-a=st]')) throw new Error('both pages think they are host');
      await host.click('[data-a=st]');
      const txt = p => p.$eval('#ui', u => u.textContent);
      for (const p of [page, page2]) await at('round 1 card', p.waitForFunction(() => /Round 1/.test(document.querySelector('#ui').textContent), null, { timeout: 3000 }));
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

      // A second win by the same rival decides the match: the card says so and offers a rematch, and the
      // rematch starts a fresh round 1 with the score back to nil on both sides.
      spy.send(JSON.stringify(['w', 'zzzz', 3.5, [[1, [10, 12, 16, 12]]]]));
      for (const p of [page, page2]) await at('match result', p.waitForFunction(() => /take the match/.test(document.querySelector('#ui').textContent), null, { timeout: 5000 }));
      if (!/You 0 – 2 Rival/.test(await txt(host))) throw new Error('match card lost the score: ' + await txt(host));
      if (!/Rematch/.test(await txt(host))) throw new Error('host was not offered a rematch: ' + await txt(host));
      await shots(host, 'race-match-end');
      await host.click('[data-a=st]'); // Rematch
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

  // The mute button has to look muted: both the title and the in-game HUD swap their glyph on click.
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
      await guest.click('[data-a=lv0]');
      await guest.waitForSelector('[data-a=cr]', { timeout: 3000 });
      await host.click('[data-a=st]');
      await sleep(1500);
      if (await guest.$('[data-a=p]')) throw new Error('a player who left was pulled into the round');
      if (!await guest.$('[data-a=cr]')) throw new Error('a player who left did not stay out of the room');
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
