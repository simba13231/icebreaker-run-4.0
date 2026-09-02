// config.js
// Central configuration for Icebreaker Run.
// All balancing values live here so gameplay can be tuned without touching logic.

export const CONFIG = {
  GAME: {
    LANES: 3,
    LANE_MARGIN_RATIO: 0.16, // horizontal margin as a ratio of canvas width reserved on each side
    BOAT_Y_RATIO: 0.82, // boat's vertical position as a ratio of canvas height
    MAX_DELTA_MS: 100 // clamp large delta times (e.g. after tab switch)
  },

  DIFFICULTY: {
    INITIAL_SPEED: 220, // px/sec icebergs fall at the start
    MAX_SPEED: 720,
    SPEED_INCREASE_PER_SEC: 3.2, // speed gained per second survived (before clamping)
    INITIAL_SPAWN_INTERVAL: 1450, // ms between spawns at the start
    MIN_SPAWN_INTERVAL: 520,
    SPAWN_DECREASE_PER_SEC: 9, // ms shaved off spawn interval per second survived
    RAMP_TIME_SEC: 90 // time to approach max difficulty (used for smooth interpolation)
  },

  BOAT: {
    WIDTH: 46,
    HEIGHT: 70,
    LANE_CHANGE_DURATION_MS: 180,
    MAX_TILT_DEG: 16,
    HITBOX_SHRINK: 0.72 // fraction of visual size used for collision (fairness)
  },

  ICEBERG: {
    MIN_WIDTH: 54,
    MAX_WIDTH: 92,
    MIN_HEIGHT: 46,
    MAX_HEIGHT: 78,
    HITBOX_SHRINK: 0.8,
    ROW_MIN_GAP_MS: 900, // minimum time between generated "rows" early on
    MAX_ROTATION_DEG: 6
  },

  SPAWNER: {
    // Difficulty tiers unlock richer obstacle patterns over time (seconds survived)
    TIER_2_TIME_SEC: 20, // two-lane obstacles allowed
    TIER_3_TIME_SEC: 55, // complex alternating patterns allowed
    MULTI_ROW_MIN_TIME_SEC: 40
  },

  PARTICLES: {
    MAX_PARTICLES: 150,
    SPLASH_COUNT: 10,
    COLLISION_COUNT: 36,
    WAKE_EMIT_INTERVAL_MS: 60
  },

  SCORE: {
    POINTS_PER_SECOND: 10,
    POINTS_PER_100PX_DISTANCE: 1
  },

  STORAGE: {
    HIGH_SCORE_KEY: 'icebreakerRun.highScore',
    SETTINGS_KEY: 'icebreakerRun.settings'
  },

  RENDER: {
    MAX_DPR: 2
  },

  COLORS: {
    OCEAN_DEEP: '#061826',
    OCEAN_MID: '#08263A',
    OCEAN_LIGHT: '#0B3D5C',
    WATER_HIGHLIGHT_1: '#1B6B8F',
    WATER_HIGHLIGHT_2: '#3BA7C9',
    ICE_LIGHT: '#DDF6FF',
    ICE_MID: '#A8D8E8',
    ICE_DARK: '#75B7CE',
    ACCENT: '#4ED0FF',
    BOAT_HULL: '#E8EEF2',
    BOAT_HULL_SHADE: '#B9C6CE',
    BOAT_CABIN: '#2D6E8F',
    DANGER: '#FF6B6B'
  }
};
