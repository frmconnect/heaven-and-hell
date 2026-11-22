import type { AbilityId } from './Abilities';
import type { SaveData } from './SaveData';

export type ShopCategory = 'outfit' | 'wings' | 'trail';

/** How an item looks (used by the 3D runner and the shop's colour swatches). */
export interface ItemLook {
  primary: string;
  secondary?: string;
  glow?: string; // emissive colour
  extra?: string;
}

export interface ShopItem {
  id: string;
  category: ShopCategory;
  name: string;
  price: number; // 0 = free starter item
  description: string;
  look: ItemLook;
}

/** Everything in the shop (Decisions log #24, #28). Looks only — nothing here changes gameplay. */
export const SHOP_ITEMS: ShopItem[] = [
  // outfits
  { id: 'pilgrim', category: 'outfit', name: 'Pilgrim', price: 0, description: 'A simple traveller’s tunic', look: { primary: '#efe6d2', secondary: '#4a3226', extra: '#3a2216' } },
  { id: 'angel', category: 'outfit', name: 'Angel', price: 800, description: 'White robes with golden trim', look: { primary: '#ffffff', secondary: '#e8c25a', extra: '#f4d27a', glow: '#3a3020' } },
  { id: 'fallen', category: 'outfit', name: 'Fallen', price: 1500, description: 'Black robes touched by fire', look: { primary: '#1e1418', secondary: '#7a0e0a', extra: '#120a0a', glow: '#3a0400' } },
  { id: 'golden', category: 'outfit', name: 'Golden One', price: 4000, description: 'Shining armour of pure gold', look: { primary: '#ffcc40', secondary: '#b07a10', extra: '#fff0b0', glow: '#6a4a00' } },
  // wings
  { id: 'none', category: 'wings', name: 'No wings', price: 0, description: 'Run as you are', look: { primary: 'transparent' } },
  { id: 'angelwings', category: 'wings', name: 'Angel Wings', price: 1200, description: 'Soft white feathers', look: { primary: '#ffffff', glow: '#605848' } },
  { id: 'batwings', category: 'wings', name: 'Bat Wings', price: 1500, description: 'Leathery wings from below', look: { primary: '#2a0a10', glow: '#300404' } },
  { id: 'crystalwings', category: 'wings', name: 'Crystal Wings', price: 3000, description: 'Glowing blue crystal', look: { primary: '#9fd8ff', glow: '#3a8aff' } },
  { id: 'firewings', category: 'wings', name: 'Wings of Fire', price: 4000, description: 'Blazing wings of flame', look: { primary: '#ff8a1a', glow: '#ff4a00' } },
  // trails
  { id: 'none-trail', category: 'trail', name: 'No trail', price: 0, description: 'Leave no mark', look: { primary: 'transparent' } },
  { id: 'light', category: 'trail', name: 'Trail of Light', price: 600, description: 'A soft white glow', look: { primary: '#fffbe8' } },
  { id: 'embers', category: 'trail', name: 'Embers', price: 900, description: 'Sparks from the fires of Hell', look: { primary: '#ff7a1a', secondary: '#ffd04a' } },
  { id: 'stardust', category: 'trail', name: 'Stardust', price: 2000, description: 'Twinkling stars behind you', look: { primary: '#c8a8ff', secondary: '#9fe8ff' } },
  { id: 'goldtrail', category: 'trail', name: 'Golden Path', price: 3500, description: 'A river of gold', look: { primary: '#ffd257', secondary: '#fff2b0' } },
];

export const itemById = (id: string): ShopItem | undefined => SHOP_ITEMS.find((i) => i.id === id);

/** Ability upgrades (Decisions log #25, #28): 3 levels, a little more duration each. */
export const UPGRADE_PRICES = [1000, 2500, 5000];
export const MAX_UPGRADE = UPGRADE_PRICES.length;
const UPGRADE_KEY: Record<AbilityId, 'upFlight' | 'upSlowmo' | 'upMagnet'> = { flight: 'upFlight', slowmo: 'upSlowmo', magnet: 'upMagnet' };

/** Daily reward for each day of a 7-day streak (Decisions log #27, #28). */
export const DAILY_REWARDS = [100, 150, 200, 300, 400, 600, 1000];

export const dayNumber = (date: Date): number =>
  Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);

export type BuyResult = 'ok' | 'owned' | 'coins' | 'unknown' | 'max';

/** Buying, equipping, upgrading and the daily reward. All saved on the device. */
export class Shop {
  constructor(private save: SaveData) {}

  get wallet(): number {
    return this.save.data.wallet;
  }

  owns(id: string): boolean {
    const item = itemById(id);
    return !!item && (item.price === 0 || this.save.data.owned.includes(id));
  }

  equipped(cat: ShopCategory): string {
    const d = this.save.data;
    const id = cat === 'outfit' ? d.outfit : cat === 'wings' ? d.wings : d.trail;
    // the starter item if nothing valid is equipped
    return this.owns(id) && itemById(id)?.category === cat ? id : SHOP_ITEMS.find((i) => i.category === cat && i.price === 0)!.id;
  }

  buy(id: string): BuyResult {
    const item = itemById(id);
    if (!item) return 'unknown';
    if (this.owns(id)) return 'owned';
    if (this.save.data.wallet < item.price) return 'coins';
    this.save.data.wallet -= item.price;
    this.save.data.owned.push(id);
    this.equip(id);
    return 'ok';
  }

  equip(id: string): boolean {
    const item = itemById(id);
    if (!item || !this.owns(id)) return false;
    const d = this.save.data;
    if (item.category === 'outfit') d.outfit = id;
    else if (item.category === 'wings') d.wings = id;
    else d.trail = id;
    this.save.save();
    return true;
  }

  upgradeLevel(a: AbilityId): number {
    return Math.max(0, Math.min(MAX_UPGRADE, this.save.data[UPGRADE_KEY[a]]));
  }

  /** Price of the next level, or null when maxed out. */
  upgradePrice(a: AbilityId): number | null {
    const lvl = this.upgradeLevel(a);
    return lvl >= MAX_UPGRADE ? null : UPGRADE_PRICES[lvl];
  }

  upgrade(a: AbilityId): BuyResult {
    const price = this.upgradePrice(a);
    if (price === null) return 'max';
    if (this.save.data.wallet < price) return 'coins';
    this.save.data.wallet -= price;
    this.save.data[UPGRADE_KEY[a]] = this.upgradeLevel(a) + 1;
    this.save.save();
    return 'ok';
  }

  /** Which day of the streak today's reward would be (1..7), or 0 if already claimed today. */
  dailyAvailable(today = dayNumber(new Date())): number {
    const d = this.save.data;
    if (d.dailyDay === today) return 0;
    const continues = d.dailyDay === today - 1 && d.dailyStreak > 0;
    return continues ? (d.dailyStreak % 7) + 1 : 1;
  }

  /** Claim today's reward. Returns the coins (0 if already claimed). */
  claimDaily(today = dayNumber(new Date())): number {
    const day = this.dailyAvailable(today);
    if (!day) return 0;
    const coins = DAILY_REWARDS[day - 1];
    const d = this.save.data;
    d.dailyDay = today;
    d.dailyStreak = day;
    d.wallet += coins;
    d.totalCoins += coins;
    this.save.save();
    return coins;
  }
}

/** Coins given once by the ?gift tester link. TESTING ONLY — remove before release (Phase 7). */
export const TESTER_GIFT = 10000;

/** Give the one-time tester gift. Returns the coins given (0 if already given on this device). */
export function giveTesterGift(save: SaveData): number {
  if (save.data.testerGift) return 0;
  save.data.testerGift = 1;
  save.data.wallet += TESTER_GIFT;
  save.save();
  return TESTER_GIFT;
}
