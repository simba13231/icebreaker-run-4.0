// SeededRandom.js
// A small deterministic PRNG (mulberry32) plus a date->seed helper, used so
// Daily Challenge mode can generate the exact same obstacle sequence for
// every player on a given day — the whole point of a daily challenge being
// comparable scores. Every other mode keeps using plain Math.random(); this
// is opt-in, threaded through as an optional `rng` parameter wherever
// Math.random() was previously called directly (see Spawner.js, Hazard.js).

/** Deterministic PRNG — same seed always produces the same sequence of calls. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic string hash -> 32-bit seed (same date string always -> same seed). */
export function seedFromDateString(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/** Today's UTC date as 'YYYY-MM-DD' — UTC (not local time) so the challenge
 * changes over at the same instant for every player regardless of timezone. */
export function todayDateKeyUTC() {
  return new Date().toISOString().slice(0, 10);
}

/** This week's key as 'YYYY-Www' (ISO week number), UTC-based. */
export function thisWeekKeyUTC() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // nearest Thursday (ISO week rule)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
