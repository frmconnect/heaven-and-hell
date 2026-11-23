import { describe, expect, it } from 'vitest';
import { ABILITIES, AbilitySystem } from '../src/systems/Abilities';
import { SaveData, type KeyValueStore } from '../src/systems/SaveData';
import { DAILY_REWARDS, giveTesterGift, Shop, SHOP_ITEMS } from '../src/systems/Shop';

function fresh(wallet = 0) {
  const mem: Record<string, string> = {};
  const store: KeyValueStore = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => void (mem[k] = v) };
  const save = new SaveData(store);
  save.data.wallet = wallet;
  return { save, shop: new Shop(save), store, mem };
}

describe('Shop catalog', () => {
  it('has ~4 items in each category plus a free starter, all looks only', () => {
    for (const cat of ['outfit', 'wings', 'trail'] as const) {
      const items = SHOP_ITEMS.filter((i) => i.category === cat);
      expect(items.filter((i) => i.price === 0)).toHaveLength(1);
      expect(items.filter((i) => i.price > 0).length).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(SHOP_ITEMS.map((i) => i.id)).size).toBe(SHOP_ITEMS.length);
  });
});

describe('Buying and equipping', () => {
  it('buys with enough coins, equips it, and remembers it', () => {
    const { save, shop, store } = fresh(1000);
    expect(shop.equipped('outfit')).toBe('pilgrim');
    expect(shop.buy('angel')).toBe('ok');
    expect(shop.wallet).toBe(200);
    expect(shop.equipped('outfit')).toBe('angel');
    expect(shop.buy('angel')).toBe('owned');
    const again = new Shop(new SaveData(store));
    expect(again.owns('angel')).toBe(true);
    expect(again.equipped('outfit')).toBe('angel');
    void save;
  });
  it('refuses when you cannot afford it, and cannot equip what you do not own', () => {
    const { shop } = fresh(100);
    expect(shop.buy('golden')).toBe('coins');
    expect(shop.wallet).toBe(100);
    expect(shop.equip('golden')).toBe(false);
    expect(shop.equip('pilgrim')).toBe(true);
  });
});

describe('Ability upgrades (3 small levels)', () => {
  it('cost 1,000 / 2,500 / 5,000 and stop at level 3', () => {
    const { shop } = fresh(20000);
    expect(shop.upgradePrice('flight')).toBe(1000);
    expect(shop.upgrade('flight')).toBe('ok');
    expect(shop.upgrade('flight')).toBe('ok');
    expect(shop.upgrade('flight')).toBe('ok');
    expect(shop.upgrade('flight')).toBe('max');
    expect(shop.wallet).toBe(20000 - 8500);
    expect(shop.upgradeLevel('flight')).toBe(3);
  });
  it('add a little duration: Flight 3 → 4.5 s, Slow Motion 4 → 5.5 s, Magnet 8 → 12.5 s', () => {
    expect(new AbilitySystem('flight', 0).duration).toBe(ABILITIES.flight.duration);
    expect(new AbilitySystem('flight', 3).duration).toBe(4.5);
    expect(new AbilitySystem('slowmo', 3).duration).toBe(5.5);
    expect(new AbilitySystem('magnet', 3).duration).toBe(12.5);
    expect(new AbilitySystem('flight', 9).duration).toBe(4.5);
  });
});

describe('Daily reward (7-day streak)', () => {
  it('grows each day in a row, once per day, and restarts after day 7', () => {
    const { shop } = fresh(0);
    const got: number[] = [];
    for (let day = 100; day < 108; day++) {
      got.push(shop.claimDaily(day));
      expect(shop.claimDaily(day)).toBe(0); // only once a day
    }
    expect(got).toEqual([...DAILY_REWARDS, DAILY_REWARDS[0]]);
  });
  it('missing a day restarts the streak', () => {
    const { shop } = fresh(0);
    shop.claimDaily(200);
    shop.claimDaily(201);
    expect(shop.dailyAvailable(203)).toBe(1);
  });
});

describe('Wallet', () => {
  it('old saves: coins already earned become spendable', () => {
    const mem: Record<string, string> = { 'heaven-and-hell.save': JSON.stringify({ version: 1, totalCoins: 1234 }) };
    const s = new SaveData({ getItem: (k) => mem[k] ?? null, setItem: () => {} });
    expect(s.data.wallet).toBe(1234);
  });
  it('coins earned in runs and judgment go into the wallet', () => {
    const { save } = fresh(0);
    save.recordRun(100, 100, 40);
    save.recordJudgment(80, true, false, 500);
    expect(save.data.wallet).toBe(540);
  });
});

describe('Tester gift (?gift link, testing only)', () => {
  it('gives 10,000 coins once per device', () => {
    const { save } = fresh(50);
    expect(giveTesterGift(save)).toBe(10000);
    expect(giveTesterGift(save)).toBe(0);
    expect(save.data.wallet).toBe(10050);
  });
});

describe('Settings: reset progress', () => {
  it('starts the game over but keeps settings and the leaderboard identity', () => {
    const { save } = fresh(5000);
    save.data.sfxVolume = 0.3;
    save.data.vibrateOn = 0;
    save.data.playerId = 'abc';
    save.data.playerName = 'Holy Dove 3';
    save.data.ascended = 1;
    save.data.bestScore = 999;
    save.data.owned = ['angel'];
    save.resetProgress();
    expect(save.data.wallet).toBe(0);
    expect(save.data.ascended).toBe(0);
    expect(save.data.bestScore).toBe(0);
    expect(save.data.owned).toEqual([]);
    expect(save.data.sfxVolume).toBe(0.3);
    expect(save.data.vibrateOn).toBe(0);
    expect(save.data.playerName).toBe('Holy Dove 3');
  });
  it('a new identity clears the name and any unsent score', () => {
    const { save } = fresh(0);
    save.data.playerName = 'Holy Dove 3';
    save.data.pendScore = 500;
    save.newIdentity('new-id');
    expect(save.data.playerId).toBe('new-id');
    expect(save.data.playerName).toBe('');
    expect(save.data.pendScore).toBe(0);
  });
});
