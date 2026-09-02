// UIManager.js
// Manages all DOM-based UI overlays (menu, HUD, pause, game over, settings,
// mode select, level select, boat shop, level complete). Keeps UI concerns
// out of the canvas/game logic entirely.

import { ScoreManager } from '../systems/ScoreManager.js';
import { States } from '../game/GameState.js';
import { CONFIG } from '../config.js';
import { BOATS } from '../data/Boats.js';
import { getAllLevelNumbers } from '../data/Levels.js';

export class UIManager {
  constructor() {
    this.el = {
      menu: document.getElementById('screen-menu'),
      modeSelect: document.getElementById('screen-mode-select'),
      levelSelect: document.getElementById('screen-level-select'),
      boatShop: document.getElementById('screen-boat-shop'),
      hud: document.getElementById('hud'),
      pause: document.getElementById('screen-pause'),
      levelComplete: document.getElementById('screen-level-complete'),
      gameOver: document.getElementById('screen-gameover'),
      settings: document.getElementById('screen-settings'),

      menuCoins: document.getElementById('menu-coins'),
      menuHighScore: document.getElementById('menu-high-score'),
      hudScore: document.getElementById('hud-score'),
      hudCoins: document.getElementById('hud-coins'),

      hudAbility: document.getElementById('hud-ability'),
      btnAbility: document.getElementById('btn-ability'),
      hudDodges: document.getElementById('hud-dodges'),
      hudDodgesCount: document.getElementById('hud-dodges-count'),
      hudShieldTimer: document.getElementById('hud-shield-timer'),
      hudShieldSeconds: document.getElementById('hud-shield-seconds'),

      gameOverScore: document.getElementById('gameover-score'),
      gameOverBest: document.getElementById('gameover-best'),
      newRecordBadge: document.getElementById('new-record-badge'),
      btnWatchAdRevive: document.getElementById('btn-watch-ad-revive'),

      levelCompleteHeading: document.getElementById('levelcomplete-heading'),
      levelCompleteScore: document.getElementById('levelcomplete-score'),
      levelCompleteCoins: document.getElementById('levelcomplete-coins'),
      btnNextLevel: document.getElementById('btn-next-level'),
      btnLevelCompleteBack: document.getElementById('btn-level-complete-back'),

      levelSelectCoins: document.getElementById('level-select-coins'),
      levelGrid: document.getElementById('level-grid'),
      shopCoins: document.getElementById('shop-coins'),
      boatGrid: document.getElementById('boat-grid'),

      btnPlay: document.getElementById('btn-play'),
      btnBoatShopOpen: document.getElementById('btn-boat-shop-open'),
      btnBoatShopBack: document.getElementById('btn-boat-shop-back'),
      btnModeSelectBack: document.getElementById('btn-mode-select-back'),
      btnModeEndless: document.getElementById('btn-mode-endless'),
      btnModeLevels: document.getElementById('btn-mode-levels'),
      btnLevelSelectBack: document.getElementById('btn-level-select-back'),

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

    this._screens = [
      this.el.menu,
      this.el.modeSelect,
      this.el.levelSelect,
      this.el.boatShop,
      this.el.pause,
      this.el.levelComplete,
      this.el.gameOver,
      this.el.settings
    ];

    this._levelSelectListeners = new Set();
    this._boatActionListeners = new Set();
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
        this.el.menuCoins.textContent = String(context.coins || 0);
        break;
      case States.MODE_SELECT:
        this._hideAllScreens();
        this.el.modeSelect.classList.add('visible');
        break;
      case States.LEVEL_SELECT:
        this._hideAllScreens();
        this.el.levelSelect.classList.add('visible');
        this.el.levelSelectCoins.textContent = String(context.coins || 0);
        break;
      case States.BOAT_SHOP:
        this._hideAllScreens();
        this.el.boatShop.classList.add('visible');
        this.el.shopCoins.textContent = String(context.coins || 0);
        break;
      case States.PLAYING:
        this._hideAllScreens();
        this.el.hud.classList.add('visible');
        break;
      case States.PAUSED:
        this.el.pause.classList.add('visible');
        break;
      case States.LEVEL_COMPLETE:
        this._hideAllScreens();
        this.el.hud.classList.remove('visible');
        this.el.levelComplete.classList.add('visible');
        this.el.levelCompleteHeading.textContent = `LEVEL ${context.level || 1} COMPLETE!`;
        this.el.levelCompleteScore.textContent = ScoreManager.format(context.score || 0);
        this.el.levelCompleteCoins.textContent = `+${context.coinsAwarded || 0} 🪙`;
        this.el.btnNextLevel.classList.toggle('hidden', !context.hasNextLevel);
        break;
      case States.GAME_OVER:
        this._hideAllScreens();
        this.el.gameOver.classList.add('visible');
        this.el.hud.classList.remove('visible');
        this.el.gameOverScore.textContent = ScoreManager.format(context.score || 0);
        this.el.gameOverBest.textContent = ScoreManager.format(context.highScore || 0);
        this.el.newRecordBadge.classList.toggle('visible', !!context.isNewRecord);
        this.el.btnWatchAdRevive.classList.toggle('hidden', !context.canRevive);
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

  /** Updates HUD score/coins plus ability indicators for the given boat. */
  updateHud(score, coins, boat) {
    this.el.hudScore.textContent = ScoreManager.format(score);
    this.el.hudCoins.textContent = String(coins);

    if (!boat) return;
    const abilityType = boat.boatDef ? boat.boatDef.abilityType : 'none';

    const showAbilityBtn =
      abilityType === 'invincibility' && boat.invincibilityCharges > 0 && !boat.isInvincible;
    this.el.btnAbility.classList.toggle('hidden', !showAbilityBtn);

    const showShieldTimer = boat.isInvincible;
    this.el.hudShieldTimer.classList.toggle('hidden', !showShieldTimer);
    if (showShieldTimer) {
      this.el.hudShieldSeconds.textContent = (boat.invincibleMsRemaining / 1000).toFixed(1);
    }

    const showDodges = abilityType === 'dodge';
    this.el.hudDodges.classList.toggle('hidden', !showDodges);
    if (showDodges) {
      this.el.hudDodgesCount.textContent = String(boat.dodgesRemaining);
    }
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

  // --- Level select grid ----------------------------------------------------

  onLevelSelect(listener) {
    this._levelSelectListeners.add(listener);
    return () => this._levelSelectListeners.delete(listener);
  }

  /** Rebuilds the 1..N level buttons based on current progression. */
  renderLevelGrid(progression) {
    const grid = this.el.levelGrid;
    grid.innerHTML = '';
    for (const levelNumber of getAllLevelNumbers()) {
      const unlocked = progression.isLevelUnlocked(levelNumber);
      const completed = progression.isLevelCompleted(levelNumber);

      const btn = document.createElement('button');
      btn.className = 'level-tile';
      btn.classList.toggle('level-tile--locked', !unlocked);
      btn.classList.toggle('level-tile--completed', completed);
      btn.disabled = !unlocked;
      btn.setAttribute('aria-label', unlocked ? `Level ${levelNumber}` : `Level ${levelNumber} (locked)`);

      if (!unlocked) {
        btn.innerHTML = `<span class="level-tile-lock">🔒</span>`;
      } else {
        btn.innerHTML = `<span class="level-tile-number">${levelNumber}</span>${
          completed ? '<span class="level-tile-star">★</span>' : ''
        }`;
        btn.addEventListener('click', () => {
          for (const l of this._levelSelectListeners) l(levelNumber);
        });
      }
      grid.appendChild(btn);
    }
  }

  // --- Boat shop grid ---------------------------------------------------------

  onBoatAction(listener) {
    this._boatActionListeners.add(listener);
    return () => this._boatActionListeners.delete(listener);
  }

  _emitBoatAction(action, boatId) {
    for (const l of this._boatActionListeners) l(action, boatId);
  }

  /** Rebuilds the boat shop cards based on current progression. */
  renderBoatGrid(progression) {
    const grid = this.el.boatGrid;
    grid.innerHTML = '';
    this.el.shopCoins.textContent = String(progression.coins);

    for (const boat of BOATS) {
      const owned = progression.ownsBoat(boat.id);
      const equipped = progression.equippedBoatId === boat.id;
      const canAfford = progression.coins >= boat.price;

      const card = document.createElement('div');
      card.className = 'boat-card';
      card.classList.toggle('boat-card--equipped', equipped);

      const swatch = document.createElement('div');
      swatch.className = 'boat-card-swatch';
      swatch.style.background = `linear-gradient(180deg, ${boat.colors.hull}, ${boat.colors.hullShade})`;
      swatch.style.borderColor = boat.colors.cabin;
      card.appendChild(swatch);

      const name = document.createElement('div');
      name.className = 'boat-card-name';
      name.textContent = boat.name;
      card.appendChild(name);

      if (boat.abilityLabel) {
        const ability = document.createElement('div');
        ability.className = 'boat-card-ability';
        ability.textContent = boat.abilityLabel;
        card.appendChild(ability);
      }

      const actionRow = document.createElement('div');
      actionRow.className = 'boat-card-action';

      if (equipped) {
        const badge = document.createElement('span');
        badge.className = 'boat-card-equipped-badge';
        badge.textContent = '✓ EQUIPPED';
        actionRow.appendChild(badge);
      } else if (owned) {
        const equipBtn = document.createElement('button');
        equipBtn.className = 'btn btn--secondary btn--card';
        equipBtn.textContent = 'EQUIP';
        equipBtn.addEventListener('click', () => this._emitBoatAction('equip', boat.id));
        actionRow.appendChild(equipBtn);
      } else {
        const buyBtn = document.createElement('button');
        buyBtn.className = 'btn btn--primary btn--card';
        buyBtn.disabled = !canAfford;
        buyBtn.textContent = boat.price === 0 ? 'FREE' : `${boat.price} 🪙`;
        buyBtn.addEventListener('click', () => this._emitBoatAction('purchase', boat.id));
        actionRow.appendChild(buyBtn);
      }

      card.appendChild(actionRow);
      grid.appendChild(card);
    }
  }

  /** Brief "PURCHASED!" flash on a boat card region (called after a successful purchase). */
  flashPurchased() {
    const grid = this.el.boatGrid;
    const flash = document.createElement('div');
    flash.className = 'purchase-flash';
    flash.textContent = 'PURCHASED!';
    grid.parentElement.appendChild(flash);
    setTimeout(() => flash.remove(), 900);
  }
}
