// Sound: ZzFX micro (Frank Force, MIT — https://github.com/KilledByAPixel/ZzFX) + a tiny sound table, and
// generative music: the rainbow is a C-major scale (red C, orange D, … violet B). A small scheduler plays a
// I–V–vi–IV backing on oscillators; drawing a colour, and the unicorn touching it, play that colour's note.
// The AudioContext is created on the first user gesture (initAudio). `snd` is the persisted mute flag.
export let snd = 1;
export const setSnd = v => snd = v;
let ac;
export function initAudio() { if (!ac) try { ac = new AudioContext(); } catch (e) { } }

// ZzFX micro: renders one sound from its parameter list and plays it. Kept verbatim-ish for byte size.
function zzfx(p = 1, k = .05, b = 220, e = 0, r = 0, t = .1, q = 0, D = 1, u = 0, y = 0, v = 0, z = 0, l = 0, E = 0, A = 0, F = 0, c = 0, w = 1, m = 0, B = 0) {
  let M = Math, d = 2 * M.PI, R = 44100, G = u *= 500 * d / R / R, C = b *= (1 - k + 2 * k * M.random(k = [])) * d / R, g = 0, H = 0, a = 0, n = 1, I = 0, J = 0, f = 0, x, h;
  e = R * e + 9; m *= R; r *= R; t *= R; c *= R; y *= 500 * d / R ** 3; A *= d / R; v *= d / R; z *= R; l = R * l | 0;
  for (h = e + m + r + t + c | 0; a < h; k[a++] = f) ++J % (100 * F | 0) || (
    f = q ? 1 < q ? 2 < q ? 3 < q ? M.sin((g % d) ** 3) : M.max(M.min(M.tan(g), 1), -1) : 1 - (2 * g / d % 2 + 2) % 2 : 1 - 4 * M.abs(M.round(g / d) - g / d) : M.sin(g),
    f = (l ? 1 - B + B * M.sin(d * a / l) : 1) * (0 < f ? 1 : -1) * M.abs(f) ** D * p * .3 * (a < e ? a / e : a < e + m ? 1 - (a - e) / m * (1 - w) : a < e + m + r ? w : a < h - c ? (h - a - c) / t * w : 0),
    f = c ? f / 2 + (c > a ? 0 : (a < h - c ? 1 : (h - a) / c) * k[a - c | 0] / 2) : f),
    x = (b += u += y) * M.cos(A * H++), g += x - x * E * (1 - 1E9 * (M.sin(a) + 1) % 2), n && ++n > z && (b += v, C += v, n = 0), !l || ++I % l || (b = C, u = G, n = n || 1);
  p = ac.createBuffer(1, h, R); p.getChannelData(0).set(k); b = ac.createBufferSource(); b.buffer = p; b.connect(ac.destination); b.start();
}

// 0 tick(colour) 1 play 2 bounce 3 crumble 4 fling 5 flip 6 fail 7 win 8 click 9 gate 10 paint lands
const S = [
  [.4, .05, 440, .01, .03, .06, , 1.5],
  [.5, , 520, .02, .1, .2, , 1.2, , , 200, .06],
  [.7, , 160, .02, .06, .18, , 1.6, 12, , , , , , , , , .8],
  [.6, , 90, .01, .08, .2, 4, 1.2, , , , , , 2],
  [.5, , 320, .04, .1, .15, 1, 1, 25],
  [.6, , 240, .05, .18, .2, 2, , -8],
  [.7, , 220, .04, .2, .3, 1, 1.5, -9],
  [.8, , 523, .05, .25, .35, , 1, , , 262, .12],
  [.25, , 900, .01, .02, .03, , 2],
  [.7, , 400, .05, .3, .3, , , 8, , 120, .1],
  [.5, , 110, .01, .04, .14, 4, 1.4, , , , , , 1.5],
];
export function sfx(id, col) {
  if (!snd || !ac) return;
  const p = S[id].slice();
  if (!id) p[2] = 330 * 2 ** (col / 7); // stroke tick pitched by colour
  try { zzfx(...p); } catch (e) { }
}

// ---- Music -------------------------------------------------------------------------------------------
const SC = [0, 2, 4, 5, 7, 9, 11], PROG = [0, 4, 5, 3]; // major scale semitones; chord roots I V vi IV
export const note = (d, o = 0) => 261.63 * 2 ** (o + (d / 7 | 0) + SC[d % 7] / 12); // degree d (0 = C) at octave o
let nextT = 0, beat = 0, mode = 1; // mode: 1 calm (draw/menus), 2 lively (play)
function tone(f, t, d, type, g) {
  const o = ac.createOscillator(), v = ac.createGain();
  o.type = type; o.frequency.value = f; o.connect(v); v.connect(ac.destination);
  v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + .02); v.gain.exponentialRampToValueAtTime(.001, t + d);
  o.start(t); o.stop(t + d);
}
export const setMusic = m => mode = m;
// A colour's note: c = colour index (scale degree), o = octave offset.
export function playNote(c, o = 1) { if (snd && ac) tone(note(c, o), ac.currentTime, .5, 'sine', .12); }
// Win: a quick run up the scale.
export function fanfare() { if (snd && ac) for (let i = 0; i < 8; i++) tone(note(i, 1), ac.currentTime + i * .07, .45, 'sine', .1); }
// Scheduler: 120 BPM, schedules ~0.35 s ahead. Bass on the bar, a chord-tone arpeggio on each beat, off-beats when lively.
function tick() {
  if (!snd || !ac) return;
  const now = ac.currentTime;
  if (nextT < now) nextT = now + .05;
  while (nextT < now + .35) {
    const ch = PROG[beat >> 3 & 3], b = beat & 3;
    if (!b) tone(note(ch, -2), nextT, 1.9, 'triangle', .16);
    tone(note(ch + [0, 2, 4, 2][b], 0), nextT, .45, 'sine', .05);
    if (mode > 1) tone(note(ch + [4, 2, 0, 4][b], 1), nextT + .25, .25, 'sine', .04);
    beat++; nextT += .5;
  }
}
setInterval(tick, 200);
