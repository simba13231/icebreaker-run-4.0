// StorageManager.js
// Wraps localStorage with graceful error handling (disabled storage, private
// browsing quotas, corrupted data, etc). Game must keep working even if
// persistence fails entirely.
//
// Also defines a small LeaderboardService abstraction so a future online
// leaderboard can be swapped in without touching game code:
//
//   LeaderboardService (interface, duck-typed)
//   ├── LocalLeaderboardService   (on-device high score, via localStorage)
//   └── CloudLeaderboardService   (global leaderboard, via the Cloudflare
//                                  Worker + D1 backend in workers/leaderboard/)
//
// Game.js uses both side by side: Local for the instant, offline-safe
// personal high score; Cloud for the shared leaderboard screen and
// best-effort score submission after a run.
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

  // --- Leaderboard username --------------------------------------------------

  getUsername() {
    const value = this._get(CONFIG.STORAGE.USERNAME_KEY, '');
    return typeof value === 'string' ? value : '';
  }

  setUsername(name) {
    return this._set(CONFIG.STORAGE.USERNAME_KEY, name);
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

/**
 * CloudLeaderboardService — talks to the Cloudflare Worker + D1 backend in
 * workers/leaderboard/ for a *global* leaderboard shared across players.
 * This is separate from LocalLeaderboardService (which still drives the
 * player's own on-device high score, shown instantly with no network
 * dependency). Score submission and leaderboard fetches here are always
 * best-effort: if apiBaseUrl isn't configured yet, or the request fails
 * (offline, Worker down), calls resolve/no-op quietly rather than breaking
 * gameplay.
 *
 *   getTopScores(limit): Promise<Array<{ name, score, created_at }>>
 *   submitScore(name, score): Promise<{ ok, rank } | null>
 */
export class CloudLeaderboardService {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = (apiBaseUrl || '').replace(/\/$/, '');
  }

  get isConfigured() {
    return Boolean(this.apiBaseUrl);
  }

  async getTopScores(limit = 50) {
    if (!this.isConfigured) return [];
    const res = await fetch(`${this.apiBaseUrl}/api/scores?limit=${encodeURIComponent(limit)}`);
    if (!res.ok) throw new Error(`Leaderboard fetch failed (${res.status})`);
    const data = await res.json();
    return Array.isArray(data.scores) ? data.scores : [];
  }

  async submitScore(name, score) {
    if (!this.isConfigured) return null;
    const res = await fetch(`${this.apiBaseUrl}/api/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score })
    });
    if (!res.ok) throw new Error(`Score submit failed (${res.status})`);
    return res.json();
  }
}
