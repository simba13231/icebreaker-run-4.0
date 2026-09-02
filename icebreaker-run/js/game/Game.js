// Game.js
// Top-level orchestrator. Wires together state, entities, systems, and
// rendering. Owns the GameLoop and reacts to input/state changes.
//
// v2 adds: mode select (Endless/Levels), a 50-level progression system, a
// boat shop with equip-able abilities, and an ad-gated revive flow. None of
// this changes the core loop/collision/rendering architecture — it's all
// wired in alongside it.

import { CONFIG } from '../config.js';
import { GameState, States } from './GameState.js';
import { Difficulty } from './Difficulty.js';
import { checkCollisions } from './Collision.js';
import { GameLoop } from './GameLoop.js';
import { Progression } from './Progression.js';

import { Boat } from '../entities/Boat.js';

import { Spawner, createIcebergsForRow } from '../systems/Spawner.js';
import { InputManager } from '../systems/InputManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { ScoreManager } from '../systems/ScoreManager.js';
import { StorageManager, LocalLeaderboardService } from '../systems/StorageManager.js';
import { AdProvider } from '../systems/AdProvider.js';

import { Renderer } from '../rendering/Renderer.js';
import { UIManager } from '../ui/UIManager.js';

import { getLevelConfig } from '../data/Levels.js';

const DEFAULT_SETTINGS = {
  sfxEnabled: true,
  musicEnabled: true,
  touchControlsEnabled: true,
  reducedEffects: false
};

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

    // Run context: which mode is active and (for level mode) which level.
    this.mode = 'endless';
    this.currentLevel = null;
    this.currentLevelConfig = null;
    this._reviveInProgress = false;

    this.lanePositions = [0, 0, 0];
    this.boat = null;
    this.icebergs = [];

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

    // Menu -> mode select -> (endless | levels) -> gameplay
    this.ui.el.btnPlay.addEventListener('click', () => this._openModeSelect());
    this.ui.el.btnModeSelectBack.addEventListener('click', () => this._backToMenu());
    this.ui.el.btnModeEndless.addEventListener('click', () => this._startRun('endless'));
    this.ui.el.btnModeLevels.addEventListener('click', () => this._openLevelSelect());
    this.ui.el.btnLevelSelectBack.addEventListener('click', () => this._backToModeSelect());
    this.ui.onLevelSelect((levelNumber) => this._startRun('level', levelNumber));

    // Boat shop
    this.ui.el.btnBoatShopOpen.addEventListener('click', () => this._openBoatShop());
    this.ui.el.btnBoatShopBack.addEventListener('click', () => this._backToMenu());
    this.ui.onBoatAction((action, boatId) => this._handleBoatAction(action, boatId));

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
  }

  _resetEntities() {
    const startLane = Math.floor(CONFIG.GAME.LANES / 2);
    this.boat = new Boat(this.lanePositions, startLane, this.progression.equippedBoatId);
    this.boat.setY(this._boatY);
    this.icebergs = [];

    if (this.mode === 'level' && this.currentLevelConfig) {
      this.difficulty.configureForLevel(this.currentLevelConfig);
    } else {
      this.difficulty.configureEndless();
    }

    this.scoreManager.reset();
    this.spawner.reset();
    this.renderer.effects.clear();
  }

  // ---------------------------------------------------------------------
  // State transitions — menus / mode / level / shop navigation
  // ---------------------------------------------------------------------

  _onStateChange(state) {
    if (state === States.PLAYING) {
      this.ui.showForState(States.PLAYING);
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
    if (mode === 'level' && levelNumber) {
      this.currentLevel = levelNumber;
      this.currentLevelConfig = getLevelConfig(levelNumber);
    } else {
      this.mode = 'endless';
      this.currentLevel = null;
      this.currentLevelConfig = null;
    }

    this.audio.ensureContext();
    this.audio.click();
    this._resetEntities();
    this.state.set(States.PLAYING);
    if (this.settings.musicEnabled) this.audio.startMusic();
  }

  _goToMenu() {
    this.audio.click();
    this.audio.stopMusic();
    this.ui.hidePauseOverlay();
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
    const canRevive = this.scoreManager.displayScore < CONFIG.REVIVE.SCORE_CAP;

    this.state.set(States.GAME_OVER);
    this.ui.showForState(States.GAME_OVER, {
      score: this.scoreManager.displayScore,
      highScore: result.highScore,
      isNewRecord: result.isNewRecord,
      canRevive
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
    this.icebergs = [];
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
  // Update / render
  // ---------------------------------------------------------------------

  _update(deltaMs) {
    const deltaSec = deltaMs / 1000;

    if (this.state.is(States.PLAYING)) {
      this.difficulty.update(deltaSec);
      this.scoreManager.update(deltaSec, this.difficulty.speed);
      if (this.mode === 'endless') {
        this.difficulty.updateFromScore(this.scoreManager.displayScore);
      }

      this.boat.update(deltaMs, (x, y, dir) => this.renderer.effects.emitSplash(x, y, dir));

      this.boat.wakeAccumulatorMs += 0;
      if (this.boat.wakeAccumulatorMs >= CONFIG.PARTICLES.WAKE_EMIT_INTERVAL_MS) {
        this.boat.wakeAccumulatorMs = 0;
        this.renderer.effects.emitWake(this.boat.x, this.boat.y);
      }

      this.spawner.update(deltaMs, this.difficulty, (blockedLanes) => {
        const spawnY = -CONFIG.ICEBERG.MAX_HEIGHT;
        const newBergs = createIcebergsForRow(blockedLanes, this.lanePositions, spawnY);
        this.icebergs.push(...newBergs);
      });

      for (const iceberg of this.icebergs) {
        iceberg.update(deltaSec, this.difficulty.speed);
      }
      this.icebergs = this.icebergs.filter(
        (b) => !b.markedForRemoval && !b.isOffscreen(this.renderer.height)
      );

      const hit = checkCollisions(this.boat, this.icebergs);
      if (hit) {
        if (this.boat.isInvincible) {
          hit.markedForRemoval = true;
        } else if (this.boat.consumeDodge()) {
          hit.markedForRemoval = true;
          this.audio.laneMove();
          this.renderer.effects.emitDodge(this.boat.x, this.boat.y);
        } else {
          this._gameOver();
        }
      }

      if (
        this.state.is(States.PLAYING) &&
        this.mode === 'level' &&
        this.currentLevelConfig &&
        this.scoreManager.displayScore >= this.currentLevelConfig.targetScore
      ) {
        this._levelComplete();
      }

      this.ui.updateHud(this.scoreManager.displayScore, this.progression.coins, this.boat);
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

    for (const iceberg of this.icebergs) {
      this.renderer.renderIceberg(iceberg);
    }

    if (this.boat) {
      this.renderer.renderBoat(this.boat);
    }

    this.renderer.renderEffects(this._lastDeltaSec || 0);
  }
}
