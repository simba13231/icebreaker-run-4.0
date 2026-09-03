// PowerUps.js
// Data-driven power-up catalogue. Power-ups always spawn in a lane that is
// reachable and NOT part of the current blocked-lane pattern (see
// systems/PowerUpManager.js), so collecting one is a bonus, never a trap.

import { CONFIG } from '../config.js';

export const POWERUP_TYPES = [
  {
    id: 'shield',
    icon: '🛡️',
    label: 'Shield',
    color: '#00E5FF',
    durationMs: CONFIG.POWERUPS.SHIELD_DURATION_MS,
    // Only makes sense during active runs (all modes).
    modes: ['endless', 'level', 'survival', 'race']
  },
  {
    id: 'magnet',
    icon: '🧲',
    label: 'Coin Magnet',
    color: '#FF6B4A',
    durationMs: CONFIG.POWERUPS.MAGNET_DURATION_MS,
    modes: ['endless', 'level', 'survival', 'race']
  },
  {
    id: 'speed',
    icon: '⚡',
    label: 'Speed Boost',
    color: '#FFC93C',
    durationMs: CONFIG.POWERUPS.SPEED_BOOST_DURATION_MS,
    modes: ['endless', 'level', 'survival', 'race']
  },
  {
    id: 'coinBonus',
    icon: '🪙',
    label: 'Coin Bonus x2',
    color: '#FFD447',
    durationMs: CONFIG.POWERUPS.COIN_BONUS_DURATION_MS,
    modes: ['endless', 'level', 'survival', 'race']
  },
  {
    id: 'repair',
    icon: '🔧',
    label: 'Repair',
    color: '#3CE87A',
    durationMs: 0, // instant effect, not a timed buff
    modes: ['survival'] // only meaningful where a health system exists
  }
];

export function getPowerUpType(id) {
  return POWERUP_TYPES.find((p) => p.id === id) || POWERUP_TYPES[0];
}

/** Returns the subset of power-up types valid for a given run mode. */
export function getPowerUpTypesForMode(mode) {
  return POWERUP_TYPES.filter((p) => p.modes.includes(mode));
}
