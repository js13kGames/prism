// Online race transport (docs/06): a plain WebSocket to the game's relay. NET.url is the relay URL from the
// js13kGames registration page; the relay treats each sub-path as an isolated room, so `{room}` becomes
// `prism26-CODE`. Any failure degrades to a status callback; an unexpected close retries a few times.
export const NET = { url: 'wss://relay.js13kgames.com/prism/{room}' }; // (unmangled: tests override url)
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
let ws, cb, id, tries = 0, peers = new Set();

// join(code, cb): code = 4 letters, or 1 to create a fresh room. cb(kind, data):
//   'err' message | 'open' {room,id,n} | 'n' [peer ids] | 'msg' [type, senderId, ...payload] | 'close'
export function join(code, onEvent) {
  leave(); cb = onEvent;
  if (code === 1) code = [...Array(4)].map(() => ALPHA[Math.random() * 24 | 0]).join('');
  code = (code || '').toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) return cb('err', 'Enter a 4-letter room code');
  if (NET.url == 'TODO') return cb('err', 'Online is not configured (offline build)');
  if (navigator.onLine === false) return cb('err', 'You are offline');
  id = Math.random().toString(36).slice(2, 6);
  try { ws = new WebSocket(NET.url.replace('{room}', 'prism26-' + code)); } catch (e) { return cb('err', 'Could not connect'); }
  ws.onopen = () => { tries = 0; peers.clear(); send(['h']); cb('open', { room: code, id, n: 1 }); };
  ws.onerror = () => cb('err', 'Connection failed — are you offline?');
  ws.onclose = () => { cb('close'); if (tries++ < 3) setTimeout(() => ws || join(code, cb), 1500); };
  ws.onmessage = e => {
    const d = e.data;
    if (typeof d != 'string') return;
    if (d[0] == '+') return send(['h']);           // relay: someone connected → re-announce
    if (d[0] == '@' || d[0] == '-') return;       // relay: own id / someone left (peers time out via hello)
    let m; try { m = JSON.parse(d); } catch (x) { return; }
    if (!m || m[1] == id) return;
    if (m[0] == 'h') { if (!peers.has(m[1])) { peers.add(m[1]); send(['h']); cb('n', [...peers]); } return; }
    cb('msg', m);
  };
}
export function send(m) { if (ws && ws.readyState == 1) ws.send(JSON.stringify([m[0], id, ...m.slice(1)])); }
export function leave() { if (ws) { ws.onclose = ws.onerror = null; ws.close(); } ws = null; peers.clear(); }
export const myId = () => id;
