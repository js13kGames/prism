// 5-line static dev server: node dev.js → http://localhost:8080 (serves repo root)
import http from 'http'; import fs from 'fs'; import path from 'path';
const T={html:'text/html',js:'text/javascript',css:'text/css',json:'application/json',png:'image/png'};
http.createServer((q,s)=>{const f=path.join(process.cwd(),decodeURIComponent(q.url.split('?')[0].replace(/\/$/,'/index.html')));
fs.readFile(f,(e,d)=>{s.writeHead(e?404:200,{'Content-Type':T[f.split('.').pop()]||'application/octet-stream'});s.end(e?'404':d)})}).listen(process.env.PORT||8080);
console.log('dev server on http://localhost:'+(process.env.PORT||8080));
