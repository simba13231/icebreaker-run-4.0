// InputManager.js
// Centralizes all input handling: keyboard, swipe gestures, and on-screen
// touch buttons. Emits a single normalized 'move' event (-1 left, 1 right)
// plus 'pauseToggle'. Debounces so one gesture/press = exactly one action.

const SWIPE_MIN_DISTANCE_PX = 40;
const SWIPE_MAX_DURATION_MS = 700;
const SWIPE_MAX_OFF_AXIS_PX = 60;

export class InputManager {
  constructor(rootEl) {
    this.rootEl = rootEl;
    this._moveListeners = new Set();
    this._pauseListeners = new Set();

    this._touchStartX = null;
    this._touchStartY = null;
    this._touchStartTime = 0;
    this._touchHandled = false;

    this._keydownHandler = this._onKeyDown.bind(this);
    this._touchStartHandler = this._onTouchStart.bind(this);
    this._touchMoveHandler = this._onTouchMove.bind(this);
    this._touchEndHandler = this._onTouchEnd.bind(this);

    document.addEventListener('keydown', this._keydownHandler);
    this.rootEl.addEventListener('touchstart', this._touchStartHandler, { passive: true });
    this.rootEl.addEventListener('touchmove', this._touchMoveHandler, { passive: false });
    this.rootEl.addEventListener('touchend', this._touchEndHandler, { passive: true });
  }

  onMove(listener) {
    this._moveListeners.add(listener);
    return () => this._moveListeners.delete(listener);
  }

  onPauseToggle(listener) {
    this._pauseListeners.add(listener);
    return () => this._pauseListeners.delete(listener);
  }

  _emitMove(direction) {
    for (const l of this._moveListeners) l(direction);
  }

  _emitPause() {
    for (const l of this._pauseListeners) l();
  }

  _onKeyDown(e) {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        this._emitMove(-1);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        this._emitMove(1);
        break;
      case 'Escape':
        e.preventDefault();
        this._emitPause();
        break;
      default:
        break;
    }
    // Prevent arrow keys from scrolling the page during gameplay.
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
    }
  }

  _onTouchStart(e) {
    const t = e.touches[0];
    this._touchStartX = t.clientX;
    this._touchStartY = t.clientY;
    this._touchStartTime = performance.now();
    this._touchHandled = false;
  }

  _onTouchMove(e) {
    // Prevent accidental page scrolling while swiping in the game area.
    if (this._touchStartX !== null) {
      e.preventDefault();
    }
  }

  _onTouchEnd(e) {
    if (this._touchStartX === null || this._touchHandled) {
      this._resetTouch();
      return;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - this._touchStartX;
    const dy = t.clientY - this._touchStartY;
    const duration = performance.now() - this._touchStartTime;

    if (
      Math.abs(dx) >= SWIPE_MIN_DISTANCE_PX &&
      Math.abs(dy) <= SWIPE_MAX_OFF_AXIS_PX &&
      duration <= SWIPE_MAX_DURATION_MS
    ) {
      this._touchHandled = true;
      this._emitMove(dx > 0 ? 1 : -1);
    }
    this._resetTouch();
  }

  _resetTouch() {
    this._touchStartX = null;
    this._touchStartY = null;
  }

  /** Wires a touch/mouse button element to emit a single move in one direction. */
  bindButton(el, direction) {
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      this._emitMove(direction);
    };
    el.addEventListener('click', handler);
    el.addEventListener(
      'touchend',
      (e) => {
        e.preventDefault();
        this._emitMove(direction);
      },
      { passive: false }
    );
  }

  destroy() {
    document.removeEventListener('keydown', this._keydownHandler);
    this.rootEl.removeEventListener('touchstart', this._touchStartHandler);
    this.rootEl.removeEventListener('touchmove', this._touchMoveHandler);
    this.rootEl.removeEventListener('touchend', this._touchEndHandler);
  }
}
