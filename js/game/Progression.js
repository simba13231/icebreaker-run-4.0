// Progression.js
// Owns all meta-game/progression logic (coins, boats, level unlocks) so
// Game.js doesn't have to know about localStorage shapes directly. Backed by
// StorageManager; everything here is synchronous and safe to call even if
// storage is unavailable (falls back to in-memory-only for the session).

import { CONFIG } from '../config.js';
import { BOATS } from '../data/Boats.js';
import { OBSTACLES } from '../data/Obstacles.js';
import { ICEBERG_SKINS } from '../data/IcebergSkins.js';
import { BACKGROUNDS } from '../data/Backgrounds.js';

export class Progression {
  constructor(storageManager) {
    this.storage = storageManager;
    this.coins = this.storage.getCoins();
    this.ownedBoats = this.storage.getOwnedBoats();
    this.equippedBoatId = this.storage.getEquippedBoat();
    this.unlockedLevel = this.storage.getUnlockedLevel();
    this.completedLevels = this.storage.getCompletedLevels();
    this.ownedObstacles = this.storage.getOwnedObstacles();
    this.ownedIcebergSkins = this.storage.getOwnedIcebergSkins();
    this.equippedIcebergSkinId = this.storage.getEquippedIcebergSkin();
    this.ownedBackgrounds = this.storage.getOwnedBackgrounds();
    this.equippedBackgroundId = this.storage.getEquippedBackground();
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

  // --- Obstacles ---------------------------------------------------------

  ownsObstacle(id) {
    return this.ownedObstacles.includes(id);
  }

  purchaseObstacle(id) {
    const obstacle = OBSTACLES.find((o) => o.id === id);
    if (!obstacle || this.ownsObstacle(id)) return false;
    if (!this.spendCoins(obstacle.price)) return false;
    this.ownedObstacles = [...this.ownedObstacles, id];
    this.storage.setOwnedObstacles(this.ownedObstacles);
    return true;
  }

  /** Returns the full obstacle defs the player currently owns (always includes 'iceberg'). */
  getUnlockedObstacleDefs() {
    return OBSTACLES.filter((o) => this.ownsObstacle(o.id));
  }

  // --- Iceberg skins (cosmetic) ------------------------------------------------

  ownsIcebergSkin(id) {
    return this.ownedIcebergSkins.includes(id);
  }

  purchaseIcebergSkin(id) {
    const skin = ICEBERG_SKINS.find((s) => s.id === id);
    if (!skin || this.ownsIcebergSkin(id)) return false;
    if (!this.spendCoins(skin.price)) return false;
    this.ownedIcebergSkins = [...this.ownedIcebergSkins, id];
    this.storage.setOwnedIcebergSkins(this.ownedIcebergSkins);
    return true;
  }

  equipIcebergSkin(id) {
    if (!this.ownsIcebergSkin(id)) return false;
    this.equippedIcebergSkinId = id;
    this.storage.setEquippedIcebergSkin(id);
    return true;
  }

  getEquippedIcebergSkinDef() {
    return ICEBERG_SKINS.find((s) => s.id === this.equippedIcebergSkinId) || ICEBERG_SKINS[0];
  }

  // --- Backgrounds (cosmetic) ---------------------------------------------------

  ownsBackground(id) {
    return this.ownedBackgrounds.includes(id);
  }

  purchaseBackground(id) {
    const bg = BACKGROUNDS.find((b) => b.id === id);
    if (!bg || this.ownsBackground(id)) return false;
    if (!this.spendCoins(bg.price)) return false;
    this.ownedBackgrounds = [...this.ownedBackgrounds, id];
    this.storage.setOwnedBackgrounds(this.ownedBackgrounds);
    return true;
  }

  equipBackground(id) {
    if (!this.ownsBackground(id)) return false;
    this.equippedBackgroundId = id;
    this.storage.setEquippedBackground(id);
    return true;
  }

  getEquippedBackgroundDef() {
    return BACKGROUNDS.find((b) => b.id === this.equippedBackgroundId) || BACKGROUNDS[0];
  }
}
