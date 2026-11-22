/**
 * Tiny sound synthesizer on the Web Audio API: tones and filtered noise with simple envelopes.
 * Works with a live AudioContext (the game) or an OfflineAudioContext (tests / previews).
 */
export type Ctx = BaseAudioContext;

export interface ToneOpts {
  freq: number;
  freqEnd?: number; // slide to this pitch
  type?: OscillatorType;
  dur: number; // seconds
  gain?: number;
  attack?: number;
  detune?: number;
  vibrato?: number; // Hz
  vibratoDepth?: number; // cents
  lowpass?: number; // Hz
}

export interface NoiseOpts {
  dur: number;
  gain?: number;
  attack?: number;
  filter?: BiquadFilterType;
  freq?: number;
  freqEnd?: number;
  q?: number;
}

const noiseBuffers = new WeakMap<Ctx, AudioBuffer>();

/** A shared 2-second buffer of white noise (made once per context). */
export function noiseBuffer(ctx: Ctx): AudioBuffer {
  let b = noiseBuffers.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      d[i] = (seed / 0x7fffffff) * 2 - 1;
    }
    noiseBuffers.set(ctx, b);
  }
  return b;
}

function envelope(ctx: Ctx, t: number, dur: number, peak: number, attack: number): GainNode {
  const g = ctx.createGain();
  const a = Math.min(attack, dur * 0.5);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + Math.max(0.002, a));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  return g;
}

export function tone(ctx: Ctx, out: AudioNode, t: number, o: ToneOpts): void {
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), t + o.dur);
  if (o.detune) osc.detune.setValueAtTime(o.detune, t);
  const env = envelope(ctx, t, o.dur, o.gain ?? 0.3, o.attack ?? 0.005);
  let node: AudioNode = osc;
  if (o.lowpass) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(o.lowpass, t);
    osc.connect(f);
    node = f;
  }
  node.connect(env).connect(out);
  if (o.vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.setValueAtTime(o.vibrato, t);
    depth.gain.setValueAtTime(o.vibratoDepth ?? 30, t);
    lfo.connect(depth).connect(osc.detune);
    lfo.start(t);
    lfo.stop(t + o.dur + 0.05);
  }
  osc.start(t);
  osc.stop(t + o.dur + 0.05);
}

export function noise(ctx: Ctx, out: AudioNode, t: number, o: NoiseOpts): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  f.type = o.filter ?? 'lowpass';
  f.frequency.setValueAtTime(o.freq ?? 1000, t);
  if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.freqEnd), t + o.dur);
  f.Q.setValueAtTime(o.q ?? 0.8, t);
  const env = envelope(ctx, t, o.dur, o.gain ?? 0.3, o.attack ?? 0.005);
  src.connect(f).connect(env).connect(out);
  src.start(t, Math.random() * 1.0);
  src.stop(t + o.dur + 0.05);
}

/** Note name helper: midi number → frequency. */
export const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);
