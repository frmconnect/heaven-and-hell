import { CONFIG, laneX } from './config';
import { DevilChase } from '../enemies/DevilChase';
import { PlayerMotion, type Action } from '../player/PlayerMotion';
import { ScoreManager } from '../systems/ScoreManager';
import { SinGrace, type MoralRecord } from '../systems/SinGrace';
import { TrackGenerator, type CoinData, type PickupData } from '../world/TrackGenerator';
import { devilGivesUpAt, groundHeight, JOURNEY_LENGTH, STAGES, stageAt, stageIndexAt, type StageDef } from '../world/journey';
import { overlaps, resolveHit, type ObstacleData } from '../world/obstacles';

export type EndReason = 'crash' | 'fall' | 'caught';
export type Chaser = 'devil' | 'shadow';

export type RunEvent =
  | { type: 'coin'; coin: CoinData }
  | { type: 'stumble' }
  | { type: 'scrape' }
  | { type: 'stage'; stage: StageDef; from: StageDef }
  | { type: 'devilGivesUp' } // the Devil falls back and the Shadow of your sins takes over
  | { type: 'checkpoint' }
  | { type: 'levelComplete'; stage: StageDef; bonus: number }
  | { type: 'journeyComplete' }
  | { type: 'soulHelped'; pickup: PickupData }
  | { type: 'soulLost' }
  | { type: 'temptationTaken'; pickup: PickupData; coins: number }
  | { type: 'resisted' }
  | { type: 'miracle'; pickup: PickupData }
  | { type: 'shieldUsed' }
  | { type: 'end'; reason: EndReason };

export interface RunStart {
  distance?: number; // start further along (checkpoint)
  coins?: number;
  bonus?: number; // score carried over from before the checkpoint
  record?: MoralRecord; // Sin/Grace from before the checkpoint
}

/** Score bonus for finishing a heavenly level. */
export const LEVEL_BONUS = 500;

/**
 * The rules of one run, with no graphics: movement, speed, obstacles, coins, the Devil,
 * and progress through the journey (Hell → Stairway → Gate → heavenly levels → God).
 * `devil` holds the chase distance for whoever is chasing (see `chaser`).
 * The 3D renderer just draws whatever this says.
 */
export class RunSession {
  readonly motion = new PlayerMotion();
  readonly devil = new DevilChase();
  readonly score = new ScoreManager();
  obstacles: ObstacleData[] = [];
  coins: CoinData[] = [];
  pickups: PickupData[] = [];
  readonly moral: SinGrace;
  /** Miracle Shield: absorbs one hit (Decisions log #18). */
  shield = false;
  private safeTimer = 0;
  speed: number = CONFIG.run.startSpeed;
  ended: EndReason | null = null;
  completed = false;
  /** Who is chasing you: the Devil (Hell, lower Stairway) or the Shadow of your sins (after that). */
  chaser: Chaser = 'devil';
  time = 0;
  stageIndex: number;
  private gen: TrackGenerator;
  private stumbleTimer = 0;
  private events: RunEvent[] = [];

  constructor(readonly seed: number, start: RunStart = {}) {
    const d = start.distance ?? 0;
    this.score.distance = d;
    this.score.coins = start.coins ?? 0;
    this.score.bonus = start.bonus ?? 0;
    this.gen = new TrackGenerator(seed, d);
    this.moral = new SinGrace(start.record);
    this.stageIndex = stageIndexAt(d);
    if (d >= devilGivesUpAt()) {
      this.chaser = 'shadow';
      this.devil.gap = CONFIG.devil.maxGap;
    }
  }

  get distance(): number {
    return this.score.distance;
  }
  get stage(): StageDef {
    return stageAt(this.distance);
  }
  /** Height of the ground under the player (the stairs climb). */
  get ground(): number {
    return groundHeight(this.distance);
  }
  /** Is the run finished in any way (crashed or reached God)? */
  get over(): boolean {
    return this.ended !== null || this.completed;
  }

  act(a: Action): void {
    if (!this.over) this.motion.apply(a);
  }

  /** Events since the last call (coins picked up, stumbles, stage changes, end of run). */
  drainEvents(): RunEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  update(dt: number): void {
    if (this.over) return;
    this.time += dt;

    const base = Math.min(CONFIG.run.maxSpeed, CONFIG.run.startSpeed + CONFIG.run.speedGainPerMetre * this.distance);
    let mult = 1;
    if (this.stumbleTimer > 0) {
      this.stumbleTimer = Math.max(0, this.stumbleTimer - dt);
      const t = 1 - this.stumbleTimer / CONFIG.run.stumbleRecoverTime;
      mult = CONFIG.run.stumbleSlowdown + (1 - CONFIG.run.stumbleSlowdown) * t;
    }
    this.speed = base * mult;
    this.score.addDistance(this.speed * dt);
    this.motion.update(dt);
    this.devil.update(dt);

    this.checkProgress();
    if (this.over) return;

    const made = this.gen.generate(this.distance + CONFIG.track.viewAhead, this.speed);
    if (made.obstacles.length) this.obstacles.push(...made.obstacles);
    if (made.coins.length) this.coins.push(...made.coins);
    if (made.pickups.length) this.pickups.push(...made.pickups);
    if (this.safeTimer > 0) this.safeTimer = Math.max(0, this.safeTimer - dt);

    this.checkObstacles();
    this.checkCoins();
    this.checkPickups();

    const behind = this.distance - CONFIG.track.cleanupBehind;
    this.obstacles = this.obstacles.filter((o) => o.z + (o.length ?? 0) / 2 > behind);
    this.coins = this.coins.filter((c) => c.z > behind && !c.taken);
    this.pickups = this.pickups.filter((p) => p.z > behind && !(p.taken && p.resolved));
  }

  /** Is the player shielded (halo) or briefly safe right after the shield broke? */
  get protectedNow(): boolean {
    return this.shield || this.safeTimer > 0;
  }

  private checkPickups(): void {
    const m = this.motion;
    const feet = this.ground + m.y;
    const r2 = CONFIG.moral.pickupRadius ** 2;
    for (const p of this.pickups) {
      if (p.resolved) continue;
      const dz = p.z - this.distance;
      if (dz < -1.5) {
        // passed it by
        p.resolved = true;
        if (p.kind === 'soul') {
          this.moral.missSoul();
          this.events.push({ type: 'soulLost' });
        } else if (p.kind === 'temptation') {
          this.moral.resist();
          this.events.push({ type: 'resisted' });
        }
        continue;
      }
      if (dz > 2) continue;
      const dx = m.x - laneX(p.lane);
      const dy = groundHeight(p.z) + p.y + 0.9 - (feet + m.height * 0.5);
      if (dx * dx + dz * dz + dy * dy * 0.3 >= r2) continue;
      p.taken = p.resolved = true;
      if (p.kind === 'soul') {
        this.moral.helpSoul();
        this.events.push({ type: 'soulHelped', pickup: p });
      } else if (p.kind === 'temptation') {
        this.moral.takeTemptation();
        this.score.coins += CONFIG.moral.temptationCoins;
        this.events.push({ type: 'temptationTaken', pickup: p, coins: CONFIG.moral.temptationCoins });
      } else {
        this.moral.miracle();
        this.shield = true;
        this.events.push({ type: 'miracle', pickup: p });
      }
    }
  }

  private checkProgress(): void {
    const d = this.distance;
    if (this.chaser === 'devil' && d >= devilGivesUpAt()) {
      // the Shadow rises far behind you (Decisions log #14)
      this.chaser = 'shadow';
      this.devil.gap = CONFIG.devil.maxGap;
      this.events.push({ type: 'devilGivesUp' });
    }
    const idx = stageIndexAt(Math.min(d, JOURNEY_LENGTH - 0.01));
    while (this.stageIndex < idx) {
      const prev = stageAtIndex(this.stageIndex);
      this.stageIndex++;
      const next = stageAtIndex(this.stageIndex);
      if (prev.level) this.finishLevel(prev);
      if (next.id === 'gardens') this.events.push({ type: 'checkpoint' });
      this.events.push({ type: 'stage', stage: next, from: prev });
    }
    if (d >= JOURNEY_LENGTH) {
      const last = stageAtIndex(this.stageIndex);
      if (last.level) this.finishLevel(last);
      this.completed = true;
      this.events.push({ type: 'journeyComplete' });
    }
  }

  private finishLevel(stage: StageDef): void {
    this.score.bonus += LEVEL_BONUS;
    this.events.push({ type: 'levelComplete', stage, bonus: LEVEL_BONUS });
  }

  private checkObstacles(): void {
    const m = this.motion;
    const feet = this.ground + m.y;
    for (const o of this.obstacles) {
      // measure the player's height from the obstacle's own ground (matters on the stairs)
      const box = { x: m.x, y: feet - groundHeight(o.z), z: this.distance, height: m.height };
      if (o.hit || !overlaps(box, o)) continue;
      o.hit = true;
      // the Miracle Shield absorbs one hit of any kind, then you're safe for a moment
      if (this.safeTimer > 0) continue;
      if (this.shield) {
        this.shield = false;
        this.safeTimer = CONFIG.moral.shieldInvulnerable;
        this.events.push({ type: 'shieldUsed' });
        continue;
      }
      const result = resolveHit(o, m.changingLane && o.lane === m.lane);
      if (result === 'crash' || result === 'fall') {
        this.devil.catchNow();
        return this.end(result);
      }
      if (result === 'scrape') {
        m.bounceBack();
        this.events.push({ type: 'scrape' });
      }
      this.events.push({ type: 'stumble' });
      this.stumbleTimer = CONFIG.run.stumbleRecoverTime;
      // the Devil (or the Shadow) closes in; two stumbles close together and you're caught
      if (this.devil.stumble()) return this.end('caught');
    }
  }

  private checkCoins(): void {
    const m = this.motion;
    const r2 = CONFIG.coins.pickupRadius ** 2;
    const feet = this.ground + m.y;
    for (const c of this.coins) {
      if (c.taken) continue;
      const dz = c.z - this.distance;
      if (dz > 2 || dz < -2) continue;
      const dx = m.x - laneX(c.lane);
      const dy = groundHeight(c.z) + c.y - (feet + m.height * 0.5);
      if (dx * dx + dy * dy + dz * dz < r2 * 1.6) {
        c.taken = true;
        this.score.addCoin();
        this.events.push({ type: 'coin', coin: c });
      }
    }
  }

  private end(reason: EndReason): void {
    this.ended = reason;
    this.events.push({ type: 'end', reason });
  }
}

const stageAtIndex = (i: number): StageDef => STAGES[i];
