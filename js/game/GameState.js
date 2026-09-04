// GameState.js
// Centralized state machine for the game. No boolean flags scattered around —
// every screen/mode is one of these named states.

export const States = Object.freeze({
  MENU: 'MENU',
  MODE_SELECT: 'MODE_SELECT',
  LEVEL_SELECT: 'LEVEL_SELECT',
  BOAT_SHOP: 'BOAT_SHOP',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  SETTINGS: 'SETTINGS',
  CHECKPOINT: 'CHECKPOINT',
  RACE_COUNTDOWN: 'RACE_COUNTDOWN',
  RACE_RESULTS: 'RACE_RESULTS'
});

export class GameState {
  constructor() {
    this._state = States.MENU;
    this._previousState = null;
    this._listeners = new Set();
  }

  get current() {
    return this._state;
  }

  get previous() {
    return this._previousState;
  }

  is(state) {
    return this._state === state;
  }

  set(state) {
    if (!Object.values(States).includes(state)) {
      throw new Error(`Unknown game state: ${state}`);
    }
    if (state === this._state) return;
    this._previousState = this._state;
    this._state = state;
    for (const listener of this._listeners) {
      listener(this._state, this._previousState);
    }
  }

  onChange(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }
}
