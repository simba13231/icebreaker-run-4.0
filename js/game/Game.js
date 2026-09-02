// Game.js
// Top-level orchestrator. Wires together state, entities, systems, and
// rendering. Owns the GameLoop and reacts to input/state changes.

import { CONFIG } from '../config.js';
import { GameState, States } from './GameState.js';
import { Difficulty } from './Difficulty.js';
import { checkCollisions } from './Collision.js';
import { GameLoop } from './GameLoop.js';

import { Boat } from '../entities/Boat.js';

import { Spawner, createIcebergsForRow } from '../systems/Spawner.js';
import { InputManager } from '../systems/InputManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { ScoreManager } from '../systems/ScoreManager.js';
import { StorageManager, LocalLeaderboardService } from '../systems/StorageManager.js';

import { Renderer } from '../rendering/Renderer.js';
import { UIManager } from '../ui/UIManager.js';

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

    this.settings = this.storage.getSettings(DEFAULT_SETTINGS);
    this.audio.setSfxEnabled(this.settings.sfxEnabled);
    this.audio.setMusicEnabled(this.settings.musicEnabled);
    this.renderer.effects.setReducedEffects(this.settings.reducedEffects);

    this.difficulty = new Difficulty();
    this.scoreManager = new ScoreManager();
    this.spawner = new Spawner(CONFIG.GAME.LANES);

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
    this.ui.showForState(States.MENU, { highScore: this.leaderboard.getHighScore() });
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

    this.ui.el.btnPlay.addEventListener('click', () => this._handlePlay());
    this.ui.el.btnPlayAgain.addEventListener('click', () => this._handlePlay());

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
    this.boat = new Boat(this.lanePositions, startLane);
    this.boat.setY(this._boatY);
    this.icebergs = [];
    this.difficulty.reset();
    this.scoreManager.reset();
    this.spawner.reset();
    this.renderer.effects.clear();
  }

  // ---------------------------------------------------------------------
  // State transitions
  // ---------------------------------------------------------------------

  _onStateChange(state) {
    if (state === States.PLAYING) {
      this.ui.showForState(States.PLAYING);
    }
  }

  _handlePlay() {
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
    this.ui.showForState(States.MENU, { highScore: this.leaderboard.getHighScore() });
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
      this.ui.showForState(States.MENU, { highScore: this.leaderboard.getHighScore() });
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

  _gameOver() {
    this.audio.collision();
    this.audio.stopMusic();
    this.renderer.effects.emitCollision(this.boat.x, this.boat.y);

    const result = this.leaderboard.submitScore(this.scoreManager.displayScore);
    this.state.set(States.GAME_OVER);
    this.ui.showForState(States.GAME_OVER, {
      score: this.scoreManager.displayScore,
      highScore: result.highScore,
      isNewRecord: result.isNewRecord
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
      this.icebergs = this.icebergs.filter((b) => !b.isOffscreen(this.renderer.height));

      const hit = checkCollisions(this.boat, this.icebergs);
      if (hit) {
        this._gameOver();
      }

      this.ui.updateHud(this.scoreManager.displayScore, this.leaderboard.getHighScore());
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

    if (this.boat && !this.state.is(States.MENU)) {
      this.renderer.renderBoat(this.boat);
    } else if (this.boat && this.state.is(States.MENU)) {
      this.renderer.renderBoat(this.boat);
    }

    this.renderer.renderEffects(this._lastDeltaSec || 0);
  }
}
