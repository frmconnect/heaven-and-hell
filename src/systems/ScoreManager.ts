import { CONFIG } from '../core/config';

/** Keeps the score for one run: distance + coins + level bonuses. */
export class ScoreManager {
  distance = 0;
  coins = 0;
  bonus = 0; // level-complete bonuses (and score carried over from a checkpoint)
  /** Ascended State: score multiplier that grows with clean running (Decisions log #22). */
  useMultiplier = false;
  multiplier = 1;
  bestMultiplier = 1;
  private cleanMetres = 0;
  private points = 0;

  reset(): void {
    this.distance = 0;
    this.coins = 0;
    this.bonus = 0;
  }

  /** Returns true if the multiplier just went up. */
  addDistance(m: number): boolean {
    this.distance += m;
    if (!this.useMultiplier) return false;
    this.points += m * CONFIG.score.pointsPerMetre * this.multiplier;
    this.cleanMetres += m;
    const every = CONFIG.ascended.multiplierEvery;
    if (this.cleanMetres >= every && this.multiplier < CONFIG.ascended.maxMultiplier) {
      this.cleanMetres -= every;
      this.multiplier++;
      this.bestMultiplier = Math.max(this.bestMultiplier, this.multiplier);
      return true;
    }
    if (this.multiplier >= CONFIG.ascended.maxMultiplier) this.cleanMetres = 0;
    return false;
  }

  addCoin(): void {
    this.coins += 1;
    if (this.useMultiplier) this.points += CONFIG.coins.points * this.multiplier;
  }

  /** A stumble drops the multiplier back to x1. */
  stumble(): void {
    this.multiplier = 1;
    this.cleanMetres = 0;
  }

  get score(): number {
    if (this.useMultiplier) return Math.floor(this.points) + this.bonus;
    return Math.floor(this.distance * CONFIG.score.pointsPerMetre) + this.coins * CONFIG.coins.points + this.bonus;
  }
}
