// Sound: ZzFX micro (Frank Force, MIT — https://github.com/KilledByAPixel/ZzFX) for effects, and generative music
// built on one idea — THE RAINBOW IS THE SCALE. Red…violet are the seven degrees of a major key (C D E F G A B in
// act 1; every act modulates), which makes the paint the sheet music and the unicorn the playhead:
//  · drawing a stroke plays its colour's note, panned to where it was drawn;
//  · the strokes on the canvas, in the order they were drawn, ARE the melody: a four-to-the-bar sequencer loops
//    them over an I–V–vi–IV pad and bass, so a level's soundtrack is the player's own painting (an empty canvas
//    falls back to a chord arpeggio);
//  · in Play, every stroke the unicorn touches sounds its note from where the unicorn is, a soft kick and hat
//    come in, and on the gem the fanfare replays the colours it touched, in order, resolved onto the tonic;
//  · one effect, a dotted-eighth feedback echo with a darkening filter, turns the sparse notes into an ambient bed.
// The AudioContext is created on the first user gesture (initAudio). `snd` is the persisted mute flag.
export let snd = 1;
export const setSnd = v => { snd = v; if (mg) mg.gain.value = v; }; // gain kills notes already scheduled ahead
let ac, mg, dl, at = 0; // at: start time for the next zzfx sound (0 = now) so the sequencer can place drum hits
export function initAudio() {
  if (ac) return;
  try {
    ac = new AudioContext(); mg = ac.createGain(); mg.gain.value = snd; mg.connect(ac.destination); ac.resume();
    const d = ac.createDelay(), fb = ac.createGain(), lp = ac.createBiquadFilter();
    dl = ac.createGain(); dl.gain.value = .4; d.delayTime.value = .375; fb.gain.value = .4; lp.frequency.value = 1500;
    dl.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(mg);
  } catch (e) { }
}

// ZzFX micro: renders one sound from its parameter list and plays it. Kept verbatim-ish for byte size.
function zzfx(p = 1, k = .05, b = 220, e = 0, r = 0, t = .1, q = 0, D = 1, u = 0, y = 0, v = 0, z = 0, l = 0, E = 0, A = 0, F = 0, c = 0, w = 1, m = 0, B = 0) {
  let M = Math, d = 2 * M.PI, R = 44100, G = u *= 500 * d / R / R, C = b *= (1 - k + 2 * k * M.random(k = [])) * d / R, g = 0, H = 0, a = 0, n = 1, I = 0, J = 0, f = 0, x, h;
  e = R * e + 9; m *= R; r *= R; t *= R; c *= R; y *= 500 * d / R ** 3; A *= d / R; v *= d / R; z *= R; l = R * l | 0;
  for (h = e + m + r + t + c | 0; a < h; k[a++] = f) ++J % (100 * F | 0) || (
    f = q ? 1 < q ? 2 < q ? 3 < q ? M.sin((g % d) ** 3) : M.max(M.min(M.tan(g), 1), -1) : 1 - (2 * g / d % 2 + 2) % 2 : 1 - 4 * M.abs(M.round(g / d) - g / d) : M.sin(g),
    f = (l ? 1 - B + B * M.sin(d * a / l) : 1) * (0 < f ? 1 : -1) * M.abs(f) ** D * p * .3 * (a < e ? a / e : a < e + m ? 1 - (a - e) / m * (1 - w) : a < e + m + r ? w : a < h - c ? (h - a - c) / t * w : 0),
    f = c ? f / 2 + (c > a ? 0 : (a < h - c ? 1 : (h - a) / c) * k[a - c | 0] / 2) : f),
    x = (b += u += y) * M.cos(A * H++), g += x - x * E * (1 - 1E9 * (M.sin(a) + 1) % 2), n && ++n > z && (b += v, C += v, n = 0), !l || ++I % l || (b = C, u = G, n = n || 1);
  p = ac.createBuffer(1, h, R); p.getChannelData(0).set(k); b = ac.createBufferSource(); b.buffer = p; b.connect(mg); b.start(at);
}

// 0 tick(colour) 1 play 2 bounce 3 crumble 4 fling 5 flip 6 fail 7 win 8 click 9 gate 10 paint lands 11 kick 12 hat
// 3 and 10 are deliberately quiet, low and short: the old crumble was a full-volume noise burst (see DECISIONS).
const S = [
  [.4, .05, 440, .01, .03, .06, , 1.5],
  [.5, , 520, .02, .1, .2, , 1.2, , , 200, .06],
  [.7, , 160, .02, .06, .18, , 1.6, 12, , , , , , , , , .8],
  [.3, , 80, , .04, .2, 4, 1.2, , , , , .04, .3, , , , , , 1],
  [.5, , 320, .04, .1, .15, 1, 1, 25],
  [.6, , 240, .05, .18, .2, 2, , -8],
  [.7, , 220, .04, .2, .3, 1, 1.5, -9],
  [.8, , 523, .05, .25, .35, , 1, , , 262, .12],
  [.25, , 900, .01, .02, .03, , 2],
  [.7, , 400, .05, .3, .3, , , 8, , 120, .1],
  [.3, , 90, , .03, .12, 1, 2, -10],
  [.7, , 90, , .02, .12, , 1.5, -1],
  [.1, , 900, , .005, .03, 4, 2, , , , , , 4],
];
export function sfx(id, col) {
  if (!snd || !ac) return;
  const p = S[id].slice();
  if (!id) p[2] = 330 * 2 ** (col / 7); // stroke tick pitched by colour
  try { zzfx(...p); } catch (e) { }
}

// ---- Music -------------------------------------------------------------------------------------------
const SC = [0, 2, 4, 5, 7, 9, 11], PROG = [0, 4, 5, 3]; // major scale semitones; chord roots I V vi IV
let key = 0; // semitone transposition of the whole scale (per act, or from the daily/race seed)
export const setKey = k => key = k;
export const note = (d, o = 0) => 261.63 * 2 ** (o + (d / 7 | 0) + (SC[d % 7] + key) / 12); // degree d (0 = C) at octave o
let nextT = 0, beat = 0, mode = 0, seq = []; // mode: 0 menus, 1 draw, 2 play; seq: [[colour, x]…] of the strokes on the canvas
// One note: frequency, start, length, waveform, gain, stereo position (-1…1), send to the echo.
function tone(f, t, d, type, g, x = 0, e) {
  const o = ac.createOscillator(), v = ac.createGain(), p = ac.createStereoPanner();
  o.type = type; o.frequency.value = f; p.pan.value = x; o.connect(v); v.connect(p); p.connect(mg);
  if (e) p.connect(dl);
  v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + .02); v.gain.exponentialRampToValueAtTime(.001, t + d);
  o.start(t); o.stop(t + d);
}
export const setMusic = m => mode = m;
export const setSeq = s => seq = s;
// A colour's note: c = colour index (scale degree), o = octave offset, x = world x (0…32) to pan by.
export function playNote(c, o = 1, x = 16) { if (snd && ac) tone(note(c, o), ac.currentTime, .5, 'sine', .12, x / 16 - 1, 1); }
// Win: the colours the run touched, in order, then the tonic triad and octave.
export function fanfare(s) { if (snd && ac) [...s, 0, 2, 4, 7].forEach((d, i) => tone(note(d, 1), ac.currentTime + i * .08, .5, 'sine', .1, 0, 1)); }
// Scheduler: 120 BPM in eighths, ~0.35 s ahead. Bar: bass + pad chord. Quarters: the painted melody (or an
// arpeggio). Play mode adds kick, hat and a high off-beat chord tone.
function tick() {
  if (!snd || !ac) return;
  const now = ac.currentTime;
  if (nextT < now) nextT = now + .05;
  while (nextT < now + .35) {
    const ch = PROG[beat >> 3 & 3], e = beat & 7, q = beat >> 1, n = mode && seq.length, T = nextT;
    if (!e) { tone(note(ch, -2), T, 1.9, 'triangle', .16); for (const k of [0, 2, 4]) tone(note(ch + k, -1), T, 2, 'triangle', .035, k / 2 - 1); }
    if (!(e & 1)) { const m = n ? seq[q % n] : [ch + [0, 2, 4, 2][q & 3], 16]; tone(note(m[0], 0), T, .45, 'sine', .06, m[1] / 16 - 1, 1); }
    if (mode > 1) {
      at = T; sfx(e & 3 ? 12 : 11); at = 0; // kick on 1 and 3, hat on the other eighths
      if (e & 1) tone(note(ch + [4, 2, 0, 4][q & 3], 1), T, .25, 'sine', .04, 0, 1);
    }
    beat++; nextT += .25;
  }
}
setInterval(tick, 200);
