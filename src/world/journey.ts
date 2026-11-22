import { GameState } from '../core/GameStateManager';

/** The look of a stretch of track. */
export type ThemeId = 'hell' | 'stairway' | 'gate' | 'gardens' | 'bridges' | 'kingdom' | 'god' | 'cosmic';

export interface StageDef {
  id: ThemeId;
  name: string;
  length: number; // metres
  state: GameState; // which game state the player is in during this stage
  slope: number; // metres climbed per metre run (stairs)
  obstacles: boolean;
  /** 0..1 difficulty for this stage (mixed with progress through it) */
  difficulty: [number, number];
  level?: number; // heavenly level number
}

/**
 * The whole journey to God, in order (Decisions log #4, #6, #10).
 * All lengths are tunable here.
 */
export const STAGES: StageDef[] = [
  { id: 'hell', name: 'Hell', length: 2000, state: GameState.HellRun, slope: 0, obstacles: true, difficulty: [0, 0.55] },
  { id: 'stairway', name: 'The Stairway to Heaven', length: 2000, state: GameState.HeavenAscent, slope: 0.22, obstacles: true, difficulty: [0.35, 0.7] },
  { id: 'gate', name: "Heaven's Gate", length: 90, state: GameState.HeavenAscent, slope: 0, obstacles: false, difficulty: [0, 0] },
  { id: 'gardens', name: 'The Heavenly Gardens', length: 2500, state: GameState.HeavenLevel, slope: 0, obstacles: true, difficulty: [0.45, 0.75], level: 1 },
  { id: 'bridges', name: 'The Celestial Bridges', length: 2500, state: GameState.HeavenLevel, slope: 0.03, obstacles: true, difficulty: [0.55, 0.85], level: 2 },
  { id: 'kingdom', name: 'The Golden Kingdom', length: 2500, state: GameState.HeavenLevel, slope: 0, obstacles: true, difficulty: [0.7, 1], level: 3 },
  // you run into God's light; judgment begins at the end (Decisions log #5)
  { id: 'god', name: 'The Light of God', length: 160, state: GameState.HeavenLevel, slope: 0, obstacles: false, difficulty: [0, 0] },
];

/** How far up the stairs the Devil follows before giving up (Decisions log #11). */
export const DEVIL_GIVES_UP_AFTER_STAIRS = 650;
/** Obstacle-free stretch at the start of each stage, and before the Gate. */
export const QUIET_START = 45;
export const QUIET_END = 60;

const starts: number[] = [];
const heights: number[] = [];
{
  let z = 0;
  let h = 0;
  for (const s of STAGES) {
    starts.push(z);
    heights.push(h);
    z += s.length;
    h += s.length * s.slope;
  }
}

export const JOURNEY_LENGTH = STAGES.reduce((a, s) => a + s.length, 0);

export function stageIndexAt(z: number): number {
  for (let i = STAGES.length - 1; i >= 0; i--) if (z >= starts[i]) return i;
  return 0;
}

export function stageAt(z: number): StageDef {
  return STAGES[stageIndexAt(z)];
}

export function stageStart(id: ThemeId): number {
  return starts[STAGES.findIndex((s) => s.id === id)];
}

export function stageEnd(id: ThemeId): number {
  const i = STAGES.findIndex((s) => s.id === id);
  return starts[i] + STAGES[i].length;
}

/** Ground height at a point on the track (the stairs climb; everything else is flat or gentle). */
export function groundHeight(z: number): number {
  if (z <= 0) return 0;
  const i = stageIndexAt(z);
  return heights[i] + (Math.min(z, starts[i] + STAGES[i].length) - starts[i]) * STAGES[i].slope;
}

/** Can obstacles appear at this point? */
export function obstaclesAllowed(z: number): boolean {
  const i = stageIndexAt(z);
  const s = STAGES[i];
  if (!s.obstacles || z >= JOURNEY_LENGTH) return false;
  const into = z - starts[i];
  return into >= QUIET_START && into <= s.length - QUIET_END;
}

/** Difficulty 0..1 at a point: rises through each stage, and stages get harder. */
export function difficultyAt(z: number): number {
  const i = stageIndexAt(z);
  const s = STAGES[i];
  const t = Math.min(1, Math.max(0, (z - starts[i]) / s.length));
  return s.difficulty[0] + (s.difficulty[1] - s.difficulty[0]) * t;
}

/** 0..1 how far along the whole journey. */
export function journeyProgress(z: number): number {
  return Math.min(1, Math.max(0, z / JOURNEY_LENGTH));
}

export function devilGivesUpAt(): number {
  return stageStart('stairway') + DEVIL_GIVES_UP_AFTER_STAIRS;
}
