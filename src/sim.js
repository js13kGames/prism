// PRISM — pure deterministic simulation. No DOM, no canvas, no audio, no Math.random.
// Every internal property is prefixed with `_` so terser can mangle it (see build.js).
// State codes: 0 = playing, 1 = win, 2 = fail.

export const { abs, min, max, sqrt, hypot, sin, cos, PI } = Math;

// World and physics constants (docs/02, docs/04). Tune only with a DECISIONS.md entry.
export const W = 32, H = 18, G = 40, DT = 1 / 60, R = .5, WALK = 4, MAXFALL = 30,
  DASH = 2.3, BMIN = 27, BMAX = 36, BK = 1.5, CRUMBLE = .6, FLING = 8, ICEMAX = 22,
  TIMEOUT = 25, OUT = 3;

// Colour indices: 0 red bounce, 1 orange dash, 2 yellow brittle, 3 green vine,
// 4 blue ice, 5 indigo phase, 6 violet flip. Rect types: 0 solid, 1 spike, 2 water, 3 gate.
export const COLS = ['#ff5d6c', '#ffa64d', '#ffe14d', '#5fd68a', '#5db8ff', '#7b6cff', '#d977ff'];

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// 'N name|H hint|S x y d|G x y|R x y w h|K ...|W ...|T ...|I O14 R6' → level object
export function parseLevel(str) {
  const L = { _name: '', _hint: '', _rects: [], _ink: [0, 0, 0, 0, 0, 0, 0], _sx: 2, _sy: 14, _sd: 1, _gx: 28, _gy: 13 };
  for (const tok of str.split('|')) {
    const [k, ...a] = tok.split(' '), n = a.map(Number);
    if (k == 'N') L._name = a.join(' ');
    else if (k == 'H') L._hint = a.join(' ');
    else if (k == 'S') [L._sx, L._sy, L._sd] = n;
    else if (k == 'G') [L._gx, L._gy] = n;
    else if (k == 'I') for (const s of a) L._ink['ROYGBIV'.indexOf(s[0])] = +s.slice(1);
    else if ('RKWT'.includes(k)) L._rects.push({ _x: n[0], _y: n[1], _w: n[2], _h: n[3], _t: 'RKWT'.indexOf(k) });
  }
  return L;
}

export function strokeLen(p) {
  let l = 0;
  for (let i = 2; i < p.length; i += 2) l += hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
  return l;
}

// A stroke: colour index + flat point list. Per-run state is added by createRun.
export const mkStroke = (c, p) => ({ _c: c, _p: p, _len: strokeLen(p) });

// True if the point is strictly inside a solid (or gate) rect — used to clip drawing.
export function inSolid(L, x, y) {
  for (const r of L._rects) if (r._t != 1 && r._t != 2 && x > r._x && x < r._x + r._w && y > r._y && y < r._y + r._h) return 1;
  return 0;
}

export function createRun(L, strokes) {
  return {
    _lv: L,
    _s: strokes.map(s => ({ _c: s._c, _p: s._p.slice(), _len: s._len, _touched: 0, _t: 0, _armed: 1, _dead: 0 })),
    _u: { _x: L._sx, _y: L._sy - R, _vx: 0, _vy: 0, _dir: L._sd, _g: 1, _climb: null, _bcd: 0, _fcd: 0, _mask: 0, _gr: 0, _surf: -1, _ps: 0, _py: L._sy - R },
    _t: 0, _state: 0, _ev: [], _gate: 0
  };
}

// Closest point on segment ab to p → [x, y].
function closest(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return [ax + dx * t, ay + dy * t];
}

// Does the unicorn circle at (x,y) overlap rect r?
const hitRect = (r, x, y) => hypot(x - clamp(x, r._x, r._x + r._w), y - clamp(y, r._y, r._y + r._h)) < R;

// Circle overlaps any solid (or closed gate) rect.
function blocked(run, x, y) {
  for (const r of run._lv._rects) if ((r._t == 0 || (r._t == 3 && !run._gate)) && hitRect(r, x, y)) return 1;
  return 0;
}

// Collect all contacts: paint first (so a pad drawn on a floor line still acts), then rects, deepest first.
function contacts(run) {
  const u = run._u, out = [];
  for (const r of run._lv._rects) {
    if (r._t == 1 || r._t == 2 || (r._t == 3 && run._gate)) continue;
    const cx = clamp(u._x, r._x, r._x + r._w), cy = clamp(u._y, r._y, r._y + r._h);
    const dx = u._x - cx, dy = u._y - cy, d = hypot(dx, dy);
    if (d >= R) continue;
    if (d < 1e-9) { // centre inside the rect: push along the smallest axis
      const l = u._x - r._x, rr = r._x + r._w - u._x, t = u._y - r._y, b = r._y + r._h - u._y, m = min(l, rr, t, b);
      out.push({ _n: [m == l ? -1 : m == rr ? 1 : 0, m == t ? -1 : m == b ? 1 : 0], _d: R + m, _c: -1 });
    } else out.push({ _n: [dx / d, dy / d], _d: R - d, _c: -1 });
  }
  for (const s of run._s) {
    if (s._dead || s._c == 6 || (s._c == 3 && u._fcd > 0)) continue;
    const p = s._p;
    for (let i = 0; i + 3 < p.length; i += 2) {
      const [cx, cy] = closest(u._x, u._y, p[i], p[i + 1], p[i + 2], p[i + 3]);
      const dx = u._x - cx, dy = u._y - cy, d = hypot(dx, dy);
      if (d >= R || d < 1e-9) continue;
      const nx = dx / d, ny = dy / d;
      if (s._c == 5) { // indigo: solid only from the world-up side, and only when moving into it
        const sx = p[i + 2] - p[i], sy = p[i + 3] - p[i + 1], ux = sx > 0 ? sy : -sy, uy = sx > 0 ? -sx : sx;
        if (nx * ux + ny * uy <= 0 || u._vx * nx + u._vy * ny > 0) continue;
      }
      out.push({ _n: [nx, ny], _d: R - d, _c: s._c, _s: s, _i: i });
    }
  }
  return out.sort((a, b) => (b._d + (b._s ? 9 : 0)) - (a._d + (a._s ? 9 : 0))); // paint before rects
}

// Enter climb mode on stroke s at segment index i.
function grab(u, s, i) {
  const p = s._p, sx = p[i + 2] - p[i], sy = p[i + 3] - p[i + 1], l = hypot(sx, sy) || 1e-9;
  const [cx, cy] = closest(u._x, u._y, p[i], p[i + 1], p[i + 2], p[i + 3]);
  // side: +1 if the unicorn is on the (sy,-sx) side of the segment
  const side = (u._x - cx) * sy - (u._y - cy) * sx < 0 ? -1 : 1;
  let dd = u._vx * sx + u._vy * sy; // continue the current travel direction
  if (!dd) dd = u._dir * sx;
  if (!dd) dd = -sy * u._g;
  u._climb = { _s: s, _i: i, _t: hypot(cx - p[i], cy - p[i + 1]) / l, _side: side, _dir: dd < 0 ? -1 : 1, _spd: max(WALK, hypot(u._vx, u._vy)) };
}

// Advance the climb along the polyline; fling off the end.
function climb(run) {
  const u = run._u, c = u._climb, s = c._s, p = s._p;
  if (s._dead) { u._climb = null; return; }
  c._spd = max(WALK, c._spd - 10 * DT);
  let i = c._i, t = c._t, rest = c._spd * DT * c._dir, sx, sy, l;
  const seg = () => { sx = p[i + 2] - p[i]; sy = p[i + 3] - p[i + 1]; l = hypot(sx, sy) || 1e-9; };
  seg();
  for (let k = 0; k < 8; k++) { // carry leftover distance across vertices
    t += rest / l; rest = 0;
    if (t > 1) { if (i + 4 >= p.length) { t = 1; break; } rest = (t - 1) * l; i += 2; t = 0; seg(); }
    else if (t < 0) { if (i == 0) { t = 0; break; } rest = t * l; i -= 2; t = 1; seg(); }
    else break;
  }
  const tx = sx / l * c._dir, ty = sy / l * c._dir, px = p[i] + sx * t, py = p[i + 1] + sy * t;
  const nx = sy / l * c._side, ny = -sx / l * c._side;
  let x = px + nx * R, y = py + ny * R;
  if (blocked(run, x, y)) { // try the other side of the vine, else turn around
    x = px - nx * R; y = py - ny * R;
    if (blocked(run, x, y)) { c._dir = -c._dir; u._dir = -u._dir; u._vx = -u._vx; u._vy = -u._vy; return; }
    c._side = -c._side;
  }
  c._i = i; c._t = t;
  u._x = x; u._y = y; u._vx = tx * c._spd; u._vy = ty * c._spd;
  if (abs(tx) > .1) u._dir = tx < 0 ? -1 : 1;
  if (c._dir > 0 ? t >= 1 && i + 4 >= p.length : t <= 0 && i == 0) { // fling off the end
    u._climb = null; u._vx = tx * FLING; u._vy = ty * FLING; u._fcd = .15;
    run._ev.push([2, 3, u._x, u._y]);
  }
}

const fail = run => (run._state = 2, run._ev.push([4, 0, run._u._x, run._u._y]), 2);

// One fixed 1/60 s step. Returns the run state.
export function step(run) {
  if (run._state) return run._state;
  const u = run._u, L = run._lv, g = u._g;
  run._t += DT;
  if (run._t > TIMEOUT) return fail(run);
  for (const s of run._s) if (s._c == 2 && s._touched && !s._dead && (s._t += DT) >= CRUMBLE) {
    s._dead = 1; run._ev.push([3, 2, s._p[0], s._p[1]]);
  }
  const wasIce = u._surf == 4;
  if (u._climb) climb(run);
  else {
    u._vy = clamp(u._vy + g * G * DT, -MAXFALL, MAXFALL);
    if (u._gr && u._surf != 4) { // walking force (ice has none)
      const tgt = u._dir * WALK * (u._surf == 1 ? DASH : 1), a = 30 * DT;
      u._vx = abs(tgt - u._vx) <= a ? tgt : u._vx + (tgt > u._vx ? a : -a);
    }
    u._x += u._vx * DT; u._y += u._vy * DT;
    u._gr = 0; u._surf = -1;
    for (let it = 0; it < 2 && !u._climb; it++) for (const c of contacts(run)) {
      const [nx, ny] = c._n, s = c._s;
      u._x += nx * c._d; u._y += ny * c._d;
      const vn = u._vx * nx + u._vy * ny;
      if (vn > .5) continue;
      if (s) { u._mask |= 1 << c._c; if (!s._touched) { s._touched = 1; run._ev.push([0, c._c, u._x, u._y]); } }
      if (c._c == 0 && vn < -3 && u._bcd <= 0) { // bounce: reflect, then set the normal speed
        u._vx -= 2 * vn * nx; u._vy -= 2 * vn * ny;
        const sp = min(BMAX, max(-vn * BK, BMIN)) + vn; // target normal speed minus current (-vn)
        u._vx += sp * nx; u._vy += sp * ny; u._bcd = .1;
        run._ev.push([1, 0, u._x, u._y]);
        continue;
      }
      if (c._c == 3) { grab(u, s, c._i); u._gr = 0; run._ev.push([1, 3, u._x, u._y]); break; }
      u._vx -= vn * nx; u._vy -= vn * ny;
      if (ny * g < -.5) { // ground
        u._gr = 1; if (c._c >= 0 || u._surf < 0) u._surf = c._c; // paint wins over the rect under it
        if (c._c == 4) { // ice: conserve energy (½v² − G·g·y) while sliding, cap speed
          const sp = hypot(u._vx, u._vy);
          if (wasIce && sp > 1e-6) {
            const s2 = min(ICEMAX, sqrt(max(0, u._ps * u._ps + 2 * G * g * (u._y - u._py))));
            u._vx *= s2 / sp; u._vy *= s2 / sp;
          }
          if (abs(u._vx) > .3) u._dir = u._vx < 0 ? -1 : 1;
        }
      } else if (abs(nx) > .7 && vn < -.5) { u._dir = -u._dir; u._vx = 0; } // wall
    }
  }
  // triggers
  for (const s of run._s) if (s._c == 6 && !s._dead) {
    const p = s._p; let dmin = 9;
    for (let i = 0; i + 3 < p.length; i += 2) {
      const [cx, cy] = closest(u._x, u._y, p[i], p[i + 1], p[i + 2], p[i + 3]), d = hypot(u._x - cx, u._y - cy);
      if (d < dmin) dmin = d;
    }
    if (s._armed && dmin < R) { s._armed = 0; u._g = -u._g; u._mask |= 64; s._touched = 1; run._ev.push([1, 6, u._x, u._y]); }
    else if (!s._armed && dmin > 1) s._armed = 1;
  }
  for (const r of L._rects) if ((r._t == 1 || r._t == 2) && hitRect(r, u._x, u._y)) return fail(run);
  if (hypot(u._x - L._gx, u._y - L._gy) < R + .6) { run._state = 1; run._ev.push([5, 0, L._gx, L._gy]); return 1; }
  if (u._mask == 127 && !run._gate) { run._gate = 1; run._ev.push([6, 0, u._x, u._y]); }
  if (u._x < -OUT || u._x > W + OUT || u._y < -OUT || u._y > H + OUT) return fail(run);
  u._bcd -= DT; u._fcd -= DT;
  u._ps = hypot(u._vx, u._vy); u._py = u._y;
  return 0;
}

// Rounded state string for determinism tests.
export function hashState(run) {
  const u = run._u;
  return [u._x, u._y, u._vx, u._vy, u._dir, u._g, u._mask, run._t, run._state, ...run._s.map(s => s._dead * 2 + s._touched)].map(v => Math.round(v * 1e3)).join(',');
}
