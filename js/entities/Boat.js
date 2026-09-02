// Boat.js
// The player's boat. Logical position is always a lane index (0, 1, 2).
// Visual position smoothly interpolates toward the target lane's x coordinate.
//
// v2: the boat now carries its equipped skin (colors + ability). Ability
// state (invincibility timer, dodge charges) lives here since it's per-run,
// per-boat state; Game.js decides *when* to consult it (on collision, on
// activation input) but doesn't own the state itself.

import { CONFIG } from '../config.js';
import { getHitbox } from '../game/Collision.js';
import { getBoatById } from '../data/Boats.js';

export class Boat {
  constructor(lanePositions, startLane, boatDefId = 'starter') {
    this.laneIndex = startLane;
    this.lanePositions = lanePositions;
    this.x = lanePositions[startLane];
    this.targetX = this.x;
    this.y = 0; // set by Game on resize
    this.width = CONFIG.BOAT.WIDTH;
    this.height = CONFIG.BOAT.HEIGHT;

    this.tilt = 0; // current tilt in degrees
    this._moveStartX = this.x;
    this._moveDuration = CONFIG.BOAT.LANE_CHANGE_DURATION_MS;
    this._moveElapsed = this._moveDuration; // start "not moving"
    this._moveDir = 0; // -1 left, 1 right, 0 none

    this.wakeAccumulatorMs = 0;

    this.setBoatDef(boatDefId);
  }

  setBoatDef(boatDefId) {
    this.boatDef = getBoatById(boatDefId);
    this.laneChangeDurationMs =
      this.boatDef.abilityType === 'speed'
        ? CONFIG.BOATS.SPEED_BOAT_LANE_CHANGE_MS
        : CONFIG.BOAT.LANE_CHANGE_DURATION_MS;

    // Ability run-state, reset whenever a boat is (re)assigned for a new run.
    this.dodgesRemaining =
      this.boatDef.abilityType === 'dodge' ? CONFIG.BOATS.DODGE_CHARGES : 0;
    this.invincibleMsRemaining = 0;
    this.invincibilityCharges = this.boatDef.abilityType === 'invincibility' ? 1 : 0;
  }

  setLanePositions(lanePositions) {
    this.lanePositions = lanePositions;
    this.targetX = lanePositions[this.laneIndex];
    if (this._moveElapsed >= this._moveDuration) {
      this.x = this.targetX;
    }
  }

  setY(y) {
    this.y = y;
  }

  /** Attempt to move one lane in the given direction (-1 or 1). */
  moveLane(direction) {
    const newLane = this.laneIndex + direction;
    if (newLane < 0 || newLane >= this.lanePositions.length) return false;
    this.laneIndex = newLane;
    this._moveStartX = this.x;
    this.targetX = this.lanePositions[this.laneIndex];
    this._moveElapsed = 0;
    this._moveDuration = this.laneChangeDurationMs;
    this._moveDir = direction;
    return true;
  }

  /** Manually activates the invincibility ability, if the boat has one available. */
  activateInvincibility() {
    if (this.boatDef.abilityType !== 'invincibility') return false;
    if (this.invincibilityCharges <= 0) return false;
    if (this.invincibleMsRemaining > 0) return false;
    this.invincibilityCharges -= 1;
    this.invincibleMsRemaining = CONFIG.BOATS.INVINCIBILITY_DURATION_MS;
    return true;
  }

  get isInvincible() {
    return this.invincibleMsRemaining > 0;
  }

  /** Consumes a dodge charge if the dodge-ability boat has one available. */
  consumeDodge() {
    if (this.boatDef.abilityType !== 'dodge') return false;
    if (this.dodgesRemaining <= 0) return false;
    this.dodgesRemaining -= 1;
    return true;
  }

  update(deltaMs, emitSplash) {
    // Interpolate lane movement
    if (this._moveElapsed < this._moveDuration) {
      this._moveElapsed = Math.min(this._moveElapsed + deltaMs, this._moveDuration);
      const t = this._moveElapsed / this._moveDuration;
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      this.x = this._moveStartX + (this.targetX - this._moveStartX) * eased;

      // Tilt toward movement direction, peaking mid-transition
      const tiltShape = Math.sin(t * Math.PI); // 0 -> 1 -> 0
      this.tilt = -this._moveDir * CONFIG.BOAT.MAX_TILT_DEG * tiltShape;

      if (t >= 1) {
        this.x = this.targetX;
        this.tilt = 0;
        if (emitSplash) emitSplash(this.x, this.y, this._moveDir);
      }
    } else {
      this.tilt = 0;
    }

    // Continuous wake particles while moving forward
    this.wakeAccumulatorMs += deltaMs;

    if (this.invincibleMsRemaining > 0) {
      this.invincibleMsRemaining = Math.max(0, this.invincibleMsRemaining - deltaMs);
    }
  }

  getHitbox() {
    return getHitbox(this.x, this.y, this.width, this.height, CONFIG.BOAT.HITBOX_SHRINK);
  }
}
