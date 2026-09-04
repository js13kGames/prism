// Dev helper: node tools/relayprobe.mjs — probes the js13kGames relay: system messages, sub-path rooms, isolation.
const BASE = 'wss://relay.js13kgames.com/prism';
const open = (url, tag) => new Promise((res) => {
  const ws = new WebSocket(url), log = [];
  const t = setTimeout(() => res({ tag, url, state: 'timeout', log }), 6000);
  ws.onopen = () => log.push('open');
  ws.onmessage = e => log.push('msg ' + String(e.data).slice(0, 80));
  ws.onerror = () => log.push('error');
  ws.onclose = e => { clearTimeout(t); res({ tag, url, state: 'closed ' + e.code + ' ' + e.reason, log, ws }); };
  setTimeout(() => res({ tag, url, state: ws.readyState == 1 ? 'open' : 'state ' + ws.readyState, log, ws }), 2500);
});
const show = r => console.log(`${r.tag.padEnd(10)} ${r.state.padEnd(14)} ${r.log.join(' | ')}`);
console.log('--- 1. base URL');
const a = await open(BASE, 'base'); show(a);
console.log('--- 2. sub-path rooms: A1, A2 in room A; B in room B; base');
const [a1, a2, b] = await Promise.all([open(BASE + '/prism26-AAAA', 'A1'), open(BASE + '/prism26-AAAA', 'A2'), open(BASE + '/prism26-BBBB', 'B')]);
show(a1); show(a2); show(b);
for (const r of [a1, a2, b, a]) if (r.ws) r.log.length = 0;
const sendIf = (r, m) => r.ws && r.ws.readyState == 1 && r.ws.send(m);
sendIf(a1, 'from-A1'); sendIf(b, 'from-B'); sendIf(a, 'from-base');
await new Promise(r => setTimeout(r, 2500));
console.log('--- 3. who received what after A1, B and base each sent one message');
for (const r of [a1, a2, b, a]) show(r);
console.log('--- 4. query-string room variant');
const q = await open(BASE + '?room=prism26-QQQQ', 'query'); show(q);
for (const r of [a1, a2, b, a, q]) r.ws && r.ws.close();
process.exit(0);
