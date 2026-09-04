// Boot, state machine, screens, HUD, input. Talks to sim.js (pure) and render.js (canvas).
import { parseLevel, createRun, step, mkStroke, inSolid, strokeLen, COLS, DT, W, H, R, min, max, hypot } from './sim.js';
import { LEVELS } from './levels.js';
import { drawWorld, drawStrokes, drawGem, drawStart, drawUnicorn, drawParts, spawn, PARTS } from './render.js';
import { titleUI, selectUI, hudUI, winUI, lobbyUI, cardUI, raceUI, onWD } from './ui.js';
import { sfx, initAudio, snd, setSnd, playNote, fanfare, setMusic, setKey, setSeq } from './audio.js';
import { join, send, leave, myId, NET } from './net.js';
import { gen, daySeed } from './gen.js';

const Q = s => document.querySelector(s), ui = Q('#ui'), cv = Q('#c'), g = cv.getContext('2d');
const rnd = Math.random; // render-side randomness only (particles); the sim never uses it
let dpr, sc, ox, oy;      // canvas scale: world unit → css px, and letterbox offset
let scr = 0;              // 0 title, 1 select, 2 game, 3 lobby
let li = 0, L, strokes = [], run = null, col = 0, cur = null, played = 0, failT = 0, daily = 0;
let T = 0, last = 0, acc = 0;
const A0 = Math.PI * 1.018, AS = Math.PI * .964; // title rainbow: the sweep whose ends meet the bottom edge
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

// Mark which draw-phase strokes would fall on Play (rendered faded) by settling a throwaway run.
const preview = () => createRun(L, strokes)._s.forEach((s, i) => strokes[i]._sup = s._sup);
function hud() {
  if ((scr != 2 && scr != 3) || !L || over) return;
  if (!run) { preview(); setSeq(strokes.map(s => [s._c, s._p[0]])); } // the canvas is the melody (audio.js)
  const tag = scr == 3 ? 'Round ' + round + ' · ' + mine() + '–' + theirs() + (ghosts.some(g => g._go) ? ' · rival racing' : '') : '';
  show(hudUI(L, col, L._ink.map((v, c) => inkLeft(c)), !!run, played ? '' : L._hint, snd, tag));
}

// Load level i, or the daily/online generated level when i == LEVELS.length (from `seed`).
function loadLevel(i, seed) {
  li = i; daily = i == LEVELS.length ? seed : 0;
  L = parseLevel(daily ? gen(seed)[0] : LEVELS[i]);
  strokes = []; run = null; cur = null; played = 0; over = 0; PARTS.length = 0;
  col = L._ink.indexOf(max(...L._ink)); scr = scr == 3 ? 3 : 2;
  setKey(((daily ? seed : (i / 5 | 0) * 7) + 5) % 12 - 5); setMusic(1); hud(); // key: a fifth up every five levels (C G D A E B F# C#), the seed's for generated ones
}

let hits = []; // colours the unicorn touched this run, in order — the win fanfare replays them
function play() {
  if (run) return;
  run = createRun(L, strokes); played = 1; hits = []; hud(); sfx(1); setMusic(2); if (scr == 3) send(['p']);
}
function rewind() { run = null; PARTS.length = 0; hud(); setMusic(1); }

// Screens
const count = a => a.filter(Boolean).length;
const title = () => { let d = 0; try { d = localStorage.prism26_daily == daySeed(); } catch (e) { } show(titleUI(snd, count(prog.done), count(prog.stars), LEVELS.length, d)); };
const goTitle = () => { scr = 0; run = null; ghosts = []; leave(); setMusic(0); title(); };
const goSelect = () => { scr = 1; run = null; setMusic(0); show(selectUI(prog, LEVELS.length)); };
// L = null: the lobby must forget whatever level was open, because 'no level' is how the peers-changed handler
// tells 'no round yet' (show the lobby, with Start for the host) from 'round live' (show the HUD). A stale level
// made the host jump to that level's HUD the moment a guest joined, while the guest waited for Start forever.
const goLobby = () => { scr = 3; run = null; L = null; show(lobbyUI('Create a room or enter a code', '', 0)); openLobby(); };

// Actions dispatched from data-a attributes.
const act = {
  go: goSelect, bk: () => scr == 2 && !daily ? goSelect() : goTitle(), on: goLobby,
  dy: () => loadLevel(LEVELS.length, daySeed()),
  sn: () => { setSnd(prog.snd = snd ? 0 : 1); save(); scr ? hud() : title(); },
  lv: v => { v = +v; if (!v || prog.done[v - 1]) loadLevel(v); },
  co: () => { let i = 0; while (i < LEVELS.length - 1 && prog.done[i]) i++; loadLevel(i); },
  c: v => { col = +v; hud(); playNote(col); },
  u: () => { if (!run && strokes.length) { strokes.pop(); hud(); } },
  x: () => { if (!run && strokes.length) { strokes = []; hud(); } },
  p: play, r: rewind,
  nx: () => { if (li < LEVELS.length - 1) loadLevel(li + 1); else goSelect(); },
  cr: () => openLobby(1), jn: () => openLobby((Q('#j') || {}).value), lv0: leaveRoom, cp: copyLink,
  st: raceStart,
};
ui.onclick = e => { const b = e.target.closest('[data-a]'); if (b) { initAudio(); sfx(8); act[b.dataset.a](b.dataset.v); } };
onkeydown = e => {
  const k = e.key;
  if (scr == 2 || (scr == 3 && !over)) {
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
  if (d < .15 || (col != 5 && (inSolid(L, x, y) || inSolid(L, (x + px) / 2, (y + py) / 2)))) return;
  const avail = inkLeft(col) - cur._len;
  if (d >= avail) { x = px + (x - px) * avail / d; y = py + (y - py) * avail / d; }
  p.push(x, y); cur._len += min(d, avail);
  const b = Q('#i' + col); if (b) b.style.width = 100 * (avail - min(d, avail)) / L._ink[col] + '%';
  if (d >= avail) endStroke();
};
cv.onpointerup = cv.onpointercancel = endStroke;
function endStroke() {
  if (!cur) return;
  if (cur._len >= .3) { strokes.push(cur); playNote(cur._c, 1, cur._p[0]); }
  cur = null; hud();
}

// Sim events → particles/sounds. e = [kind, colour, x, y]; kinds: 0 touch 1 trigger 2 fling 3 crumble 4 fail 5 win 6 gate 7 paint landed
function events(r, ghost) {
  for (const e of r._ev.splice(0)) {
    const k = e[0], c = e[1];
    if (ghost) continue;
    if (k == 5) for (let i = 0; i < 7; i++) spawn(e[2], e[3], COLS[i], 6, rnd); // rainbow win burst
    else spawn(e[2], e[3], k == 4 ? '#ccc' : COLS[c], k == 4 ? 12 : k == 6 ? 20 : 5, rnd);
    if (k < 2) hits.push(c);
    if (k == 0 || (k == 1 && c != 0 && c != 6)) playNote(c, 0, e[2]); // the paint plays its note from where the unicorn is
    else if (k == 5) fanfare(hits);
    else sfx(k == 1 ? (c == 0 ? 2 : 5) : [0, 0, 4, 3, 6, 7, 9, 10][k], c);
    if (k == 6) ach('gate');
  }
}

// Main loop: fixed-step sim with an accumulator, render every frame.
function frame(ts) {
  const dt = min(.1, (ts - last) / 1e3 || 0); last = ts; T += dt;
  if (run && !run._state) {
    acc += dt;
    for (let n = 0; acc >= DT && n < 4; n++) { step(run); acc -= DT; events(run); }
    if (run._state == 1) onWin(); else if (run._state == 2) failT = T + .8;
  } else if (run && run._state == 2 && T > failT) rewind();
  if (scr == 3) for (const gh of ghosts) if (gh._run && !gh._run._state) { step(gh._run); events(gh._run, 1); }
  render(dt);
  requestAnimationFrame(frame);
}

function onWin() {
  const u = used(), t = total(), star = u <= t * .6;
  if (!daily && scr == 2) {
    prog.done[li] = 1; if (star) prog.stars[li] = 1; save();
    const d = count(prog.done), s = count(prog.stars);
    ach('gem'); if (d > 19) ach('half'); if (d > 39) ach('all'); if (s > 9) ach('star10'); if (s > 39) ach('star40'); if (strokes.length == 1) ach('solo');
    lb('levels', d); lb('stars', s);
  }
  else if (daily && scr == 2) { try { localStorage.prism26_daily = daily; } catch (e) { } ach('daily'); lb('daily', run._t * 1e3 | 0, 1); }
  setMusic(1);
  if (scr == 3) { send(['w', +run._t.toFixed(3), strokes.map(k => [k._c, k._p])]); raceWin(myId(), run._t); return; }
  show(winUI(u, t, star, li >= LEVELS.length - 1 || daily, daily ? 'Daily done!' : ''));
}

function render(dt) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#241d4a'; g.fillRect(0, 0, cv.width, cv.height);
  g.setTransform(sc * dpr, 0, 0, sc * dpr, ox * dpr, oy * dpr);
  if (scr >= 2 && L) {
    drawWorld(g, L, run, T);
    if (scr == 3) for (const gh of ghosts) if (gh._run) { drawStrokes(g, gh._run._s, 0, .35); if (!gh._run._state) { g.globalAlpha = .35; drawUnicorn(g, gh._run._u, T); g.globalAlpha = 1; } }
    drawStrokes(g, run ? run._s : strokes, cur);
    drawStart(g, L._sx, L._sy, L._sd); drawGem(g, L._gx, L._gy, T);
    if (run) { if (run._state != 2) drawUnicorn(g, run._u, T); }
    else if (!over) drawUnicorn(g, { _x: L._sx, _y: L._sy - R, _dir: L._sd, _g: 1, _gr: 1 }, 0);
  } else {
    // Title / select / lobby backdrop, drawn in css pixels rather than world units: the world box letterboxes
    // to a thin strip in portrait, which left the art stranded between dead bars. Anchored below the bottom
    // edge with a height-proportional radius, the arch frames the menu on every aspect and its apex stays
    // above the title text. The loop is the game in miniature: paint a rainbow, then walk it.
    const cw = innerWidth, ch = innerHeight, cx = cw / 2, cy = ch * 1.05, rr = ch * .86, lw = ch * .022;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, ch); sky.addColorStop(0, '#6ea8ff'); sky.addColorStop(1, '#ffd6ea');
    g.fillStyle = sky; g.fillRect(0, 0, cw, ch);
    const k = T % 10, pn = min(1, k / 3.5), wk = min(1, max(0, (k - 4) / 5)), f = wk ? .25 + .5 * wk : min(.25, pn);
    g.globalAlpha = min(1, k * 2, 10 - k); // fade out and back in so the restart is not a jump cut
    g.lineWidth = lw; g.lineCap = 'round';
    for (let c = 0; c < 7; c++) { g.strokeStyle = COLS[c]; g.beginPath(); g.arc(cx, cy, rr - c * lw, A0, A0 + AS * pn); g.stroke(); }
    g.lineCap = 'butt';
    const a = A0 + AS * f, us = ch * .055, r = rr + lw / 2 + us * .52; // stand on the outer band, upright to the curve
    g.save(); g.translate(cx + r * Math.cos(a), cy + r * Math.sin(a)); g.rotate(a + Math.PI / 2); g.scale(us, us);
    drawUnicorn(g, { _x: 0, _y: 0, _dir: 1, _g: 1, _gr: 1 }, f < .25 || (wk && wk < 1) ? T : 0); g.restore();
    g.globalAlpha = 1;
  }
  drawParts(g, dt);
}

// ---- Online race (docs/06): lobby, best-of-3 rounds, winner's replay ----
// Nothing about a player's paint leaves their machine until they win the round: the only in-round message is
// 'p' (started running), so nobody can read a rival's solution off the screen while they still need it. The
// winner's strokes travel with their 'w', and everyone else watches that run replay on the result screen.
let room = '', ghosts = [], round = 0, over = 0, score = {};
const isHost = () => [myId(), ...ghosts.map(g => g._id)].sort()[0] == myId();
const lobby = st => show(lobbyUI(st, room, ghosts.length + 1, isHost() && ghosts.length)); // Start needs a rival
const mine = () => score[myId()] || 0;
const theirs = () => ghosts.reduce((s, g) => s + (score[g._id] || 0), 0);
const scoreLine = () => `You ${mine()} – ${theirs()} Rival`;
const showRes = () => show(raceUI(over._w, over._s, scoreLine(), over._d, isHost()));
function openLobby(code) {
  if (code === undefined) { const h = location.hash.match(/#r=([a-zA-Z]{4})/); if (!h) return; code = h[1]; }
  ghosts = []; over = 0; round = 0; score = {};
  join(code, (st, data) => {
    if (st == 'err') { room = ''; lobby(data); }
    else if (st == 'open') { room = data.room; lobby('Connected. Share the code!'); }
    else if (st == 'n') {
      ghosts = data.map(i => ghosts.find(g => g._id == i) || { _id: i, _s: [], _run: null });
      if (over) showRes(); else if (!L) lobby(isHost() ? 'Press Start when everyone is in' : 'Waiting for the host to start…'); else hud();
    }
    else if (st == 'msg') onMsg(data);
    else if (st == 'close') lobby('Reconnecting…');
  });
}
// Copy the room link — or, on Wavedash, the code on its own: the game runs in that platform's iframe, so its
// own URL is a sandbox path nobody can open, and the other player types the code in anyway.
// navigator.clipboard needs a secure context and the clipboard-write permission, neither of which an embedded
// game can count on, and it rejects silently — so only the synchronous execCommand path (valid inside this click
// gesture) is used, and if it fails the text itself goes in the status line to be copied by hand.
function copyLink() {
  const wd = onWD(), u = wd ? room : location.href.split('#')[0] + '#r=' + room;
  const t = document.createElement('textarea'), done = (wd ? 'Code' : 'Link') + ' copied!';
  let ok = 0;
  t.value = u; t.style.cssText = 'position:fixed;top:0;opacity:0';
  document.body.appendChild(t); t.select(); t.setSelectionRange(0, 1e5);
  try { ok = document.execCommand('copy'); } catch (e) { }
  t.remove();
  lobby(ok ? done : u);
}
function leaveRoom() { leave(); room = ''; ghosts = []; score = {}; over = round = 0; L = null; show(lobbyUI('Create a room or enter a code', '', 0)); }
// Host drives the rounds: Start / Next round / Rematch all land here. Round 1 means a fresh match, so the
// scores reset on both sides from the round number alone (a rejoining player picks up the same rule).
function raceStart() { if (!isHost() || !ghosts.length) return; const s = Math.random() * 1e9 | 0, r = over && over._d ? 1 : round + 1; send(['s', s, r]); startRound(s, r); }
function startRound(s, r) {
  round = r; if (r == 1) score = {};
  ghosts.forEach(gh => { gh._s = []; gh._run = null; gh._go = 0; });
  loadLevel(LEVELS.length, s);
  show(cardUI('Round ' + r, r > 1 ? scoreLine() : 'First to two rounds takes the match'));
  setTimeout(() => { if (scr == 3 && !over) hud(); }, 1400);
}
function onMsg([type, id, ...a]) {
  let gh = ghosts.find(x => x._id == id); if (!gh) ghosts.push(gh = { _id: id, _s: [], _run: null });
  if (type == 's') startRound(a[0], a[1]);
  else if (type == 'p') { gh._go = 1; hud(); }                       // rival is running — no paint, just presence
  else if (type == 'w') { gh._s = a[1].map(k => mkStroke(k[0], k[1])); if (L) gh._run = createRun(L, gh._s); raceWin(id, a[0]); }
}
// Round over. First to the gem takes the round; best of three (or three rounds) takes the match. The loser's
// own run is dropped so the winner's replay has the stage; the winner's unicorn stays parked on the gem.
function raceWin(id, t) {
  if (over) return;
  const won = id == myId();
  score[id] = (score[id] || 0) + 1;
  setMusic(1);                       // the winner's fanfare already fired from their own win event
  if (won) ach('race'); else { run = null; sfx(6); }
  over = {
    _w: won, _d: mine() > 1 || theirs() > 1 || round > 2,
    _s: (won ? 'You reached the gem first, in ' : 'Your rival got there first, in ') + t.toFixed(2) + 's',
  };
  showRes();
}

window.__prism = { net: NET, gs: () => ghosts.map(g => [g._s.length, !!g._run]), toScreen: (x, y) => [ox + x * sc, oy + y * sc], load: i => (scr = 2, loadLevel(i)), setStrokes: sol => { strokes = sol.map(([c, p]) => mkStroke(c, p)); hud(); }, get run() { return run; }, get strokes() { return strokes; } };
// Wavedash: the platform injects a global `Wavedash` before the game boots, so nothing is loaded from outside
// the zip; everywhere else (js13k, offline, file://) every wd() call is a no-op. Achievements are created on the
// portal by id (tools/wavedash-achievements.sh); leaderboards are created on first use. Nothing here may throw
// or leave a rejected promise behind — either would be a console error, which is a release blocker.
const wd = f => { try { const W = self.Wavedash; if (W) return f(W); } catch (e) { } };
const ach = id => wd(W => W.setAchievement(id, 1));
// lb(name, value, isTime): sort 0 = ascending (times) / 1 = descending; display 2 = milliseconds / 0 = numeric.
const lb = (name, v, t) => wd(W => W.getOrCreateLeaderboard(name, t ? 0 : 1, t ? 2 : 0).then(r => W.uploadLeaderboardScore(r.data.id, v, 1)).catch(e => { }));
wd(W => { if (!W.initialized) { W.init(); if (W.readyForEvents) W.readyForEvents(); } });
goTitle();
if (location.hash.startsWith('#r=')) goLobby();
requestAnimationFrame(frame);
