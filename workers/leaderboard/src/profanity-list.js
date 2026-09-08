// profanity-list.js
// Server-side mirror of js/systems/ProfanityFilter.js in the main game.
// Duplicated (not imported) because this Worker is a separate deployment
// with its own bundle — keeping it self-contained means the Worker never
// breaks if the game's file structure changes. Keep the two lists in sync
// if you edit one.
//
// This is the actual line of defense: the client-side check in the game is
// just for instant feedback and can always be bypassed by calling this API
// directly, so every request is re-validated here regardless of what the
// client already checked.

const BLOCKLIST = [
  'fuck', 'shit', 'bitch', 'cunt', 'asshole', 'dick', 'cock', 'pussy',
  'whore', 'slut', 'bastard', 'twat', 'wanker', 'bollocks', 'douche',
  'motherfucker', 'nigger', 'nigga', 'faggot', 'fag', 'dyke', 'retard',
  'chink', 'spic', 'kike', 'gook', 'coon', 'tranny', 'rapist', 'nazi',
  'niger', 'niga'
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

export function containsProfanity(input) {
  const normalized = normalize(input || '');
  return BLOCKLIST.some((word) => normalized.includes(word));
}
