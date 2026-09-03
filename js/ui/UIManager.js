// UIManager.js
// Manages all DOM-based UI overlays (menu, HUD, pause, game over, settings,
// mode select, level select, boat/obstacle shop, level complete, survival
// checkpoint, race countdown/results). Keeps UI concerns out of the
// canvas/game logic entirely.

import { ScoreManager } from '../systems/ScoreManager.js';
import { States } from '../game/GameState.js';
import { CONFIG } from '../config.js';
import { BOATS } from '../data/Boats.js';
import { OBSTACLES } from '../data/Obstacles.js';
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
      checkpoint: document.getElementById('screen-checkpoint'),
      raceCountdown: document.getElementById('screen-race-countdown'),
      raceResults: document.getElementById('screen-race-results'),

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

      hudSurvival: document.getElementById('hud-survival'),
      hudLives: document.getElementById('hud-lives'),
      hudHealthFill: document.getElementById('hud-health-fill'),

      hudRace: document.getElementById('hud-race'),
      hudRacePosition: document.getElementById('hud-race-position'),
      hudRaceProgressFill: document.getElementById('hud-race-progress-fill'),

      hudPowerupEffects: document.getElementById('hud-powerup-effects'),

      gameOverHeading: document.getElementById('gameover-heading'),
      gameOverScore: document.getElementById('gameover-score'),
      gameOverBest: document.getElementById('gameover-best'),
      gameOverCoinsBlock: document.getElementById('gameover-coins-block'),
      gameOverCoins: document.getElementById('gameover-coins'),
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
      obstacleGrid: document.getElementById('obstacle-grid'),
      btnShopTabBoats: document.getElementById('btn-shop-tab-boats'),
      btnShopTabObstacles: document.getElementById('btn-shop-tab-obstacles'),

      checkpointHealthFill: document.getElementById('checkpoint-health-fill'),
      checkpointHealthLabel: document.getElementById('checkpoint-health-label'),
      btnCheckpointRepair: document.getElementById('btn-checkpoint-repair'),
      btnCheckpointSkip: document.getElementById('btn-checkpoint-skip'),

      raceCountdownNumber: document.getElementById('race-countdown-number'),
      raceResultsBadge: document.getElementById('race-results-badge'),
      raceResultsHeading: document.getElementById('race-results-heading'),
      raceResultsScore: document.getElementById('race-results-score'),
      raceResultsCoins: document.getElementById('race-results-coins'),
      btnRaceResultsRetry: document.getElementById('btn-race-results-retry'),
      btnRaceResultsMenu: document.getElementById('btn-race-results-menu'),

      btnPlay: document.getElementById('btn-play'),
      btnBoatShopOpen: document.getElementById('btn-boat-shop-open'),
      btnBoatShopBack: document.getElementById('btn-boat-shop-back'),
      btnModeSelectBack: document.getElementById('btn-mode-select-back'),
      btnModeEndless: document.getElementById('btn-mode-endless'),
      btnModeLevels: document.getElementById('btn-mode-levels'),
      btnModeSurvival: document.getElementById('btn-mode-survival'),
      btnModeRace: document.getElementById('btn-mode-race'),
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
      this.el.settings,
      this.el.checkpoint,
      this.el.raceCountdown,
      this.el.raceResults
    ];

    this._levelSelectListeners = new Set();
    this._boatActionListeners = new Set();
    this._obstacleActionListeners = new Set();

    this.el.btnShopTabBoats.addEventListener('click', () => this._setShopTab('boats'));
    this.el.btnShopTabObstacles.addEventListener('click', () => this._setShopTab('obstacles'));
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
        this._setShopTab('boats');
        break;
      case States.PLAYING:
        this._hideAllScreens();
        this.el.hud.classList.add('visible');
        this.setModeHudVisibility(context.mode);
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
        this.el.gameOverHeading.textContent = context.heading || 'GAME OVER';
        this.el.gameOverScore.textContent = ScoreManager.format(context.score || 0);
        this.el.gameOverBest.textContent = ScoreManager.format(context.highScore || 0);
        this.el.newRecordBadge.classList.toggle('visible', !!context.isNewRecord);
        this.el.btnWatchAdRevive.classList.toggle('hidden', !context.canRevive);
        if (context.coinsEarned) {
          this.el.gameOverCoinsBlock.classList.remove('hidden');
          this.el.gameOverCoins.textContent = `+${context.coinsEarned} 🪙`;
        } else {
          this.el.gameOverCoinsBlock.classList.add('hidden');
        }
        break;
      case States.SETTINGS:
        this.el.settings.classList.add('visible');
        break;
      case States.CHECKPOINT:
        this.el.checkpoint.classList.add('visible');
        this.updateCheckpointModal(context.health, context.maxHealth, context.canAfford);
        break;
      case States.RACE_COUNTDOWN:
        this._hideAllScreens();
        this.el.hud.classList.remove('visible');
        this.el.raceCountdown.classList.add('visible');
        break;
      case States.RACE_RESULTS:
        this._hideAllScreens();
        this.el.hud.classList.remove('visible');
        this.el.raceResults.classList.add('visible');
        this._renderRaceResults(context);
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

  hideCheckpointOverlay() {
    this.el.checkpoint.classList.remove('visible');
  }

  hideRaceCountdownOverlay() {
    this.el.raceCountdown.classList.remove('visible');
  }

  /** Shows/hides the mode-specific HUD rows (survival health/lives, race position). */
  setModeHudVisibility(mode) {
    this.el.hudSurvival.classList.toggle('hidden', mode !== 'survival');
    this.el.hudRace.classList.toggle('hidden', mode !== 'race');
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

  /** Survival Run: lives (heart icons) + health bar. */
  updateSurvivalHud(lives, maxLives, health, maxHealth) {
    this.el.hudLives.innerHTML = '';
    for (let i = 0; i < maxLives; i++) {
      const span = document.createElement('span');
      span.className = i < lives ? 'life-icon' : 'life-icon life-icon--lost';
      span.textContent = '❤️';
      this.el.hudLives.appendChild(span);
    }
    const pct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
    this.el.hudHealthFill.style.width = `${pct}%`;
    this.el.hudHealthFill.classList.toggle('health-bar-fill--low', pct <= 30);
  }

  /** Race Mode: live position pill + progress bar. */
  updateRaceHud(position, totalRacers, progressPx, distancePx) {
    const suffix = position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th';
    this.el.hudRacePosition.textContent = `${position}${suffix} / ${totalRacers}`;
    const pct = Math.max(0, Math.min(100, (progressPx / distancePx) * 100));
    this.el.hudRaceProgressFill.style.width = `${pct}%`;
  }

  /** Renders the strip of active power-up buff pills below the HUD. */
  renderActivePowerUps(list) {
    const el = this.el.hudPowerupEffects;
    el.innerHTML = '';
    for (const effect of list) {
      const pill = document.createElement('div');
      pill.className = 'powerup-pill';
      const seconds = Math.ceil(effect.remainingMs / 1000);
      pill.innerHTML = `<span>${effect.icon}</span><span>${effect.label} ${seconds}s</span>`;
      el.appendChild(pill);
    }
  }

  updateCheckpointModal(health, maxHealth, canAfford) {
    const pct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
    this.el.checkpointHealthFill.style.width = `${pct}%`;
    this.el.checkpointHealthFill.classList.toggle('health-bar-fill--low', pct <= 30);
    this.el.checkpointHealthLabel.textContent = `HEALTH ${Math.round(pct)}%`;
    this.el.btnCheckpointRepair.disabled = !canAfford;
  }

  updateRaceCountdown(text) {
    this.el.raceCountdownNumber.textContent = text;
  }

  _renderRaceResults(context) {
    const { rank = 4, coinsAwarded = 0, score = 0 } = context;
    const suffix = rank === 1 ? 'ST' : rank === 2 ? 'ND' : rank === 3 ? 'RD' : 'TH';
    this.el.raceResultsHeading.textContent = `${rank}${suffix} PLACE`;
    this.el.raceResultsBadge.textContent = rank === 1 ? '🏆 YOU WON!' : rank <= 3 ? '🎉 PODIUM FINISH!' : '🏁 RACE COMPLETE';
    this.el.raceResultsScore.textContent = ScoreManager.format(score);
    this.el.raceResultsCoins.textContent = `+${coinsAwarded} 🪙`;
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

  // --- Shop tabs ---------------------------------------------------------------

  _setShopTab(tab) {
    this._activeShopTab = tab;
    this.el.btnShopTabBoats.classList.toggle('shop-tab--active', tab === 'boats');
    this.el.btnShopTabObstacles.classList.toggle('shop-tab--active', tab === 'obstacles');
    this.el.boatGrid.classList.toggle('hidden', tab !== 'boats');
    this.el.obstacleGrid.classList.toggle('hidden', tab !== 'obstacles');
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
    const grid = this.el.boatGrid.classList.contains('hidden') ? this.el.obstacleGrid : this.el.boatGrid;
    const flash = document.createElement('div');
    flash.className = 'purchase-flash';
    flash.textContent = 'PURCHASED!';
    grid.parentElement.appendChild(flash);
    setTimeout(() => flash.remove(), 900);
  }

  // --- Obstacle shop grid ------------------------------------------------------

  onObstacleAction(listener) {
    this._obstacleActionListeners.add(listener);
    return () => this._obstacleActionListeners.delete(listener);
  }

  _emitObstacleAction(action, obstacleId) {
    for (const l of this._obstacleActionListeners) l(action, obstacleId);
  }

  renderObstacleGrid(progression) {
    const grid = this.el.obstacleGrid;
    grid.innerHTML = '';

    for (const obstacle of OBSTACLES) {
      const owned = progression.ownsObstacle(obstacle.id);
      const canAfford = progression.coins >= obstacle.price;

      const card = document.createElement('div');
      card.className = 'boat-card';

      const swatch = document.createElement('div');
      swatch.className = 'boat-card-swatch';
      swatch.style.background = 'linear-gradient(180deg, #E7FBFF, #9FE6FF)';
      swatch.textContent = obstacle.kind === 'mine' ? '💣'
        : obstacle.kind === 'log' ? '🪵'
        : obstacle.kind === 'buoy' ? '🔴'
        : obstacle.kind === 'net' ? '🕸️'
        : obstacle.kind === 'barrel' ? '🛢️'
        : obstacle.kind === 'barricade' ? '🚧'
        : '🧊';
      swatch.style.display = 'flex';
      swatch.style.alignItems = 'center';
      swatch.style.justifyContent = 'center';
      swatch.style.fontSize = '1.6rem';
      card.appendChild(swatch);

      const name = document.createElement('div');
      name.className = 'boat-card-name';
      name.textContent = obstacle.name;
      card.appendChild(name);

      const desc = document.createElement('div');
      desc.className = 'boat-card-desc';
      desc.textContent = obstacle.description || '';
      card.appendChild(desc);

      const actionRow = document.createElement('div');
      actionRow.className = 'boat-card-action';

      if (owned) {
        const badge = document.createElement('span');
        badge.className = 'boat-card-equipped-badge';
        badge.textContent = '✓ UNLOCKED';
        actionRow.appendChild(badge);
      } else {
        const buyBtn = document.createElement('button');
        buyBtn.className = 'btn btn--primary btn--card';
        buyBtn.disabled = !canAfford;
        buyBtn.textContent = `${obstacle.price} 🪙`;
        buyBtn.addEventListener('click', () => this._emitObstacleAction('purchase', obstacle.id));
        actionRow.appendChild(buyBtn);
      }

      card.appendChild(actionRow);
      grid.appendChild(card);
    }
  }
}
