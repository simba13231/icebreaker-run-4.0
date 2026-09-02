// Progression.js
// Owns all meta-game/progression logic (coins, boats, level unlocks) so
// Game.js doesn't have to know about localStorage shapes directly. Backed by
// StorageManager; everything here is synchronous and safe to call even if
// storage is unavailable (falls back to in-memory-only for the session).

import { CONFIG } from '../config.js';
import { BOATS } from '../data/Boats.js';

export class Progression {
  constructor(storageManager) {
    this.storage = storageManager;
    this.coins = this.storage.getCoins();
    this.ownedBoats = this.storage.getOwnedBoats();
    this.equippedBoatId = this.storage.getEquippedBoat();
    this.unlockedLevel = this.storage.getUnlockedLevel();
    this.completedLevels = this.storage.getCompletedLevels();
  }

  // --- Coins ---------------------------------------------------------------

  addCoins(amount) {
    this.coins += amount;
    this.storage.setCoins(this.coins);
    return this.coins;
  }

  spendCoins(amount) {
    if (this.coins < amount) return false;
    this.coins -= amount;
    this.storage.setCoins(this.coins);
    return true;
  }

  // --- Boats -----------------------------------------------------------------

  ownsBoat(id) {
    return this.ownedBoats.includes(id);
  }

  purchaseBoat(id) {
    const boat = BOATS.find((b) => b.id === id);
    if (!boat || this.ownsBoat(id)) return false;
    if (!this.spendCoins(boat.price)) return false;
    this.ownedBoats = [...this.ownedBoats, id];
    this.storage.setOwnedBoats(this.ownedBoats);
    return true;
  }

  equipBoat(id) {
    if (!this.ownsBoat(id)) return false;
    this.equippedBoatId = id;
    this.storage.setEquippedBoat(id);
    return true;
  }

  getEquippedBoatDef() {
    return BOATS.find((b) => b.id === this.equippedBoatId) || BOATS[0];
  }

  // --- Levels ------------------------------------------------------------------

  isLevelUnlocked(levelNumber) {
    return levelNumber <= this.unlockedLevel;
  }

  isLevelCompleted(levelNumber) {
    return this.completedLevels.includes(levelNumber);
  }

  /** Call when a level is cleared. Awards coins, unlocks the next level. */
  completeLevel(levelNumber) {
    const coinsAwarded = CONFIG.LEVELS.COINS_PER_LEVEL;
    this.addCoins(coinsAwarded);

    if (!this.completedLevels.includes(levelNumber)) {
      this.completedLevels = [...this.completedLevels, levelNumber];
      this.storage.setCompletedLevels(this.completedLevels);
    }

    const nextLevel = levelNumber + 1;
    if (nextLevel > this.unlockedLevel && nextLevel <= CONFIG.LEVELS.COUNT) {
      this.unlockedLevel = nextLevel;
      this.storage.setUnlockedLevel(this.unlockedLevel);
    }

    return { coinsAwarded, totalCoins: this.coins };
  }
}
