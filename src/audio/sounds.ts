import { midi, noise, tone, type Ctx } from './Synth';

/** Every sound effect in the game (Decisions log #36). Each plays at time t into `out`. `p` = optional pitch step. */
export type SoundFn = (ctx: Ctx, out: AudioNode, t: number, p?: number) => void;

const C5 = 72, E5 = 76, G5 = 79, C6 = 84, E6 = 88, G6 = 91;
const chord = (ctx: Ctx, out: AudioNode, t: number, notes: number[], o: { dur: number; gain: number; type?: OscillatorType; attack?: number; lowpass?: number }) => {
  for (const [i, n] of notes.entries()) tone(ctx, out, t, { freq: midi(n), type: o.type ?? 'triangle', dur: o.dur, gain: o.gain / notes.length, attack: o.attack ?? 0.02, detune: (i % 2 ? 4 : -4), lowpass: o.lowpass });
};
const arp = (ctx: Ctx, out: AudioNode, t: number, notes: number[], step: number, dur: number, gain: number, type: OscillatorType = 'triangle') => {
  notes.forEach((n, i) => tone(ctx, out, t + i * step, { freq: midi(n), type, dur, gain }));
};

export const SOUNDS: Record<string, { label: string; fn: SoundFn }> = {
  // movement
  coin: { label: 'Coin', fn: (c, o, t, p = 0) => { const f = midi(84 + Math.min(p, 12)); tone(c, o, t, { freq: f, type: 'square', dur: 0.07, gain: 0.08 }); tone(c, o, t + 0.06, { freq: f * 1.5, type: 'triangle', dur: 0.16, gain: 0.14 }); } },
  jump: { label: 'Jump', fn: (c, o, t) => { tone(c, o, t, { freq: 260, freqEnd: 620, type: 'triangle', dur: 0.18, gain: 0.22 }); noise(c, o, t, { dur: 0.2, gain: 0.08, filter: 'highpass', freq: 1500, freqEnd: 4000 }); } },
  land: { label: 'Land', fn: (c, o, t) => { noise(c, o, t, { dur: 0.12, gain: 0.7, filter: 'bandpass', freq: 900, q: 1 }); tone(c, o, t, { freq: 280, freqEnd: 140, type: 'triangle', dur: 0.14, gain: 0.45 }); tone(c, o, t, { freq: 140, freqEnd: 70, type: 'square', dur: 0.1, gain: 0.12, lowpass: 1200 }); } },
  slide: { label: 'Slide', fn: (c, o, t) => noise(c, o, t, { dur: 0.35, gain: 0.32, filter: 'bandpass', freq: 1400, freqEnd: 450, q: 1.2, attack: 0.03 }) },
  lane: { label: 'Change lane', fn: (c, o, t) => noise(c, o, t, { dur: 0.12, gain: 0.22, filter: 'bandpass', freq: 2400, freqEnd: 1100, q: 1.5 }) },
  stumble: { label: 'Stumble', fn: (c, o, t) => { tone(c, o, t, { freq: 160, freqEnd: 70, dur: 0.22, gain: 0.4 }); tone(c, o, t, { freq: 330, freqEnd: 150, type: 'triangle', dur: 0.18, gain: 0.35 }); noise(c, o, t, { dur: 0.14, gain: 0.5, filter: 'bandpass', freq: 800, q: 0.9 }); } },
  crash: { label: 'Crash', fn: (c, o, t) => { noise(c, o, t, { dur: 0.7, gain: 0.55, filter: 'lowpass', freq: 1800, freqEnd: 180 }); tone(c, o, t, { freq: 90, freqEnd: 38, dur: 0.55, gain: 0.5 }); tone(c, o, t, { freq: 58, type: 'square', dur: 0.18, gain: 0.12, lowpass: 400 }); } },
  fallLava: { label: 'Fall into lava', fn: (c, o, t) => { tone(c, o, t, { freq: 720, freqEnd: 90, type: 'triangle', dur: 1.0, gain: 0.25 }); noise(c, o, t + 0.55, { dur: 1.1, gain: 0.18, filter: 'highpass', freq: 2500, attack: 0.05 }); noise(c, o, t + 0.5, { dur: 0.8, gain: 0.3, filter: 'lowpass', freq: 400 }); } },
  fallVoid: { label: 'Fall into the void', fn: (c, o, t) => { tone(c, o, t, { freq: 520, freqEnd: 60, dur: 1.3, gain: 0.25 }); noise(c, o, t, { dur: 1.4, gain: 0.2, filter: 'bandpass', freq: 900, freqEnd: 180, q: 0.7, attack: 0.1 }); } },
  // chasers
  devilRoar: { label: 'Devil roar', fn: (c, o, t) => { noise(c, o, t, { dur: 1.3, gain: 0.35, filter: 'lowpass', freq: 420, freqEnd: 180, attack: 0.08 }); for (const f of [62, 65.5, 93]) tone(c, o, t, { freq: f, freqEnd: f * 0.8, type: 'sawtooth', dur: 1.2, gain: 0.12, attack: 0.08, lowpass: 600, vibrato: 7, vibratoDepth: 60 }); } },
  heartbeat: { label: 'Danger heartbeat', fn: (c, o, t) => { for (const dt of [0, 0.24]) { const k = dt ? 0.8 : 1; tone(c, o, t + dt, { freq: 62, freqEnd: 45, dur: 0.14, gain: 0.35 * k }); tone(c, o, t + dt, { freq: 220, freqEnd: 120, type: 'triangle', dur: 0.14, gain: 0.8 * k }); tone(c, o, t + dt, { freq: 120, freqEnd: 80, type: 'square', dur: 0.1, gain: 0.14 * k, lowpass: 1000 }); noise(c, o, t + dt, { dur: 0.08, gain: 0.9 * k, filter: 'bandpass', freq: 850, q: 1.1 }); } } },
  devilGivesUp: { label: 'Devil gives up', fn: (c, o, t) => { SOUNDS.devilRoar.fn(c, o, t); arp(c, o, t + 1.0, [G5, C6, E6], 0.12, 0.6, 0.1, 'sine'); } },
  shadowRise: { label: 'Shadow rises', fn: (c, o, t) => { for (const [i, n] of [57, 60, 63, 66].entries()) tone(c, o, t + i * 0.12, { freq: midi(n), dur: 1.8, gain: 0.1, attack: 0.5, type: 'triangle', vibrato: 5, vibratoDepth: 30 }); for (const n of [45, 51]) tone(c, o, t, { freq: midi(n), dur: 1.8, gain: 0.08, attack: 0.5 }); noise(c, o, t, { dur: 1.8, gain: 0.22, filter: 'bandpass', freq: 600, freqEnd: 1600, q: 2, attack: 0.6 }); } },
  shadowGrab: { label: 'Shadow drags you down', fn: (c, o, t) => { SOUNDS.shadowRise.fn(c, o, t); SOUNDS.fallVoid.fn(c, o, t + 0.2); } },
  // choices
  soulSaved: { label: 'Soul saved', fn: (c, o, t) => { arp(c, o, t, [C6, E6, G6, C6 + 12], 0.07, 0.5, 0.11, 'sine'); chord(c, o, t, [C5, E5, G5], { dur: 0.9, gain: 0.12, attack: 0.08, type: 'sine' }); } },
  soulLost: { label: 'Soul left behind', fn: (c, o, t) => tone(c, o, t, { freq: midi(69), freqEnd: midi(64), dur: 0.5, gain: 0.1, type: 'sine', attack: 0.04 }) },
  temptation: { label: 'Temptation taken', fn: (c, o, t) => { chord(c, o, t, [45, 48, 52], { dur: 0.7, gain: 0.3, type: 'sawtooth', lowpass: 700, attack: 0.01 }); arp(c, o, t + 0.05, [76, 72, 69], 0.06, 0.18, 0.08, 'square'); } },
  resisted: { label: 'Temptation resisted', fn: (c, o, t) => { tone(c, o, t, { freq: midi(81), dur: 0.35, gain: 0.08, type: 'sine' }); tone(c, o, t + 0.08, { freq: midi(88), dur: 0.45, gain: 0.08, type: 'sine' }); } },
  miracle: { label: 'Miracle Shield', fn: (c, o, t) => { [91, 96, 100, 103, 108].forEach((n, i) => tone(c, o, t + i * 0.05, { freq: midi(n), dur: 0.6, gain: 0.06, type: 'sine' })); chord(c, o, t, [C5, E5, G5, C6], { dur: 1.0, gain: 0.12, attack: 0.1, type: 'sine' }); } },
  shieldBreak: { label: 'Shield saves you', fn: (c, o, t) => { noise(c, o, t, { dur: 0.35, gain: 0.25, filter: 'highpass', freq: 3500 }); tone(c, o, t, { freq: 2200, freqEnd: 700, type: 'triangle', dur: 0.3, gain: 0.12 }); } },
  // journey
  run: { label: 'Run!', fn: (c, o, t) => noise(c, o, t, { dur: 0.45, gain: 0.35, filter: 'bandpass', freq: 400, freqEnd: 2500, q: 1, attack: 0.1 }) },
  stage: { label: 'New world', fn: (c, o, t) => { noise(c, o, t, { dur: 0.8, gain: 0.12, filter: 'bandpass', freq: 300, freqEnd: 1800, q: 0.8, attack: 0.2 }); arp(c, o, t + 0.2, [G5, C6], 0.12, 0.5, 0.07, 'sine'); } },
  gate: { label: "Heaven's Gate opens", fn: (c, o, t) => { chord(c, o, t, [60, 64, 67, 72, 76], { dur: 3.0, gain: 0.3, attack: 1.0, type: 'sine' }); [84, 91, 96].forEach((n, i) => tone(c, o, t + 0.6 + i * 0.35, { freq: midi(n), dur: 1.5, gain: 0.07, type: 'sine' })); } },
  checkpoint: { label: 'Checkpoint', fn: (c, o, t) => { tone(c, o, t, { freq: midi(81), dur: 0.8, gain: 0.1, type: 'sine' }); tone(c, o, t + 0.12, { freq: midi(88), dur: 0.9, gain: 0.08, type: 'sine' }); } },
  levelComplete: { label: 'Level complete', fn: (c, o, t) => { arp(c, o, t, [67, 72, 76], 0.1, 0.25, 0.12); chord(c, o, t + 0.3, [72, 76, 79, 84], { dur: 0.9, gain: 0.22 }); } },
  gameOver: { label: 'Run over', fn: (c, o, t) => { tone(c, o, t, { freq: midi(76), freqEnd: midi(64), type: 'triangle', dur: 0.7, gain: 0.18 }); tone(c, o, t + 0.25, { freq: midi(69), freqEnd: midi(57), type: 'triangle', dur: 0.8, gain: 0.16 }); tone(c, o, t + 0.25, { freq: midi(57), freqEnd: midi(45), type: 'triangle', dur: 0.8, gain: 0.08 }); } },
  judgePass: { label: 'Judgment: free to roam', fn: (c, o, t) => { chord(c, o, t, [60, 64, 67, 72, 76, 79], { dur: 3.0, gain: 0.32, attack: 0.4, type: 'sine' }); arp(c, o, t + 0.5, [84, 88, 91, 96], 0.15, 1.2, 0.07, 'sine'); } },
  judgeFail: { label: 'Judgment: not yet ready', fn: (c, o, t) => { chord(c, o, t, [57, 60, 64, 69], { dur: 2.6, gain: 0.32, attack: 0.3, type: 'sawtooth', lowpass: 1500 }); chord(c, o, t, [45, 52], { dur: 2.6, gain: 0.15, attack: 0.3, type: 'sawtooth', lowpass: 600 }); tone(c, o, t, { freq: 55, dur: 2.6, gain: 0.12, attack: 0.3 }); } },
  // Ascended
  multiplier: { label: 'Multiplier up', fn: (c, o, t, p = 0) => { tone(c, o, t, { freq: midi(76 + p * 2), freqEnd: midi(83 + p * 2), type: 'square', dur: 0.12, gain: 0.07 }); tone(c, o, t + 0.1, { freq: midi(88 + p * 2), dur: 0.25, gain: 0.08, type: 'triangle' }); } },
  abilityReady: { label: 'Ability ready', fn: (c, o, t) => arp(c, o, t, [88, 93, 100], 0.06, 0.35, 0.08, 'sine') },
  flight: { label: 'Flight Burst', fn: (c, o, t) => { noise(c, o, t, { dur: 1.0, gain: 0.32, filter: 'bandpass', freq: 600, freqEnd: 2400, q: 0.8, attack: 0.1 }); tone(c, o, t, { freq: 440, freqEnd: 1100, type: 'triangle', dur: 0.5, gain: 0.16 }); arp(c, o, t + 0.3, [88, 93], 0.08, 0.4, 0.06, 'sine'); } },
  slowmo: { label: 'Slow Motion', fn: (c, o, t) => { tone(c, o, t, { freq: 900, freqEnd: 180, dur: 0.7, gain: 0.15 }); noise(c, o, t, { dur: 0.7, gain: 0.12, filter: 'lowpass', freq: 2000, freqEnd: 200 }); } },
  magnet: { label: 'Celestial Magnet', fn: (c, o, t) => { tone(c, o, t, { freq: 300, freqEnd: 600, dur: 0.9, gain: 0.16, type: 'triangle', vibrato: 12, vibratoDepth: 80 }); tone(c, o, t, { freq: 600, freqEnd: 1200, dur: 0.9, gain: 0.07, type: 'sine', vibrato: 12, vibratoDepth: 80 }); arp(c, o, t + 0.5, [84, 88, 91], 0.05, 0.3, 0.06, 'sine'); } },
  // menus
  tap: { label: 'Button tap', fn: (c, o, t) => tone(c, o, t, { freq: 1200, type: 'square', dur: 0.04, gain: 0.07, lowpass: 4000 }) },
  buy: { label: 'Buy (cha-ching)', fn: (c, o, t) => { noise(c, o, t, { dur: 0.08, gain: 0.12, filter: 'highpass', freq: 3000 }); tone(c, o, t + 0.05, { freq: midi(88), dur: 0.12, gain: 0.1, type: 'square' }); tone(c, o, t + 0.13, { freq: midi(95), dur: 0.4, gain: 0.12, type: 'triangle' }); } },
  denied: { label: 'Not enough coins', fn: (c, o, t) => { tone(c, o, t, { freq: 330, freqEnd: 240, type: 'square', dur: 0.12, gain: 0.09, lowpass: 2200 }); tone(c, o, t + 0.14, { freq: 240, freqEnd: 180, type: 'square', dur: 0.16, gain: 0.09, lowpass: 2200 }); } },
  daily: { label: 'Daily reward', fn: (c, o, t) => { arp(c, o, t, [72, 76, 79, 84], 0.08, 0.3, 0.1); SOUNDS.coin.fn(c, o, t + 0.35, 4); } },
};

export type SoundName = keyof typeof SOUNDS;
