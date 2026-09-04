// RaceManager.js
// Owns everything specific to Race Mode: the bot roster, their progress
// simulation (rubber-banded so the race stays close and fun), basic
// obstacle-avoidance AI, and finish-order/rank/reward calculation.
//
// Design note on how bots "move": the game world is lane + scroll based
// (nothing has independent (x,y) — obstacles scroll past a fixed player).
// Bots therefore don't move through space either; instead each bot tracks a
// `progress` value (px along the race), exactly like the player's existing
// scoreManager.distancePx. Game.js converts the *difference* between a bot's
// progress and the player's progress into a screen Y offset purely for
// rendering (see Game._render). This keeps bots fully consistent with the
// existing single-scroll-field architecture without adding a second physics
// system.

import { CONFIG } from '../config.js';
import { Bot } from '../entities/Bot.js';

const BOT_PALETTE = [
  { hull: '#FFD9D9', hullShade: '#FF9E9E', cabin: '#C0392B' },
  { hull: '#FFF0C9', hullShade: '#FFD37A', cabin: '#B9770E' },
  { hull: '#E3D9FF', hullShade: '#B39DFF', cabin: '#5B3EBF' },
  { hull: '#D6FFEA', hullShade: '#8CF0B9', cabin: '#1E8449' },
  { hull: '#FFE0F0', hullShade: '#FFA6D6', cabin: '#B0347A' }
];

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export class RaceManager {
  constructor() {
    this.bots = [];
    this.playerFinishOrder = null;
    this._finishCounter = 0;
  }

  setup(lanePositions) {
    this.bots = [];
    this.playerFinishOrder = null;
    this._finishCounter = 0;

    const count = CONFIG.RACE.BOT_COUNT;
    const names = [...CONFIG.RACE.BOT_NAMES].sort(() => Math.random() - 0.5).slice(0, count);
    for (let i = 0; i < count; i++) {
      const speedMultiplier =
        1 +
        CONFIG.RACE.BOT_BASE_SPEED_BONUS +
        randRange(-CONFIG.RACE.BOT_SPEED_VARIANCE, CONFIG.RACE.BOT_SPEED_VARIANCE);
      const startLane = i % lanePositions.length;
      const bot = new Bot(
        i + 1,
        names[i] || `Rival ${i + 1}`,
        lanePositions,
        startLane,
        speedMultiplier,
        BOT_PALETTE[i % BOT_PALETTE.length]
      );
      this.bots.push(bot);
    }
  }

  setLanePositions(lanePositions) {
    for (const bot of this.bots) bot.setLanePositions(lanePositions);
  }

  /** Called whenever the Spawner produces a new hazard row, so bots can react. */
  notifyNewRow(blockedLanes) {
    for (const bot of this.bots) {
      if (bot.finished) continue;
      // Bots don't react instantly/perfectly — small chance they just eat the
      // hit, so the AI feels alive rather than robotic-perfect.
      if (Math.random() < 0.82) bot.tryDodge(blockedLanes);
      // Still in a blocked lane after the dodge attempt = hit an obstacle.
      if (blockedLanes.has(bot.laneIndex)) {
        bot.applyHitSlowdown(CONFIG.RACE.BOT_HIT_SLOWDOWN_MS, CONFIG.RACE.BOT_HIT_SLOWDOWN_FACTOR);
      }
    }
  }

  /** Advances all unfinished bots. playerSpeed is difficulty.speed (px/sec). */
  update(deltaMs, playerSpeed, playerProgress) {
    const deltaSec = deltaMs / 1000;
    for (const bot of this.bots) {
      if (bot.finished) continue;

      const diff = bot.progress - playerProgress;
      const normalizedDiff = Math.max(-0.3, Math.min(0.3, diff / CONFIG.RACE.DISTANCE_PX));
      const rubberBand = 1 - normalizedDiff * CONFIG.RACE.BOT_RUBBER_BAND_STRENGTH;
      const effectiveMultiplier = bot.speedMultiplier * rubberBand * bot.slowFactor;
      const progressDelta = playerSpeed * effectiveMultiplier * deltaSec;

      bot.update(deltaMs, progressDelta);

      if (bot.progress >= CONFIG.RACE.DISTANCE_PX) {
        bot.finished = true;
        bot.finishOrder = this._finishCounter++;
      }
    }
  }

  /** Call once when the player crosses the finish line. Returns their 1-based rank. */
  finishPlayer() {
    const rank = this._finishCounter + 1;
    this._finishCounter++;
    this.playerFinishOrder = rank;
    return rank;
  }

  /** Live 1-based position for the in-run HUD indicator. */
  getLivePosition(playerProgress) {
    const effective = this.bots.map((b) => (b.finished ? CONFIG.RACE.DISTANCE_PX + 1 : b.progress));
    let ahead = 0;
    for (const p of effective) {
      if (p > playerProgress) ahead++;
    }
    return ahead + 1;
  }

  getReward(rank) {
    return CONFIG.RACE.REWARDS[rank] || CONFIG.RACE.REWARDS.OTHER;
  }

  get totalRacers() {
    return this.bots.length + 1;
  }
}
