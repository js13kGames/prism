// Boot, state machine, screens, HUD, input. Talks to sim.js (pure) and render.js (canvas).
import { parseLevel, createRun, step, mkStroke, inSolid, strokeLen, COLS, DT, W, H, R, min, max, hypot } from './sim.js';
import { LEVELS } from './levels.js';
import { drawWorld, drawStrokes, drawGem, drawStart, drawUnicorn, drawParts, spawn, PARTS } from './render.js';
import { titleUI, selectUI, hudUI, winUI, lobbyUI } from './ui.js';
import { sfx, initAudio, snd, setSnd } from './audio.js';
import { join, send, leave, NET } from './net.js';
import { gen, daySeed } from './gen.js';

const Q = s => document.querySelector(s), ui = Q('#ui'), cv = Q('#c'), g = cv.getContext('2d');
const rnd = Math.random; // render-side randomness only (particles); the sim never uses it
let dpr, sc, ox, oy;      // canvas scale: world unit → css px, and letterbox offset
let scr = 0;              // 0 title, 1 select, 2 game, 3 lobby
let li = 0, L, strokes = [], run = null, col = 0, cur = null, played = 0, failT = 0, daily = 0;
let T = 0, last = 0, acc = 0, hintOn = 1;
let prog = { done: [], stars: [], snd: 1 };
try { prog = { ...prog, ...JSON.parse(localStorage.prism26_progress || '{}') }; } catch (e) { }
setSnd(prog.snd);
const save = () => { try { localStorage.prism26_progress = JSON.stringify(prog); } catch (e) { } };

function resize() {
  dpr = min(2, devicePixelRatio || 1);
  const cw = innerWidth, ch = innerHeight;
  cv.width = cw * dpr; cv.height = ch * dpr; cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  sc = min(cw / W, (ch - 120) / H); ox = (cw - W * sc) / 2; oy = (ch - H * sc) / 2;
}
onresize = resize; resize();

const show = html => ui.innerHTML = html;
const inkLeft = c => L._ink[c] - strokes.reduce((s, k) => s + (k._c == c ? k._len : 0), 0);
const used = () => strokes.reduce((s, k) => s + k._len, 0);
const total = () => L._ink.reduce((s, v) => s + v, 0);

function hud() {
  if (scr != 2 && scr != 3) return;
  show(hudUI(L, col, L._ink.map((v, c) => inkLeft(c)), !!run, hintOn && !played ? L._hint : ''));
}

// Load level i (0..19) or the daily/online level when i == 20 (seed from `seed`).
function loadLevel(i, seed) {
  li = i; daily = i == 20 ? seed : 0;
  L = parseLevel(i == 20 ? gen(seed)[0] : LEVELS[i]);
  strokes = []; run = null; cur = null; played = 0; PARTS.length = 0;
  col = L._ink.indexOf(max(...L._ink)); scr = scr == 3 ? 3 : 2; hud();
}

function play() {
  if (run) return;
  run = createRun(L, strokes); played = 1; hud(); sfx(1); if (scr == 3) send(['p']);
}
function rewind() { run = null; PARTS.length = 0; hud(); }

// Screens
const goTitle = () => { scr = 0; run = null; leave(); show(titleUI(snd)); };
const goSelect = () => { scr = 1; run = null; show(selectUI(prog, 'Daily ' + new Date().toISOString().slice(5, 10), 20)); };
const goLobby = () => { scr = 3; run = null; show(lobbyUI('Connecting…', '', 0)); openLobby(); };

// Actions dispatched from data-a attributes.
const act = {
  go: goSelect, bk: () => scr == 2 && !daily ? goSelect() : goTitle(), on: goLobby,
  dy: () => loadLevel(20, daySeed()),
  sn: () => { setSnd(prog.snd = snd ? 0 : 1); save(); scr ? hud() : show(titleUI(snd)); },
  lv: v => { v = +v; if (!v || prog.done[v - 1]) loadLevel(v); },
  c: v => { col = +v; hud(); sfx(0, col); },
  u: () => { if (!run && strokes.length) { strokes.pop(); hud(); if (scr == 3) send(['u']); } },
  x: () => { if (!run && strokes.length) { strokes = []; hud(); if (scr == 3) send(['c']); } },
  p: play, r: rewind,
  nx: () => { if (li < 19) loadLevel(li + 1); else goSelect(); },
  cr: () => openLobby(1), jn: () => openLobby((Q('#j') || {}).value), lv0: goLobby, cp: () => { try { navigator.clipboard.writeText(location.href.split('#')[0] + '#r=' + room); } catch (e) { } },
  st: () => raceStart(),
};
ui.onclick = e => { const b = e.target.closest('[data-a]'); if (b) { initAudio(); sfx(7); act[b.dataset.a](b.dataset.v); } };
onkeydown = e => {
  const k = e.key;
  if (scr == 2 || scr == 3) {
    if (k >= '1' && k <= '7' && L._ink[k - 1]) act.c(k - 1);
    else if (k == 'z') act.u(); else if (k == 'c') act.x();
    else if (k == ' ') { e.preventDefault(); run ? rewind() : play(); }
    else if (k == 'Escape') act.bk();
  } else if (k == 'Escape' && scr) goTitle();
};

// Drawing input (Pointer Events: mouse, touch, pen)
const wp = e => [(e.clientX - ox) / sc, (e.clientY - oy) / sc];
cv.onpointerdown = e => {
  if (scr < 2 || run || inkLeft(col) <= .3) return;
  initAudio(); try { cv.setPointerCapture(e.pointerId); } catch (x) { }
  const [x, y] = wp(e); cur = mkStroke(col, [x, y]);
};
cv.onpointermove = e => {
  if (!cur) return;
  let [x, y] = wp(e); const p = cur._p, px = p[p.length - 2], py = p[p.length - 1], d = hypot(x - px, y - py);
  if (d < .15 || inSolid(L, (x + px) / 2, (y + py) / 2)) return;
  const avail = inkLeft(col) - cur._len;
  if (d >= avail) { x = px + (x - px) * avail / d; y = py + (y - py) * avail / d; }
  p.push(x, y); cur._len += min(d, avail);
  const b = Q('#i' + col); if (b) b.style.width = 100 * (avail - min(d, avail)) / L._ink[col] + '%';
  if (d >= avail) endStroke();
};
cv.onpointerup = cv.onpointercancel = endStroke;
function endStroke() {
  if (!cur) return;
  if (cur._len >= .3) { strokes.push(cur); sfx(0, cur._c); if (scr == 3) send(['k', cur._c, cur._p.map(v => +v.toFixed(1))]); }
  cur = null; hud();
}

// Sim events → particles/sounds. e = [kind, colour, x, y]; kinds: 0 touch 1 trigger 2 fling 3 crumble 4 fail 5 win 6 gate
function events(r, ghost) {
  for (const e of r._ev.splice(0)) {
    const k = e[0], c = e[1];
    if (ghost) continue;
    spawn(e[2], e[3], k == 4 ? '#ccc' : k == 5 ? COLS[(T * 7 | 0) % 7] : COLS[c], k == 5 ? 30 : k == 4 ? 12 : 5, rnd);
    sfx(k == 0 ? 0 : k == 1 ? (c == 0 ? 2 : c == 3 ? 4 : c == 6 ? 5 : 0) : k + 1, c);
  }
}

// Main loop: fixed-step sim with an accumulator, render every frame.
function frame(ts) {
  const dt = min(.1, (ts - last) / 1e3 || 0); last = ts; T += dt;
  if (run && !run._state) {
    acc += dt;
    for (let n = 0; acc >= DT && n < 4; n++) { step(run); acc -= DT; events(run); }
    if (run._state == 1) onWin(); else if (run._state == 2) { failT = T + .8; if (scr == 3) send(['f']); }
  } else if (run && run._state == 2 && T > failT) rewind();
  for (const gh of ghosts) if (gh._run && !gh._run._state) for (let n = 0; n < 1; n++) { step(gh._run); events(gh._run, 1); }
  render(dt);
  requestAnimationFrame(frame);
}

function onWin() {
  const u = used(), t = total(), star = u <= t * .6;
  if (!daily && scr == 2) { prog.done[li] = 1; if (star) prog.stars[li] = 1; save(); }
  if (scr == 3) { send(['w', +run._t.toFixed(3)]); raceWin(myId, run._t); return; }
  show(winUI(u, t, star, li >= 19 || daily, daily ? 'Daily done!' : ''));
}

function render(dt) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#241d4a'; g.fillRect(0, 0, cv.width, cv.height);
  g.setTransform(sc * dpr, 0, 0, sc * dpr, ox * dpr, oy * dpr);
  if (scr >= 2 && L) {
    drawWorld(g, L, run, T);
    for (const gh of ghosts) if (gh._run) { g.globalAlpha = .35; drawStrokes(g, gh._run._s); if (!gh._run._state) drawUnicorn(g, gh._run._u, T); g.globalAlpha = 1; }
    drawStrokes(g, run ? run._s : strokes, cur);
    drawStart(g, L._sx, L._sy, L._sd); drawGem(g, L._gx, L._gy, T);
    if (run) { if (run._state != 2) drawUnicorn(g, run._u, T); }
    else drawUnicorn(g, { _x: L._sx, _y: L._sy - R, _dir: L._sd, _g: 1, _gr: 1 }, 0);
  } else { // title / select backdrop: sky, rainbow arc, idle unicorn
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#6ea8ff'); sky.addColorStop(1, '#ffd6ea');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.lineWidth = .6;
    for (let c = 0; c < 7; c++) { g.strokeStyle = COLS[c]; g.beginPath(); g.arc(16, 22, 15 - c * .6, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    drawUnicorn(g, { _x: 16 + Math.sin(T) * 2, _y: 5.9, _dir: 1, _g: 1, _gr: 1 }, T);
  }
  drawParts(g, dt);
}

// ---- Online race (docs/06): thin glue over net.js ----
let room = '', myId = '', ghosts = [], seed = 0, round = 0, host = 0, raceOver = 0;
function openLobby(code) {
  if (code === undefined) { const m = location.hash.match(/#r=(\w{4})/); if (!m) return; code = m[1]; }
  ghosts = []; raceOver = 0;
  join(code, (st, data) => {
    if (st == 'err') return show(lobbyUI(data, '', 0) );
    if (st == 'open') { room = data.room; myId = data.id; show(lobbyUI('Connected. Share the code!', room, data.n)); }
    if (st == 'n') show(lobbyUI(raceOver ? raceOver : 'Waiting for host to start…', room, data));
    if (st == 'msg') onMsg(data);
    if (st == 'close') show(lobbyUI('Reconnecting…', room, 0));
  });
}
function raceStart() { seed = (Math.random() * 1e9) | 0; round++; send(['s', seed, round]); startRound(seed); }
function startRound(s) { seed = s; raceOver = 0; ghosts.forEach(gh => { gh._s = []; gh._run = null; }); loadLevel(20, s); }
function onMsg([type, id, ...a]) {
  let gh = ghosts.find(x => x._id == id); if (!gh) ghosts.push(gh = { _id: id, _s: [], _run: null });
  if (type == 's') startRound(a[0]);
  else if (type == 'k') gh._s.push(mkStroke(a[0], a[1]));
  else if (type == 'u') gh._s.pop(); else if (type == 'c') gh._s = [];
  else if (type == 'p' && L) gh._run = createRun(L, gh._s);
  else if (type == 'f') gh._run = null;
  else if (type == 'w') raceWin(id, a[0]);
}
function raceWin(id, t) {
  if (raceOver) return;
  raceOver = id == myId ? 'You win!' : 'Ghost ' + id + ' wins!';
  run = null; show(lobbyUI(raceOver + ' (' + t.toFixed(2) + 's)', room, ghosts.length + 1));
}

window.__prism = { toScreen: (x, y) => [ox + x * sc, oy + y * sc], load: i => (scr = 2, loadLevel(i)), setStrokes: sol => { strokes = sol.map(([c, p]) => mkStroke(c, p)); hud(); }, get run() { return run; }, get scr() { return scr; }, get strokes() { return strokes; } };
goTitle();
if (location.hash.startsWith('#r=')) goLobby();
requestAnimationFrame(frame);
