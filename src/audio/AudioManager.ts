import { noiseBuffer } from './Synth';
import { SOUNDS, type SoundName } from './sounds';

export interface AudioSettings {
  sfxOn: boolean;
  sfxVolume: number; // 0..1
  ambienceOn: boolean;
}

/** World ambience: a quiet looping bed of filtered noise (and a low tone in some worlds). */
const AMBIENCE: Record<string, { filter: BiquadFilterType; freq: number; q: number; gain: number; hum?: number }> = {
  hell: { filter: 'lowpass', freq: 220, q: 0.7, gain: 0.5, hum: 41 }, // rumbling lava
  stairway: { filter: 'bandpass', freq: 650, q: 0.6, gain: 0.18 }, // high wind
  gate: { filter: 'bandpass', freq: 800, q: 0.5, gain: 0.12 },
  gardens: { filter: 'bandpass', freq: 1200, q: 0.4, gain: 0.08 }, // soft breeze
  bridges: { filter: 'bandpass', freq: 500, q: 0.8, gain: 0.2 }, // open-air wind
  kingdom: { filter: 'bandpass', freq: 900, q: 0.5, gain: 0.1 },
  god: { filter: 'highpass', freq: 3000, q: 0.5, gain: 0.05 },
  cosmic: { filter: 'lowpass', freq: 300, q: 2, gain: 0.15, hum: 55 }, // deep space hum
};

/**
 * Plays the game's sound effects and world ambience (Decisions log #36).
 * Never throws: if the browser has no Web Audio, the game simply runs silent.
 * Phones only allow sound after the player touches the screen, so `unlock()` runs on the first tap.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private sfx: GainNode | null = null;
  private amb: GainNode | null = null;
  private ambNodes: { stop: () => void; gain: GainNode } | null = null;
  private ambTheme = '';
  private lastPlay = new Map<string, number>();
  settings: AudioSettings;

  constructor(settings: AudioSettings) {
    this.settings = { ...settings };
    const unlock = () => this.unlock();
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  /** Create / resume the audio engine (must happen during a tap). */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.sfx = this.ctx.createGain();
        this.amb = this.ctx.createGain();
        // a gentle limiter so many sounds at once never distort
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -10;
        comp.ratio.value = 6;
        this.sfx.connect(comp);
        this.amb.connect(comp);
        comp.connect(this.ctx.destination);
        this.apply();
        if (this.ambTheme) this.startAmbience(this.ambTheme);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      /* no sound on this device */
    }
  }

  setSettings(s: Partial<AudioSettings>): void {
    Object.assign(this.settings, s);
    this.apply();
  }

  private apply(): void {
    if (!this.ctx || !this.sfx || !this.amb) return;
    const t = this.ctx.currentTime;
    this.sfx.gain.setTargetAtTime(this.settings.sfxOn ? this.settings.sfxVolume : 0, t, 0.05);
    this.amb.gain.setTargetAtTime(this.settings.sfxOn && this.settings.ambienceOn ? this.settings.sfxVolume * 0.9 : 0, t, 0.3);
  }

  /** Play a sound effect. `p` = pitch step (e.g. coins in a row). */
  play(name: SoundName, p = 0, minGapMs = 35): void {
    if (!this.ctx || !this.sfx || !this.settings.sfxOn || this.ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (this.lastPlay.get(name) ?? 0) < minGapMs) return;
    this.lastPlay.set(name, now);
    try {
      SOUNDS[name].fn(this.ctx, this.sfx, this.ctx.currentTime + 0.005, p);
    } catch {
      /* ignore a bad sound rather than crash the game */
    }
  }

  /** Switch the background ambience to a world's sound ('' = silence). */
  ambience(theme: string): void {
    if (theme === this.ambTheme) return;
    this.ambTheme = theme;
    if (this.ctx) this.startAmbience(theme);
  }

  private startAmbience(theme: string): void {
    const ctx = this.ctx;
    if (!ctx || !this.amb) return;
    const t = ctx.currentTime;
    // fade the old bed out
    if (this.ambNodes) {
      const old = this.ambNodes;
      old.gain.gain.setTargetAtTime(0.0001, t, 0.6);
      setTimeout(() => old.stop(), 3000);
      this.ambNodes = null;
    }
    const a = AMBIENCE[theme];
    if (!a) return;
    try {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.setTargetAtTime(a.gain, t, 0.8);
      g.connect(this.amb);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx);
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = a.filter;
      f.frequency.value = a.freq;
      f.Q.value = a.q;
      // slow swell, like wind or lava breathing
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.13;
      lfoGain.gain.value = a.freq * 0.35;
      lfo.connect(lfoGain).connect(f.frequency);
      src.connect(f).connect(g);
      const parts: { stop(): void }[] = [src, lfo];
      if (a.hum) {
        const hum = ctx.createOscillator();
        const hg = ctx.createGain();
        hum.frequency.value = a.hum;
        hg.gain.value = 0.25;
        hum.connect(hg).connect(g);
        hum.start(t);
        parts.push(hum);
      }
      src.start(t);
      lfo.start(t);
      this.ambNodes = { gain: g, stop: () => parts.forEach((p) => { try { p.stop(); } catch { /* already stopped */ } }) };
    } catch {
      /* no ambience */
    }
  }

  /** Quieten everything while paused / in the background. */
  setPaused(paused: boolean): void {
    if (!this.ctx) return;
    try {
      if (paused) void this.ctx.suspend();
      else void this.ctx.resume();
    } catch {
      /* ignore */
    }
  }
}
