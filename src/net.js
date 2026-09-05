// Online race transport (docs/06): a plain WebSocket to the game's relay. NET.url is the relay URL from the
// js13kGames registration page; the relay treats each sub-path as an isolated room, so `{room}` becomes
// `prism26-CODE`. Any failure degrades to a status callback; an unexpected close retries a few times.
export const NET = { url: 'wss://relay.js13kgames.com/prism/{room}' }; // (unmangled: tests override url)
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const mkCode = () => [...Array(4)].map(() => ALPHA[Math.random() * 24 | 0]).join('');
// peers: our id → the relay's id if that peer arrived after me, 0 if it was in the room first. The relay's
// '+id' for a newcomer always precedes the newcomer's own hello (verified on the live relay), so the pending
// '+' ids (nw) are handed out to unknown hellos in order; anyone who was here before me sends a hello with
// no '+' pending. That order is the same on every client, which is what makes the host (nobody senior)
// unambiguous — the ids are random, so "lowest id" made a late joiner the host half the time.
let ws, cb, id, tries = 0, peers = new Map(), nw = [];

// join(code, cb): code = 4 letters, or 1 to create a fresh room. cb(kind, data):
//   'err' message | 'open' code | 'n' [[peer id, 0 if senior to me]…] | 'msg' [type, senderId, ...payload] | 'close'
export function join(code, onEvent) {
  leave(); cb = onEvent;
  code = code === 1 ? mkCode() : (code || '').toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) return cb('err', 'Enter a 4-letter room code');
  if (navigator.onLine === false) return cb('err', 'You are offline'); // no socket: a failed one logs a console error
  id = Math.random().toString(36).slice(2, 6);
  try { ws = new WebSocket(NET.url.replace('{room}', 'prism26-' + code)); } catch (e) { return cb('err', 'Could not connect'); }
  ws.onopen = () => { tries = 0; peers.clear(); nw = []; send(['h']); cb('open', code); };
  ws.onerror = () => cb('err', 'Connection failed — are you offline?');
  ws.onclose = () => { cb('close'); if (tries++ < 3) setTimeout(() => ws || join(code, cb), 1500); };
  ws.onmessage = e => {
    const d = e.data;                             // relay system messages: '@' own id, '+' / '-' someone came / went
    if (d[0] == '+') return nw.push(d.slice(1));  // their hello comes next
    if (d[0] == '-') { for (const [k, v] of peers) if (v == d.slice(1)) { peers.delete(k); cb('n', [...peers]); } return; }
    let m; try { m = JSON.parse(d); } catch (x) { return; }  // '@…' and anything that is not ours ends here
    if (!m || m[1] == id) return;
    if (m[0] == 'h') { if (!peers.has(m[1])) { peers.set(m[1], nw.shift() || 0); send(['h']); cb('n', [...peers]); } return; }
    cb('msg', m);
  };
}
export function send(m) { if (ws && ws.readyState == 1) ws.send(JSON.stringify([m[0], id, ...m.slice(1)])); }
export function leave() { if (ws) { ws.onclose = ws.onerror = null; ws.close(); } ws = null; peers.clear(); }
export const myId = () => id;
