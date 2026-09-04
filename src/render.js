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
    }
  }
}

// Strokes: colour order 0→6. Faded when unsupported (draw phase preview or falling) or a spent violet.
export function drawStrokes(g, strokes, cur) {
  const all = cur ? [...strokes, cur] : strokes;
  for (let c = 0; c < 7; c++) for (const s of all) if (s._c == c && !s._dead && s._p.length > 3) {
    g.globalAlpha = s._armed == 0 || s._sup == 0 ? .45 : 1;
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

export function drawStart(g, x, y) {
  g.fillStyle = '#fff8'; rr(g, x - .8, y - .12, 1.6, .24, .12); g.fill();
}

// Rainbow gradient along a line (mane, tail).
function rainbow(g, x0, y0, x1, y1) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (let i = 0; i < 7; i++) gr.addColorStop(i / 6, COLS[i]);
  return gr;
}

// The unicorn. u = run._u (x, y, dir, g, gr, climb, vx, vy, ph, fe), t = seconds for the leg cycle.
// Local space: origin at the circle centre, facing +x, y down; hooves at y = R.
export function drawUnicorn(g, u, t) {
  const air = !u._gr && !u._climb, ph = u._ph > 0;
  g.save(); g.translate(u._x, u._y);
  if (u._climb) { const a = Math.atan2(u._vy, u._vx); g.rotate(u._dir < 0 ? a + PI : a); }
  g.scale(u._dir, u._g);
  if (ph) g.globalAlpha = .55;
  const W_ = '#fff6fb', O = '#7a4d7d', E = .05;
  g.lineWidth = E; g.lineCap = g.lineJoin = 'round'; g.strokeStyle = O;
  // feather wing (blue) while gliding: scalloped wing behind the shoulder
  if (u._fe && air) {
    g.fillStyle = '#cfe9ff';
    g.beginPath(); g.moveTo(.05, -.25); g.quadraticCurveTo(-.3, -1.1, -1.05, -.9);
    g.quadraticCurveTo(-.85, -.6, -.7, -.55); g.quadraticCurveTo(-.6, -.35, -.4, -.3); g.quadraticCurveTo(-.25, -.15, .05, -.25); g.fill(); g.stroke();
  }
  // legs: hip x, phase. Diagonal pairs swing together; airborne legs splay.
  const walk = u._gr || u._climb ? t * 14 : 0;
  const legs = [[-.3, 0], [.22, PI], [-.22, PI], [.3, 0]];
  legs.forEach(([hx, p], i) => {
    const a = air ? (i < 2 ? -.5 : .5) : sin(walk + p) * .5;
    g.save(); g.translate(hx, .1); g.rotate(a);
    g.fillStyle = i < 2 ? '#e8d3ea' : W_; rr(g, -.075, 0, .15, .42, .07); g.fill(); g.stroke();
    g.fillStyle = O; rr(g, -.085, .32, .17, .1, .04); g.fill();
    g.restore();
  });
  // tail
  g.lineWidth = .16; g.strokeStyle = rainbow(g, -.5, -.6, -.9, .3);
  g.beginPath(); g.moveTo(-.5, -.15); g.quadraticCurveTo(-1, -.5, -.85, .25); g.stroke();
  g.lineWidth = E; g.strokeStyle = O;
  // body + neck + head + snout
  g.fillStyle = W_;
  g.beginPath(); g.ellipse(-.03, .02, .55, .34, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(.2, -.2); g.quadraticCurveTo(.35, -.7, .6, -.75); g.lineTo(.8, -.45); g.quadraticCurveTo(.65, -.3, .45, .05); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(.62, -.62, .3, .24, .3, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(.88, -.52, .17, .14, .2, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#ffd1e8'; g.beginPath(); g.ellipse(.9, -.52, .09, .08, 0, 0, 7); g.fill(); // muzzle
  // ear
  g.fillStyle = W_; g.beginPath(); g.moveTo(.36, -.72); g.lineTo(.38, -1.06); g.lineTo(.58, -.82); g.fill(); g.stroke();
  // horn: gold with stripes
  g.fillStyle = '#ffd34d'; g.beginPath(); g.moveTo(.55, -.85); g.lineTo(.78, -1.4); g.lineTo(.74, -.78); g.fill(); g.stroke();
  g.strokeStyle = '#d9971f'; g.beginPath(); g.moveTo(.6, -1); g.lineTo(.76, -1.05); g.moveTo(.65, -1.15); g.lineTo(.77, -1.19); g.stroke();
  // mane: rainbow ribbon from the horn down the neck
  g.lineWidth = .2; g.strokeStyle = rainbow(g, .5, -1, -.1, -.2);
  g.beginPath(); g.moveTo(.5, -.95); g.quadraticCurveTo(.1, -.9, .05, -.35); g.stroke();
  g.lineWidth = .1; g.beginPath(); g.moveTo(.3, -.85); g.quadraticCurveTo(-.05, -.55, -.15, -.3); g.stroke();
  // eye + blush
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(.7, -.66, .09, .1, 0, 0, 7); g.fill();
  g.fillStyle = '#3a2440'; g.beginPath(); g.arc(.73, -.66, .06, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(.75, -.69, .022, 0, 7); g.fill();
  g.strokeStyle = O; g.lineWidth = E; g.beginPath(); g.moveTo(.63, -.78); g.quadraticCurveTo(.72, -.82, .8, -.76); g.stroke(); // brow/lash
  g.fillStyle = '#ffa3c4'; g.globalAlpha *= .6; g.beginPath(); g.arc(.72, -.5, .06, 0, 7); g.fill();
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
