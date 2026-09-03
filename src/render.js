// Canvas rendering: world, paint, unicorn, particles. Reads sim state, never writes it.
import { COLS, R, W, H, PI, sin, cos, min, max, abs, hypot } from './sim.js';

export const PARTS = []; // {x,y,vx,vy,l,c} — render-side only, max 80

export function spawn(x, y, col, n, rnd) {
  for (let i = 0; i < n && PARTS.length < 80; i++) {
    const a = rnd() * 2 * PI, s = 2 + rnd() * 5;
    PARTS.push({ x, y, vx: cos(a) * s, vy: sin(a) * s - 3, l: .6 + rnd() * .4, c: col });
  }
}

// Rounded rect path helper (shared by blocks, buttons-in-canvas, unicorn parts).
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.roundRect(x, y, w, h, r);
}

export function drawWorld(g, L, run, t) {
  // sky
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#6ea8ff'); sky.addColorStop(1, '#ffd6ea');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // rects
  for (const r of L._rects) {
    const { _x: x, _y: y, _w: w, _h: h, _t: ty } = r;
    if (ty == 1) { // spikes
      g.fillStyle = '#8a8ea3'; g.beginPath();
      for (let i = 0; i < w; i += .5) { g.moveTo(x + i, y + h); g.lineTo(x + i + .25, y); g.lineTo(x + i + .5, y + h); }
      g.fill();
    } else if (ty == 2) { // water
      g.fillStyle = '#3d8dff'; g.fillRect(x, y, w, h);
      g.fillStyle = '#9fd0ff'; g.beginPath(); g.moveTo(x, y + .2);
      for (let i = 0; i <= w; i += .5) g.lineTo(x + i, y + .2 + sin(t * 3 + i * 2) * .1);
      g.lineTo(x + w, y + .5); g.lineTo(x, y + .5); g.fill();
    } else if (ty == 3 && !(run && run._gate)) { // gate: striped, 7 dots
      g.fillStyle = '#7d7f95'; g.fillRect(x, y, w, h);
      g.fillStyle = '#5b5d73';
      for (let i = 0; i < h; i += 1) g.fillRect(x, y + i, w, .5);
      const m = run ? run._u._mask : 0;
      for (let c = 0; c < 7; c++) {
        g.fillStyle = m >> c & 1 ? COLS[c] : '#3a3b4a';
        g.beginPath(); g.arc(x + w / 2, y + .6 + c * min(1, (h - 1.2) / 6), .18, 0, 7); g.fill();
      }
    } else if (ty == 0) { // cloud block
      g.fillStyle = '#f4f2ff'; rr(g, x, y, w, h, .35); g.fill();
      g.fillStyle = '#fff'; rr(g, x + .1, y + .1, w - .2, min(.35, h - .2), .2); g.fill();
      g.fillStyle = '#d9d4f5'; rr(g, x + .1, y + max(h - .35, .1), w - .2, min(.25, h - .2), .2); g.fill();
    }
  }
}

export function drawStrokes(g, strokes, cur) {
  const all = cur ? [...strokes, cur] : strokes;
  for (let c = 0; c < 7; c++) for (const s of all) if (s._c == c && !s._dead && s._p.length > 3) {
    g.globalAlpha = s._armed == 0 ? .4 : 1;
    g.lineCap = g.lineJoin = 'round';
    g.setLineDash(s._touched && c == 2 ? [.3, .2] : []);
    g.beginPath(); g.moveTo(s._p[0], s._p[1]);
    for (let i = 2; i < s._p.length; i += 2) g.lineTo(s._p[i], s._p[i + 1]);
    g.strokeStyle = COLS[c]; g.lineWidth = .5; g.stroke();
    g.strokeStyle = '#fff6'; g.lineWidth = .18; g.stroke();
    g.setLineDash([]); g.globalAlpha = 1;
  }
}

export function drawGem(g, x, y, t) {
  g.save(); g.translate(x, y); g.rotate(t * 1.5); g.scale(1 + sin(t * 4) * .08, 1 + sin(t * 4) * .08);
  g.fillStyle = '#fff'; g.fillRect(-.6, -.6, 1.2, 1.2);
  g.fillStyle = '#ffb6f2'; g.fillRect(-.42, -.42, .84, .84);
  g.fillStyle = '#fff'; g.fillRect(-.42, -.42, .42, .42);
  g.restore();
}

export function drawStart(g, x, y, d) {
  g.fillStyle = '#fff8'; rr(g, x - .8, y - .12, 1.6, .24, .12); g.fill();
  g.fillStyle = '#ffd1f0'; g.beginPath(); g.moveTo(x + d * .9, y - .5); g.lineTo(x + d * .4, y - .85); g.lineTo(x + d * .4, y - .15); g.fill();
}

// The unicorn: body ellipse, head, horn, mane, legs. u = run._u, t = seconds for leg animation.
export function drawUnicorn(g, u, t) {
  g.save(); g.translate(u._x, u._y);
  if (u._climb) { const v = hypot(u._vx, u._vy) || 1; const a = Math.atan2(u._vy, u._vx); g.rotate(u._dir < 0 ? a + PI : a); }
  g.scale(u._dir, u._g);
  const walk = u._gr || u._climb ? sin(t * 14) * .12 : .1;
  g.fillStyle = '#fbe5f3';
  for (const dx of [-.22, .2]) { rr(g, dx - .09, .15, .2, .35 + (dx < 0 ? walk : -walk), .08); g.fill(); }
  g.beginPath(); g.ellipse(0, 0, .55, .36, 0, 0, 7); g.fill();
  g.beginPath(); g.arc(.5, -.3, .28, 0, 7); g.fill(); // head
  g.fillStyle = '#ffe14d'; g.beginPath(); g.moveTo(.6, -.55); g.lineTo(.68, -1.05); g.lineTo(.78, -.5); g.fill(); // horn
  g.lineWidth = .1; g.lineCap = 'round';
  for (let i = 0; i < 3; i++) { g.strokeStyle = COLS[i * 2]; g.beginPath(); g.arc(.15 - i * .2, -.3, .25, PI, PI * 1.9); g.stroke(); } // mane
  g.strokeStyle = COLS[6]; g.beginPath(); g.moveTo(-.55, -.05); g.quadraticCurveTo(-.9, -.4, -.8, .2); g.stroke(); // tail
  g.fillStyle = '#332'; g.beginPath(); g.arc(.6, -.34, .05, 0, 7); g.fill(); // eye
  g.restore();
}

export function drawParts(g, dt) {
  for (let i = PARTS.length; i--;) {
    const p = PARTS[i];
    p.l -= dt; if (p.l <= 0) { PARTS.splice(i, 1); continue; }
    p.vy += 20 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    g.globalAlpha = min(1, p.l * 2); g.fillStyle = p.c;
    g.beginPath(); g.arc(p.x, p.y, .15, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
}
