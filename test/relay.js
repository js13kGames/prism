// Minimal in-process WebSocket relay that mimics the js13kGames relay for tests: broadcasts every message to
// the other clients in the same room (room = URL path), sends '@id' on connect and '+id' / '-id' to the others.
// No dependencies: does the RFC 6455 handshake and text frames by hand.
import http from 'http';
import crypto from 'crypto';

export function startRelay() {
  const rooms = new Map();
  let nextId = 1;
  const server = http.createServer((q, s) => { s.writeHead(404); s.end(); });
  server.on('upgrade', (req, sock) => {
    const key = req.headers['sec-websocket-key'];
    const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    const room = req.url.split('?')[0], id = 'c' + nextId++;
    if (!rooms.has(room)) rooms.set(room, new Set());
    const peers = rooms.get(room);
    const frame = text => { const b = Buffer.from(text); const h = b.length < 126 ? Buffer.from([0x81, b.length]) : Buffer.from([0x81, 126, b.length >> 8, b.length & 255]); return Buffer.concat([h, b]); };
    const sendTo = (c, text) => { try { c.sock.write(frame(text)); } catch (e) { } };
    const me = { sock, id };
    sendTo(me, '@' + id);
    for (const p of peers) sendTo(p, '+' + id);
    peers.add(me);
    let buf = Buffer.alloc(0);
    sock.on('data', d => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= 2) {
        const op = buf[0] & 15, masked = buf[1] >> 7; let len = buf[1] & 127, off = 2;
        if (len == 126) { len = buf.readUInt16BE(2); off = 4; } else if (len == 127) { len = Number(buf.readBigUInt64BE(2)); off = 10; }
        if (buf.length < off + (masked ? 4 : 0) + len) return;
        const mask = masked ? buf.subarray(off, off + 4) : null; off += masked ? 4 : 0;
        const data = Buffer.from(buf.subarray(off, off + len)); buf = buf.subarray(off + len);
        if (mask) for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
        if (op == 8) { sock.end(); return; }
        if (op == 9) { sock.write(Buffer.concat([Buffer.from([0x8a, data.length]), data])); continue; }
        if (op != 1) continue;
        const text = data.toString();
        if (text[0] == '@') { const [to, msg] = [text.slice(1, text.indexOf('|')), text.slice(text.indexOf('|') + 1)]; for (const p of peers) if (p.id == to) sendTo(p, msg); }
        else for (const p of peers) if (p !== me) sendTo(p, text);
      }
    });
    sock.on('close', () => { peers.delete(me); for (const p of peers) sendTo(p, '-' + id); });
    sock.on('error', () => { });
  });
  server.listen(0);
  return new Promise(r => server.on('listening', () => r({ port: server.address().port, close: () => server.close() })));
}
