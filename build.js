// PRISM build: concat → terser → roadroller → inline → zip (zopfli) → verify → size gate.
// Usage: node build.js [-O0|-O1|-O2] [--no-rr] [--wavedash]   (default -O1; -O2 is the slow release search)
//
// Two builds from one source tree:
//   node build.js             js13k competition build → dist/index.html, dist/prism.zip (size-gated at 13,312).
//                             src/wavedash.js is replaced by a no-op stub, so no platform code ships in the zip.
//   node build.js --wavedash  Wavedash build → dist/wavedash/index.html only (what wavedash.toml uploads).
//                             Same game plus achievements/leaderboards/SDK init; no zip, no size gate.
import fs from 'fs';
import zlib from 'zlib';
import { execSync } from 'child_process';
import { minify } from 'terser';
import { Packer } from 'roadroller';
import zopfli from '@gfx/zopfli';

const LIMIT = 13312, TARGET = 12900;
const args = process.argv.slice(2), OPT = +(args.find(a => /^-O\d$/.test(a)) || '-O1').slice(2), NORR = args.includes('--no-rr'), WD = args.includes('--wavedash');
const ORDER = ['sim', 'levels', 'gen', 'audio', 'render', 'net', 'wavedash', 'ui', 'main'];
const read = f => fs.readFileSync(f, 'utf8');
// The competition build's stand-in for src/wavedash.js: the same exports, all no-ops, which terser inlines
// and drops (a call whose only arguments are literals has no side effects), so no platform code remains.
const STUB = 'const onWD=()=>0,ach=()=>0,lb=()=>0;\n';

// 1. Concatenate modules, stripping ES module syntax (no name collisions by construction).
const strip = src => src.replace(/^import [^\n]*\n/gm, '').replace(/^export (default )?/gm, '');
const mod = m => m == 'wavedash' && !WD ? STUB : strip(read(`src/${m}.js`));
const bundle = '(()=>{' + ORDER.map(mod).join('\n') + '})()';
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/bundle.tmp.js', bundle);

// 2. Minify with property mangling on _-prefixed keys.
const TERSER = {
  compress: { passes: 3, unsafe: true, unsafe_math: true, pure_getters: true, toplevel: true, drop_console: true },
  mangle: { toplevel: true, properties: { regex: /^_/, reserved: ['__prism'] } },
  format: { ascii_only: false, comments: false },
};
const min = (await minify(bundle, TERSER)).code;
fs.writeFileSync('dist/min.tmp.js', min);
if (!WD && /Wavedash/.test(min)) throw new Error('the competition build still contains platform code');
if (WD && !/Wavedash/.test(min)) throw new Error('the Wavedash build lost its platform code');

// 3. Roadroller.
let packed = min;
if (!NORR) {
  const packer = new Packer([{ data: min, type: 'js', action: 'eval' }], {});
  await packer.optimize(OPT);
  const { firstLine, secondLine } = packer.makeDecoder();
  packed = firstLine + secondLine;
}

// 4. Inline into index.html (CSS minified by whitespace stripping).
const css = read('src/style.css').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}').replace(/\n/g, '').trim();
const html = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover"><title>Prism</title><style>${css}</style><canvas id=c></canvas><div id=ui></div><script>${packed}</script>`;
const data = Buffer.from(html, 'utf8');

// 5. Zip: single deflated entry, no extra fields, zopfli-compressed. (Also measured for the Wavedash build, for
// the record, but only the competition build writes it: the Wavedash upload dir must hold index.html alone.)
const crcTable = [...Array(256)].map((_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
const crc32 = b => { let c = ~0; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; };
const deflated = Buffer.from(await new Promise((res, rej) => zopfli.deflate(data, { numiterations: 500, blocksplitting: true }, (e, r) => e ? rej(e) : res(r))));
const alt = zlib.deflateRawSync(data, { level: 9 });
const body = deflated.length <= alt.length ? deflated : alt;
const name = Buffer.from('index.html'), crc = crc32(data);
const u16 = v => { const b = Buffer.alloc(2); b.writeUInt16LE(v); return b; }, u32 = v => { const b = Buffer.alloc(4); b.writeUInt32LE(v >>> 0); return b; };
const dt = new Date(), dosT = (dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >> 1), dosD = ((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate();
const local = Buffer.concat([u32(0x04034b50), u16(20), u16(0), u16(8), u16(dosT), u16(dosD), u32(crc), u32(body.length), u32(data.length), u16(name.length), u16(0), name]);
const central = Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(8), u16(dosT), u16(dosD), u32(crc), u32(body.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(0), name]);
const eocd = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(1), u16(1), u32(central.length), u32(local.length + body.length), u16(0)]);
const zip = Buffer.concat([local, body, central, eocd]);

if (WD) {
  fs.mkdirSync('dist/wavedash', { recursive: true });
  fs.writeFileSync('dist/wavedash/index.html', html);
} else {
  fs.writeFileSync('dist/index.html', html);
  fs.writeFileSync('dist/prism.zip', zip);
  // 6. Verify with Info-ZIP if available.
  try {
    const l = execSync('unzip -l dist/prism.zip', { encoding: 'utf8' });
    const t = execSync('unzip -t dist/prism.zip', { encoding: 'utf8' });
    if (!/index\.html/.test(l) || !/No errors detected/.test(t)) throw new Error('unzip verification failed:\n' + l + t);
    const entries = l.split('\n').filter(x => /^\s*\d+\s+\d{4}-\d\d-\d\d/.test(x) || /^\s*\d+\s+\d\d-\d\d-\d{2,4}/.test(x)).length;
    if (entries != 1) throw new Error('zip must contain exactly one entry, found ' + entries);
  } catch (e) { if (/verification|exactly one/.test(e.message)) throw e; console.log('(unzip not available: ' + e.message.split('\n')[0] + ')'); }
}

// 7. Report: per-module minified sizes (each module minified alone) + totals.
const rows = [];
for (const m of ORDER) {
  const src = mod(m);
  const one = (await minify(src, { ...TERSER, compress: { ...TERSER.compress, toplevel: false, unused: false } })).code;
  rows.push([m + '.js' + (m == 'wavedash' && !WD ? ' (stub)' : ''), src.length, one.length, zlib.deflateRawSync(one, { level: 9 }).length]);
}
rows.push(['style.css', read('src/style.css').length, css.length, zlib.deflateRawSync(css, { level: 9 }).length]);
const pad = (s, n) => String(s).padStart(n);
const table = [(WD ? 'WAVEDASH build' : 'js13k competition build') + ' (roadroller -O' + OPT + ')', 'module              source   min  deflate', ...rows.map(r => `${r[0].padEnd(18)}${pad(r[1], 7)}${pad(r[2], 7)}${pad(r[3], 7)}`),
  '', `bundle raw ${bundle.length}, minified ${min.length}, roadrolled ${packed.length}, html ${data.length}, zip ${zip.length} (${body === deflated ? 'zopfli' : 'zlib'})`].join('\n');
fs.writeFileSync(WD ? 'dist/size-wavedash.txt' : 'dist/size.txt', table + '\n');
console.log(table);
fs.rmSync('dist/bundle.tmp.js'); fs.rmSync('dist/min.tmp.js');

// 8. Gate (competition build only; the Wavedash upload is not size-limited, its zip size is informational).
if (WD) { console.log(`\nwrote dist/wavedash/index.html (${data.length} bytes; would zip to ${zip.length})`); }
else if (zip.length > LIMIT) { console.error(`\n!!! ZIP IS ${zip.length} BYTES — OVER THE ${LIMIT} LIMIT BY ${zip.length - LIMIT} !!!`); process.exit(1); }
else if (zip.length > TARGET) console.log(`\n*** WARNING: zip ${zip.length} > working target ${TARGET} (${zip.length - TARGET} over) ***`);
else console.log(`\nzip ${zip.length} bytes — ${LIMIT - zip.length} under the limit, ${TARGET - zip.length} under target`);
