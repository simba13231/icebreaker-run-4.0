// Levels.js
// Level configs are generated programmatically from CONFIG rather than
// hand-authored one by one, so the level system is trivial to extend later
// (just raise CONFIG.LEVELS.COUNT). Each level gets a fixed base difficulty
// (speed/spawn interval/pattern complexity) that scales smoothly from
// Level 1 (very easy) to the final level (very challenging), plus a target
// score the player must reach to clear it.

import { CONFIG } from '../config.js';

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Returns the config object for a given 1-indexed level number. */
export function getLevelConfig(levelNumber) {
  const count = CONFIG.LEVELS.COUNT;
  const t = count > 1 ? (levelNumber - 1) / (count - 1) : 0; // 0 (Level 1) -> 1 (final level)

  const baseSpeed = lerp(
    CONFIG.DIFFICULTY.INITIAL_SPEED,
    CONFIG.DIFFICULTY.MAX_SPEED * 0.92,
    t
  );
  const baseSpawnInterval = lerp(
    CONFIG.DIFFICULTY.INITIAL_SPAWN_INTERVAL,
    CONFIG.DIFFICULTY.MIN_SPAWN_INTERVAL,
    t
  );
  // Fixed pattern-complexity baseline for the level (independent of live ramp).
  const baseTierProgress = Math.min(1, t * 1.05);

  const targetScore = Math.round(
    CONFIG.LEVELS.BASE_TARGET_SCORE + CONFIG.LEVELS.TARGET_SCORE_PER_LEVEL * (levelNumber - 1)
  );

  return {
    level: levelNumber,
    baseSpeed,
    baseSpawnInterval,
    baseTierProgress,
    targetScore
  };
}

export function getAllLevelNumbers() {
  return Array.from({ length: CONFIG.LEVELS.COUNT }, (_, i) => i + 1);
}
