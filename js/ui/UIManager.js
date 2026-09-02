// UIManager.js
// Manages all DOM-based UI overlays (menu, HUD, pause, game over, settings).
// Keeps UI concerns out of the canvas/game logic entirely.

import { ScoreManager } from '../systems/ScoreManager.js';
import { States } from '../game/GameState.js';

export class UIManager {
  constructor() {
    this.el = {
      menu: document.getElementById('screen-menu'),
      hud: document.getElementById('hud'),
      pause: document.getElementById('screen-pause'),
      gameOver: document.getElementById('screen-gameover'),
      settings: document.getElementById('screen-settings'),

      menuHighScore: document.getElementById('menu-high-score'),
      hudScore: document.getElementById('hud-score'),
      hudBest: document.getElementById('hud-best'),

      gameOverScore: document.getElementById('gameover-score'),
      gameOverBest: document.getElementById('gameover-best'),
      newRecordBadge: document.getElementById('new-record-badge'),

      btnPlay: document.getElementById('btn-play'),
      btnSettingsOpen: document.getElementById('btn-settings-open'),
      btnSettingsClose: document.getElementById('btn-settings-close'),
      btnPause: document.getElementById('btn-pause'),
      btnResume: document.getElementById('btn-resume'),
      btnPauseMainMenu: document.getElementById('btn-pause-main-menu'),
      btnPlayAgain: document.getElementById('btn-play-again'),
      btnGameOverMainMenu: document.getElementById('btn-gameover-main-menu'),
      btnMute: document.getElementById('btn-mute'),

      toggleSfx: document.getElementById('toggle-sfx'),
      toggleMusic: document.getElementById('toggle-music'),
      toggleTouch: document.getElementById('toggle-touch'),
      toggleReducedFx: document.getElementById('toggle-reduced-fx'),

      touchControls: document.getElementById('touch-controls'),
      btnLeft: document.getElementById('btn-left'),
      btnRight: document.getElementById('btn-right')
    };

    this._screens = [this.el.menu, this.el.pause, this.el.gameOver, this.el.settings];
  }

  _hideAllScreens() {
    for (const screen of this._screens) {
      screen.classList.remove('visible');
    }
  }

  showForState(state, context = {}) {
    switch (state) {
      case States.MENU:
        this._hideAllScreens();
        this.el.menu.classList.add('visible');
        this.el.hud.classList.remove('visible');
        this.el.menuHighScore.textContent = ScoreManager.format(context.highScore || 0);
        break;
      case States.PLAYING:
        this._hideAllScreens();
        this.el.hud.classList.add('visible');
        break;
      case States.PAUSED:
        this.el.pause.classList.add('visible');
        break;
      case States.GAME_OVER:
        this._hideAllScreens();
        this.el.gameOver.classList.add('visible');
        this.el.hud.classList.remove('visible');
        this.el.gameOverScore.textContent = ScoreManager.format(context.score || 0);
        this.el.gameOverBest.textContent = ScoreManager.format(context.highScore || 0);
        this.el.newRecordBadge.classList.toggle('visible', !!context.isNewRecord);
        break;
      case States.SETTINGS:
        this.el.settings.classList.add('visible');
        break;
      default:
        break;
    }
  }

  hidePauseOverlay() {
    this.el.pause.classList.remove('visible');
  }

  hideSettingsOverlay() {
    this.el.settings.classList.remove('visible');
  }

  updateHud(score, best) {
    this.el.hudScore.textContent = ScoreManager.format(score);
    this.el.hudBest.textContent = ScoreManager.format(best);
  }

  applySettingsToControls(settings) {
    this.el.toggleSfx.checked = settings.sfxEnabled;
    this.el.toggleMusic.checked = settings.musicEnabled;
    this.el.toggleTouch.checked = settings.touchControlsEnabled;
    this.el.toggleReducedFx.checked = settings.reducedEffects;
    this.el.touchControls.classList.toggle('hidden', !settings.touchControlsEnabled);
    this.el.btnMute.setAttribute(
      'aria-pressed',
      String(!settings.sfxEnabled && !settings.musicEnabled)
    );
    this.el.btnMute.textContent = settings.sfxEnabled || settings.musicEnabled ? '🔊' : '🔇';
  }
}
