// Backgrounds.js
// Purely cosmetic ocean color palettes — one equipped at a time, same
// owned+equipped pattern as data/Boats.js. Swaps the colors OceanRenderer
// paints the water/streaks/foam with; doesn't affect gameplay at all.

export const BACKGROUNDS = [
  {
    id: 'classic',
    name: 'Classic Ocean',
    price: 0,
    colors: { deep: '#0A3D6E', mid: '#0F6FB8', light: '#20AEEB', streak: '#3FC6FF', foam: '#8CE8FF' },
    description: 'The original icy blue.'
  },
  {
    id: 'midnight',
    name: 'Midnight Waters',
    price: 100,
    colors: { deep: '#04122B', mid: '#0B2A57', light: '#1C4E8C', streak: '#3E6FB0', foam: '#6FA0D8' },
    description: 'A deep, moody night sail.'
  },
  {
    id: 'sunset_bay',
    name: 'Sunset Bay',
    price: 140,
    colors: { deep: '#5C1E3A', mid: '#B0355C', light: '#F0784F', streak: '#FFA36B', foam: '#FFD199' },
    description: 'Warm pinks and orange over the water.'
  },
  {
    id: 'emerald_cove',
    name: 'Emerald Cove',
    price: 140,
    colors: { deep: '#03352E', mid: '#0E6E56', light: '#2FAE86', streak: '#5FD1A8', foam: '#9CEBCB' },
    description: 'Tropical, green-tinted lagoon water.'
  },
  {
    id: 'arctic_dawn',
    name: 'Arctic Dawn',
    price: 160,
    colors: { deep: '#274A63', mid: '#5B93B3', light: '#B9E4F2', streak: '#DFF3FA', foam: '#FFFFFF' },
    description: 'Pale, glowing early-morning ice light.'
  },
  {
    id: 'abyss',
    name: 'The Abyss',
    price: 200,
    colors: { deep: '#000000', mid: '#0D0D1A', light: '#241E4E', streak: '#4A3F8C', foam: '#8577D6' },
    description: 'Unnervingly deep, dark water.'
  }
];

export function getBackgroundById(id) {
  return BACKGROUNDS.find((b) => b.id === id) || BACKGROUNDS[0];
}
