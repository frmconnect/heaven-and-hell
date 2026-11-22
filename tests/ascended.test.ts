import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { RunSession } from '../src/core/RunSession';
import { ABILITIES, AbilitySystem, isUnlocked } from '../src/systems/Abilities';
import { ScoreManager } from '../src/systems/ScoreManager';
import { TrackGenerator } from '../src/world/TrackGenerator';
import { ASCENDED_MAP, ASCENDED_SEGMENT } from '../src/world/worldMap';
import { botStep } from './bot';

describe('Ascended map', () => {
  it('is endless, flat, and rotates worlds every 1,500 m', () => {
    expect(ASCENDED_MAP.end).toBe(Infinity);
    expect(ASCENDED_MAP.ground(12345)).toBe(0);
    const worlds = [0, 1, 2, 3, 4].map((i) => ASCENDED_MAP.stageAt(i * ASCENDED_SEGMENT + 10).id);
    expect(worlds).toEqual(['kingdom', 'gardens', 'bridges', 'cosmic', 'kingdom']);
  });
  it('keeps getting harder', () => {
    expect(ASCENDED_MAP.difficultyAt(6000)).toBeGreaterThan(ASCENDED_MAP.difficultyAt(500));
  });
  it('has no souls or temptations, but Miracle Shields still appear', () => {
    const { pickups, obstacles } = new TrackGenerator(3, 0, ASCENDED_MAP).generate(9000, 25);
    expect(pickups.some((p) => p.kind === 'soul' || p.kind === 'temptation')).toBe(false);
    expect(pickups.some((p) => p.kind === 'miracle')).toBe(true);
    expect(new Set(obstacles.map((o) => o.theme))).toEqual(new Set(['kingdom', 'gardens', 'bridges', 'cosmic']));
  });
});

describe('Score multiplier (Decisions log #22)', () => {
  it('rises every 250 clean metres up to x5, and a stumble resets it', () => {
    const s = new ScoreManager();
    s.useMultiplier = true;
    s.addDistance(249);
    expect(s.multiplier).toBe(1);
    s.addDistance(2);
    expect(s.multiplier).toBe(2);
    for (let i = 0; i < 20; i++) s.addDistance(250);
    expect(s.multiplier).toBe(CONFIG.ascended.maxMultiplier);
    s.stumble();
    expect(s.multiplier).toBe(1);
    expect(s.bestMultiplier).toBe(5);
  });
  it('multiplies distance and coin points', () => {
    const s = new ScoreManager();
    s.useMultiplier = true;
    s.addDistance(250); // 250 pts, now x2
    s.addCoin(); // 10 * 2
    s.addDistance(100); // 100 * 2
    expect(s.score).toBe(250 + 20 + 200);
  });
});

describe('Abilities (Decisions log #21, #23)', () => {
  it('unlock by best Ascended distance', () => {
    expect(isUnlocked('flight', 0)).toBe(true);
    expect(isUnlocked('slowmo', 1499)).toBe(false);
    expect(isUnlocked('slowmo', 1500)).toBe(true);
    expect(isUnlocked('magnet', 3000)).toBe(true);
  });
  it('the button charges from coins and clean running, fires when full, then lasts its duration', () => {
    const a = new AbilitySystem('slowmo');
    expect(a.activate()).toBe(false);
    for (let i = 0; i < 180; i++) a.addCoin();
    expect(a.ready).toBe(false);
    expect(a.addCleanDistance(500)).toBe(true);
    expect(a.ready).toBe(true);
    expect(a.activate()).toBe(true);
    expect(a.charge).toBe(0);
    expect(a.update(ABILITIES.slowmo.duration - 0.1)).toBeNull();
    expect(a.update(0.2)).toBe('slowmo');
    expect(a.active).toBeNull();
  });
});

describe('Ascended run', () => {
  const run = (ability: 'flight' | 'slowmo' | 'magnet' = 'flight') => new RunSession(11, { ability, distance: 500 }, ASCENDED_MAP);
  it('starts faster, has no chaser, and uses the multiplier', () => {
    const s = run();
    expect(s.chaser).toBe('none');
    expect(s.speed).toBe(CONFIG.ascended.startSpeed);
    expect(s.score.useMultiplier).toBe(true);
    expect(s.ability?.selected).toBe('flight');
  });
  it('3 stumbles close together put your light out', () => {
    const s = run();
    for (let i = 0; i < 3; i++) {
      s.obstacles = [{ id: 80000 + i, kind: 'low', lane: s.motion.lane, z: s.distance + 1, hit: false, theme: 'kingdom' }];
      for (let k = 0; k < 8 && !s.over; k++) s.update(1 / 60);
    }
    expect(s.ended).toBe('caught');
  });
  it('Flight Burst flies over a wall', () => {
    const s = run('flight');
    s.ability!.charge = 1;
    expect(s.useAbility()).toBe(true);
    for (let i = 0; i < 30; i++) s.update(1 / 60);
    expect(s.flying).toBe(true);
    s.obstacles = [{ id: 81000, kind: 'wall', lane: s.motion.lane, z: s.distance + 1, hit: false, theme: 'kingdom' }];
    for (let i = 0; i < 20; i++) s.update(1 / 60);
    expect(s.ended).toBeNull();
  });
  it('Slow Motion halves the world speed', () => {
    const s = run('slowmo');
    s.ability!.charge = 1;
    s.useAbility();
    expect(s.timeScale).toBe(0.5);
  });
  it('charging takes about a minute (owner, twice: it was too easy): not full after 80 coins + 1,500 m', () => {
    const a = new AbilitySystem('flight');
    for (let i = 0; i < 80; i++) a.addCoin();
    a.addCleanDistance(1500);
    expect(a.ready).toBe(false);
  });
  it('Celestial Magnet collects coins in other lanes', () => {
    const s = run('magnet');
    s.ability!.charge = 1;
    s.useAbility();
    s.coins = [{ id: 82000, lane: 0, z: s.distance + 5, y: 1, taken: false }, { id: 82001, lane: 2, z: s.distance + 6, y: 1, taken: false }];
    s.obstacles = [];
    s.update(1 / 60);
    expect(s.score.coins).toBeGreaterThanOrEqual(2);
    expect(s.coins.some((c) => c.id === 82000 || c.id === 82001)).toBe(false);
  });
  it('a robot can survive 4,000 m of the Ascended State on several seeds', () => {
    const fails: string[] = [];
    for (const seed of [21, 22, 23, 24, 25]) {
      const s = new RunSession(seed, {}, ASCENDED_MAP);
      while (!s.over && s.distance < 4000) {
        botStep(s);
        s.update(1 / 60);
      }
      if (s.ended) fails.push(`seed ${seed}: ${s.ended} at ${Math.floor(s.distance)} (${s.stage.id})`);
    }
    expect(fails).toEqual([]);
  });
});
