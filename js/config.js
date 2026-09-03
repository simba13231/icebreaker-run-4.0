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
    RAMP_TIME_SEC: 90, // time to approach max difficulty (used for smooth interpolation)

    // Endless mode: discrete difficulty milestones on top of the continuous ramp.
    // Every MILESTONE_SCORE_STEP points, speed/spawn get an additional bump so the
    // game keeps getting harder indefinitely, even after the continuous ramp caps out.
    MILESTONE_SCORE_STEP: 500,
    MILESTONE_SPEED_BONUS: 0.12, // +12% speed per milestone tier
    MILESTONE_SPAWN_REDUCTION: 0.05, // -5% spawn interval per milestone tier
    MILESTONE_SPAWN_FLOOR: 260, // never go below this spawn interval regardless of tier
    MILESTONE_TIER_PROGRESS_BONUS: 0.16 // pattern-complexity unlock boost per milestone tier
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
    MULTI_ROW_MIN_TIME_SEC: 40,
    // Chance (0-1) that a purchased custom obstacle skin is chosen instead of
    // the classic iceberg for any given hazard. Purely cosmetic variety.
    CUSTOM_OBSTACLE_CHANCE: 0.4
  },

  // Oncoming rival boats that appear as an additional hazard type in Endless
  // mode once the score passes ENABLE_SCORE. They use the same fairness
  // algorithm as icebergs (same blocked-lane row), just rendered as boats
  // and moving slightly faster for visual distinction.
  ONCOMING_BOATS: {
    ENABLE_SCORE: 300,
    BASE_CHANCE: 0.12,
    MAX_CHANCE: 0.42,
    CHANCE_SCORE_STEP: 400,
    SPEED_MULTIPLIER: 1.15,
    DAMAGE: 20
  },

  COINS: {
    MIN_SPAWN_INTERVAL_MS: 1700,
    MAX_SPAWN_INTERVAL_MS: 3000,
    VALUE: 1
  },

  POWERUPS: {
    MIN_SPAWN_INTERVAL_MS: 9000,
    MAX_SPAWN_INTERVAL_MS: 16000,
    SHIELD_DURATION_MS: 8000,
    MAGNET_DURATION_MS: 7000,
    MAGNET_RADIUS_PX: 130,
    SPEED_BOOST_DURATION_MS: 6000,
    SPEED_BOOST_LANE_CHANGE_MS: 110,
    SPEED_BOOST_SCORE_MULTIPLIER: 1.5,
    COIN_BONUS_DURATION_MS: 8000,
    COIN_BONUS_MULTIPLIER: 2,
    REPAIR_HEAL_AMOUNT: 40
  },

  SURVIVAL: {
    STARTING_LIVES: 3,
    MAX_HEALTH: 100,
    DEFAULT_OBSTACLE_DAMAGE: 25,
    CHECKPOINT_SCORE_STEP: 1000,
    REPAIR_COST_COINS: 10,
    REPAIR_HEAL_AMOUNT: 100,
    POST_HIT_INVINCIBILITY_MS: 1200,
    CLEAR_RADIUS_PX: 220
  },

  RACE: {
    DISTANCE_PX: 11000,
    BOT_COUNT: 3,
    BOT_BASE_SPEED_BONUS: 0.1, // bots are 10% faster than the player by default
    BOT_SPEED_VARIANCE: 0.16,
    BOT_RUBBER_BAND_STRENGTH: 0.18,
    BOT_HIT_SLOWDOWN_MS: 700, // how long a bot is slowed after failing to dodge a hazard
    BOT_HIT_SLOWDOWN_FACTOR: 0.4, // speed multiplier while slowed
    COUNTDOWN_SECONDS: 3,
    COLLISION_PENALTY_MS: 900,
    COLLISION_PENALTY_SPEED_FACTOR: 0.35,
    REWARDS: { 1: 150, 2: 90, 3: 50, OTHER: 20 },
    BOT_NAMES: ['Frostbite', 'Glacier', 'Polar Star', 'Nordwind', 'Blizzard']
  },

  PARTICLES: {
    MAX_PARTICLES: 150,
    SPLASH_COUNT: 10,
    COLLISION_COUNT: 36,
    DODGE_COUNT: 26,
    WAKE_EMIT_INTERVAL_MS: 60
  },

  SCORE: {
    POINTS_PER_SECOND: 10,
    POINTS_PER_100PX_DISTANCE: 1
  },

  // --- Progression / meta-game -------------------------------------------

  LEVELS: {
    COUNT: 50,
    COINS_PER_LEVEL: 10,
    // Level difficulty is fixed (based on level index) rather than time-ramped,
    // so each level feels like a distinct, repeatable stage. A mild in-level
    // ramp is still layered on top for game feel (see Difficulty.configureForLevel).
    IN_LEVEL_RAMP_TIME_SEC: 35,
    IN_LEVEL_SPEED_HEADROOM: 0.18, // level speed can still climb +18% within the level
    // Score the player must reach to clear a level, scaling with level index.
    BASE_TARGET_SCORE: 260,
    TARGET_SCORE_PER_LEVEL: 42
  },

  REVIVE: {
    SCORE_CAP: 5000, // watch-ad-to-revive is unavailable at/above this score
    CLEAR_RADIUS_PX: 220 // icebergs within this distance of the boat are cleared on revive, for fairness
  },

  BOATS: {
    DODGE_CHARGES: 3,
    INVINCIBILITY_DURATION_MS: 5000,
    SPEED_BOAT_LANE_CHANGE_MS: 120 // faster lane-change duration for the Speed Boat
  },

  STORAGE: {
    HIGH_SCORE_KEY: 'icebreakerRun.highScore',
    SETTINGS_KEY: 'icebreakerRun.settings',
    COINS_KEY: 'icebreakerRun.coins',
    BOATS_OWNED_KEY: 'icebreakerRun.boatsOwned',
    BOAT_EQUIPPED_KEY: 'icebreakerRun.boatEquipped',
    LEVELS_UNLOCKED_KEY: 'icebreakerRun.levelsUnlocked',
    LEVELS_COMPLETED_KEY: 'icebreakerRun.levelsCompleted',
    OBSTACLES_OWNED_KEY: 'icebreakerRun.obstaclesOwned'
  },

  RENDER: {
    MAX_DPR: 2
  },

  // Bright, playful "mobile arcade game" palette — replaces the darker,
  // website-like tones from v1. Kept as icy blues/whites but far more vivid.
  COLORS: {
    OCEAN_DEEP: '#0A3D6E',
    OCEAN_MID: '#0F6FB8',
    OCEAN_LIGHT: '#20AEEB',
    WATER_HIGHLIGHT_1: '#3FC6FF',
    WATER_HIGHLIGHT_2: '#8CE8FF',
    ICE_LIGHT: '#FFFFFF',
    ICE_MID: '#D7F5FF',
    ICE_DARK: '#9FDCF2',
    ACCENT: '#00E5FF',
    ACCENT_WARM: '#FFC93C',
    BOAT_HULL: '#FFFFFF',
    BOAT_HULL_SHADE: '#C9E8F5',
    BOAT_CABIN: '#FF6B4A',
    DANGER: '#FF4D6D',
    SUCCESS: '#3CE87A',
    GOLD: '#FFD447'
  }
};
