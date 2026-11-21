import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { RunSession } from '../src/core/RunSession';
import { PATTERNS, TrackGenerator } from '../src/world/TrackGenerator';
import { SHAPES } from '../src/world/obstacles';

describe('TrackGenerator', () => {
  it('every pattern leaves at least one lane without a wall', () => {
    for (const tier of PATTERNS) for (const p of tier) {
      expect(p).toHaveLength(3);
      expect(p.split('').some((c) => c !== 'W')).toBe(true);
    }
  });
  it('keeps the start clear and leaves room between rows', () => {
    const g = new TrackGenerator(7);
    const { obstacles } = g.generate(5000, CONFIG.run.maxSpeed);
    expect(Math.min(...obstacles.map((o) => o.z))).toBeGreaterThanOrEqual(CONFIG.track.safeStart);
    const rows = [...new Set(obstacles.map((o) => o.z))].sort((a, b) => a - b);
    for (let i = 1; i < rows.length; i++) expect(rows[i] - rows[i - 1]).toBeGreaterThanOrEqual(CONFIG.track.minRowGapMetres - 1e-9);
  });
  it('different seeds make different courses (runs vary)', () => {
    const a = new TrackGenerator(1).generate(800, 12).obstacles.map((o) => `${o.kind}${o.lane}`).join();
    const b = new TrackGenerator(2).generate(800, 12).obstacles.map((o) => `${o.kind}${o.lane}`).join();
    expect(a).not.toBe(b);
  });
});

/** A simple robot player: looks at the next row, moves to a lane without a wall, then jumps or slides. */
function botStep(s: RunSession): void {
  const d = s.distance;
  const ahead = s.obstacles.filter((o) => o.z + SHAPES[o.kind].length / 2 > d - 0.5).sort((a, b) => a.z - b.z);
  if (!ahead.length) return;
  const rowZ = ahead[0].z;
  const row = ahead.filter((o) => o.z === rowZ);
  const kindIn = (lane: number) => row.find((o) => o.lane === lane)?.kind;
  const m = s.motion;
  const score = (lane: number) => {
    const k = kindIn(lane);
    return (k === 'wall' ? 100 : k ? 1 : 0) + Math.abs(lane - m.lane) * 0.5;
  };
  const best = [0, 1, 2].sort((a, b) => score(a) - score(b))[0];
  if (best < m.lane) s.act('left');
  else if (best > m.lane) s.act('right');
  const k = kindIn(m.lane);
  if (!k || m.changingLane) return;
  const near = rowZ - SHAPES[k].length / 2 - CONFIG.player.depth / 2 - d;
  if ((k === 'low' || k === 'lava') && near < s.speed * 0.2 && near > 0) s.act('jump');
  if (k === 'high' && near < s.speed * 0.25 && near > 0 && !m.sliding) s.act('slide');
}

describe('a robot can survive the course (it is always fair)', () => {
  it('survives 3000 m on 40 different seeds without dying', () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const s = new RunSession(seed);
      let stumbles = 0;
      while (!s.ended && s.distance < 3000) {
        botStep(s);
        s.update(1 / 60);
        for (const e of s.drainEvents()) if (e.type === 'stumble') stumbles++;
      }
      if (s.ended) failures.push(`seed ${seed}: ${s.ended} at ${Math.floor(s.distance)} m (stumbles ${stumbles})`);
    }
    expect(failures).toEqual([]);
  });
  it('collects coins and the speed ramps up', () => {
    const s = new RunSession(3);
    while (!s.ended && s.distance < 1500) {
      botStep(s);
      s.update(1 / 60);
    }
    expect(s.score.coins).toBeGreaterThan(20);
    expect(s.speed).toBeGreaterThan(CONFIG.run.startSpeed + 4);
  });
  it('a player who does nothing gets caught or crashes quickly', () => {
    const s = new RunSession(5);
    while (!s.ended && s.distance < 3000) s.update(1 / 60);
    expect(s.ended).not.toBeNull();
    expect(s.distance).toBeLessThan(400);
  });
});
