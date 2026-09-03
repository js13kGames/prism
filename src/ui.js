// HTML screens as template strings. Buttons carry data-a (action) and data-v (value); main.js dispatches.
import { COLS, PI, cos, sin } from './sim.js';

export const GLYPH = '↑⇒✶⋮~⇑⟳';
const NAMES = 'Red bounce,Orange dash,Yellow brittle,Green vine,Blue ice,Indigo phase,Violet flip'.split(',');

export const titleUI = snd => `<div class=t><h1>PRISM</h1><p>Paint rainbow paths. A very stupid unicorn walks them.</p>
<button class=b data-a=go>Play</button><div><button data-a=on>Online</button><button data-a=dy>Daily</button><button data-a=sn>${snd ? '🔊' : '🔇'}</button></div></div>`;

// 20 dots on a rainbow arc + a daily dot. prog = {done, stars}; daily = label string or ''.
export function selectUI(prog, daily, n) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = PI * (1 - i / (n - 1)), open = !i || prog.done[i - 1];
    d += `<button class="d${open ? '' : ' l'}${open && !prog.done[i] ? ' g' : ''}" data-a=lv data-v=${i} style="left:${50 + 47 * cos(a)}%;top:${92 - 84 * sin(a)}%;background:${open ? COLS[i % 7] : ''}">${i + 1}${prog.stars[i] ? '★' : ''}</button>`;
  }
  if (daily) d += `<button class=d data-a=dy style="left:50%;top:75%;width:auto;padding:0 12px;background:#fff">${daily}</button>`;
  return `<div class=t><h2>Levels</h2><div class=a>${d}</div><button data-a=bk>Back</button></div>`;
}

// In-game HUD. ink = remaining per colour, L = level, col = selected, play = run active, hint shown until first play.
export function hudUI(L, col, ink, play, hint) {
  let pal = '';
  for (let c = 0; c < 7; c++) if (L._ink[c]) pal += `<button class="k${c == col ? ' s' : ''}" data-a=c data-v=${c} title="${NAMES[c]}" style=background:${COLS[c]}>${GLYPH[c]}<i><b id=i${c} style=width:${100 * ink[c] / L._ink[c]}%></b></i></button>`;
  return `<div class=h><button data-a=bk>‹</button><span>${L._name}${hint ? ' · ' + hint : ''}</span><button data-a=sn>♪</button></div>` +
    (play ? `<div class=r><button class=b data-a=r>⟲ Rewind</button></div>` :
      `<div class=r>${pal}<button data-a=u title=Undo>↶</button><button data-a=x title=Clear>✕</button><button class=b data-a=p>▶ Play</button></div>`);
}

export const winUI = (used, total, star, last, extra) => `<div class=t><h2>${extra || 'Gem got!'}</h2><p>Ink ${used.toFixed(1)} / ${total}${star ? ' ★' : ''}</p>
<div><button data-a=bk>Levels</button>${last ? '' : '<button class=b data-a=nx>Next</button>'}</div></div>`;

export const lobbyUI = (status, code, n, host) => `<div class=t><h2>Online race</h2><p>${status}</p>${code ? `<p>Room <b>${code}</b> · ${n} player${n == 1 ? '' : 's'}</p>` : ''}
<div>${code ? `<button data-a=cp>Copy link</button>${host ? '<button class=b data-a=st>Start</button>' : ''}<button data-a=lv0>Leave</button>` : `<button class=b data-a=cr>Create room</button><input id=j maxlength=4 placeholder=CODE><button data-a=jn>Join</button>`}</div>
<button data-a=bk>Back</button></div>`;
