// Dev helper: node tools/titleshot.mjs 2 6.5 8.8 — screenshots of dist/index.html at those seconds into
// the title attract loop (paint 0-3.5 s, walk 4-9 s, fade 9-10 s), into test-results/title[TAG]-<t>.png.
// VW/VH set the viewport, TAG names the run: VW=390 VH=844 TAG=-p node tools/titleshot.mjs 6.5
import http from 'http'; import fs from 'fs'; import path from 'path';
import { chromium } from 'playwright';
const dir = 'dist';
const srv = http.createServer((q, s) => { fs.readFile(path.join(dir, 'index.html'), (e, d) => { s.writeHead(e ? 404 : 200, { 'Content-Type': 'text/html' }); s.end(e ? '404' : d); }); }).listen(0);
await new Promise(r => srv.on('listening', r));
const url = `http://localhost:${srv.address().port}/`;
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: +(process.env.VW||1280), height: +(process.env.VH||720) } })).newPage();
await p.goto(url);
await p.waitForFunction(() => /PRISM/.test(document.querySelector('#ui').textContent));
const at = process.argv.slice(2).map(Number);
let prev = 0;
for (const t of at) { await new Promise(r => setTimeout(r, (t - prev) * 1000)); prev = t; await p.screenshot({ path: `test-results/title${process.env.TAG||''}-${t}.png` }); }
await b.close(); srv.close();
