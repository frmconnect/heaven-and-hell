import type { MoralRecord } from './SinGrace';

/** Everything the game remembers between sessions. More fields arrive in later phases. */
export interface SaveState {
  version: 1;
  bestScore: number;
  bestDistance: number;
  totalCoins: number;
  runs: number;
  /** Distance of the Heaven's Gate checkpoint, 0 = not reached (Decisions log #12). */
  checkpoint: number;
  checkpointCoins: number;
  journeysCompleted: number;
  // Sin/Grace record at the checkpoint (so dying after the Gate can't wipe your sins)
  cpSoulsHelped: number;
  cpSoulsMissed: number;
  cpResisted: number;
  cpTaken: number;
  cpMiracles: number;
  // Phase 3: judgment
  godReached: number; // times
  ascended: number; // 1 = passed judgment, Ascended State unlocked
  bestGrace: number;
  perfectJudgments: number;
  // Phase 4: Ascended State — the competitive score (Decisions log #23)
  ascendedBestScore: number;
  ascendedBestDistance: number;
  ascendedRuns: number;
  selectedAbility: number; // index into ABILITY_ORDER
  ascendedTop: number[]; // local top 5 scores
  // Phase 5: shop, upgrades, daily reward (Decisions log #24-28)
  wallet: number; // coins you can spend (totalCoins = all coins ever earned)
  walletReady: number; // 1 once old saves have had their coins moved into the wallet
  owned: string[]; // shop item ids
  outfit: string;
  wings: string;
  trail: string;
  upFlight: number; // upgrade levels 0..3
  upSlowmo: number;
  upMagnet: number;
  dailyDay: number; // last day a daily reward was claimed (days since 1970)
  dailyStreak: number; // 1..7
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'heaven-and-hell.save';

export const defaultSave = (): SaveState => ({
  version: 1, bestScore: 0, bestDistance: 0, totalCoins: 0, runs: 0, checkpoint: 0, checkpointCoins: 0, journeysCompleted: 0,
  cpSoulsHelped: 0, cpSoulsMissed: 0, cpResisted: 0, cpTaken: 0, cpMiracles: 0,
  godReached: 0, ascended: 0, bestGrace: 0, perfectJudgments: 0,
  ascendedBestScore: 0, ascendedBestDistance: 0, ascendedRuns: 0, selectedAbility: 0, ascendedTop: [],
  wallet: 0, walletReady: 1, owned: [], outfit: 'pilgrim', wings: 'none', trail: 'none',
  upFlight: 0, upSlowmo: 0, upMagnet: 0, dailyDay: 0, dailyStreak: 0,
});

const STRING_KEYS = ['outfit', 'wings', 'trail'] as const;

/** Saves progress on the device. Never throws: if storage is blocked, the game keeps working without saving. */
export class SaveData {
  data: SaveState;

  constructor(private store: KeyValueStore | null = safeLocalStorage()) {
    this.data = this.load();
  }

  private load(): SaveState {
    try {
      const raw = this.store?.getItem(KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw);
      const d = defaultSave();
      for (const k of Object.keys(d) as (keyof SaveState)[]) {
        if (k === 'version' || typeof d[k] !== 'number') continue;
        if (typeof parsed[k] === 'number' && Number.isFinite(parsed[k])) (d as unknown as Record<string, number>)[k] = parsed[k];
      }
      if (Array.isArray(parsed.ascendedTop)) {
        d.ascendedTop = parsed.ascendedTop.filter((x: unknown) => typeof x === 'number' && Number.isFinite(x)).slice(0, 5);
      }
      if (Array.isArray(parsed.owned)) d.owned = parsed.owned.filter((x: unknown) => typeof x === 'string').slice(0, 100);
      for (const k of STRING_KEYS) if (typeof parsed[k] === 'string') d[k] = parsed[k];
      // saves from before the shop: the coins you already earned become spendable (Decisions log #28)
      if (parsed.walletReady !== 1) {
        d.wallet = d.totalCoins;
        d.walletReady = 1;
      }
      return d;
    } catch {
      return defaultSave();
    }
  }

  save(): void {
    try {
      this.store?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage full or blocked: ignore */
    }
  }

  /** Remember reaching Heaven's Gate, so a crash in Heaven restarts there. */
  setCheckpoint(distance: number, coins: number, r?: MoralRecord): void {
    this.data.checkpoint = distance;
    this.data.checkpointCoins = coins;
    if (r) {
      this.data.cpSoulsHelped = r.soulsHelped;
      this.data.cpSoulsMissed = r.soulsMissed;
      this.data.cpResisted = r.temptationsResisted;
      this.data.cpTaken = r.temptationsTaken;
      this.data.cpMiracles = r.miracles;
    }
    this.save();
  }

  get checkpointRecord(): MoralRecord {
    const d = this.data;
    return { soulsHelped: d.cpSoulsHelped, soulsMissed: d.cpSoulsMissed, temptationsResisted: d.cpResisted, temptationsTaken: d.cpTaken, miracles: d.cpMiracles };
  }

  /** Record God's judgment. Passing unlocks the Ascended State and pays the reward. */
  recordJudgment(percent: number, passed: boolean, perfect: boolean, rewardCoins: number): void {
    const d = this.data;
    d.godReached += 1;
    d.bestGrace = Math.max(d.bestGrace, percent);
    if (passed) d.ascended = 1;
    if (perfect) d.perfectJudgments += 1;
    d.totalCoins += rewardCoins;
    d.wallet += rewardCoins;
    // the journey is over either way: pass → free to roam, fail → back to Hell (Decisions log #3, #12)
    d.checkpoint = 0;
    d.checkpointCoins = 0;
    this.save();
  }

  clearCheckpoint(): void {
    this.data.checkpoint = 0;
    this.data.checkpointCoins = 0;
    this.save();
  }

  /**
   * Record an Ascended run (the competitive score). Returns whether it's a new best,
   * its place in the local top 5 (0 = not in it), and which abilities it unlocked.
   */
  recordAscended(score: number, distance: number, coins: number, unlockAt: Record<string, number>): { isBest: boolean; rank: number; unlocked: string[] } {
    const d = this.data;
    const before = d.ascendedBestDistance;
    const isBest = score > d.ascendedBestScore;
    d.ascendedRuns += 1;
    d.totalCoins += coins;
    d.wallet += coins;
    if (isBest) d.ascendedBestScore = score;
    d.ascendedBestDistance = Math.max(before, Math.floor(distance));
    const top = [...d.ascendedTop, score].sort((a, b) => b - a).slice(0, 5);
    const rank = score > 0 && top.includes(score) ? top.indexOf(score) + 1 : 0;
    d.ascendedTop = top;
    const unlocked = Object.entries(unlockAt)
      .filter(([, at]) => at > 0 && before < at && d.ascendedBestDistance >= at)
      .map(([id]) => id);
    this.save();
    return { isBest, rank, unlocked };
  }

  /** Record a finished run. Returns true if it was a new best score. */
  recordRun(score: number, distance: number, coins: number): boolean {
    const isBest = score > this.data.bestScore;
    this.data.runs += 1;
    this.data.totalCoins += coins;
    this.data.wallet += coins;
    if (isBest) this.data.bestScore = score;
    this.data.bestDistance = Math.max(this.data.bestDistance, Math.floor(distance));
    this.save();
    return isBest;
  }
}

function safeLocalStorage(): KeyValueStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}
