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
