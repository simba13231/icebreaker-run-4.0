// Game.js
// Top-level orchestrator. Wires together state, entities, systems, and
// rendering. Owns the GameLoop and reacts to input/state changes.
//
// v2 added: mode select (Endless/Levels), a 50-level progression system, a
// boat shop with equip-able abilities, and an ad-gated revive flow.
//
// v3 adds four features on top of that, without changing the core
// loop/collision/rendering architecture:
//   - An obstacle shop (purchasable hazard skins, purely cosmetic variety —
//     never pay-to-win) plus oncoming rival boats in Endless mode.
//   - An in-run coin-pickup economy (previously coins only came from
//     completing levels) that also powers the new power-ups.
//   - Power-ups: Shield, Coin Magnet, Speed Boost, Coin Bonus, and (Survival
//     Run only) Repair.
//   - Two new modes: Survival Run (lives + health bar + repair checkpoints
//     every 1000 points) and Race Mode (3 AI rival boats, countdown start,
//     finish-line ranking, coin rewards for top 3).

import { CONFIG } from '../config.js';
import { GameState, States } from './GameState.js';
import { Difficulty } from './Difficulty.js';
import { checkCollisions, checkPickups } from './Collision.js';
import { GameLoop } from './GameLoop.js';
import { Progression } from './Progression.js';

import { Boat } from '../entities/Boat.js';
import { Coin } from '../entities/Coin.js';

import { Spawner, createHazardsForRow } from '../systems/Spawner.js';
import { InputManager } from '../systems/InputManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { ScoreManager } from '../systems/ScoreManager.js';
import { StorageManager, LocalLeaderboardService } from '../systems/StorageManager.js';
import { AdProvider } from '../systems/AdProvider.js';
import { PowerUpManager } from '../systems/PowerUpManager.js';
import { RaceManager } from '../systems/RaceManager.js';

import { Renderer } from '../rendering/Renderer.js';
import { UIManager } from '../ui/UIManager.js';

import { getLevelConfig } from '../data/Levels.js';
import { POWERUP_TYPES } from '../data/PowerUps.js';

const DEFAULT_SETTINGS = {
  sfxEnabled: true,
  musicEnabled: true,
  touchControlsEnabled: true,
  reducedEffects: false
};

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export class Game {
  constructor(canvas, rootEl) {
    this.canvas = canvas;
    this.rootEl = rootEl;

    this.state = new GameState();
    this.renderer = new Renderer(canvas);
    this.ui = new UIManager();
    this.input = new InputManager(rootEl);
    this.audio = new AudioManager();
    this.storage = new StorageManager();
    this.leaderboard = new LocalLeaderboardService(this.storage);
    this.progression = new Progression(this.storage);
    this.adProvider = new AdProvider();

    this.settings = this.storage.getSettings(DEFAULT_SETTINGS);
    this.audio.setSfxEnabled(this.settings.sfxEnabled);
    this.audio.setMusicEnabled(this.settings.musicEnabled);
    this.renderer.effects.setReducedEffects(this.settings.reducedEffects);

    this.difficulty = new Difficulty();
    this.scoreManager = new ScoreManager();
    this.spawner = new Spawner(CONFIG.GAME.LANES);
    this.powerUpManager = new PowerUpManager();
    this.raceManager = new RaceManager();

    // Run context: which mode is active and (for level mode) which level.
    this.mode = 'endless';
    this.currentLevel = null;
    this.currentLevelConfig = null;
    this._reviveInProgress = false;

    this.lanePositions = [0, 0, 0];
    this.boat = null;
    this.hazards = [];
    this.coinPickups = [];
    this.powerUps = [];
    this._runCoinsEarned = 0;

    // Survival Run state.
    this.survivalLives = CONFIG.SURVIVAL.STARTING_LIVES;
    this.survivalHealth = CONFIG.SURVIVAL.MAX_HEALTH;
    this.nextCheckpointScore = CONFIG.SURVIVAL.CHECKPOINT_SCORE_STEP;
    this._survivalInvulnMsRemaining = 0;

    // Race Mode state.
    this._raceFinished = false;
    this._raceCountdownMsRemaining = 0;
    this._racePenaltyMsRemaining = 0;

    // Coin pickup spawn timing (shared across all run modes).
    this._coinTimeSinceSpawnMs = 0;
    this._coinNextSpawnMs = randRange(CONFIG.COINS.MIN_SPAWN_INTERVAL_MS, CONFIG.COINS.MAX_SPAWN_INTERVAL_MS);

    this.loop = new GameLoop({
      update: (deltaMs) => this._update(deltaMs),
      render: () => this._render()
    });

    this._bindEvents();
    this._resize();
    this._resetEntities();

    this.state.onChange((state) => this._onStateChange(state));
    this.ui.showForState(States.MENU, {
      highScore: this.leaderboard.getHighScore(),
      coins: this.progression.coins
    });
    this.ui.applySettingsToControls(this.settings);

    this.loop.start();
  }

  // ---------------------------------------------------------------------
  // Setup / wiring
  // ---------------------------------------------------------------------

  _bindEvents() {
    window.addEventListener('resize', () => this._resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state.is(States.PLAYING)) {
        this.pauseGame();
      }
    });

    this.input.onMove((direction) => this._handleMove(direction));
    this.input.onPauseToggle(() => this._handlePauseToggle());
    this.input.bindButton(this.ui.el.btnLeft, -1);
    this.input.bindButton(this.ui.el.btnRight, 1);

    // Menu -> mode select -> (endless | levels | survival | race) -> gameplay
    this.ui.el.btnPlay.addEventListener('click', () => this._openModeSelect());
    this.ui.el.btnModeSelectBack.addEventListener('click', () => this._backToMenu());
    this.ui.el.btnModeEndless.addEventListener('click', () => this._startRun('endless'));
    this.ui.el.btnModeLevels.addEventListener('click', () => this._openLevelSelect());
    this.ui.el.btnModeSurvival.addEventListener('click', () => this._startRun('survival'));
    this.ui.el.btnModeRace.addEventListener('click', () => this._startRun('race'));
    this.ui.el.btnLevelSelectBack.addEventListener('click', () => this._backToModeSelect());
    this.ui.onLevelSelect((levelNumber) => this._startRun('level', levelNumber));

    // Boat / obstacle shop
    this.ui.el.btnBoatShopOpen.addEventListener('click', () => this._openBoatShop());
    this.ui.el.btnBoatShopBack.addEventListener('click', () => this._backToMenu());
    this.ui.onBoatAction((action, boatId) => this._handleBoatAction(action, boatId));
    this.ui.onObstacleAction((action, obstacleId) => this._handleObstacleAction(action, obstacleId));

    // Level complete
    this.ui.el.btnNextLevel.addEventListener('click', () =>
      this._startRun('level', this.currentLevel + 1)
    );
    this.ui.el.btnLevelCompleteBack.addEventListener('click', () => this._openLevelSelect());

    // Game over / revive
    this.ui.el.btnPlayAgain.addEventListener('click', () =>
      this._startRun(this.mode, this.currentLevel)
    );
    this.ui.el.btnWatchAdRevive.addEventListener('click', () => this._handleWatchAdRevive());

    // Boat ability
    this.ui.el.btnAbility.addEventListener('click', () => this._handleAbilityActivate());

    // Survival Run: repair checkpoint
    this.ui.el.btnCheckpointRepair.addEventListener('click', () => this._handleCheckpointRepair());
    this.ui.el.btnCheckpointSkip.addEventListener('click', () => this._closeCheckpoint());

    // Race Mode: results
    this.ui.el.btnRaceResultsRetry.addEventListener('click', () => this._startRun('race'));
    this.ui.el.btnRaceResultsMenu.addEventListener('click', () => this._goToMenu());

    this.ui.el.btnSettingsOpen.addEventListener('click', () => {
      this.audio.ensureContext();
      this.audio.click();
      this._openSettings();
    });
    this.ui.el.btnSettingsClose.addEventListener('click', () => this._closeSettings());

    this.ui.el.btnPause.addEventListener('click', () => this.pauseGame());
    this.ui.el.btnResume.addEventListener('click', () => this.resumeGame());
    this.ui.el.btnPauseMainMenu.addEventListener('click', () => this._goToMenu());
    this.ui.el.btnGameOverMainMenu.addEventListener('click', () => this._goToMenu());

    this.ui.el.btnMute.addEventListener('click', () => this._toggleMute());

    this.ui.el.toggleSfx.addEventListener('change', (e) =>
      this._updateSetting('sfxEnabled', e.target.checked)
    );
    this.ui.el.toggleMusic.addEventListener('change', (e) =>
      this._updateSetting('musicEnabled', e.target.checked)
    );
    this.ui.el.toggleTouch.addEventListener('change', (e) =>
      this._updateSetting('touchControlsEnabled', e.target.checked)
    );
    this.ui.el.toggleReducedFx.addEventListener('change', (e) =>
      this._updateSetting('reducedEffects', e.target.checked)
    );
  }

  _resize() {
    const width = this.rootEl.clientWidth;
    const height = this.rootEl.clientHeight;
    this.renderer.resize(width, height);

    const margin = width * CONFIG.GAME.LANE_MARGIN_RATIO;
    const usable = width - margin * 2;
    const laneWidth = usable / CONFIG.GAME.LANES;
    this.lanePositions = Array.from(
      { length: CONFIG.GAME.LANES },
      (_, i) => margin + laneWidth * (i + 0.5)
    );
    this.laneWidth = laneWidth;

    const boatY = height * CONFIG.GAME.BOAT_Y_RATIO;
    if (this.boat) {
      this.boat.setLanePositions(this.lanePositions);
      this.boat.setY(boatY);
    }
    this._boatY = boatY;
    this.raceManager.setLanePositions(this.lanePositions);
  }

  _resetEntities() {
    const startLane = Math.floor(CONFIG.GAME.LANES / 2);
    this.boat = new Boat(this.lanePositions, startLane, this.progression.equippedBoatId);
    this.boat.setY(this._boatY);
    this.boat._baseLaneChangeDurationMs = this.boat.laneChangeDurationMs;
    this.hazards = [];
    this.coinPickups = [];
    this.powerUps = [];
    this._runCoinsEarned = 0;

    if (this.mode === 'level' && this.currentLevelConfig) {
      this.difficulty.configureForLevel(this.currentLevelConfig);
    } else {
      this.difficulty.configureEndless();
    }

    this.scoreManager.reset();
    this.spawner.reset();
    this.powerUpManager.reset();
    this.renderer.effects.clear();

    this._coinTimeSinceSpawnMs = 0;
    this._coinNextSpawnMs = randRange(CONFIG.COINS.MIN_SPAWN_INTERVAL_MS, CONFIG.COINS.MAX_SPAWN_INTERVAL_MS);

    // Survival Run reset (harmless when not in survival mode).
    this.survivalLives = CONFIG.SURVIVAL.STARTING_LIVES;
    this.survivalHealth = CONFIG.SURVIVAL.MAX_HEALTH;
    this.nextCheckpointScore = CONFIG.SURVIVAL.CHECKPOINT_SCORE_STEP;
    this._survivalInvulnMsRemaining = 0;

    // Race Mode reset.
    this._raceFinished = false;
    this._racePenaltyMsRemaining = 0;
    if (this.mode === 'race') {
      this.raceManager.setup(this.lanePositions);
    }
  }

  // ---------------------------------------------------------------------
  // State transitions — menus / mode / level / shop navigation
  // ---------------------------------------------------------------------

  _onStateChange(state) {
    if (state === States.PLAYING) {
      this.ui.showForState(States.PLAYING, { mode: this.mode });
    }
  }

  _openModeSelect() {
    this.audio.click();
    this.state.set(States.MODE_SELECT);
    this.ui.showForState(States.MODE_SELECT);
  }

  _backToModeSelect() {
    this.audio.click();
    this.state.set(States.MODE_SELECT);
    this.ui.showForState(States.MODE_SELECT);
  }

  _openLevelSelect() {
    this.audio.click();
    this.state.set(States.LEVEL_SELECT);
    this.ui.showForState(States.LEVEL_SELECT, { coins: this.progression.coins });
    this.ui.renderLevelGrid(this.progression);
  }

  _openBoatShop() {
    this.audio.click();
    this.state.set(States.BOAT_SHOP);
    this.ui.showForState(States.BOAT_SHOP, { coins: this.progression.coins });
    this.ui.renderBoatGrid(this.progression);
    this.ui.renderObstacleGrid(this.progression);
  }

  _handleBoatAction(action, boatId) {
    if (action === 'purchase') {
      const purchased = this.progression.purchaseBoat(boatId);
      if (purchased) {
        this.audio.click();
        this.ui.flashPurchased();
      }
    } else if (action === 'equip') {
      this.progression.equipBoat(boatId);
      this.audio.click();
    }
    this.ui.renderBoatGrid(this.progression);
  }

  _handleObstacleAction(action, obstacleId) {
    if (action === 'purchase') {
      const purchased = this.progression.purchaseObstacle(obstacleId);
      if (purchased) {
        this.audio.click();
        this.ui.flashPurchased();
      }
    }
    this.ui.renderObstacleGrid(this.progression);
    this.ui.el.shopCoins.textContent = String(this.progression.coins);
  }

  _backToMenu() {
    this.audio.click();
    this.state.set(States.MENU);
    this.ui.showForState(States.MENU, {
      highScore: this.leaderboard.getHighScore(),
      coins: this.progression.coins
    });
  }

  _startRun(mode, levelNumber = null) {
    this.mode = mode;
    if (mode === 'level') {
      if (levelNumber) {
        this.currentLevel = levelNumber;
        this.currentLevelConfig = getLevelConfig(levelNumber);
      } else {
        // Invalid call — fall back safely to endless rather than crash.
        this.mode = 'endless';
        this.currentLevel = null;
        this.currentLevelConfig = null;
      }
    } else {
      this.currentLevel = null;
      this.currentLevelConfig = null;
    }

    this.audio.ensureContext();
    this.audio.click();
    this._resetEntities();

    if (this.mode === 'race') {
      this._raceCountdownMsRemaining = CONFIG.RACE.COUNTDOWN_SECONDS * 1000;
      this.state.set(States.RACE_COUNTDOWN);
      this.ui.showForState(States.RACE_COUNTDOWN);
      this.ui.updateRaceCountdown(String(CONFIG.RACE.COUNTDOWN_SECONDS));
    } else {
      this.state.set(States.PLAYING);
      this.ui.showForState(States.PLAYING, { mode: this.mode });
      if (this.settings.musicEnabled) this.audio.startMusic();
    }
  }

  _goToMenu() {
    this.audio.click();
    this.audio.stopMusic();
    this.ui.hidePauseOverlay();
    this.ui.hideCheckpointOverlay();
    this.state.set(States.MENU);
    this.ui.showForState(States.MENU, {
      highScore: this.leaderboard.getHighScore(),
      coins: this.progression.coins
    });
  }

  pauseGame() {
    if (!this.state.is(States.PLAYING)) return;
    this.state.set(States.PAUSED);
    this.ui.showForState(States.PAUSED);
    this.audio.click();
  }

  resumeGame() {
    if (!this.state.is(States.PAUSED)) return;
    this.ui.hidePauseOverlay();
    this.state.set(States.PLAYING);
    this.audio.click();
  }

  _handlePauseToggle() {
    if (this.state.is(States.PLAYING)) this.pauseGame();
    else if (this.state.is(States.PAUSED)) this.resumeGame();
  }

  _handleMove(direction) {
    if (!this.state.is(States.PLAYING)) return;
    const moved = this.boat.moveLane(direction);
    if (moved) this.audio.laneMove();
  }

  _handleAbilityActivate() {
    if (!this.state.is(States.PLAYING) || !this.boat) return;
    const activated = this.boat.activateInvincibility();
    if (activated) this.audio.shieldUp();
  }

  _openSettings() {
    this._settingsReturnState = this.state.current;
    if (this.state.is(States.PLAYING)) this.pauseGame();
    this.state.set(States.SETTINGS);
    this.ui.showForState(States.SETTINGS);
  }

  _closeSettings() {
    this.ui.hideSettingsOverlay();
    const returnState =
      this._settingsReturnState === States.PLAYING ? States.PAUSED : States.MENU;
    this.state.set(returnState);
    if (returnState === States.MENU) {
      this.ui.showForState(States.MENU, {
        highScore: this.leaderboard.getHighScore(),
        coins: this.progression.coins
      });
    } else {
      this.ui.showForState(States.PAUSED);
    }
  }

  _updateSetting(key, value) {
    this.settings[key] = value;
    this.storage.setSettings(this.settings);
    this.ui.applySettingsToControls(this.settings);

    if (key === 'sfxEnabled') this.audio.setSfxEnabled(value);
    if (key === 'musicEnabled') {
      this.audio.ensureContext();
      this.audio.setMusicEnabled(value);
    }
    if (key === 'reducedEffects') this.renderer.effects.setReducedEffects(value);
  }

  _toggleMute() {
    const shouldMute = this.settings.sfxEnabled || this.settings.musicEnabled;
    this._updateSetting('sfxEnabled', !shouldMute);
    this._updateSetting('musicEnabled', !shouldMute);
  }

  // ---------------------------------------------------------------------
  // Game over / level complete / revive
  // ---------------------------------------------------------------------

  _gameOver() {
    this.audio.collision();
    this.audio.stopMusic();
    this.renderer.effects.emitCollision(this.boat.x, this.boat.y);

    const result = this.leaderboard.submitScore(this.scoreManager.displayScore);
    const canRevive =
      (this.mode === 'endless' || this.mode === 'level') &&
      this.scoreManager.displayScore < CONFIG.REVIVE.SCORE_CAP;
    const heading = this.mode === 'survival' ? 'OUT OF LIVES!' : 'GAME OVER';

    this.state.set(States.GAME_OVER);
    this.ui.showForState(States.GAME_OVER, {
      heading,
      score: this.scoreManager.displayScore,
      highScore: result.highScore,
      isNewRecord: result.isNewRecord,
      canRevive,
      coinsEarned: this._runCoinsEarned
    });
  }

  async _handleWatchAdRevive() {
    if (this._reviveInProgress) return;
    this._reviveInProgress = true;
    this.ui.el.btnWatchAdRevive.disabled = true;

    const granted = await this.adProvider.showRewardedAd();

    this._reviveInProgress = false;
    this.ui.el.btnWatchAdRevive.disabled = false;
    if (!granted || !this.state.is(States.GAME_OVER)) return;

    // Clear the board so the player isn't revived directly into another hit.
    // Score, difficulty, current run, and boat/ability state are preserved.
    this.hazards = [];
    this.renderer.effects.clear();

    this.state.set(States.PLAYING);
    if (this.settings.musicEnabled) this.audio.startMusic();
  }

  _levelComplete() {
    this.audio.levelComplete();
    this.audio.stopMusic();

    const { coinsAwarded } = this.progression.completeLevel(this.currentLevel);
    const hasNextLevel = this.currentLevel < CONFIG.LEVELS.COUNT;

    this.state.set(States.LEVEL_COMPLETE);
    this.ui.showForState(States.LEVEL_COMPLETE, {
      level: this.currentLevel,
      score: this.scoreManager.displayScore,
      coinsAwarded,
      hasNextLevel
    });
  }

  // ---------------------------------------------------------------------
  // Survival Run — damage, lives, repair checkpoints
  // ---------------------------------------------------------------------

  _survivalTakeHit(hit) {
    this.survivalHealth -= hit.damage;
    this.audio.collision();
    this.renderer.effects.emitCollision(this.boat.x, this.boat.y);

    if (this.survivalHealth <= 0) {
      this.survivalLives -= 1;
      if (this.survivalLives <= 0) {
        this.survivalHealth = 0;
        this._gameOver();
        return;
      }
      this.survivalHealth = CONFIG.SURVIVAL.MAX_HEALTH;
      this._clearNearbyHazards(CONFIG.SURVIVAL.CLEAR_RADIUS_PX);
    }
    this._survivalInvulnMsRemaining = CONFIG.SURVIVAL.POST_HIT_INVINCIBILITY_MS;
  }

  _clearNearbyHazards(radius) {
    for (const h of this.hazards) {
      if (Math.abs(h.y - this.boat.y) < radius) h.markedForRemoval = true;
    }
  }

  _checkSurvivalCheckpoint() {
    if (this.mode !== 'survival') return;
    if (this.scoreManager.displayScore < this.nextCheckpointScore) return;
    this.nextCheckpointScore += CONFIG.SURVIVAL.CHECKPOINT_SCORE_STEP;
    this._openCheckpoint();
  }

  _openCheckpoint() {
    this.audio.click();
    this.state.set(States.CHECKPOINT);
    this.ui.showForState(States.CHECKPOINT, {
      health: this.survivalHealth,
      maxHealth: CONFIG.SURVIVAL.MAX_HEALTH,
      canAfford: this.progression.coins >= CONFIG.SURVIVAL.REPAIR_COST_COINS
    });
  }

  _handleCheckpointRepair() {
    if (this.progression.spendCoins(CONFIG.SURVIVAL.REPAIR_COST_COINS)) {
      this.survivalHealth = CONFIG.SURVIVAL.MAX_HEALTH;
      this.audio.click();
    }
    this._closeCheckpoint();
  }

  _closeCheckpoint() {
    this.audio.click();
    this.ui.hideCheckpointOverlay();
    this.state.set(States.PLAYING);
    this.ui.showForState(States.PLAYING, { mode: this.mode });
  }

  // ---------------------------------------------------------------------
  // Race Mode — finish line, rank, rewards
  // ---------------------------------------------------------------------

  _raceFinish(rank) {
    this.audio.levelComplete();
    this.audio.stopMusic();
    const coinsAwarded = this.raceManager.getReward(rank);
    this.progression.addCoins(coinsAwarded);

    this.state.set(States.RACE_RESULTS);
    this.ui.showForState(States.RACE_RESULTS, {
      rank,
      coinsAwarded,
      score: this.scoreManager.displayScore
    });
  }

  // ---------------------------------------------------------------------
  // Update / render
  // ---------------------------------------------------------------------

  _update(deltaMs) {
    const deltaSec = deltaMs / 1000;

    if (this.state.is(States.RACE_COUNTDOWN)) {
      this._raceCountdownMsRemaining -= deltaMs;
      const secsRemaining = Math.max(0, this._raceCountdownMsRemaining) / 1000;
      if (this._raceCountdownMsRemaining <= 0) {
        this.ui.hideRaceCountdownOverlay();
        this.state.set(States.PLAYING);
        this.ui.showForState(States.PLAYING, { mode: this.mode });
        if (this.settings.musicEnabled) this.audio.startMusic();
      } else if (secsRemaining <= 1) {
        this.ui.updateRaceCountdown('GO!');
      } else {
        this.ui.updateRaceCountdown(String(Math.ceil(secsRemaining)));
      }
    }

    if (this.state.is(States.PLAYING)) {
      this.difficulty.update(deltaSec);
      this.difficulty.updateFromScore(this.scoreManager.displayScore);

      if (this._survivalInvulnMsRemaining > 0) {
        this._survivalInvulnMsRemaining = Math.max(0, this._survivalInvulnMsRemaining - deltaMs);
      }
      if (this._racePenaltyMsRemaining > 0) {
        this._racePenaltyMsRemaining = Math.max(0, this._racePenaltyMsRemaining - deltaMs);
      }

      // Power-ups can temporarily out-speed the boat's own ability lane-change time.
      const baseLaneChangeMs = this.boat._baseLaneChangeDurationMs || this.boat.laneChangeDurationMs;
      this.boat.laneChangeDurationMs = this.powerUpManager.isActive('speed')
        ? Math.min(baseLaneChangeMs, CONFIG.POWERUPS.SPEED_BOOST_LANE_CHANGE_MS)
        : baseLaneChangeMs;

      let effectiveSpeed = this.difficulty.speed;
      if (this.mode === 'race' && this._racePenaltyMsRemaining > 0) {
        effectiveSpeed *= CONFIG.RACE.COLLISION_PENALTY_SPEED_FACTOR;
      }
      if (this.powerUpManager.isActive('speed')) {
        effectiveSpeed *= CONFIG.POWERUPS.SPEED_BOOST_SCORE_MULTIPLIER;
      }
      this.scoreManager.update(deltaSec, effectiveSpeed);

      this.boat.update(deltaMs, (x, y, dir) => this.renderer.effects.emitSplash(x, y, dir));

      this.boat.wakeAccumulatorMs += 0;
      if (this.boat.wakeAccumulatorMs >= CONFIG.PARTICLES.WAKE_EMIT_INTERVAL_MS) {
        this.boat.wakeAccumulatorMs = 0;
        this.renderer.effects.emitWake(this.boat.x, this.boat.y);
      }

      // --- Hazard spawning (icebergs, purchased obstacle skins, oncoming boats) ---
      this.spawner.update(deltaMs, this.difficulty, (blockedLanes) => {
        const spawnY = -CONFIG.ICEBERG.MAX_HEIGHT;
        const unlockedObstacleDefs = this.progression.getUnlockedObstacleDefs();
        const allowBoats = this.mode === 'endless';
        const newHazards = createHazardsForRow(
          blockedLanes,
          this.lanePositions,
          spawnY,
          unlockedObstacleDefs,
          this.scoreManager.displayScore,
          allowBoats
        );
        this.hazards.push(...newHazards);
        if (this.mode === 'race') this.raceManager.notifyNewRow(blockedLanes);
      });

      for (const hazard of this.hazards) {
        hazard.update(deltaSec, this.difficulty.speed);
      }
      this.hazards = this.hazards.filter(
        (h) => !h.markedForRemoval && !h.isOffscreen(this.renderer.height)
      );

      // --- Coin pickups ---
      this._coinTimeSinceSpawnMs += deltaMs;
      if (this._coinTimeSinceSpawnMs >= this._coinNextSpawnMs) {
        this._coinTimeSinceSpawnMs = 0;
        this._coinNextSpawnMs = randRange(
          CONFIG.COINS.MIN_SPAWN_INTERVAL_MS,
          CONFIG.COINS.MAX_SPAWN_INTERVAL_MS
        );
        const laneIndex = Math.floor(Math.random() * this.lanePositions.length);
        this.coinPickups.push(new Coin(laneIndex, this.lanePositions[laneIndex], -40));
      }

      const magnetActive = this.powerUpManager.isActive('magnet');
      // Scale the magnet's reach with the current lane width, not just a
      // fixed pixel radius — on wide desktop windows the lanes are spread
      // much further apart than on mobile, so a flat radius stops reaching
      // coins in neighboring lanes. This keeps the mobile feel (radius
      // rarely changes there) while fixing the desktop case.
      const magnetRadius = Math.max(CONFIG.POWERUPS.MAGNET_RADIUS_PX, this.laneWidth * 1.5);
      for (const coin of this.coinPickups) {
        if (magnetActive) {
          const dist = Math.hypot(this.boat.x - coin.x, this.boat.y - coin.y);
          if (dist < magnetRadius) {
            coin.attractToward(this.boat.x, this.boat.y, deltaSec, 6);
          }
        }
        coin.update(deltaSec, this.difficulty.speed);
      }

      const coinHits = checkPickups(this.boat, this.coinPickups);
      for (const coin of coinHits) {
        coin.collected = true;
        coin.markedForRemoval = true;
        const multiplier = this.powerUpManager.isActive('coinBonus')
          ? CONFIG.POWERUPS.COIN_BONUS_MULTIPLIER
          : 1;
        const amount = CONFIG.COINS.VALUE * multiplier;
        this.progression.addCoins(amount);
        this._runCoinsEarned += amount;
      }
      this.coinPickups = this.coinPickups.filter(
        (c) => !c.markedForRemoval && !c.isOffscreen(this.renderer.height)
      );

      // --- Power-up pickups ---
      const newPowerUp = this.powerUpManager.maybeSpawn(deltaMs, this.mode, this.lanePositions, -40);
      if (newPowerUp) this.powerUps.push(newPowerUp);
      for (const p of this.powerUps) p.update(deltaSec, this.difficulty.speed);

      const powerUpHits = checkPickups(this.boat, this.powerUps);
      for (const p of powerUpHits) {
        p.collected = true;
        p.markedForRemoval = true;
        if (p.typeDef.id === 'repair') {
          this.survivalHealth = Math.min(
            CONFIG.SURVIVAL.MAX_HEALTH,
            this.survivalHealth + CONFIG.POWERUPS.REPAIR_HEAL_AMOUNT
          );
        } else {
          this.powerUpManager.activate(p.typeDef);
        }
        this.audio.click();
      }
      this.powerUps = this.powerUps.filter(
        (p) => !p.markedForRemoval && !p.isOffscreen(this.renderer.height)
      );
      this.powerUpManager.update(deltaMs);

      // --- Collisions ---
      const hit = checkCollisions(this.boat, this.hazards);
      if (hit) {
        if (this.boat.isInvincible) {
          hit.markedForRemoval = true;
        } else if (this.powerUpManager.isActive('shield')) {
          hit.markedForRemoval = true;
          this.powerUpManager.consume('shield');
          this.audio.laneMove();
          this.renderer.effects.emitDodge(this.boat.x, this.boat.y);
        } else if (this.boat.consumeDodge()) {
          hit.markedForRemoval = true;
          this.audio.laneMove();
          this.renderer.effects.emitDodge(this.boat.x, this.boat.y);
        } else if (this.mode === 'survival') {
          hit.markedForRemoval = true;
          if (this._survivalInvulnMsRemaining <= 0) {
            this._survivalTakeHit(hit);
          }
        } else if (this.mode === 'race') {
          hit.markedForRemoval = true;
          this._racePenaltyMsRemaining = CONFIG.RACE.COLLISION_PENALTY_MS;
          this.audio.collision();
          this.renderer.effects.emitCollision(this.boat.x, this.boat.y);
        } else {
          this._gameOver();
        }
      }

      if (this.state.is(States.PLAYING) && this.mode === 'survival') {
        this._checkSurvivalCheckpoint();
      }

      if (
        this.state.is(States.PLAYING) &&
        this.mode === 'level' &&
        this.currentLevelConfig &&
        this.scoreManager.displayScore >= this.currentLevelConfig.targetScore
      ) {
        this._levelComplete();
      }

      if (this.state.is(States.PLAYING) && this.mode === 'race') {
        this.raceManager.update(deltaMs, this.difficulty.speed, this.scoreManager.distancePx);
        if (!this._raceFinished && this.scoreManager.distancePx >= CONFIG.RACE.DISTANCE_PX) {
          this._raceFinished = true;
          const rank = this.raceManager.finishPlayer();
          this._raceFinish(rank);
        } else if (this.state.is(States.PLAYING)) {
          const position = this.raceManager.getLivePosition(this.scoreManager.distancePx);
          this.ui.updateRaceHud(
            position,
            this.raceManager.totalRacers,
            this.scoreManager.distancePx,
            CONFIG.RACE.DISTANCE_PX
          );
        }
      }

      this.ui.updateHud(this.scoreManager.displayScore, this.progression.coins, this.boat);
      if (this.mode === 'survival') {
        this.ui.updateSurvivalHud(
          this.survivalLives,
          CONFIG.SURVIVAL.STARTING_LIVES,
          this.survivalHealth,
          CONFIG.SURVIVAL.MAX_HEALTH
        );
      }
      this.ui.renderActivePowerUps(this.powerUpManager.getActiveList(POWERUP_TYPES));
    }

    // Ocean keeps animating gently even outside active play for a lively menu.
    const speedFactor = this.state.is(States.PLAYING)
      ? this.difficulty.speed / CONFIG.DIFFICULTY.INITIAL_SPEED
      : 0.6;
    this._oceanSpeedFactor = speedFactor;
    this._lastDeltaSec = deltaSec;
  }

  _render() {
    this.renderer.clear();
    this.renderer.renderOcean(
      this._lastDeltaSec || 0,
      this._oceanSpeedFactor || 0.6,
      this.lanePositions,
      this.laneWidth
    );

    for (const hazard of this.hazards) {
      this.renderer.renderHazard(hazard);
    }
    for (const coin of this.coinPickups) {
      this.renderer.renderCoin(coin);
    }
    for (const powerUp of this.powerUps) {
      this.renderer.renderPowerUp(powerUp);
    }

    if (this.mode === 'race' && this.boat) {
      const playerProgress = this.scoreManager.distancePx;
      for (const bot of this.raceManager.bots) {
        const y = this.boat.y - (bot.progress - playerProgress);
        if (y > -100 && y < this.renderer.height + 100) {
          this.renderer.renderBot(bot, y);
        }
      }
    }

    if (this.boat) {
      this.renderer.renderBoat(this.boat);
    }

    this.renderer.renderEffects(this._lastDeltaSec || 0);
  }
}
