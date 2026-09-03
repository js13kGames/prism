# 07 — Build pipeline & size budget

## Target

`dist/prism.zip` ≤ 13,312 bytes. Working target ≤ 12,900. `build.js` exits non-zero
above 13,312 and prints a loud warning above 12,900.

## Pipeline (`node build.js`)

1. **Concatenate** `src/` in dependency order (sim, levels, gen, audio, render, net,
   ui, main). Strip `import`/`export` lines with a regex (the modules are written so
   this is safe: no name collisions, no default exports except `levels.js`, which is
   turned into `const LEVELS = [...]`). Wrap in `(()=>{ ... })()`.
2. **Minify** with `terser`:
   ```
   { compress: { passes: 3, unsafe: true, unsafe_math: true, pure_getters: true, toplevel: true, drop_console: true },
     mangle: { toplevel: true, properties: { regex: /^_/ } }, format: { ascii_only: false, comments: false } }
   ```
   Prefix *every* internal object property with `_` (`u._x`, `stroke._p`, …) so
   property mangling is safe; never prefix DOM/Web API names. Level string tokens are
   data, not properties, so they are untouched.
3. **Roadroller**: `npx roadroller -O2` on the minified JS (try `-O1` and `-O2`; keep
   the smaller zip result, not the smaller JS). Roadroller output is JS that unpacks
   itself; it adds ~100–300 ms startup — acceptable.
4. **Inline** into `dist/index.html`:
   ```html
   <!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover"><title>Prism</title><style>…minified css…</style><canvas id=c></canvas><div id=ui></div><script>…roadrolled…</script>
   ```
   Minify the CSS by hand-tight authoring + a simple whitespace/comment strip. No
   `<html>/<head>/<body>` tags (valid HTML5, saves bytes).
5. **Zip** with the best deflate available, in this order of preference:
   `advzip -4 -i 300` (package `advancecomp`), else `ect -9 -zip`, else the
   `zopfli` npm package's deflate via a tiny zip writer, else Node `zlib` level 9
   with a hand-rolled zip container (store the entry as deflate, correct CRC32,
   no extra fields, no directory entries). Verify with `unzip -t` and `unzip -l`.
6. **Report**: print bytes for raw JS, minified, roadrolled, html, zip; and a per-module
   minified size table (minify each module alone for the table only). Save the table
   to `dist/size.txt` and copy into `SUBMISSION.md` at the end.
7. **Gate**: fail if zip > 13,312.

## Size budget (minified+roadrolled, before zip — rough guide)

| module | budget |
|---|---|
| sim.js | 3.5 KB |
| render.js | 2.5 KB |
| main.js + ui.js + css | 3.0 KB |
| levels.js | 1.3 KB |
| audio.js | 0.9 KB |
| net.js | 1.1 KB |
| gen.js | 0.9 KB |

Roadroller + deflate typically bring 40–50 KB of minified JS to ~13 KB; this game is
well within that if the code stays terse. Check after every feature.

## Byte-saving rules (apply while writing, not after)

- One file of short helper functions: `Q=s=>document.querySelector(s)`,
  `abs=Math.abs`, etc. Destructure `Math` once: `const {abs,min,max,sqrt,hypot,sin,cos,PI}=Math`.
- Arrays over objects for hot data where sensible (`u=[x,y,vx,vy]`) — but readability
  in `src/` matters for the "readable source" requirement; use `_`-prefixed object
  keys and let terser mangle them instead.
- No template engines; HTML screens as template literals, share one CSS class set.
- Colours as one array of 7 hex strings; lighter variants computed with `+'8'` alpha.
- Level strings, not JSON. Hints short. Names short.
- Avoid `class` syntax; closures and plain objects minify smaller.
- No polyfills. Target latest Chrome/Firefox only.
- Sounds as ZzFX parameter arrays; ≤ 10 sounds.
- Reuse the same rounded-rect/line drawing helper for everything.

## What to try if over the limit (in order)

1. Compare Roadroller `-O1` vs `-O2` vs `-O3` (3 is slow; run once at the end).
2. Look at `dist/size.txt`; attack the biggest module.
3. Shorten level hints; drop optional hints.
4. Reduce sound table.
5. Drop particles.
6. Drop the generator (docs/05 fallback).
7. Drop online (docs/06) — last resort before touching core levels.

## Repo hygiene

- `.gitignore`: `node_modules`, `dist/*.html`, `test-results`. Commit `dist/prism.zip`
  only in the final commit (tagged `submission`).
- `package.json` scripts: `build`, `test`, `test:sim`, `test:browser`, `dev`
  (a 5-line static server on 8080 serving the repo root).
- README documents the exact build steps so judges can rebuild the zip.
