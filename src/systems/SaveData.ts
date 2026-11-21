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
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'heaven-and-hell.save';

export const defaultSave = (): SaveState => ({
  version: 1, bestScore: 0, bestDistance: 0, totalCoins: 0, runs: 0, checkpoint: 0, checkpointCoins: 0, journeysCompleted: 0,
});

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
        if (k !== 'version' && typeof parsed[k] === 'number' && Number.isFinite(parsed[k])) d[k] = parsed[k];
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
  setCheckpoint(distance: number, coins: number): void {
    this.data.checkpoint = distance;
    this.data.checkpointCoins = coins;
    this.save();
  }

  clearCheckpoint(): void {
    this.data.checkpoint = 0;
    this.data.checkpointCoins = 0;
    this.save();
  }

  /** Record a finished run. Returns true if it was a new best score. */
  recordRun(score: number, distance: number, coins: number): boolean {
    const isBest = score > this.data.bestScore;
    this.data.runs += 1;
    this.data.totalCoins += coins;
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
