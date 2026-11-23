import { Rng } from '../core/rng';

/**
 * Daily Challenges and Missions (Decisions log #40).
 * Rewards are coins and exclusive cosmetics only — nothing that changes scores.
 */

/** What one run achieved (collected by the game during the run). */
export interface RunStats {
  mode: 'journey' | 'ascended';
  coins: number;
  distance: number;
  souls: number;
  resisted: number;
  miracles: number;
  jumps: number;
  slides: number;
  stageIndex: number; // journey: 0 Hell, 1 Stairway, 2 Gate, 3 Gardens, 4 Bridges, 5 Kingdom, 6 Light of God
  bestClean: number; // longest stretch without a stumble (metres)
  maxMultiplier: number;
  abilities: number;
  reachedGod: boolean;
  passedJudgment: boolean;
}

export const emptyStats = (mode: 'journey' | 'ascended' = 'journey'): RunStats => ({
  mode, coins: 0, distance: 0, souls: 0, resisted: 0, miracles: 0, jumps: 0, slides: 0, stageIndex: 0, bestClean: 0, maxMultiplier: 1, abilities: 0, reachedGod: false, passedJudgment: false,
});

export type GoalType = 'coins' | 'distance' | 'souls' | 'resisted' | 'miracles' | 'jumps' | 'slides' | 'stage' | 'clean' | 'multiplier' | 'abilities' | 'god' | 'judgment';
/** 'run' = in a single run; 'total' = added up over any number of runs */
export type Scope = 'run' | 'total';

export interface Goal {
  type: GoalType;
  scope: Scope;
  target: number;
}

const STAGE_NAMES = ['Hell', 'the Stairway to Heaven', "Heaven's Gate", 'the Heavenly Gardens', 'the Celestial Bridges', 'the Golden Kingdom', 'the Light of God'];
const fmt = (n: number) => n.toLocaleString('en-US');

/** Plain-language text for a goal. */
export function goalText(g: Goal): string {
  const t = g.target;
  const one = g.scope === 'run' ? ' in one run' : '';
  switch (g.type) {
    case 'coins': return `Collect ${fmt(t)} coins${one}`;
    case 'distance': return `Run ${fmt(t)} m${one}`;
    case 'souls': return `Save ${t} lost soul${t === 1 ? '' : 's'}${one}`;
    case 'resisted': return `Resist ${t} temptation${t === 1 ? '' : 's'}${one}`;
    case 'miracles': return `Collect ${t} Miracle Shield${t === 1 ? '' : 's'}${one}`;
    case 'jumps': return `Jump ${t} times${one}`;
    case 'slides': return `Slide ${t} times${one}`;
    case 'stage': return `Reach ${STAGE_NAMES[Math.min(t, STAGE_NAMES.length - 1)]}`;
    case 'clean': return `Run ${fmt(t)} m without stumbling`;
    case 'multiplier': return `Reach x${t} in the Ascended State`;
    case 'abilities': return `Use your ability ${t} time${t === 1 ? '' : 's'}${one}`;
    case 'god': return t === 1 ? 'Reach God' : `Reach God ${t} times`;
    case 'judgment': return t === 1 ? 'Pass judgment' : `Pass judgment ${t} times`;
  }
}

/** How much a run adds to (or reaches for) a goal. */
export function runValue(g: Goal, s: RunStats): number {
  switch (g.type) {
    case 'coins': return s.coins;
    case 'distance': return Math.floor(s.distance);
    case 'souls': return s.souls;
    case 'resisted': return s.resisted;
    case 'miracles': return s.miracles;
    case 'jumps': return s.jumps;
    case 'slides': return s.slides;
    case 'stage': return s.mode === 'journey' ? s.stageIndex : 0;
    case 'clean': return Math.floor(s.bestClean);
    case 'multiplier': return s.mode === 'ascended' ? s.maxMultiplier : 0;
    case 'abilities': return s.abilities;
    case 'god': return s.reachedGod ? 1 : 0;
    case 'judgment': return s.passedJudgment ? 1 : 0;
  }
}

/** Goals that keep the best of single runs (not added up). */
const BEST_OF: GoalType[] = ['stage', 'clean', 'multiplier'];

/** New progress after a run (or part of a run). `base` = progress before this run started. */
export function progressAfter(g: Goal, base: number, s: RunStats): number {
  const v = runValue(g, s);
  if (BEST_OF.includes(g.type) || g.scope === 'run') return Math.min(g.target, Math.max(base, v));
  return Math.min(g.target, base + v);
}

// ---- Daily challenges ----

export const DAILY_REWARDS = { easy: 100, medium: 200, hard: 300, allThree: 250 };

interface Template {
  type: GoalType;
  scope: Scope;
  targets: [number, number, number]; // easy, medium, hard
  ascendedOnly?: boolean;
}

const DAILY_POOL: Template[] = [
  { type: 'coins', scope: 'total', targets: [300, 700, 1500] },
  { type: 'coins', scope: 'run', targets: [100, 200, 350] },
  { type: 'distance', scope: 'run', targets: [600, 1200, 2500] },
  { type: 'distance', scope: 'total', targets: [2000, 5000, 10000] },
  { type: 'souls', scope: 'total', targets: [3, 6, 12] },
  { type: 'resisted', scope: 'total', targets: [3, 6, 10] },
  { type: 'jumps', scope: 'total', targets: [30, 60, 120] },
  { type: 'slides', scope: 'total', targets: [20, 40, 80] },
  { type: 'clean', scope: 'run', targets: [400, 800, 1500] },
  { type: 'miracles', scope: 'total', targets: [1, 2, 4] },
  { type: 'stage', scope: 'run', targets: [1, 3, 5] },
  { type: 'multiplier', scope: 'run', targets: [3, 4, 5], ascendedOnly: true },
  { type: 'abilities', scope: 'total', targets: [2, 4, 8], ascendedOnly: true },
];

/** Today's 3 challenges: one easy, one medium, one hard, the same for everyone on that day. */
export function dailyChallenges(day: number, ascended: boolean): { goal: Goal; reward: number }[] {
  const rng = new Rng(day * 2654435761);
  const pool = DAILY_POOL.filter((t) => ascended || !t.ascendedOnly);
  const picked: Template[] = [];
  while (picked.length < 3) {
    const t = rng.pick(pool);
    if (!picked.some((p) => p.type === t.type)) picked.push(t);
  }
  const rewards = [DAILY_REWARDS.easy, DAILY_REWARDS.medium, DAILY_REWARDS.hard];
  return picked.map((t, i) => ({ goal: { type: t.type, scope: t.scope, target: t.targets[i] }, reward: rewards[i] }));
}

// ---- Missions (levels) ----

/** Exclusive cosmetics earned at mission levels (shop item ids). */
export const MISSION_UNLOCKS: { level: number; item: string }[] = [
  { level: 5, item: 'halotrail' },
  { level: 10, item: 'seraphwings' },
  { level: 15, item: 'saintrobe' },
  { level: 20, item: 'eternitywings' },
];

/** Coins for finishing a mission level. */
export const missionReward = (level: number): number => level * 100;

interface MissionTemplate { type: GoalType; scope: Scope; base: number; step: number; max?: number }

/** A mission goal's target at a given level (rounded to friendly numbers). */
export function missionTarget(m: MissionTemplate, level: number): number {
  const raw = m.base + m.step * (level - 1);
  const rounded = m.type === 'god' ? Math.floor(raw) : raw >= 100 ? Math.round(raw / 10) * 10 : Math.round(raw);
  return Math.max(1, Math.min(m.max ?? Infinity, rounded));
}

export const MISSION_POOL: MissionTemplate[] = [
  { type: 'coins', scope: 'total', base: 300, step: 150 },
  { type: 'coins', scope: 'run', base: 80, step: 25 },
  { type: 'distance', scope: 'run', base: 500, step: 200 },
  { type: 'distance', scope: 'total', base: 2000, step: 1000 },
  { type: 'souls', scope: 'total', base: 3, step: 2 },
  { type: 'resisted', scope: 'total', base: 3, step: 2 },
  { type: 'jumps', scope: 'total', base: 25, step: 15 },
  { type: 'slides', scope: 'total', base: 20, step: 10 },
  { type: 'clean', scope: 'run', base: 300, step: 120 },
  { type: 'miracles', scope: 'total', base: 1, step: 1 },
  { type: 'stage', scope: 'run', base: 1, step: 1, max: 6 },
  { type: 'god', scope: 'total', base: 1, step: 0.34 },
];

/** The 3 goals for a mission level (gets harder each level; same for everyone). */
export function missionGoals(level: number): Goal[] {
  const rng = new Rng(level * 40503 + 7);
  const picked: Goal[] = [];
  const pool = MISSION_POOL.filter((m) => m.type !== 'god' || level >= 6);
  while (picked.length < 3) {
    const m = rng.pick(pool);
    if (picked.some((p) => p.type === m.type)) continue;
    picked.push({ type: m.type, scope: m.scope, target: missionTarget(m, level) });
  }
  return picked;
}
