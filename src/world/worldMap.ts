import { GameState } from '../core/GameStateManager';
import {
  devilGivesUpAt, difficultyAt, groundHeight, JOURNEY_LENGTH, journeyProgress, obstaclesAllowed,
  STAGES, stageAt, stageIndexAt, stageStart, type StageDef,
} from './journey';
import { GATE_Z } from './gateZ';

/**
 * A map of the track: which world you're in at each distance, how high the ground is, where obstacles may go.
 * The journey (Hell → God) is one map; the endless Ascended State is another.
 */
export interface WorldMap {
  kind: 'journey' | 'ascended';
  end: number; // Infinity for endless
  stageAt(z: number): StageDef;
  stageIndexAt(z: number): number;
  stageStartAt(z: number): number;
  prevStageAt(z: number): StageDef;
  ground(z: number): number;
  obstaclesAllowed(z: number): boolean;
  difficultyAt(z: number): number;
  progress(z: number): number;
  gateZ: number | null;
  devilGivesUpAt: number;
  moral: boolean; // souls & temptations appear (journey only)
}

export const JOURNEY_MAP: WorldMap = {
  kind: 'journey',
  end: JOURNEY_LENGTH,
  stageAt,
  stageIndexAt,
  stageStartAt: (z) => stageStart(stageAt(z).id),
  prevStageAt: (z) => STAGES[Math.max(0, stageIndexAt(z) - 1)],
  ground: groundHeight,
  obstaclesAllowed,
  difficultyAt,
  progress: journeyProgress,
  gateZ: GATE_Z,
  devilGivesUpAt: devilGivesUpAt(),
  moral: true,
};

/** Ascended worlds rotate every this many metres (Decisions log #23). */
export const ASCENDED_SEGMENT = 1500;

export const ASCENDED_WORLDS: StageDef[] = [
  { id: 'kingdom', name: 'The Golden Clouds', length: ASCENDED_SEGMENT, state: GameState.AscendedRun, slope: 0, obstacles: true, difficulty: [0, 0] },
  { id: 'gardens', name: 'The Celestial Gardens', length: ASCENDED_SEGMENT, state: GameState.AscendedRun, slope: 0, obstacles: true, difficulty: [0, 0] },
  { id: 'bridges', name: 'The Crystal Bridges', length: ASCENDED_SEGMENT, state: GameState.AscendedRun, slope: 0, obstacles: true, difficulty: [0, 0] },
  { id: 'cosmic', name: 'The Cosmic Heavens', length: ASCENDED_SEGMENT, state: GameState.AscendedRun, slope: 0, obstacles: true, difficulty: [0, 0] },
];

const segIndex = (z: number) => Math.max(0, Math.floor(z / ASCENDED_SEGMENT));

/** The endless Ascended State: flat, rotating worlds, difficulty keeps climbing. */
export const ASCENDED_MAP: WorldMap = {
  kind: 'ascended',
  end: Infinity,
  stageAt: (z) => ASCENDED_WORLDS[segIndex(z) % ASCENDED_WORLDS.length],
  stageIndexAt: segIndex,
  stageStartAt: (z) => segIndex(z) * ASCENDED_SEGMENT,
  prevStageAt: (z) => ASCENDED_WORLDS[Math.max(0, segIndex(z) - 1) % ASCENDED_WORLDS.length],
  ground: () => 0,
  obstaclesAllowed: (z) => z >= 40,
  // starts where the journey ends and keeps getting harder (gaps keep shrinking down to the minimum)
  difficultyAt: (z) => Math.min(1.4, 0.55 + z / 7000),
  progress: () => 0,
  gateZ: null,
  devilGivesUpAt: -1,
  moral: false,
};
