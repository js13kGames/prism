// Seeded generator: filled in during Phase 6 (docs/05). Stub: rotates the 20 levels by seed.
import { LEVELS } from './levels.js';
export const daySeed = () => Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 864e5);
export function gen(seed, withSolution) { return [LEVELS[seed % 20], []]; }
