import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { RunSession } from '../src/core/RunSession';
import { PATTERNS, TrackGenerator } from '../src/world/TrackGenerator';
import { lengthOf } from '../src/world/obstacles';
import { JOURNEY_LENGTH, obstaclesAllowed, stageStart } from '../src/world/journey';

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
    for (let i = 1; i < rows.length; i++) expect(rows[i] - rows[i - 1]).toBeGreaterThanOrEqual(CONFIG.track.minRowGapMetres - 1e-6);
  });
  it('different seeds make different courses (runs vary)', () => {
    const a = new TrackGenerator(1).generate(800, 12).obstacles.map((o) => `${o.kind}${o.lane}`).join();
    const b = new TrackGenerator(2).generate(800, 12).obstacles.map((o) => `${o.kind}${o.lane}`).join();
    expect(a).not.toBe(b);
  });
  it('no obstacles at stage changes, at the Gate, or after the end of the journey', () => {
    const { obstacles } = new TrackGenerator(9).generate(JOURNEY_LENGTH + 500, 20);
    for (const o of obstacles) expect(obstaclesAllowed(o.z - lengthOf(o) / 2)).toBe(true);
    const gate = stageStart('gate');
    expect(obstacles.some((o) => Math.abs(o.z - gate) < 60)).toBe(false);
    expect(Math.max(...obstacles.map((o) => o.z))).toBeLessThan(JOURNEY_LENGTH);
  });
  it('each stage gets obstacles themed for it, and the bridges have narrow paths', () => {
    const { obstacles } = new TrackGenerator(4).generate(JOURNEY_LENGTH, 22);
    const themes = new Set(obstacles.map((o) => o.theme));
    expect([...themes].sort()).toEqual(['bridges', 'gardens', 'hell', 'kingdom', 'stairway']);
    expect(obstacles.some((o) => o.theme === 'bridges' && (o.length ?? 0) > 10)).toBe(true);
  });
});

/** A simple robot player: looks at the next row, moves to a lane without a wall, then jumps or slides.
 *  style 'saint' goes for souls, 'sinner' goes for temptations, 'none' ignores both. */
export function botStep(s: RunSession, style: 'none' | 'saint' | 'sinner' = 'none'): void {
  const d = s.distance;
  if (style !== 'none') {
    const want = style === 'saint' ? 'soul' : 'temptation';
    const firstRow = Math.min(...s.obstacles.filter((o) => o.z + lengthOf(o) / 2 > d).map((o) => o.z - lengthOf(o) / 2), Infinity);
    const target = s.pickups.find((p) => !p.resolved && p.kind === want && p.z > d && p.z < firstRow && p.z - d < 30);
    if (target) {
      if (target.lane < s.motion.lane) s.act('left');
      else if (target.lane > s.motion.lane) s.act('right');
      return;
    }
  }
  const ahead = s.obstacles.filter((o) => o.z + lengthOf(o) / 2 > d - 0.5).sort((a, b) => a.z - lengthOf(a) / 2 - (b.z - lengthOf(b) / 2));
  if (!ahead.length) return;
  const rowZ = ahead[0].z;
  const row = ahead.filter((o) => o.z === rowZ);
  const obIn = (lane: number) => row.find((o) => o.lane === lane);
  const m = s.motion;
  const blocked = (lane: number) => {
    const o = obIn(lane);
    return !!o && (o.kind === 'wall' || lengthOf(o) > 6);
  };
  const score = (lane: number) => (blocked(lane) ? 100 : obIn(lane) ? 1 : 0) + Math.abs(lane - m.lane) * 0.5;
  const best = [0, 1, 2].sort((a, b) => score(a) - score(b))[0];
  if (best < m.lane) s.act('left');
  else if (best > m.lane) s.act('right');
  const o = obIn(m.lane);
  if (!o || m.changingLane) return;
  const near = rowZ - lengthOf(o) / 2 - CONFIG.player.depth / 2 - d;
  if ((o.kind === 'low' || o.kind === 'pit') && near < s.speed * 0.2 && near > 0) s.act('jump');
  if (o.kind === 'high' && near < s.speed * 0.25 && near > 0 && !m.sliding) s.act('slide');
}

function play(s: RunSession, maxDistance: number, style: 'none' | 'saint' | 'sinner' = 'none') {
  const events: string[] = [];
  while (!s.over && s.distance < maxDistance) {
    botStep(s, style);
    s.update(1 / 60);
    for (const e of s.drainEvents()) if (e.type !== 'coin') events.push(e.type === 'stage' ? `stage:${e.stage.id}` : e.type);
  }
  return events;
}

describe('a robot can survive the course (it is always fair)', () => {
  it('survives Hell and the Stairway on 30 different seeds', () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= 30; seed++) {
      const s = new RunSession(seed);
      play(s, stageStart('gate') + 10);
      if (s.ended) failures.push(`seed ${seed}: ${s.ended} at ${Math.floor(s.distance)} m (${s.stage.id})`);
    }
    expect(failures).toEqual([]);
  });
  it('completes the whole journey to God on 15 seeds, in the right order', () => {
    const failures: string[] = [];
    for (let seed = 100; seed < 115; seed++) {
      const s = new RunSession(seed);
      const ev = play(s, JOURNEY_LENGTH + 100);
      if (!s.completed) failures.push(`seed ${seed}: ${s.ended} at ${Math.floor(s.distance)} m (${s.stage.id})`);
      else if (seed === 100) {
        expect(ev.filter((e) => e.startsWith('stage') || e === 'devilGivesUp' || e === 'checkpoint' || e === 'journeyComplete')).toEqual([
          'stage:stairway', 'devilGivesUp', 'stage:gate', 'checkpoint', 'stage:gardens', 'stage:bridges', 'stage:kingdom', 'stage:god', 'journeyComplete',
        ]);
        expect(ev.filter((e) => e === 'levelComplete')).toHaveLength(3);
      }
    }
    expect(failures).toEqual([]);
  });
  it('restarting from the Heaven\'s Gate checkpoint: the Shadow chases you, starting far back', () => {
    const s = new RunSession(3, { distance: stageStart('gardens'), coins: 40 });
    expect(s.stage.id).toBe('gardens');
    expect(s.chaser).toBe('shadow');
    expect(s.devil.gap).toBe(CONFIG.devil.maxGap);
    expect(s.score.coins).toBe(40);
    play(s, stageStart('gardens') + 300);
    expect(s.ended).toBeNull();
  });
  it('collects coins and the speed ramps up', () => {
    const s = new RunSession(3);
    play(s, 1500);
    expect(s.score.coins).toBeGreaterThan(20);
    expect(s.speed).toBeGreaterThan(CONFIG.run.startSpeed + 4);
  });
  it('souls, temptations and Miracles appear along the whole journey', () => {
    const { pickups, obstacles } = new TrackGenerator(12).generate(JOURNEY_LENGTH, 22);
    const souls = pickups.filter((p) => p.kind === 'soul').length;
    const temptations = pickups.filter((p) => p.kind === 'temptation').length;
    const miracles = pickups.filter((p) => p.kind === 'miracle').length;
    expect(souls + temptations).toBeGreaterThan(25);
    expect(souls).toBeGreaterThan(8);
    expect(temptations).toBeGreaterThan(8);
    expect(miracles).toBeGreaterThanOrEqual(4);
    // temptations usually sit right in front of an obstacle in the same lane (the riskier path)
    const risky = pickups.filter((p) => p.kind === 'temptation' && obstacles.some((o) => o.lane === p.lane && o.z - p.z > 0 && o.z - p.z < 6));
    expect(risky.length / temptations).toBeGreaterThan(0.5);
    // never inside an obstacle
    for (const p of pickups) for (const o of obstacles) if (o.lane === p.lane) expect(Math.abs(o.z - p.z)).toBeGreaterThan(lengthOf(o) / 2 + 1);
  });
  it('a robot "saint" passes judgment and a robot "sinner" fails', async () => {
    const { judge } = await import('../src/systems/SinGrace');
    let saintPasses = 0, sinnerFails = 0;
    for (const seed of [201, 202, 203, 204]) {
      const a = new RunSession(seed);
      play(a, JOURNEY_LENGTH + 50, 'saint');
      if (a.completed && judge(a.moral.record).passed) saintPasses++;
      const b = new RunSession(seed);
      play(b, JOURNEY_LENGTH + 50, 'sinner');
      if (b.over && !judge(b.moral.record).passed) sinnerFails++;
      expect(b.moral.record.temptationsTaken).toBeGreaterThan(3);
    }
    expect(saintPasses).toBe(4);
    expect(sinnerFails).toBe(4);
  });
  it('the Miracle Shield absorbs one hit, even a head-on wall crash', () => {
    const s = new RunSession(4, { distance: 1000 });
    s.obstacles = [];
    s.shield = true;
    s.obstacles.push({ id: 7001, kind: 'wall', lane: 1, z: s.distance + 1, hit: false, theme: 'hell' });
    s.update(1 / 60);
    expect(s.ended).toBeNull();
    expect(s.shield).toBe(false);
    const e = s.drainEvents().map((x) => x.type);
    expect(e).toContain('shieldUsed');
  });
  it('restarting from the checkpoint keeps the Sin/Grace record', () => {
    const s = new RunSession(4, { distance: stageStart('gate'), record: { soulsHelped: 5, soulsMissed: 1, temptationsResisted: 2, temptationsTaken: 2, miracles: 0 } });
    expect(s.moral.record.soulsHelped).toBe(5);
    expect(s.moral.percent).toBe(70);
  });
  it('a player who does nothing gets caught or crashes quickly', () => {
    const s = new RunSession(5);
    while (!s.over && s.distance < 3000) s.update(1 / 60);
    expect(s.ended).not.toBeNull();
    expect(s.distance).toBeLessThan(400);
  });
  it('in Heaven the Shadow follows the same rule: 3 stumbles close together and it catches you', () => {
    const s = new RunSession(8, { distance: stageStart('gardens') });
    s.obstacles.push({ id: 999, kind: 'low', lane: 1, z: s.distance + 1, hit: false, theme: 'gardens' });
    s.update(1 / 60);
    s.update(1 / 60);
    expect(s.ended).toBeNull();
    expect(s.speed).toBeLessThan(CONFIG.run.maxSpeed);
    s.obstacles.push({ id: 1000, kind: 'high', lane: 1, z: s.distance + 1, hit: false, theme: 'gardens' });
    s.update(1 / 60);
    s.update(1 / 60);
    expect(s.ended).toBeNull();
    s.obstacles.push({ id: 1001, kind: 'low', lane: 1, z: s.distance + 1, hit: false, theme: 'gardens' });
    s.update(1 / 60);
    s.update(1 / 60);
    expect(s.ended).toBe('caught');
    expect(s.chaser).toBe('shadow');
  });
  it('the chase never stops: the Shadow takes over the moment the Devil gives up', () => {
    const s = new RunSession(2, { distance: stageStart('stairway') + 640 });
    expect(s.chaser).toBe('devil');
    let gaveUp = false;
    while (s.distance < stageStart('stairway') + 700 && !s.over) {
      s.obstacles = [];
      s.update(1 / 60);
      for (const e of s.drainEvents()) if (e.type === 'devilGivesUp') gaveUp = true;
    }
    expect(gaveUp).toBe(true);
    expect(s.chaser).toBe('shadow');
    expect(s.devil.gap).toBeGreaterThan(CONFIG.devil.stumblePenalty);
  });
});
