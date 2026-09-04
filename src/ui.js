// HTML screens as template strings. Buttons carry data-a (action) and data-v (value); main.js dispatches.
import { COLS } from './sim.js';

export const GLYPH = '↑⇒✶⋮❋⇢⟳';
const NAMES = 'Red bounce,Orange dash,Yellow brittle,Green vine,Blue feather,Indigo phase,Violet flip'.split(',');

// Title. The backdrop behind it is animated (main.js), so this screen uses the .v vignette rather than the
// flat wash the menus use — otherwise the sky and the rainbow read as grey.
export const titleUI = (snd, done, stars, n) => `<div class="t v"><h1>PRISM</h1><p>Paint rainbow paths. A very stupid unicorn walks them.</p>
<button class="b w" data-a=go>Play</button><div><button data-a=on>Online</button><button data-a=dy>Daily</button><button data-a=sn>${snd ? '🔊' : '🔇'}</button></div>
<p class=g>${done ? `${done} / ${n} levels · ★ ${stars}` : '30 levels · daily seed · online races'}</p></div>`;

// Level grid: rainbow-coloured dots, locked ones grey, stars marked. prog = {done, stars}; daily = label string or ''.
export function selectUI(prog, daily, n) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const open = !i || prog.done[i - 1];
    d += `<button class="d${open ? '' : ' l'}${open && !prog.done[i] ? ' g' : ''}" data-a=lv data-v=${i} style="background:${open ? COLS[i % 7] : ''}">${i + 1}${prog.stars[i] ? '★' : ''}</button>`;
  }
  return `<div class=t><h2>Levels</h2><div class=a>${d}</div><div>${daily ? `<button data-a=dy>${daily}</button>` : ''}<button data-a=bk>Back</button></div></div>`;
}

// In-game HUD. ink = remaining per colour, L = level, col = selected, play = run active, hint shown until
// first play, tag = race status (round, score, whether a rival is running) shown before the level name.
export function hudUI(L, col, ink, play, hint, snd, tag) {
  let pal = '';
  for (let c = 0; c < 7; c++) if (L._ink[c]) pal += `<button class="k${c == col ? ' s' : ''}" data-a=c data-v=${c} title="${NAMES[c]}" style=background:${COLS[c]}>${GLYPH[c]}<i><b id=i${c} style=width:${100 * ink[c] / L._ink[c]}%></b></i></button>`;
  return `<div class=h><button data-a=bk>‹</button><span>${tag ? tag + ' · ' : ''}${L._name}${hint ? ' · ' + hint : ''}</span><button data-a=sn${snd ? '' : ' class=g'}>${snd ? '🔊' : '🔇'}</button></div>` +
    (play ? `<div class=r><button class=b data-a=r>⟲ Rewind</button></div>` :
      `<div class=r>${pal}<button data-a=u title=Undo>↶</button><button data-a=x title=Clear>✕</button><button class=b data-a=p>▶ Play</button></div>`);
}

export const winUI = (used, total, star, last, extra) => `<div class=t><h2>${extra || 'Gem got!'}</h2><p>Ink ${used.toFixed(1)} / ${total}${star ? ' ★' : ''}</p>
<div><button data-a=bk>Levels</button>${last ? '' : '<button class=b data-a=nx>Next</button>'}</div></div>`;

export const lobbyUI = (status, code, n, host) => `<div class=t><h2>Online race</h2><p>${status}</p>${code ? `<p>Room <b>${code}</b> · ${n} player${n == 1 ? '' : 's'}</p>` : ''}
<div>${code ? `<button data-a=cp>Copy link</button>${host ? '<button class=b data-a=st>Start</button>' : ''}<button data-a=lv0>Leave</button>` : `<button class=b data-a=cr>Create room</button><input id=j maxlength=4 placeholder=CODE><button data-a=jn>Join</button>`}</div>
<button data-a=bk>Back</button></div>`;

// Round start card: the solid menu backdrop, because the rainbow h1 is unreadable over a bright sky.
export const cardUI = (h, p) => `<div class=t><h1>${h}</h1><p>${p}</p></div>`;

// Round / match result. The winner's run is replaying behind this one, so it uses the lighter .q overlay.
export const raceUI = (won, sub, score, done, host) => `<div class="t q"><h2>${done ? won ? 'You take the match!' : 'They take the match.' : won ? 'Round won!' : 'Round lost'}</h2>
<p>${sub}</p><p><b>${score}</b></p>${host ? '' : '<p>Waiting for the host…</p>'}
<div>${host ? `<button class=b data-a=st>${done ? 'Rematch' : 'Next round'}</button>` : ''}<button data-a=bk>Leave</button></div></div>`;
