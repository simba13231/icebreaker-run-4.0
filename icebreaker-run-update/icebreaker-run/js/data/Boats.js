// Boats.js
// Data-driven boat skin catalogue. Adding a new boat later is just adding a
// new entry here — no changes needed to the shop UI, save system, or
// rendering code, all of which read from this list generically.
//
// abilityType: 'none' | 'speed' | 'invincibility' | 'dodge'

export const BOATS = [
  {
    id: 'starter',
    name: 'Starter Boat',
    price: 0,
    abilityType: 'none',
    abilityLabel: null,
    colors: {
      hull: '#FFFFFF',
      hullShade: '#C9E8F5',
      cabin: '#FF6B4A'
    }
  },
  {
    id: 'speed',
    name: 'Speed Boat',
    price: 100,
    abilityType: 'speed',
    abilityLabel: 'Faster lane changes',
    colors: {
      hull: '#FFF7D6',
      hullShade: '#FFE29A',
      cabin: '#FF9F1C'
    }
  },
  {
    id: 'icebreaker',
    name: 'Icebreaker',
    price: 250,
    abilityType: 'none',
    abilityLabel: 'Distinct reinforced-prow design',
    colors: {
      hull: '#E7FBFF',
      hullShade: '#9FE6FF',
      cabin: '#0B3D5C'
    },
    special: 'reinforcedProw'
  },
  {
    id: 'ghost',
    name: 'Ghost Boat',
    price: 500,
    abilityType: 'invincibility',
    abilityLabel: 'Invincibility — 5 seconds (once per run, tap to activate)',
    colors: {
      hull: '#EAEBFF',
      hullShade: '#B9BEFF',
      cabin: '#6C5CE7'
    }
  },
  {
    id: 'guardian',
    name: 'Guardian Boat',
    price: 750,
    abilityType: 'dodge',
    abilityLabel: '3 iceberg dodges per round',
    colors: {
      hull: '#FFFFFF',
      hullShade: '#CFE8D8',
      cabin: '#2BA84A'
    }
  }
];

export function getBoatById(id) {
  return BOATS.find((b) => b.id === id) || BOATS[0];
}
