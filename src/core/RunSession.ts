import { CONFIG, laneX } from './config';
import { DevilChase } from '../enemies/DevilChase';
import { PlayerMotion, type Action } from '../player/PlayerMotion';
import { AbilitySystem, type AbilityId } from '../systems/Abilities';
import { ScoreManager } from '../systems/ScoreManager';
import { SinGrace, type MoralRecord } from '../systems/SinGrace';
import { TrackGenerator, type CoinData, type PickupData } from '../world/TrackGenerator';
import type { StageDef } from '../world/journey';
import { overlaps, resolveHit, type ObstacleData } from '../world/obstacles';
import { JOURNEY_MAP, type WorldMap } from '../world/worldMap';

export type EndReason = 'crash' | 'fall' | 'caught';
/** devil / shadow chase you on the journey; 'none' in the Ascended State (your halo of light instead). */
export type Chaser = 'devil' | 'shadow' | 'none';

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
  | { type: 'multiplier'; value: number }
  | { type: 'abilityReady' }
  | { type: 'abilityStart'; id: AbilityId }
  | { type: 'abilityEnd'; id: AbilityId }
  | { type: 'end'; reason: EndReason };

export interface RunStart {
  distance?: number; // start further along (checkpoint)
  coins?: number;
  bonus?: number; // score carried over from before the checkpoint
  record?: MoralRecord; // Sin/Grace from before the checkpoint
  ability?: AbilityId; // Ascended State: the ability you brought
}

/** Score bonus for finishing a heavenly level. */
export const LEVEL_BONUS = 500;

/**
 * The rules of one run, with no graphics: movement, speed, obstacles, coins, the chase,
 * and progress along a map — the journey (Hell → God) or the endless Ascended State.
 * `devil` holds the chase distance for whoever is chasing (see `chaser`); in the Ascended State
 * it is your halo of light instead (3 stumbles close together and it goes out).
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
  /** Ascended State only: the ability button. */
  readonly ability: AbilitySystem | null;
  /** Miracle Shield: absorbs one hit (Decisions log #18). */
  shield = false;
  private safeTimer = 0;
  speed: number;
  ended: EndReason | null = null;
  completed = false;
  /** Who is chasing you. */
  chaser: Chaser = 'devil';
  /** Flight Burst: how high above the ground the player is flying (0 when not flying). */
  flyY = 0;
  time = 0;
  stageIndex: number;
  private gen: TrackGenerator;
  private stumbleTimer = 0;
  private events: RunEvent[] = [];

  constructor(readonly seed: number, start: RunStart = {}, readonly map: WorldMap = JOURNEY_MAP) {
    const d = start.distance ?? 0;
    this.score.distance = d;
    this.score.coins = start.coins ?? 0;
    this.score.bonus = start.bonus ?? 0;
    this.gen = new TrackGenerator(seed, d, map);
    this.moral = new SinGrace(start.record);
    this.stageIndex = map.stageIndexAt(d);
    this.speed = this.ascended ? CONFIG.ascended.startSpeed : CONFIG.run.startSpeed;
    if (this.ascended) {
      this.chaser = 'none';
      this.devil.gap = CONFIG.devil.maxGap;
      this.score.useMultiplier = true;
    } else if (d >= map.devilGivesUpAt) {
      this.chaser = 'shadow';
      this.devil.gap = CONFIG.devil.maxGap;
    }
    this.ability = this.ascended ? new AbilitySystem(start.ability ?? 'flight') : null;
  }

  get ascended(): boolean {
    return this.map.kind === 'ascended';
  }
  get distance(): number {
    return this.score.distance;
  }
  get stage(): StageDef {
    return this.map.stageAt(this.distance);
  }
  /** Height of the ground under the player (the stairs climb). */
  get ground(): number {
    return this.map.ground(this.distance);
  }
  /** Is the run finished in any way (crashed or reached God)? */
  get over(): boolean {
    return this.ended !== null || this.completed;
  }
  /** Slow Motion makes the whole world run at half speed. */
  get timeScale(): number {
    return this.ability?.isActive('slowmo') ? CONFIG.ability.slowMotionScale : 1;
  }

  act(a: Action): void {
    if (!this.over) this.motion.apply(a);
  }

  /** Tap the ability button. Returns true if it fired. */
  useAbility(): boolean {
    if (this.over || !this.ability?.activate()) return false;
    const id = this.ability.selected;
    this.events.push({ type: 'abilityStart', id });
    return true;
  }

  /** Events since the last call (coins picked up, stumbles, stage changes, end of run). */
  drainEvents(): RunEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** dt = game time (slowed during Slow Motion); realDt = real time (for ability timers). */
  update(dt: number, realDt = dt): void {
    if (this.over) return;
    this.time += dt;

    const run = this.ascended ? CONFIG.ascended : CONFIG.run;
    const base = Math.min(run.maxSpeed, run.startSpeed + CONFIG.run.speedGainPerMetre * this.distance);
    let mult = 1;
    if (this.stumbleTimer > 0) {
      this.stumbleTimer = Math.max(0, this.stumbleTimer - dt);
      const t = 1 - this.stumbleTimer / CONFIG.run.stumbleRecoverTime;
      mult = CONFIG.run.stumbleSlowdown + (1 - CONFIG.run.stumbleSlowdown) * t;
    }
    // walking into God's light: you slow down to a walk
    const st = this.stage;
    if (st.id === 'god') {
      const t = Math.min(1, (this.distance - this.map.stageStartAt(this.distance)) / st.length);
      mult *= 1 - 0.6 * t;
    }
    this.speed = Math.max(4, base * mult);
    const step = this.speed * dt;
    if (this.score.addDistance(step)) this.events.push({ type: 'multiplier', value: this.score.multiplier });
    this.motion.update(dt);
    this.devil.update(dt);
    this.updateAbility(step, realDt);

    this.checkProgress();
    if (this.over) return;

    const made = this.gen.generate(this.distance + CONFIG.track.viewAhead, this.speed);
    if (made.obstacles.length) this.obstacles.push(...made.obstacles);
    if (made.coins.length) this.coins.push(...made.coins);
    if (made.pickups.length) this.pickups.push(...made.pickups);
    if (this.safeTimer > 0) this.safeTimer = Math.max(0, this.safeTimer - dt);

    if (!this.flying) this.checkObstacles();
    this.checkCoins();
    this.checkPickups();

    const behind = this.distance - CONFIG.track.cleanupBehind;
    this.obstacles = this.obstacles.filter((o) => o.z + (o.length ?? 0) / 2 > behind);
    this.coins = this.coins.filter((c) => c.z > behind && !c.taken);
    this.pickups = this.pickups.filter((p) => p.z > behind && !(p.taken && p.resolved));
  }

  /** True while Flight Burst keeps you above everything (including the short landing). */
  get flying(): boolean {
    return this.flyY > 0.6;
  }

  private updateAbility(step: number, realDt: number): void {
    const a = this.ability;
    if (!a) return;
    if (a.addCleanDistance(step)) this.events.push({ type: 'abilityReady' });
    const ended = a.update(realDt);
    if (ended) {
      this.events.push({ type: 'abilityEnd', id: ended });
      // a moment of safety after landing
      if (ended === 'flight') this.safeTimer = Math.max(this.safeTimer, 0.6);
    }
    const target = a.isActive('flight') ? CONFIG.ability.flightHeight : 0;
    this.flyY += (target - this.flyY) * Math.min(1, realDt * 6);
    if (target === 0 && this.flyY < 0.02) this.flyY = 0;
  }

  /** Is the player shielded (halo) or briefly safe right after the shield broke? */
  get protectedNow(): boolean {
    return this.shield || this.safeTimer > 0;
  }

  private checkPickups(): void {
    const m = this.motion;
    const feet = this.ground + m.y + this.flyY;
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
      const dy = this.map.ground(p.z) + p.y + 0.9 - (feet + m.height * 0.5);
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
    const map = this.map;
    if (this.chaser === 'devil' && d >= map.devilGivesUpAt) {
      // the Shadow rises far behind you (Decisions log #14)
      this.chaser = 'shadow';
      this.devil.gap = CONFIG.devil.maxGap;
      this.events.push({ type: 'devilGivesUp' });
    }
    const idx = map.stageIndexAt(Math.min(d, map.end - 0.01));
    while (this.stageIndex < idx) {
      const prev = this.stageAtIndex(this.stageIndex);
      this.stageIndex++;
      const next = this.stageAtIndex(this.stageIndex);
      if (prev.level) this.finishLevel(prev);
      if (map.kind === 'journey' && next.id === 'gardens') this.events.push({ type: 'checkpoint' });
      this.events.push({ type: 'stage', stage: next, from: prev });
    }
    if (d >= map.end) {
      const last = this.stageAtIndex(this.stageIndex);
      if (last.level) this.finishLevel(last);
      this.completed = true;
      this.events.push({ type: 'journeyComplete' });
    }
  }

  /** The stage with this index (stages are laid end to end along the map). */
  private stageAtIndex(i: number): StageDef {
    // find a point inside stage i by walking from the start of the map
    let z = 0;
    for (let k = 0; k < i; k++) z += this.map.stageAt(z).length;
    return this.map.stageAt(z);
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
      const box = { x: m.x, y: feet - this.map.ground(o.z), z: this.distance, height: m.height };
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
      this.score.stumble();
      // the chaser closes in (or your light dims); 3 stumbles close together and you're out
      if (this.devil.stumble()) return this.end('caught');
    }
  }

  private checkCoins(): void {
    const m = this.motion;
    const r2 = CONFIG.coins.pickupRadius ** 2;
    const feet = this.ground + m.y + this.flyY;
    const magnet = this.ability?.isActive('magnet') ?? false;
    const range = CONFIG.ability.magnetRange;
    for (const c of this.coins) {
      if (c.taken) continue;
      const dz = c.z - this.distance;
      let take = false;
      if (magnet) {
        // Celestial Magnet: every coin close ahead, in any lane
        take = dz < range && dz > -2;
      } else if (this.flying) {
        // flying over your lane collects its coins
        take = Math.abs(dz) < 1.5 && Math.abs(m.x - laneX(c.lane)) < 1;
      } else if (dz <= 2 && dz >= -2) {
        const dx = m.x - laneX(c.lane);
        const dy = this.map.ground(c.z) + c.y - (feet + m.height * 0.5);
        take = dx * dx + dy * dy + dz * dz < r2 * 1.6;
      }
      if (take) {
        c.taken = true;
        this.score.addCoin();
        if (this.ability?.addCoin()) this.events.push({ type: 'abilityReady' });
        this.events.push({ type: 'coin', coin: c });
      }
    }
  }

  private end(reason: EndReason): void {
    this.ended = reason;
    this.events.push({ type: 'end', reason });
  }
}
