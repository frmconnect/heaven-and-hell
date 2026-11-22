import { CONFIG } from '../core/config';

export type AbilityId = 'flight' | 'slowmo' | 'magnet';

export interface AbilityDef {
  id: AbilityId;
  name: string;
  description: string;
  duration: number; // seconds
  unlockDistance: number; // best Ascended distance needed (Decisions log #23)
}

/** The three Ascended abilities (Decisions log #21). */
export const ABILITIES: Record<AbilityId, AbilityDef> = {
  flight: { id: 'flight', name: 'Flight Burst', description: 'Fly above everything for 3 seconds', duration: 3, unlockDistance: 0 },
  slowmo: { id: 'slowmo', name: 'Slow Motion', description: 'Time slows down for 4 seconds', duration: 4, unlockDistance: 1500 },
  magnet: { id: 'magnet', name: 'Celestial Magnet', description: 'Pull in every coin nearby for 8 seconds', duration: 8, unlockDistance: 3000 },
};

export const ABILITY_ORDER: AbilityId[] = ['flight', 'slowmo', 'magnet'];

export function isUnlocked(id: AbilityId, bestAscendedDistance: number): boolean {
  return bestAscendedDistance >= ABILITIES[id].unlockDistance;
}

/**
 * One ability button that charges as you collect coins and run cleanly; tap when full.
 * Skill-based: nothing to buy.
 */
export class AbilitySystem {
  charge = 0; // 0..1
  active: AbilityId | null = null;
  timer = 0;

  constructor(readonly selected: AbilityId) {}

  get ready(): boolean {
    return this.active === null && this.charge >= 1;
  }

  isActive(id: AbilityId): boolean {
    return this.active === id;
  }

  /** Returns true if the button just became full. */
  addCoin(): boolean {
    return this.add(CONFIG.ability.chargePerCoin);
  }

  addCleanDistance(m: number): boolean {
    return this.add(m * CONFIG.ability.chargePerMetre);
  }

  private add(v: number): boolean {
    if (this.active || this.charge >= 1) return false;
    this.charge = Math.min(1, this.charge + v);
    return this.charge >= 1;
  }

  activate(): boolean {
    if (!this.ready) return false;
    this.active = this.selected;
    this.timer = ABILITIES[this.selected].duration;
    this.charge = 0;
    return true;
  }

  /** Real (not slowed) time. Returns the ability that just ended, if any. */
  update(realDt: number): AbilityId | null {
    if (!this.active) return null;
    this.timer -= realDt;
    if (this.timer > 0) return null;
    const ended = this.active;
    this.active = null;
    this.timer = 0;
    return ended;
  }
}
