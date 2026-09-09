// IcebergSkins.js
// Purely cosmetic re-colorings of the classic iceberg hazard shape — one
// equipped at a time, same owned+equipped pattern as data/Boats.js. Doesn't
// affect gameplay (damage/size come from data/Obstacles.js, untouched by
// this); this only changes the gradient colors renderIceberg() paints with.

export const ICEBERG_SKINS = [
  {
    id: 'classic',
    name: 'Classic Ice',
    price: 0,
    colors: { light: '#FFFFFF', mid: '#D7F5FF', dark: '#9FDCF2' },
    description: 'The original look.'
  },
  {
    id: 'glacier_blue',
    name: 'Glacier Blue',
    price: 90,
    colors: { light: '#EAF9FF', mid: '#8FD8FF', dark: '#2E8FCB' },
    description: 'Deeper blue, glassy glacier ice.'
  },
  {
    id: 'ash_ice',
    name: 'Ash Ice',
    price: 90,
    colors: { light: '#F1F3F5', mid: '#C7CDD4', dark: '#6E7681' },
    description: 'Soot-streaked, volcanic-looking ice.'
  },
  {
    id: 'rose_quartz',
    name: 'Rose Quartz',
    price: 130,
    colors: { light: '#FFF1F5', mid: '#FFC2D9', dark: '#E0729F' },
    description: 'Pink-tinted mineral ice.'
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    price: 130,
    colors: { light: '#FFF8E1', mid: '#FFD684', dark: '#E0A030' },
    description: 'Warm amber ice, like sunset light through it.'
  },
  {
    id: 'obsidian',
    name: 'Obsidian Ice',
    price: 180,
    colors: { light: '#D8DEE6', mid: '#5E6B7A', dark: '#1E2733' },
    description: 'Dark, volcanic-glass ice. Menacing.'
  }
];

export function getIcebergSkinById(id) {
  return ICEBERG_SKINS.find((s) => s.id === id) || ICEBERG_SKINS[0];
}
