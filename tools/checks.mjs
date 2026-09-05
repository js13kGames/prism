// Release checks (docs/08 C): zip entries, CRC, forbidden strings, external URLs. node tools/checks.mjs
import fs from 'fs';
import zlib from 'zlib';
import { execSync } from 'child_process';
import { minify } from 'terser';
const zip = fs.readFileSync('dist/prism.zip');
console.log('zip bytes:', zip.length, zip.length <= 13312 ? '(≤ 13312 OK)' : '(OVER LIMIT!)');
console.log(execSync('unzip -l dist/prism.zip', { encoding: 'utf8' }).trim());
console.log(execSync('unzip -t dist/prism.zip', { encoding: 'utf8' }).trim());
// count central directory entries
let entries = 0; for (let i = 0; i < zip.length - 4; i++) if (zip.readUInt32LE(i) == 0x02014b50) entries++;
console.log('central directory entries:', entries);
const html = fs.readFileSync('dist/index.html', 'utf8');
console.log('index.html bytes:', html.length, '| fetch( in html:', /fetch\(/.test(html), '| XMLHttpRequest:', /XMLHttpRequest/.test(html));
// The shipped JS is roadroller-packed, so grep the minified (pre-pack) bundle for string-level checks.
// Same module order and stub as build.js: the competition build swaps src/wavedash.js for no-ops.
const ORDER = ['sim', 'levels', 'gen', 'audio', 'render', 'net', 'wavedash', 'ui', 'main'];
const strip = s => s.replace(/^import [^\n]*\n/gm, '').replace(/^export (default )?/gm, '');
const bundle = '(()=>{' + ORDER.map(m => m == 'wavedash' ? 'const onWD=()=>0,ach=()=>0,lb=()=>0;\n' : strip(fs.readFileSync(`src/${m}.js`, 'utf8'))).join('\n') + '})()';
const min = (await minify(bundle, { compress: { passes: 3, unsafe: true, unsafe_math: true, pure_getters: true, toplevel: true, drop_console: true }, mangle: { toplevel: true, properties: { regex: /^_/, reserved: ['__prism'] } }, format: { ascii_only: false, comments: false } })).code;
console.log('minified JS bytes:', min.length);
console.log('URL occurrences in minified JS:', (min.match(/(https?|wss?):\/\/[^"'`\s]*/g) || []));
console.log('localStorage.clear present:', /localStorage\.clear/.test(min));
console.log('console. present:', /console\./.test(min));
console.log('platform (Wavedash) code in the competition build:', /Wavedash|Copy code/.test(min), '(must be false — that code is only in `node build.js --wavedash`)');
if (fs.existsSync('dist/wavedash/index.html')) console.log('dist/wavedash/index.html bytes:', fs.statSync('dist/wavedash/index.html').size, '(the Wavedash upload; built separately, not size-limited)');
console.log('localStorage keys used:', [...new Set(min.match(/prism26_\w+/g))]);
console.log('external tags in html (link/img/script src):', (html.match(/<(link|img|script)[^>]*(href|src)=/g) || []).length);
