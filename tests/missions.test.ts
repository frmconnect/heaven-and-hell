import { describe, expect, it } from 'vitest';
import { dailyChallenges, emptyStats, goalText, missionGoals, missionReward, missionTarget, MISSION_POOL, MISSION_UNLOCKS, progressAfter, type Goal } from '../src/systems/Missions';

describe('Daily challenges', () => {
  it('gives 3 different challenges per day, easy/medium/hard, the same for everyone that day', () => {
    const a = dailyChallenges(20000, false);
    expect(a).toHaveLength(3);
    expect(new Set(a.map((c) => c.goal.type)).size).toBe(3);
    expect(a.map((c) => c.reward)).toEqual([100, 200, 300]);
    expect(dailyChallenges(20000, false)).toEqual(a);
    expect(JSON.stringify(dailyChallenges(20001, false))).not.toBe(JSON.stringify(a));
  });
  it('only uses Ascended challenges once the Ascended State is unlocked', () => {
    for (let d = 0; d < 200; d++) {
      for (const c of dailyChallenges(d, false)) expect(['multiplier', 'abilities']).not.toContain(c.goal.type);
    }
  });
  it('every challenge reads as plain English', () => {
    for (let d = 0; d < 50; d++) for (const c of dailyChallenges(d, true)) expect(goalText(c.goal)).toMatch(/^[A-Z]/);
  });
});

describe('Progress', () => {
  const s = { ...emptyStats(), coins: 150, distance: 900, souls: 2, jumps: 12, stageIndex: 1, bestClean: 500 };
  it('totals add up over runs; single-run goals keep the best run', () => {
    expect(progressAfter({ type: 'coins', scope: 'total', target: 300 }, 200, s)).toBe(300); // capped at target
    expect(progressAfter({ type: 'coins', scope: 'total', target: 1000 }, 200, s)).toBe(350);
    expect(progressAfter({ type: 'coins', scope: 'run', target: 300 }, 200, s)).toBe(200); // earlier run was better
    expect(progressAfter({ type: 'distance', scope: 'run', target: 600 }, 0, s)).toBe(600);
    expect(progressAfter({ type: 'clean', scope: 'run', target: 800 }, 0, s)).toBe(500);
    expect(progressAfter({ type: 'stage', scope: 'run', target: 3 }, 0, s)).toBe(1);
  });
  it('Ascended goals only count Ascended runs', () => {
    const g: Goal = { type: 'multiplier', scope: 'run', target: 4 };
    expect(progressAfter(g, 0, { ...emptyStats('journey'), maxMultiplier: 5 })).toBe(0);
    expect(progressAfter(g, 0, { ...emptyStats('ascended'), maxMultiplier: 5 })).toBe(4);
  });
});

describe('Missions', () => {
  it('3 different goals per level, and every kind of goal gets harder with level', () => {
    for (let l = 1; l < 30; l++) {
      const gs = missionGoals(l);
      expect(gs).toHaveLength(3);
      expect(new Set(gs.map((g) => g.type)).size).toBe(3);
    }
    for (const m of MISSION_POOL) {
      if (m.max) continue;
      expect(missionTarget(m, 12)).toBeGreaterThan(missionTarget(m, 1));
    }
  });
  it('rewards: coins per level and exclusive cosmetics at 5, 10, 15, 20', () => {
    expect(missionReward(7)).toBe(700);
    expect(MISSION_UNLOCKS.map((u) => u.level)).toEqual([5, 10, 15, 20]);
  });
  it('never asks to reach a stage past the Light of God', () => {
    for (let l = 1; l < 60; l++) for (const g of missionGoals(l)) if (g.type === 'stage') expect(g.target).toBeLessThanOrEqual(6);
  });
});

import { SaveData, type KeyValueStore } from '../src/systems/SaveData';
import { MissionTracker } from '../src/systems/MissionTracker';
import { Shop } from '../src/systems/Shop';

function tracker() {
  const mem: Record<string, string> = {};
  const store: KeyValueStore = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => void (mem[k] = v) };
  const save = new SaveData(store);
  return { save, t: new MissionTracker(save), store };
}

describe('MissionTracker', () => {
  it('pays each daily challenge once, plus the all-three bonus', () => {
    const { save, t } = tracker();
    t.ensureDay(30000);
    t.startRun();
    const big = { ...emptyStats(), coins: 5000, distance: 20000, souls: 20, resisted: 20, jumps: 500, slides: 500, bestClean: 5000, miracles: 9, stageIndex: 6 };
    const ev = t.update(big);
    expect(ev.filter((e) => e.kind === 'daily')).toHaveLength(3);
    expect(ev.some((e) => e.kind === 'dailyAll')).toBe(true);
    const paid = save.data.wallet;
    expect(paid).toBeGreaterThanOrEqual(100 + 200 + 300 + 250);
    expect(t.update(big).filter((e) => e.kind === 'daily')).toHaveLength(0); // never twice
    t.ensureDay(30001); // a new day: fresh challenges
    expect(t.dailyDoneCount()).toBe(0);
  });
  it('totals carry over between runs', () => {
    const { save, t } = tracker();
    t.ensureDay(30000);
    t.startRun();
    t.update({ ...emptyStats(), jumps: 10, coins: 10 });
    t.startRun();
    t.update({ ...emptyStats(), jumps: 5, coins: 5 });
    const views = t.daily();
    for (const v of views) if (v.goal.type === 'jumps' && v.goal.scope === 'total') expect(v.progress).toBe(15);
    void save;
  });
  it('finishing all 3 missions levels up, pays coins, and unlocks exclusives at level 5', () => {
    const { save, t } = tracker();
    save.data.mLevel = 4;
    t.startRun();
    const huge = { ...emptyStats(), coins: 99999, distance: 99999, souls: 999, resisted: 999, jumps: 9999, slides: 9999, bestClean: 99999, miracles: 99, stageIndex: 6, reachedGod: true };
    const ev = t.update(huge);
    const lv = ev.find((e) => e.kind === 'missionLevel');
    expect(lv).toMatchObject({ kind: 'missionLevel', level: 5, reward: 400, unlock: 'Halo Trail' });
    expect(save.data.owned).toContain('halotrail');
    // progress from that same run doesn't instantly complete the next level
    expect(t.update(huge).some((e) => e.kind === 'missionLevel')).toBe(false);
  });
  it('mission-exclusive cosmetics can never be bought, only earned', () => {
    const { save } = tracker();
    const shop = new Shop(save);
    save.data.wallet = 99999;
    expect(shop.owns('seraphwings')).toBe(false);
    expect(shop.buy('seraphwings')).toBe('unknown');
    expect(shop.equip('seraphwings')).toBe(false);
    save.data.owned.push('seraphwings');
    expect(shop.equip('seraphwings')).toBe(true);
  });
});
