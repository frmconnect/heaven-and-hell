/** Every state the game can be in. Only some are used in Phase 1. */
export enum GameState {
  MainMenu = 'MainMenu',
  HellRun = 'HellRun',
  HeavenAscent = 'HeavenAscent',
  HeavenLevel = 'HeavenLevel',
  Judgment = 'Judgment',
  JudgmentFailed = 'JudgmentFailed',
  AscendedUnlocked = 'AscendedUnlocked',
  AscendedRun = 'AscendedRun',
  GameOver = 'GameOver',
  Paused = 'Paused',
}

const S = GameState;
const RUN_STATES = [S.HellRun, S.HeavenAscent, S.HeavenLevel, S.AscendedRun];

/** Which states each state may move to. Anything else is refused. */
const ALLOWED: Record<GameState, GameState[]> = {
  [S.MainMenu]: [...RUN_STATES],
  [S.HellRun]: [S.HeavenAscent, S.GameOver, S.Paused, S.MainMenu],
  [S.HeavenAscent]: [S.HeavenLevel, S.GameOver, S.Paused, S.MainMenu],
  [S.HeavenLevel]: [S.HeavenLevel, S.Judgment, S.GameOver, S.Paused, S.MainMenu],
  // MainMenu is a temporary exit until judgment is built in Phase 3
  [S.Judgment]: [S.JudgmentFailed, S.AscendedUnlocked, S.MainMenu],
  [S.JudgmentFailed]: [S.HellRun, S.MainMenu],
  [S.AscendedUnlocked]: [S.AscendedRun, S.MainMenu],
  [S.AscendedRun]: [S.GameOver, S.Paused, S.MainMenu],
  [S.GameOver]: [...RUN_STATES, S.MainMenu],
  [S.Paused]: [...RUN_STATES, S.MainMenu],
};

export type StateListener = (to: GameState, from: GameState) => void;

/** Central place that owns the current game state and announces changes. */
export class GameStateManager {
  private current: GameState = GameState.MainMenu;
  private resumeTo: GameState | null = null;
  private listeners: StateListener[] = [];

  get state(): GameState {
    return this.current;
  }

  /** True while the player is actually running (not paused, not in a menu). */
  get isRunning(): boolean {
    return RUN_STATES.includes(this.current);
  }

  canGo(to: GameState): boolean {
    if (this.current === S.Paused && RUN_STATES.includes(to)) return to === this.resumeTo;
    return ALLOWED[this.current].includes(to);
  }

  go(to: GameState): boolean {
    if (!this.canGo(to)) return false;
    const from = this.current;
    if (to === S.Paused) this.resumeTo = from;
    else if (from === S.Paused) this.resumeTo = null;
    this.current = to;
    for (const l of this.listeners) l(to, from);
    return true;
  }

  pause(): boolean {
    return this.isRunning ? this.go(S.Paused) : false;
  }

  resume(): boolean {
    return this.current === S.Paused && this.resumeTo ? this.go(this.resumeTo) : false;
  }

  onChange(l: StateListener): () => void {
    this.listeners.push(l);
    return () => {
      this.listeners = this.listeners.filter((x) => x !== l);
    };
  }
}
