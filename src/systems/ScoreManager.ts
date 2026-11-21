import { CONFIG } from '../core/config';

/** Keeps the score for one run: distance + coins + level bonuses. */
export class ScoreManager {
  distance = 0;
  coins = 0;
  bonus = 0; // level-complete bonuses (and score carried over from a checkpoint)

  reset(): void {
    this.distance = 0;
    this.coins = 0;
    this.bonus = 0;
  }

  addDistance(m: number): void {
    this.distance += m;
  }

  addCoin(): void {
    this.coins += 1;
  }

  get score(): number {
    return Math.floor(this.distance * CONFIG.score.pointsPerMetre) + this.coins * CONFIG.coins.points + this.bonus;
  }
}
