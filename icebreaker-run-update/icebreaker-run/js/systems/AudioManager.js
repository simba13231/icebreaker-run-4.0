// AudioManager.js
// Generates simple sound effects procedurally using the Web Audio API —
// no external/copyrighted audio files are used. Fully optional: the game
// must work identically if audio is disabled, blocked, or unavailable.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.musicEnabled = true;
    this._musicNodes = null;
    this._available = typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
  }

  /** Must be called after a user gesture (click/tap) to satisfy autoplay policies. */
  ensureContext() {
    if (!this._available || this.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
    } catch (err) {
      this._available = false;
      this.ctx = null;
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!enabled) this.stopMusic();
    else if (this.ctx) this.startMusic();
  }

  _canPlay() {
    return this._available && this.ctx && this.sfxEnabled;
  }

  _tone({ freq = 440, duration = 0.12, type = 'sine', gain = 0.2, sweepTo = null }) {
    if (!this._canPlay()) return;
    try {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (sweepTo !== null) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(sweepTo, 1),
          this.ctx.currentTime + duration
        );
      }
      gainNode.gain.setValueAtTime(gain, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gainNode).connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration + 0.02);
    } catch (err) {
      // Fail silently — audio is always optional.
    }
  }

  click() {
    this._tone({ freq: 620, duration: 0.06, type: 'triangle', gain: 0.15 });
  }

  laneMove() {
    this._tone({ freq: 320, duration: 0.09, type: 'sine', gain: 0.12, sweepTo: 460 });
  }

  splash() {
    if (!this._canPlay()) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      const gainNode = this.ctx.createGain();
      gainNode.gain.value = 0.18;
      noise.connect(filter).connect(gainNode).connect(this.ctx.destination);
      noise.start();
    } catch (err) {
      // ignore
    }
  }

  collision() {
    this._tone({ freq: 180, duration: 0.35, type: 'sawtooth', gain: 0.25, sweepTo: 40 });
  }

  /** Boat's invincibility ability activating. */
  shieldUp() {
    this._tone({ freq: 500, duration: 0.28, type: 'sine', gain: 0.2, sweepTo: 1100 });
  }

  /** Level cleared — short ascending three-note chime. */
  levelComplete() {
    if (!this._canPlay()) return;
    this._tone({ freq: 523, duration: 0.14, type: 'triangle', gain: 0.2 });
    setTimeout(() => this._tone({ freq: 659, duration: 0.14, type: 'triangle', gain: 0.2 }), 110);
    setTimeout(() => this._tone({ freq: 784, duration: 0.22, type: 'triangle', gain: 0.22 }), 220);
  }

  startMusic() {
    if (!this._available || !this.ctx || !this.musicEnabled || this._musicNodes) return;
    try {
      const gainNode = this.ctx.createGain();
      gainNode.gain.value = 0.05;
      gainNode.connect(this.ctx.destination);

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 90;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 20;
      lfo.connect(lfoGain).connect(osc.frequency);
      osc.connect(gainNode);
      osc.start();
      lfo.start();

      this._musicNodes = { osc, lfo, gainNode };
    } catch (err) {
      // ignore
    }
  }

  stopMusic() {
    if (!this._musicNodes) return;
    try {
      this._musicNodes.osc.stop();
      this._musicNodes.lfo.stop();
    } catch (err) {
      // ignore
    }
    this._musicNodes = null;
  }
}
