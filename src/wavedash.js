// Wavedash platform integration — the platform's own init, achievements, leaderboards, cloud saves, the player's
// identity and presence — and nothing else. Two builds come out of one source tree: the js13k competition zip
// (`node build.js`) swaps this module for a stub whose exports are no-ops, which terser folds away, so the
// competition build carries no platform code; the Wavedash upload (`node build.js --wavedash`) includes it. The
// dev server always runs this real module. The platform injects a global `Wavedash` before the game boots, so
// nothing is loaded from outside the zip; offline, on file:// and on js13kgames every wd() call is a no-op.
// Nothing here may throw or leave a rejected promise behind — either would be a console error.
//
// SDK facts this code depends on (read from @wvdsh/sdk-js 1.3.48, DECISIONS.md §22):
// - Every argument is type-checked: `storeNow` and `keepBest` must be real booleans (a 1 throws, silently
//   swallowed by wd(), which is why nothing ever reached the portal before).
// - setAchievement returns false, and does nothing, until the SDK has loaded the player's stats and the game's
//   achievement ids from the server (a second or two after boot) — so a set that returns false is retried.
// - Async calls resolve to {success, data}; they never reject.
// - Cloud files are written to the SDK's local store first, then uploaded; downloadRemoteFile logs an error
//   for a missing file, so remoteFileExists is asked first (a new player has no save).
const wd = f => { try { const W = self.Wavedash; if (W) return f(W); } catch (e) { } };
const FILE = 'prism/progress.json';

// True on Wavedash. Only that platform needs the room code instead of a link: js13kgames also runs the game in
// an iframe, but there the frame's URL is a real page.
export const onWD = () => !!self.Wavedash;
// Unlock an achievement (ids are created on the portal by tools/wavedash-achievements.mjs); retried once a
// second for half a minute while the SDK is still loading.
export const ach = (id, n = 0) => wd(W => { if (!W.setAchievement(id, true) && n < 30) setTimeout(() => ach(id, n + 1), 1000); });
// lb(name, value, isTime): sort 0 = ascending (times) / 1 = descending; display 2 = milliseconds / 0 = numeric.
export const lb = (name, v, t) => wd(W => W.getOrCreateLeaderboard(name, t ? 0 : 1, t ? 2 : 0).then(r => r.success && W.uploadLeaderboardScore(r.data.id, v, true)).catch(e => { }));

// Cloud save: cloudLoad(cb) hands the remote progress object to cb if the player has one; cloudSave(obj) writes
// and uploads it, debounced so a burst of saves is one upload.
export const cloudLoad = cb => wd(W => W.remoteFileExists(FILE)
  .then(r => r.success && r.data && W.downloadRemoteFile(FILE))
  .then(r => r && r.success && W.readLocalFile(FILE))
  .then(b => { if (b) cb(JSON.parse(new TextDecoder().decode(b))); })
  .catch(e => { }));
let saveT;
export const cloudSave = obj => wd(W => {
  clearTimeout(saveT);
  saveT = setTimeout(() => wd(W => W.writeLocalFile(FILE, new TextEncoder().encode(JSON.stringify(obj))).then(ok => ok && W.uploadRemoteFile(FILE)).catch(e => { })), 1500);
});

// Player identity: a "Playing as <avatar> <name>" line on the title screen, built with DOM calls (the name is
// user text). root = the #ui element after the title has been shown.
export const wdTitle = root => wd(W => {
  const u = W.getUser(), t = root.querySelector('p.g');
  if (!u || !u.username || !t) return;
  const p = document.createElement('p'), b = document.createElement('b');
  p.className = 'g'; p.style.cssText = 'display:flex;align-items:center;gap:6px;justify-content:center';
  if (u.avatarUrl) { const i = new Image(22, 22); i.src = u.avatarUrl; i.style.borderRadius = '50%'; p.append(i); }
  b.textContent = u.username;
  p.append('Playing as ', b, ' · progress synced');
  t.before(p);
});
// Presence: what the player is doing, shown to their friends.
export const pres = (status, details) => wd(W => W.updateUserPresence({ status, details: details || '' }).catch(e => { }));

wd(W => { if (!W.initialized) { W.init(); if (W.readyForEvents) W.readyForEvents(); } });
