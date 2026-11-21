import { CONFIG } from '../core/config';
import { Rng } from '../core/rng';
import type { ObstacleData, ObstacleKind } from './obstacles';

export interface CoinData {
  id: number;
  lane: number;
  z: number;
  y: number;
  taken: boolean;
}

const K: Record<string, ObstacleKind | null> = { ' ': null, L: 'low', H: 'high', W: 'wall', V: 'lava' };

/** Obstacle rows, one character per lane. Grouped by difficulty tier. Every row leaves at least one lane without a wall. */
export const PATTERNS: string[][] = [
  ['W  ', ' W ', '  W', 'L  ', ' L ', '  L', 'H  ', ' H ', '  H', 'LLL', 'V  ', ' V '],
  ['WW ', 'W W', ' WW', 'HHH', 'VVV', 'WL ', 'LW ', ' HW', 'W H', 'LHL', 'HLH', 'WV ', ' VW'],
  ['WWL', 'LWW', 'WHW', 'WVW', 'HWH', 'VWV', 'WWH', 'HWW', 'VLV', 'WWV', 'VWW'],
];

/** 0 at the start, rising to 1 as the run goes on. */
export function difficultyAt(distance: number): number {
  return Math.min(1, Math.max(0, (distance - CONFIG.track.safeStart) / 1500));
}

/**
 * Builds the course ahead of the player: rows of obstacles and trails of coins.
 * Uses a seed, so each run is different (Decisions log #3) but tests are repeatable.
 */
export class TrackGenerator {
  private rng: Rng;
  private nextRowZ: number;
  private nextId = 1;

  constructor(seed: number) {
    this.rng = new Rng(seed);
    this.nextRowZ = CONFIG.track.safeStart;
  }

  /** Create everything up to `untilZ`. Call every frame; it only adds what's missing. */
  generate(untilZ: number, speed: number): { obstacles: ObstacleData[]; coins: CoinData[] } {
    const obstacles: ObstacleData[] = [];
    const coins: CoinData[] = [];
    while (this.nextRowZ < untilZ) {
      const z = this.nextRowZ;
      const row = this.pickPattern(difficultyAt(z));
      const freeLanes: number[] = [];
      for (let lane = 0; lane < 3; lane++) {
        const kind = K[row[lane]];
        if (kind) obstacles.push({ id: this.nextId++, kind, lane, z, hit: false });
        if (row[lane] !== 'W') freeLanes.push(lane);
      }
      const gap = this.rowGap(z, speed);
      // coin trail leading into a lane you can get through
      if (this.rng.chance(0.7)) {
        const lane = this.rng.pick(freeLanes);
        const kind = K[row[lane]];
        const start = z - gap + 4;
        const end = kind ? z - 3 : z + 2;
        for (let cz = start; cz <= end; cz += CONFIG.coins.spacing) {
          coins.push({ id: this.nextId++, lane, z: cz, y: 1, taken: false });
        }
        // little arc of coins over a jump obstacle
        if (kind === 'low' || kind === 'lava') {
          for (const [dz, y] of [[-1.5, 2.0], [0, 2.4], [1.5, 2.0]] as const) {
            coins.push({ id: this.nextId++, lane, z: z + dz, y, taken: false });
          }
        }
      }
      this.nextRowZ += gap;
    }
    return { obstacles, coins };
  }

  private pickPattern(difficulty: number): string {
    const maxTier = difficulty < 0.12 ? 0 : difficulty < 0.45 ? 1 : 2;
    // lean towards the hardest unlocked tier as difficulty grows
    let tier = this.rng.int(0, maxTier);
    if (maxTier > 0 && this.rng.chance(difficulty * 0.5)) tier = maxTier;
    const p = this.rng.pick(PATTERNS[tier]);
    return this.rng.chance(0.5) ? p.split('').reverse().join('') : p;
  }

  private rowGap(z: number, speed: number): number {
    const d = difficultyAt(z);
    const { minRowGapSeconds: mn, maxRowGapSeconds: mx, minRowGapMetres } = CONFIG.track;
    const maxSecs = mx - (mx - mn) * d * 0.7;
    const secs = this.rng.range(Math.max(mn, maxSecs - 0.5), maxSecs);
    return Math.max(minRowGapMetres, secs * Math.max(speed, CONFIG.run.startSpeed));
  }
}
