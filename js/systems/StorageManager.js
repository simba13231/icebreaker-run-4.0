// StorageManager.js
// Wraps localStorage with graceful error handling (disabled storage, private
// browsing quotas, corrupted data, etc). Game must keep working even if
// persistence fails entirely.
//
// Also defines a small LeaderboardService abstraction so a future online
// leaderboard can be swapped in without touching game code:
//
//   LeaderboardService (interface, duck-typed)
//   ├── LocalLeaderboardService   (implemented now, uses localStorage)
//   └── CloudLeaderboardService   (future — see workers/README.md)
//
// v2 additions: coins, owned/equipped boats, and level unlock/completion
// progress. All new reads have safe, sensible defaults so existing players
// upgrading from v1 (which only had high score + settings) start with a
// clean, valid progression state instead of crashing.

import { CONFIG } from '../config.js';

function isStorageAvailable() {
  try {
    const testKey = '__icebreaker_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (err) {
    return false;
  }
}

export class StorageManager {
  constructor() {
    this.available = isStorageAvailable();
  }

  _get(key, fallback) {
    if (!this.available) return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  _set(key, value) {
    if (!this.available) return false;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  getHighScore() {
    const value = this._get(CONFIG.STORAGE.HIGH_SCORE_KEY, 0);
    return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  }

  setHighScore(score) {
    return this._set(CONFIG.STORAGE.HIGH_SCORE_KEY, score);
  }

  getSettings(defaults) {
    const stored = this._get(CONFIG.STORAGE.SETTINGS_KEY, null);
    if (!stored || typeof stored !== 'object') return { ...defaults };
    return { ...defaults, ...stored };
  }

  setSettings(settings) {
    return this._set(CONFIG.STORAGE.SETTINGS_KEY, settings);
  }

  // --- Coins --------------------------------------------------------------

  getCoins() {
    const value = this._get(CONFIG.STORAGE.COINS_KEY, 0);
    return typeof value === 'number' && !Number.isNaN(value) && value >= 0 ? value : 0;
  }

  setCoins(amount) {
    return this._set(CONFIG.STORAGE.COINS_KEY, Math.max(0, Math.floor(amount)));
  }

  // --- Boats ----------------------------------------------------------------

  getOwnedBoats() {
    const value = this._get(CONFIG.STORAGE.BOATS_OWNED_KEY, ['starter']);
    if (!Array.isArray(value) || value.length === 0) return ['starter'];
    return value.includes('starter') ? value : ['starter', ...value];
  }

  setOwnedBoats(list) {
    return this._set(CONFIG.STORAGE.BOATS_OWNED_KEY, list);
  }

  getEquippedBoat() {
    const value = this._get(CONFIG.STORAGE.BOAT_EQUIPPED_KEY, 'starter');
    return typeof value === 'string' && value ? value : 'starter';
  }

  setEquippedBoat(id) {
    return this._set(CONFIG.STORAGE.BOAT_EQUIPPED_KEY, id);
  }

  // --- Levels ---------------------------------------------------------------

  getUnlockedLevel() {
    const value = this._get(CONFIG.STORAGE.LEVELS_UNLOCKED_KEY, 1);
    return typeof value === 'number' && value >= 1 ? Math.floor(value) : 1;
  }

  setUnlockedLevel(levelNumber) {
    return this._set(CONFIG.STORAGE.LEVELS_UNLOCKED_KEY, levelNumber);
  }

  getCompletedLevels() {
    const value = this._get(CONFIG.STORAGE.LEVELS_COMPLETED_KEY, []);
    return Array.isArray(value) ? value : [];
  }

  setCompletedLevels(list) {
    return this._set(CONFIG.STORAGE.LEVELS_COMPLETED_KEY, list);
  }

  // --- Obstacles ------------------------------------------------------------

  getOwnedObstacles() {
    const value = this._get(CONFIG.STORAGE.OBSTACLES_OWNED_KEY, ['iceberg']);
    if (!Array.isArray(value) || value.length === 0) return ['iceberg'];
    return value.includes('iceberg') ? value : ['iceberg', ...value];
  }

  setOwnedObstacles(list) {
    return this._set(CONFIG.STORAGE.OBSTACLES_OWNED_KEY, list);
  }
}

/**
 * LocalLeaderboardService — the only implementation used in v1.
 * Exposes the shape a future CloudLeaderboardService (backed by a
 * Cloudflare Worker + D1, see workers/README.md) could also implement:
 *   getHighScore(): number
 *   submitScore(score): { isNewRecord: boolean, highScore: number }
 */
export class LocalLeaderboardService {
  constructor(storageManager) {
    this.storage = storageManager;
  }

  getHighScore() {
    return this.storage.getHighScore();
  }

  submitScore(score) {
    const current = this.storage.getHighScore();
    if (score > current) {
      this.storage.setHighScore(score);
      return { isNewRecord: true, highScore: score };
    }
    return { isNewRecord: false, highScore: current };
  }
}
