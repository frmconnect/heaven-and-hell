import { describe, expect, it } from 'vitest';
import { CONFIG, laneX } from '../src/core/config';
import { GameState, GameStateManager } from '../src/core/GameStateManager';
import { Rng } from '../src/core/rng';
import { DevilChase } from '../src/enemies/DevilChase';
import { swipeToAction } from '../src/input/InputController';
import { PlayerMotion } from '../src/player/PlayerMotion';
import { SaveData, type KeyValueStore } from '../src/systems/SaveData';
import { ScoreManager } from '../src/systems/ScoreManager';
import { overlaps, resolveHit, type ObstacleData } from '../src/world/obstacles';

const step = (m: PlayerMotion, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 60) m.update(1 / 60);
};

describe('GameStateManager', () => {
  it('starts in the main menu and follows allowed transitions', () => {
    const g = new GameStateManager();
    expect(g.state).toBe(GameState.MainMenu);
    expect(g.go(GameState.HellRun)).toBe(true);
    expect(g.isRunning).toBe(true);
    expect(g.go(GameState.GameOver)).toBe(true);
    expect(g.go(GameState.HellRun)).toBe(true);
  });
  it('refuses transitions that are not allowed', () => {
    const g = new GameStateManager();
    expect(g.go(GameState.GameOver)).toBe(false);
    expect(g.go(GameState.AscendedUnlocked)).toBe(false);
    expect(g.state).toBe(GameState.MainMenu);
  });
  it('pauses and resumes back to the same run state', () => {
    const g = new GameStateManager();
    g.go(GameState.HellRun);
    expect(g.pause()).toBe(true);
    expect(g.isRunning).toBe(false);
    expect(g.go(GameState.AscendedRun)).toBe(false);
    expect(g.resume()).toBe(true);
    expect(g.state).toBe(GameState.HellRun);
  });
  it('notifies listeners', () => {
    const g = new GameStateManager();
    const seen: string[] = [];
    g.onChange((to, from) => seen.push(`${from}>${to}`));
    g.go(GameState.HellRun);
    expect(seen).toEqual(['MainMenu>HellRun']);
  });
});

describe('PlayerMotion (lanes, jump, slide)', () => {
  it('starts in the middle lane and moves one lane per swipe, never off the track', () => {
    const m = new PlayerMotion();
    expect(m.lane).toBe(1);
    m.apply('left');
    m.apply('left');
    expect(m.lane).toBe(0);
    step(m, 0.5);
    expect(m.x).toBeCloseTo(laneX(0));
    m.apply('right');
    m.apply('right');
    m.apply('right');
    expect(m.lane).toBe(2);
  });
  it('jumps, lands, and cannot double-jump', () => {
    const m = new PlayerMotion();
    m.apply('jump');
    step(m, 0.2);
    const h = m.y;
    expect(h).toBeGreaterThan(1);
    m.apply('jump');
    step(m, 0.05);
    expect(m.y).toBeLessThan(h + 1);
    step(m, 1);
    expect(m.y).toBe(0);
    expect(m.grounded).toBe(true);
  });
  it('clears a low barrier height at the top of the jump', () => {
    const m = new PlayerMotion();
    m.apply('jump');
    let peak = 0;
    for (let i = 0; i < 60; i++) {
      m.update(1 / 60);
      peak = Math.max(peak, m.y);
    }
    expect(peak).toBeGreaterThan(1.4);
  });
  it('slides with a lower body for a short time', () => {
    const m = new PlayerMotion();
    m.apply('slide');
    expect(m.sliding).toBe(true);
    expect(m.height).toBe(CONFIG.player.slideHeight);
    step(m, CONFIG.slide.duration + 0.05);
    expect(m.sliding).toBe(false);
    expect(m.height).toBe(CONFIG.player.height);
  });
  it('swipe down in the air drops fast and slides on landing', () => {
    const m = new PlayerMotion();
    m.apply('jump');
    step(m, 0.15);
    m.apply('slide');
    step(m, 0.2);
    expect(m.y).toBe(0);
    expect(m.sliding).toBe(true);
  });
  it('bounces back to the previous lane', () => {
    const m = new PlayerMotion();
    m.apply('right');
    m.bounceBack();
    expect(m.lane).toBe(1);
  });
});

describe('swipe detection', () => {
  it('reads direction and ignores tiny movements', () => {
    expect(swipeToAction(5, 3)).toBeNull();
    expect(swipeToAction(-60, 10)).toBe('left');
    expect(swipeToAction(60, -10)).toBe('right');
    expect(swipeToAction(10, -60)).toBe('jump');
    expect(swipeToAction(-10, 60)).toBe('slide');
  });
});

describe('collisions', () => {
  const ob = (kind: ObstacleData['kind'], lane = 1): ObstacleData => ({ id: 1, kind, lane, z: 50, hit: false });
  const at = (y: number, height = CONFIG.player.height, x = laneX(1)) => ({ x, y, z: 50, height });
  it('low barrier: hit when running, clear when jumping high enough', () => {
    expect(overlaps(at(0), ob('low'))).toBe(true);
    expect(overlaps(at(0.9), ob('low'))).toBe(false);
  });
  it('high beam: hit when standing or jumping, clear when sliding', () => {
    expect(overlaps(at(0), ob('high'))).toBe(true);
    expect(overlaps(at(1.5), ob('high'))).toBe(true);
    expect(overlaps(at(0, CONFIG.player.slideHeight), ob('high'))).toBe(false);
  });
  it('other lanes never collide', () => {
    expect(overlaps(at(0, 1.8, laneX(0)), ob('wall'))).toBe(false);
  });
  it('resolves outcomes', () => {
    expect(resolveHit(ob('low'), false)).toBe('stumble');
    expect(resolveHit(ob('wall'), false)).toBe('crash');
    expect(resolveHit(ob('wall'), true)).toBe('scrape');
    expect(resolveHit(ob('lava'), false)).toBe('fall');
  });
});

describe('DevilChase', () => {
  it('falls back with clean running up to a maximum', () => {
    const d = new DevilChase();
    d.update(100);
    expect(d.gap).toBe(CONFIG.devil.maxGap);
  });
  it('catches you if you stumble while he is close', () => {
    const d = new DevilChase();
    expect(d.stumble()).toBe(true);
    expect(d.caught).toBe(true);
  });
  it('one stumble at full distance is survivable, two in a row is not', () => {
    const d = new DevilChase();
    d.update(100);
    expect(d.stumble()).toBe(false);
    expect(d.stumble()).toBe(true);
  });
});

describe('Score and save data', () => {
  it('scores distance plus coins', () => {
    const s = new ScoreManager();
    s.addDistance(123.7);
    s.addCoin();
    expect(s.score).toBe(123 + CONFIG.coins.points);
  });
  it('remembers the best score and survives broken storage', () => {
    const mem: Record<string, string> = {};
    const store: KeyValueStore = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => void (mem[k] = v) };
    const a = new SaveData(store);
    expect(a.recordRun(500, 400, 10)).toBe(true);
    expect(a.recordRun(300, 250, 5)).toBe(false);
    const b = new SaveData(store);
    expect(b.data.bestScore).toBe(500);
    expect(b.data.totalCoins).toBe(15);
    expect(b.data.runs).toBe(2);
    mem['heaven-and-hell.save'] = '{not json';
    expect(new SaveData(store).data.bestScore).toBe(0);
    const broken: KeyValueStore = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    const c = new SaveData(broken);
    expect(() => c.recordRun(1, 1, 1)).not.toThrow();
  });
});

describe('Rng', () => {
  it('is repeatable for the same seed', () => {
    const a = new Rng(42), b = new Rng(42);
    for (let i = 0; i < 10; i++) expect(a.next()).toBe(b.next());
  });
});
