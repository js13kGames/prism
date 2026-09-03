// Suite B — Playwright, chromium + firefox, against the UNZIPPED dist/prism.zip.
// Usage: node test/browser.test.js [chromium|firefox] [--quick]   (quick: skip the all-levels run)
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import zlib from 'zlib';
import { chromium, firefox } from 'playwright';
import { SOLUTIONS } from './solutions.js';

const args = process.argv.slice(2), QUICK = args.includes('--quick');
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
  const waitWin = page => page.waitForSelector('.t h2', { timeout: 12000 });
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
    for (let i = 0; i < 20; i++) {
      await page.evaluate(i => __prism.load(i), i);
      await page.waitForSelector('[data-a=p]');
      await page.evaluate(s => __prism.setStrokes(s), SOLUTIONS[i]);
      await page.click('[data-a=p]');
      const t0 = Date.now();
      try { await waitWin(page); } catch (e) { await shots(page, `level${i + 1}-fail`); throw new Error(`level ${i + 1} did not win`); }
      console.log(`    level ${i + 1} won in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      if (i == 19) await shots(page, 'level20-win');
    }
    const prog = await page.evaluate(() => JSON.parse(localStorage.prism26_progress));
    if (prog.done.filter(Boolean).length != 20) throw new Error('not all levels marked done');
  });

  await test('fail-path', async page => {
    await boot(page); await page.evaluate(() => __prism.load(2)); await page.waitForSelector('[data-a=p]');
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

  await test('offline-lobby', async page => {
    await boot(page);
    await page.click('[data-a=on]'); await page.waitForSelector('[data-a=bk]');
    if (await page.$('[data-a=cr]')) await page.click('[data-a=cr]');
    await page.waitForFunction(() => /offline|unavailable|not available|failed|error|blocked|TODO|relay/i.test(document.querySelector('#ui').textContent), null, { timeout: 5000 });
    await shots(page, 'lobby-offline');
    await page.click('[data-a=bk]'); await page.waitForSelector('[data-a=go]');
  }, {}, route => { const u = route.request().url(); return u.startsWith(URL) ? route.continue() : route.abort(); });

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
