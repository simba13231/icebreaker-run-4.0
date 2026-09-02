// main.js
// Entry point. Boots the Game once the DOM is ready.

import { Game } from './game/Game.js';

function boot() {
  const canvas = document.getElementById('game-canvas');
  const root = document.getElementById('game-root');

  if (!canvas || !root) {
    console.error('Icebreaker Run: required DOM elements are missing.');
    return;
  }

  // eslint-disable-next-line no-new
  new Game(canvas, root);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
