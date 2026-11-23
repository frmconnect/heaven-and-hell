import { CONFIG } from '../core/config';
import { Rng } from '../core/rng';
import { difficultyAt, type ThemeId } from './journey';
import { JOURNEY_MAP, type WorldMap } from './worldMap';
import type { ObstacleData, ObstacleKind } from './obstacles';

export interface CoinData {
  id: number;
  lane: number;
  z: number;
  y: number; // height above the coin's own ground
  taken: boolean;
}

/** Lost soul (help it = Grace), temptation (take it = Sin, pass it = Grace), Miracle Shield. */
export type PickupKind = 'soul' | 'temptation' | 'miracle';

export interface PickupData {
  id: number;
  kind: PickupKind;
  lane: number;
  z: number;
  y: number;
  taken: boolean;
  resolved: boolean; // counted (helped / missed / taken / resisted)
  drift?: boolean; // temptation that slides into the player's lane
  drifted?: boolean;
  gauntlet?: boolean; // temptation in the only open lane (jump over it)
}

const K: Record<string, ObstacleKind | null> = { ' ': null, L: 'low', H: 'high', W: 'wall', V: 'pit' };

/** Obstacle rows, one character per lane. Grouped by difficulty tier. Every row leaves at least one lane without a wall. */
export const PATTERNS: string[][] = [
  ['W  ', ' W ', '  W', 'L  ', ' L ', '  L', 'H  ', ' H ', '  H', 'LLL', 'V  ', ' V '],
  ['WW ', 'W W', ' WW', 'HHH', 'VVV', 'WL ', 'LW ', ' HW', 'W H', 'LHL', 'HLH', 'WV ', ' VW'],
  ['WWL', 'LWW', 'WHW', 'WVW', 'HWH', 'VWV', 'WWH', 'HWW', 'VLV', 'WWV', 'VWW'],
];

/** The Stairway has extra broken-step gaps (Decisions log #13). */
const STAIR_EXTRA = ['V  ', ' V ', '  V', 'VV ', ' VV', 'V V', 'VVV'];

export { difficultyAt };

/** Ids are unique across runs, so a restarted run never reuses an old obstacle's mesh. */
let NEXT_ID = 1;

/**
 * Builds the course ahead of the player: rows of obstacles and trails of coins.
 * It follows the journey map: each stage has its own mix, quiet stretches near stage changes,
 * and nothing after the end of the journey.
 * Uses a seed, so each run is different (Decisions log #3) but tests are repeatable.
 */
export class TrackGenerator {
  private rng: Rng;
  private nextRowZ: number;
  private lastRowZ = -1e9;
  private nextEncounterZ: number;
  private nextMiracleZ: number;

  constructor(seed: number, startZ = 0, private map: WorldMap = JOURNEY_MAP) {
    this.rng = new Rng(seed);
    this.nextRowZ = startZ + CONFIG.track.safeStart;
    this.nextEncounterZ = startZ + this.rng.range(120, 220);
    this.nextMiracleZ = startZ + this.rng.range(500, 900);
  }

  /** Create everything up to `untilZ`. Call every frame; it only adds what's missing. */
  generate(untilZ: number, speed: number): { obstacles: ObstacleData[]; coins: CoinData[]; pickups: PickupData[] } {
    const obstacles: ObstacleData[] = [];
    const coins: CoinData[] = [];
    const pickups: PickupData[] = [];
    const map = this.map;
    const limit = Math.min(untilZ, map.end);
    while (this.nextRowZ < limit) {
      const z = this.nextRowZ;
      if (!map.obstaclesAllowed(z)) {
        // quiet stretch: just a few coins down the middle
        if (this.rng.chance(0.25)) for (let k = 0; k < 5; k++) coins.push(this.coin(1, z + k * CONFIG.coins.spacing, 1));
        this.nextRowZ += 12;
        this.lastRowZ = -1e9;
        continue;
      }
      const stage = map.stageAt(z);
      const gap = this.rowGap(z, speed);
      if (stage.id === 'bridges' && this.rng.chance(0.28)) {
        this.nextRowZ += this.narrowPath(z, gap, obstacles, coins);
        this.lastRowZ = -1e9;
        continue;
      }
      // temptation gauntlet: walls in two lanes, cursed gold in the only open one (Decisions log #41)
      if (map.moral && z >= this.nextEncounterZ && this.lastRowZ > -1e8 && z - this.lastRowZ >= 11 && map.difficultyAt(z) > 0.08 && this.rng.chance(CONFIG.moral.gauntletChance)) {
        const m = CONFIG.moral;
        this.nextEncounterZ = z + this.rng.range(m.encounterEvery[0], m.encounterEvery[1]);
        const free = this.rng.int(0, 2);
        for (let lane = 0; lane < 3; lane++) if (lane !== free) obstacles.push({ id: NEXT_ID++, kind: 'wall', lane, z, hit: false, theme: stage.id });
        pickups.push({ id: NEXT_ID++, kind: 'temptation', lane: free, z, y: 0, taken: false, resolved: false, gauntlet: true });
        this.lure(free, this.lastRowZ + 4, z - 2, coins);
        this.lastRowZ = z;
        this.nextRowZ += gap;
        continue;
      }
      const row = this.pickPattern(map.difficultyAt(z), stage.id);
      const freeLanes: number[] = [];
      for (let lane = 0; lane < 3; lane++) {
        const kind = K[row[lane]];
        if (kind) obstacles.push({ id: NEXT_ID++, kind, lane, z, hit: false, theme: stage.id });
        if (row[lane] !== 'W') freeLanes.push(lane);
      }
      // coin trail leading into a lane you can get through
      if (this.rng.chance(0.7)) {
        const lane = this.rng.pick(freeLanes);
        const kind = K[row[lane]];
        const end = kind ? z - 3 : z + 2;
        for (let cz = z - gap + 4; cz <= end; cz += CONFIG.coins.spacing) coins.push(this.coin(lane, cz, 1));
        // little arc of coins over a jump obstacle
        if (kind === 'low' || kind === 'pit') {
          for (const [dz, y] of [[-1.5, 2.0], [0, 2.4], [1.5, 2.0]] as const) coins.push(this.coin(lane, z + dz, y));
        }
      }
      this.placePickups(z, row, pickups);
      if (this.lureCoins.length) {
        coins.push(...this.lureCoins);
        this.lureCoins = [];
      }
      this.lastRowZ = z;
      this.nextRowZ += gap;
    }
    return { obstacles, coins, pickups };
  }

  /**
   * Souls, temptations and Miracles go in the clear space before this obstacle row.
   * A temptation is put on the riskier path: right in front of an obstacle you must jump or slide.
   */
  private placePickups(z: number, row: string, out: PickupData[]): void {
    const prev = this.lastRowZ;
    if (z - prev < 11 || z - prev > 45) return;
    const mid = (prev + z) / 2;
    const add = (kind: PickupKind, lane: number, pz: number, y = 0) =>
      out.push({ id: NEXT_ID++, kind, lane, z: pz, y, taken: false, resolved: false });
    if (this.map.moral && z >= this.nextEncounterZ) {
      const m = CONFIG.moral;
      this.nextEncounterZ = z + this.rng.range(m.encounterEvery[0], m.encounterEvery[1]);
      if (this.rng.chance(m.temptationChance)) {
        const risky = [0, 1, 2].filter((l) => row[l] === 'L' || row[l] === 'H' || row[l] === 'V');
        const lane = risky.length ? this.rng.pick(risky) : this.rng.int(0, 2);
        const pz = risky.length ? z - 4.5 : mid;
        add('temptation', lane, pz);
        // a trail of coins leads straight into it: skipping the gold means skipping the coins
        this.lure(lane, Math.max(prev + 3, pz - 11), pz - 1.6, this.lureCoins);
        const t = out[out.length - 1];
        if (this.map.difficultyAt(z) > 0.1 && this.rng.chance(m.driftChance)) t.drift = true;
      } else {
        add('soul', this.rng.int(0, 2), mid);
      }
      return;
    }
    if (z >= this.nextMiracleZ) {
      const m = CONFIG.moral;
      this.nextMiracleZ = z + this.rng.range(m.miracleEvery[0], m.miracleEvery[1]);
      add('miracle', this.rng.int(0, 2), mid, 0.4);
    }
  }

  /** Coins found by placePickups (it runs inside generate, which collects them). */
  private lureCoins: CoinData[] = [];

  /** A trail of normal coins leading into a temptation. */
  private lure(lane: number, from: number, to: number, out: CoinData[]): void {
    for (let cz = from; cz <= to; cz += CONFIG.coins.spacing) out.push(this.coin(lane, cz, 1));
  }

  private coin(lane: number, z: number, y: number): CoinData {
    return { id: NEXT_ID++, lane, z, y, taken: false };
  }

  /**
   * Celestial Bridges: the path narrows. Two lanes fall away into the clouds for a stretch,
   * leaving one safe lane. Returns how far to move on.
   */
  private narrowPath(z: number, gap: number, obstacles: ObstacleData[], coins: CoinData[]): number {
    const length = this.rng.range(12, 22);
    const safe = this.rng.int(0, 2);
    const centre = z + length / 2;
    for (let lane = 0; lane < 3; lane++) {
      if (lane !== safe) obstacles.push({ id: NEXT_ID++, kind: 'pit', lane, z: centre, hit: false, theme: 'bridges', length });
    }
    for (let cz = z - gap + 4; cz <= z + length; cz += CONFIG.coins.spacing) coins.push(this.coin(safe, cz, 1));
    return length + gap;
  }

  private pickPattern(difficulty: number, theme: ThemeId): string {
    const maxTier = difficulty < 0.12 ? 0 : difficulty < 0.45 ? 1 : 2;
    let p: string;
    if (theme === 'stairway' && this.rng.chance(0.3)) {
      p = this.rng.pick(STAIR_EXTRA);
      // never a full gap row early on
      if (p === 'VVV' && difficulty < 0.5) p = ' V ';
    } else {
      // lean towards the hardest unlocked tier as difficulty grows
      let tier = this.rng.int(0, maxTier);
      if (maxTier > 0 && this.rng.chance(difficulty * 0.5)) tier = maxTier;
      p = this.rng.pick(PATTERNS[tier]);
    }
    return this.rng.chance(0.5) ? p.split('').reverse().join('') : p;
  }

  private rowGap(z: number, speed: number): number {
    const d = this.map.difficultyAt(z);
    const { minRowGapSeconds: mn, maxRowGapSeconds: mx, minRowGapMetres } = CONFIG.track;
    const maxSecs = mx - (mx - mn) * d * 0.7;
    const secs = this.rng.range(Math.max(mn, maxSecs - 0.5), Math.max(mn, maxSecs));
    return Math.max(minRowGapMetres, secs * Math.max(speed, CONFIG.run.startSpeed));
  }
}
