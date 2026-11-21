import { CONFIG } from '../core/config';

/**
 * Tracks how far behind the player the Devil is.
 * Clean running slowly pulls you away; every stumble lets him close in.
 * When the gap reaches zero, he catches you.
 */
export class DevilChase {
  gap: number = CONFIG.devil.startGap;
  caught = false;

  reset(): void {
    this.gap = CONFIG.devil.startGap;
    this.caught = false;
  }

  update(dt: number): void {
    if (this.caught) return;
    this.gap = Math.min(CONFIG.devil.maxGap, this.gap + CONFIG.devil.recoverPerSecond * dt);
  }

  /** Called when the player stumbles. Returns true if that stumble got them caught. */
  stumble(): boolean {
    if (this.caught) return true;
    this.gap -= CONFIG.devil.stumblePenalty;
    if (this.gap <= CONFIG.devil.catchGap) this.catchNow();
    return this.caught;
  }

  catchNow(): void {
    this.gap = 0;
    this.caught = true;
  }

  /** 0 = far away, 1 = right on your heels. Used for the HUD warning. */
  get danger(): number {
    return 1 - Math.max(0, Math.min(1, this.gap / CONFIG.devil.maxGap));
  }
}
