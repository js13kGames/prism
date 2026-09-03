// Online race transport (docs/06). PartySocket is imported lazily from the js13kGames server only when the
// player opens a room; any failure degrades to a status callback. NET.url is the relay URL from the game's
// registration page with the literal `{room}` where the room name goes — see SUBMISSION.md.
export const NET = { imp: 'https://play.js13kgames.com/2026/online/partysocket.js', url: 'TODO' }; // (unmangled: tests override url)
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
let ws, cb, id, peers = new Set();

// join(code, cb): code = 4 letters, or 1 to create a fresh room. cb(kind, data):
//   'err' message | 'open' {room,id,n} | 'n' [peer ids] | 'msg' [type, senderId, ...payload] | 'close'
export async function join(code, onEvent) {
  leave(); cb = onEvent;
  if (code === 1) code = [...Array(4)].map(() => ALPHA[Math.random() * 24 | 0]).join('');
  code = (code || '').toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) return cb('err', 'Enter a 4-letter room code');
  if (NET.url == 'TODO') return cb('err', 'Online is not configured (offline build)');
  id = Math.random().toString(36).slice(2, 6);
  const url = NET.url.replace('{room}', 'prism26-' + code);
  try {
    let P; try { P = (await import(NET.imp)).PartySocket; } catch (e) { }
    const u = new URL(url);
    ws = P ? new P({ host: u.host, basePath: u.pathname.slice(1), protocol: u.protocol.slice(0, -1) }) : new WebSocket(url);
  } catch (e) { return cb('err', 'Could not connect — are you offline?'); }
  ws.onopen = () => { peers.clear(); send(['h']); cb('open', { room: code, id, n: 1 }); };
  ws.onerror = () => cb('err', 'Connection failed — are you offline?');
  ws.onclose = () => cb('close');
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
export function leave() { if (ws) { ws.onclose = ws.onerror = null; ws.close(); ws = null; } peers.clear(); }
export const myId = () => id;
