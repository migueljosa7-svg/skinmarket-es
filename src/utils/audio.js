// src/utils/audio.js
/**
 * Zero-dependency Web Audio API sound engine for UI feedback.
 * Works 100% offline, instantly, and cleanly without external MP3 assets.
 * Supports mute/unmute toggle persisted in localStorage.
 *
 * AUDIO AUTOPLAY POLICY FIX:
 * - A global one-time listener is attached to the document on first init()
 *   call, which creates the AudioContext on the very first user interaction
 *   (click, touchstart, or keydown).
 * - Every play method calls init() first, which will either create the
 *   context (if not yet created) or resume it if suspended.
 * - This eliminates the "AudioContext was not allowed to start" warning.
 */

const MUTE_KEY = "skinmarket_audio_muted";

class SoundEngine {
  constructor() {
    this.ctx = null;
    this._muted = false;
    this._volume = 1.0;
    this._globalListenerAttached = false;
  }

  /** Read persisted mute state from localStorage */
  get muted() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(MUTE_KEY);
      if (stored !== null) {
        this._muted = stored === "true";
      }
    }
    return this._muted;
  }

  set muted(val) {
    this._muted = val;
    if (typeof window !== "undefined") {
      localStorage.setItem(MUTE_KEY, val ? "true" : "false");
    }
  }

  /** Toggle mute on/off, returns new state */
  toggleMute() {
    this.muted = !this.muted;
    return !this._muted;
  }

  /** Set volume 0-1 */
  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
  }

  /**
   * Creates or resumes AudioContext. Safe to call multiple times.
   * Attaches a one-time global listener on the document to create the
   * context on the very first user gesture, avoiding autoplay policy warnings.
   */
  init() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // If context already exists, just try to resume if suspended
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    // Attach a ONE-TIME global listener to create AudioContext on first interaction
    if (!this._globalListenerAttached) {
      this._globalListenerAttached = true;
      const handler = () => {
        document.removeEventListener('click', handler);
        document.removeEventListener('touchstart', handler);
        document.removeEventListener('keydown', handler);
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) {
            this.ctx = new AudioCtx();
            if (this.ctx.state === "suspended") {
              this.ctx.resume().catch(() => {});
            }
          }
        } catch (e) {
          // Audio not supported — silently ignore
        }
      };
      document.addEventListener('click', handler);
      document.addEventListener('touchstart', handler);
      document.addEventListener('keydown', handler);
    }

    // Also try creating immediately (for browsers that already allow it)
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          if (this.ctx.state === "suspended") {
            this.ctx.resume().catch(() => {});
          }
        }
      }
    } catch (e) {
      // Will be created via the global listener on first user gesture
    }
  }

  /** Short click/tick sound for roulette spinning */
  playTick() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.04);

      gain.gain.setValueAtTime(0.05 * this._volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Audio context policy ignored
    }
  }

  /** Rising success jingle */
  playWin(isRare = false) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;
      const notes = isRare
        ? [523.25, 659.25, 783.99, 1046.50, 1318.51]
        : [392.00, 523.25, 659.25, 783.99];

      notes.forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + index * 0.1);

        gain.gain.setValueAtTime(0.12 * this._volume, now + index * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 0.35);
      });
    } catch {
      // Audio context policy ignored
    }
  }

  /** Descending failure sound */
  playFail() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;

      [300, 250, 200, 150].forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + index * 0.1);

        gain.gain.setValueAtTime(0.06 * this._volume, now + index * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 0.2);
      });
    } catch {
      // Audio context policy ignored
    }
  }

  /** Coin drop / deposit sound */
  playDeposit() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);

      gain.gain.setValueAtTime(0.07 * this._volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Audio context policy ignored
    }
  }

  /** Contract fusion / upgrade whoosh */
  playWhoosh() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;

      // White noise burst via buffer
      const bufferSize = this.ctx.sampleRate * 0.3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08 * this._volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(3000, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      source.start(now);
      source.stop(now + 0.3);
    } catch {
      // Audio context policy ignored
    }
  }

  /** Rare drop sparkle */
  playSparkle() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;

      [1200, 1500, 1800, 2200, 2600].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        gain.gain.setValueAtTime(0.04 * this._volume, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.15);
      });
    } catch {
      // Audio context policy ignored
    }
  }
}

export const sound = new SoundEngine();

