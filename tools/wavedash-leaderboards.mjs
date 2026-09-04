// Names PRISM's leaderboards and makes them visible on the Wavedash game page. The game creates them on first
// use through the SDK (getOrCreateLeaderboard), and SDK-created boards start hidden; the HTTP API's PATCH
// by-name is the only way to flip that. Idempotent; a board that has not been created yet reports "not yet".
//   $env:WAVEDASH_TOKEN = "wd_…"; node tools/wavedash-leaderboards.mjs
import fs from 'fs';

const token = process.env.WAVEDASH_TOKEN;
if (!token) { console.error('Set WAVEDASH_TOKEN'); process.exit(1); }
const game = fs.readFileSync(new URL('../wavedash.toml', import.meta.url), 'utf8').match(/game_id\s*=\s*"([^"]+)"/)[1];
const BOARDS = [
  ['levels', 'Levels cleared', 1, 0],
  ['stars', 'Ink stars', 1, 0],
  ['daily', 'Fastest daily', 0, 2],
];
for (const [name, displayName, sortOrder, displayType] of BOARDS) {
  const r = await fetch(`https://api.wavedash.com/api/games/${game}/leaderboards/by-name/${name}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ visible: true, displayName, sortOrder, displayType }),
  });
  const j = await r.json().catch(() => ({}));
  console.log(r.status == 404 ? `- ${name}: not yet created (needs a first score from the game)` : r.ok ? `+ ${name}: "${j.leaderboard.displayName}" visible` : `! ${name}: ${JSON.stringify(j)}`);
}
