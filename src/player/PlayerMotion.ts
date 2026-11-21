import { CONFIG, laneX } from '../core/config';

export type Action = 'left' | 'right' | 'jump' | 'slide';

/**
 * Pure movement logic for the runner: lanes, jumping and sliding.
 * No graphics here, so it can be unit-tested.
 */
export class PlayerMotion {
  lane = 1; // 0 = left, 1 = middle, 2 = right
  prevLane = 1;
  x = laneX(1);
  y = 0;
  vy = 0;
  slideTimer = 0;
  private fastFall = false;

  reset(): void {
    this.lane = this.prevLane = 1;
    this.x = laneX(1);
    this.y = this.vy = this.slideTimer = 0;
    this.fastFall = false;
  }

  get grounded(): boolean {
    return this.y <= 0 && this.vy <= 0;
  }
  get sliding(): boolean {
    return this.slideTimer > 0;
  }
  get height(): number {
    return this.sliding ? CONFIG.player.slideHeight : CONFIG.player.height;
  }
  /** True while moving sideways between lanes. */
  get changingLane(): boolean {
    return Math.abs(this.x - laneX(this.lane)) > 0.05;
  }

  apply(action: Action): void {
    switch (action) {
      case 'left':
        this.moveTo(this.lane - 1);
        break;
      case 'right':
        this.moveTo(this.lane + 1);
        break;
      case 'jump':
        if (this.grounded) {
          this.slideTimer = 0;
          this.vy = CONFIG.jump.velocity;
          this.fastFall = false;
        }
        break;
      case 'slide':
        if (this.grounded) this.slideTimer = CONFIG.slide.duration;
        else {
          this.fastFall = true; // drop quickly, then slide on landing
          this.vy = Math.min(this.vy, 0);
        }
        break;
    }
  }

  private moveTo(lane: number): void {
    const clamped = Math.max(0, Math.min(CONFIG.lanes.count - 1, lane));
    if (clamped === this.lane) return;
    this.prevLane = this.lane;
    this.lane = clamped;
  }

  /** Push the player back to the lane they came from (after scraping a wall). */
  bounceBack(): void {
    const back = this.prevLane;
    this.prevLane = this.lane;
    this.lane = back;
  }

  update(dt: number): void {
    // sideways
    const target = laneX(this.lane);
    const step = CONFIG.lanes.switchSpeed * dt;
    const d = target - this.x;
    this.x = Math.abs(d) <= step ? target : this.x + Math.sign(d) * step;

    // vertical
    if (!this.grounded || this.vy > 0) {
      const g = this.fastFall ? CONFIG.jump.fastFallGravity : CONFIG.jump.gravity;
      this.vy -= g * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        if (this.fastFall) this.slideTimer = CONFIG.slide.duration;
        this.fastFall = false;
      }
    }

    if (this.slideTimer > 0) this.slideTimer = Math.max(0, this.slideTimer - dt);
  }
}
