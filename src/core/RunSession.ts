import { CONFIG, laneX } from './config';
import { DevilChase } from '../enemies/DevilChase';
import { PlayerMotion, type Action } from '../player/PlayerMotion';
import { ScoreManager } from '../systems/ScoreManager';
import { TrackGenerator, type CoinData } from '../world/TrackGenerator';
import { overlaps, resolveHit, type ObstacleData } from '../world/obstacles';

export type EndReason = 'crash' | 'fall' | 'caught';

export type RunEvent =
  | { type: 'coin'; coin: CoinData }
  | { type: 'stumble' }
  | { type: 'scrape' }
  | { type: 'end'; reason: EndReason };

/**
 * The rules of one run, with no graphics: movement, speed, obstacles, coins, the Devil.
 * The 3D renderer just draws whatever this says.
 */
export class RunSession {
  readonly motion = new PlayerMotion();
  readonly devil = new DevilChase();
  readonly score = new ScoreManager();
  obstacles: ObstacleData[] = [];
  coins: CoinData[] = [];
  speed: number = CONFIG.run.startSpeed;
  ended: EndReason | null = null;
  time = 0;
  private gen: TrackGenerator;
  private stumbleTimer = 0;
  private events: RunEvent[] = [];

  constructor(readonly seed: number) {
    this.gen = new TrackGenerator(seed);
  }

  get distance(): number {
    return this.score.distance;
  }

  act(a: Action): void {
    if (!this.ended) this.motion.apply(a);
  }

  /** Events since the last call (coins picked up, stumbles, end of run). */
  drainEvents(): RunEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  update(dt: number): void {
    if (this.ended) return;
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

    const made = this.gen.generate(this.distance + CONFIG.track.viewAhead, this.speed);
    if (made.obstacles.length) this.obstacles.push(...made.obstacles);
    if (made.coins.length) this.coins.push(...made.coins);

    this.checkObstacles();
    this.checkCoins();

    const behind = this.distance - CONFIG.track.cleanupBehind;
    this.obstacles = this.obstacles.filter((o) => o.z > behind);
    this.coins = this.coins.filter((c) => c.z > behind && !c.taken);
  }

  private checkObstacles(): void {
    const m = this.motion;
    const box = { x: m.x, y: m.y, z: this.distance, height: m.height };
    for (const o of this.obstacles) {
      if (o.hit || !overlaps(box, o)) continue;
      o.hit = true;
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
      if (this.devil.stumble()) return this.end('caught');
    }
  }

  private checkCoins(): void {
    const m = this.motion;
    const r2 = CONFIG.coins.pickupRadius ** 2;
    for (const c of this.coins) {
      if (c.taken) continue;
      const dz = c.z - this.distance;
      if (dz > 2 || dz < -2) continue;
      const dx = m.x - laneX(c.lane);
      const dy = c.y - (m.y + m.height * 0.5);
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
