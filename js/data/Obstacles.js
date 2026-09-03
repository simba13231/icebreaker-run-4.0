// Obstacles.js
// Data-driven obstacle catalogue, mirroring the pattern used by data/Boats.js.
// Every entry (other than the always-owned 'iceberg' baseline) is a purchasable
// skin that, once bought, is simply added to the pool of hazards the Spawner
// can pick from on future runs. Buying obstacles never makes the game easier
// or harder for the player who buys them — damage values sit in the same
// range as the classic iceberg — so this is purely cosmetic variety, not
// pay-to-win.
//
// kind drives both rendering (see rendering/Renderer.js#renderHazard) and the
// widthRatio/heightRatio used to size the hazard relative to the base
// iceberg range in config.js.

export const OBSTACLES = [
  {
    id: 'iceberg',
    name: 'Classic Iceberg',
    price: 0,
    kind: 'iceberg',
    damage: 25,
    description: 'The original hazard.'
  },
  {
    id: 'buoy',
    name: 'Warning Buoy',
    price: 60,
    kind: 'buoy',
    damage: 18,
    widthRatio: 0.55,
    heightRatio: 0.7,
    description: 'Small and bobbing — easy to miss.'
  },
  {
    id: 'barrel',
    name: 'Floating Barrel',
    price: 70,
    kind: 'barrel',
    damage: 20,
    widthRatio: 0.7,
    heightRatio: 0.85,
    description: 'A stray cargo barrel adrift at sea.'
  },
  {
    id: 'log',
    name: 'Drift Log',
    price: 80,
    kind: 'log',
    damage: 22,
    widthRatio: 1.25,
    heightRatio: 0.6,
    description: 'Wide and low — hugs the waterline.'
  },
  {
    id: 'net',
    name: 'Fishing Net',
    price: 120,
    kind: 'net',
    damage: 15,
    widthRatio: 1.3,
    heightRatio: 0.75,
    description: 'Tangled netting spread across the lane.'
  },
  {
    id: 'mine',
    name: 'Floating Mine',
    price: 150,
    kind: 'mine',
    damage: 40,
    widthRatio: 0.75,
    heightRatio: 0.9,
    description: 'Spiky and dangerous. Give it room.'
  },
  {
    id: 'barricade',
    name: 'Barricade',
    price: 200,
    kind: 'barricade',
    damage: 30,
    widthRatio: 1.35,
    heightRatio: 0.65,
    description: 'A striped, unmissable hazard bar.'
  }
];

export function getObstacleById(id) {
  return OBSTACLES.find((o) => o.id === id) || OBSTACLES[0];
}
