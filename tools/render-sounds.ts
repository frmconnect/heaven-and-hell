/** Renders every sound effect offline to WAV (base64) and measures it. Used by scripts/render-sounds.cjs. */
import { SOUNDS } from '../src/audio/sounds';

function wav(buf: AudioBuffer): string {
  const d = buf.getChannelData(0), n = d.length, rate = buf.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + n * 2));
  const w = (o: number, s: string) => [...s].forEach((ch, i) => out.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF'); out.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, rate, true); out.setUint32(28, rate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
  w(36, 'data'); out.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
  let s = '';
  const bytes = new Uint8Array(out.buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function renderSounds(): Promise<Record<string, { peak: number; rms: number; secs: number; wav: string }>> {
  const out: Record<string, { peak: number; rms: number; secs: number; wav: string }> = {};
  for (const [name, def] of Object.entries(SOUNDS)) {
    const ctx = new OfflineAudioContext(1, 44100 * 4, 44100);
    const g = ctx.createGain();
    g.gain.value = 0.8; // the game's default volume
    g.connect(ctx.destination);
    def.fn(ctx, g, 0.01, 0);
    const buf = await ctx.startRendering();
    const d = buf.getChannelData(0);
    let peak = 0, sum = 0, last = 0;
    for (let i = 0; i < d.length; i++) {
      const v = Math.abs(d[i]);
      if (v > peak) peak = v;
      sum += d[i] * d[i];
      if (v > 0.001) last = i;
    }
    // trim the silence at the end
    const len = Math.min(d.length, last + 2205);
    const trimmed = new AudioBuffer({ length: len, sampleRate: 44100, numberOfChannels: 1 });
    trimmed.copyToChannel(d.subarray(0, len), 0);
    out[name] = { peak, rms: Math.sqrt(sum / Math.max(1, last)), secs: len / 44100, wav: wav(trimmed) };
  }
  return out;
}
