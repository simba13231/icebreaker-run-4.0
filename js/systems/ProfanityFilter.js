// ProfanityFilter.js
// Validates and cleans up the leaderboard username the player enters:
// length/character checks plus a profanity blocklist.
//
// The blocklist is paired with normalization (lowercase, look-alike
// character substitution, collapsing repeated letters) so simple
// obfuscation attempts ("fuuuck", "f4ck", "$hit") are still caught by a
// plain substring match — no need to list every variant explicitly.
//
// This is a first line of defense for instant UI feedback. The Cloudflare
// Worker (workers/leaderboard/) re-validates the same way server-side,
// since a client-side check alone can always be bypassed by calling the
// API directly.

import { CONFIG } from '../config.js';

const NAME_PATTERN = /^[A-Za-z0-9 _-]+$/;

// Root forms only — normalization above handles most spacing/character
// tricks, and substring matching catches simple pluralization/suffixes.
const BLOCKLIST = [
  'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'motherfuck', 'motherfucking',
  'shit', 'shitty', 'bullshit', 'horseshit', 'dipshit', 'shithead',
  'bitch', 'bitches', 'bitchy', 'sonofabitch',
  'cunt', 'cunts',
  'ass', 'asses', 'asshole', 'assholes', 'arse', 'arsehole', 'dumbass',
  'jackass', 'badass', 'smartass', 'hardass',
  'dick', 'dicks', 'dickhead', 'cock', 'cocks', 'cocksucker',
  'pussy', 'pussies',
  'whore', 'whores', 'slut', 'sluts', 'slutty',
  'bastard', 'bastards', 'twat', 'twats', 'wanker', 'wankers',
  'bollocks', 'douche', 'douchebag', 'douchebags',
  'prick', 'pricks', 'tosser', 'tosspots',
  'jerkoff', 'jerkoff', 'jackoff', 'jackoff',
  'dipshit', 'dumbfuck', 'fuckwit', 'shitface', 'shithead',
  'scumbag', 'scumbags', 'dirtbag', 'douchecanoe',
  'motherfucker', 'motherfuckers',
  'faggot', 'fag', 'fags', 'dyke',
  'retard', 'retarded', 'tard',
  'chink', 'spic', 'kike', 'gook', 'coon', 'tranny',
  'nigger', 'nigga', 'niger', 'niga', 'nig',
  'rapist', 'nazi',
  'goon', 'gooner',
  'moron', 'idiot', 'imbecile', 'dumbass', 'dumbfuck',
  'loser', 'scumbag', 'shitbag', 'asswipe', 'asshat',
  'crackhead', 'dipstick', 'dumbshit', 'fuckface',
];

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[@]/g, 'a')
    .replace(/[0]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1+/g, '$1'); // collapse repeated letters (fuuuck -> fuck)
}

// Normalize the blocklist itself the same way input gets normalized. This
// matters: several blocklist words (e.g. "nigger", "asshole", "bollocks")
// contain a naturally doubled letter, so without this the collapse step
// above would turn typed input into a form that no longer matches the
// blocklist word at all ("nigger" -> "niger" collapses right past the
// literal "nigger" entry). Normalizing both sides the same way fixes that.
const NORMALIZED_BLOCKLIST = [...new Set(BLOCKLIST.map(normalize))];

export function containsProfanity(input) {
  const normalized = normalize(input || '');
  return NORMALIZED_BLOCKLIST.some((word) => normalized.includes(word));
}

/**
 * Validates and cleans a raw username string.
 * Returns { valid, cleaned, error }. `cleaned` is always the
 * trimmed/whitespace-collapsed version, even when invalid, so it can be
 * redisplayed in the input field.
 */
export function validateUsername(raw) {
  const cleaned = (raw || '').trim().replace(/\s+/g, ' ');
  const { USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH } = CONFIG.LEADERBOARD;

  if (cleaned.length < USERNAME_MIN_LENGTH) {
    return { valid: false, cleaned, error: 'Name is too short.' };
  }
  if (cleaned.length > USERNAME_MAX_LENGTH) {
    return { valid: false, cleaned, error: `Name must be ${USERNAME_MAX_LENGTH} characters or fewer.` };
  }
  if (!NAME_PATTERN.test(cleaned)) {
    return { valid: false, cleaned, error: 'Only letters, numbers, spaces, - and _ are allowed.' };
  }
  if (containsProfanity(cleaned)) {
    return { valid: false, cleaned, error: "That name isn't allowed — try another." };
  }
  return { valid: true, cleaned, error: null };
}
