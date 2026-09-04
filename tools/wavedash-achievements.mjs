// Creates PRISM's achievements on the Wavedash portal with the CLI (idempotent: existing identifiers are skipped).
// The ids here must match the ach('…') calls in src/main.js. Leaderboards need no setup: the game calls
// getOrCreateLeaderboard by name ('levels', 'stars', 'daily-<seed>').
//   $env:WAVEDASH_TOKEN = "wd_…"; node tools/wavedash-achievements.mjs
import { execFileSync } from 'child_process';

export const ACHIEVEMENTS = [
  ['gem', 'First Gem', 'Guide the unicorn to its first gem.'],
  ['solo', 'One Stroke', 'Clear a level with a single stroke of paint.'],
  ['gate', 'Full Spectrum', 'Open a rainbow gate: touch all seven colours in one run.'],
  ['half', 'Halfway Over the Rainbow', 'Clear 20 levels.'],
  ['all', 'Prism', 'Clear all 40 levels.'],
  ['star10', 'Ink Saver', 'Earn 10 ink stars (finish with 60% of the ink or less).'],
  ['star40', 'Not a Drop Wasted', 'Earn the ink star on every level.'],
  ['daily', 'Daily Rainbow', 'Clear a daily level.'],
  ['race', 'Photo Finish', 'Win a round of an online race.'],
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const run = a => execFileSync('wavedash', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  let have = [];
  try { have = JSON.parse(run(['achievement', 'list', '--json'])); } catch (e) { console.log('(could not list existing achievements: ' + e.message.split('\n')[0] + ')'); }
  const ids = new Set(JSON.stringify(have).match(/"identifier":"([^"]+)"/g)?.map(s => s.split('"')[3]) || []);
  for (const [id, title, desc] of ACHIEVEMENTS) {
    if (ids.has(id)) { console.log(`= ${id} exists`); continue; }
    try { run(['achievement', 'create', '--identifier', id, '--title', title, '--description', desc]); console.log(`+ ${id}  ${title}`); }
    catch (e) { console.log(`! ${id}: ${(e.stderr || e.message).toString().trim().split('\n')[0]}`); }
  }
  console.log(run(['achievement', 'list']));
}
