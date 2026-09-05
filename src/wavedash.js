// Wavedash platform integration — achievements, leaderboards, the platform's own init — and nothing else.
// Two builds come out of one source tree: the js13k competition zip (`node build.js`) swaps this module for a
// stub whose exports are no-ops, which terser folds away, so the competition build carries no platform code;
// the Wavedash upload (`node build.js --wavedash`) includes it. The dev server always runs this real module.
// The platform injects a global `Wavedash` before the game boots, so nothing is loaded from outside the zip;
// offline, on file:// and on js13kgames every wd() call is a no-op. Achievements are created on the portal by
// id (tools/wavedash-achievements.mjs); leaderboards are created on first use. Nothing here may throw or leave
// a rejected promise behind — either would be a console error, which is a release blocker.
const wd = f => { try { const W = self.Wavedash; if (W) return f(W); } catch (e) { } };

// True on Wavedash. Only that platform needs the room code instead of a link: js13kgames also runs the game in
// an iframe, but there the frame's URL is a real page.
export const onWD = () => !!self.Wavedash;
export const ach = id => wd(W => W.setAchievement(id, 1));
// lb(name, value, isTime): sort 0 = ascending (times) / 1 = descending; display 2 = milliseconds / 0 = numeric.
export const lb = (name, v, t) => wd(W => W.getOrCreateLeaderboard(name, t ? 0 : 1, t ? 2 : 0).then(r => W.uploadLeaderboardScore(r.data.id, v, 1)).catch(e => { }));
wd(W => { if (!W.initialized) { W.init(); if (W.readyForEvents) W.readyForEvents(); } });
