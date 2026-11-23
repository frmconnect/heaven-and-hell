import { dayNumber, itemById } from './Shop';
import type { SaveData } from './SaveData';
import {
  dailyChallenges, DAILY_REWARDS, goalText, missionGoals, missionReward, MISSION_UNLOCKS, progressAfter, emptyStats,
  type Goal, type RunStats,
} from './Missions';

export type MissionEvent =
  | { kind: 'daily'; text: string; reward: number }
  | { kind: 'dailyAll'; reward: number }
  | { kind: 'mission'; text: string }
  | { kind: 'missionLevel'; level: number; reward: number; unlock?: string };

export interface GoalView {
  goal: Goal;
  text: string;
  progress: number;
  done: boolean;
  reward?: number;
}

const NUMERIC: (keyof RunStats)[] = ['coins', 'distance', 'souls', 'resisted', 'miracles', 'jumps', 'slides', 'abilities'];

/**
 * Keeps track of Daily Challenges and Missions and pays rewards the moment a goal is done
 * (Decisions log #40). Progress is saved on the device.
 */
export class MissionTracker {
  private chBase = [0, 0, 0];
  private mBase = [0, 0, 0];
  private offset: RunStats = emptyStats();

  constructor(private save: SaveData) {}

  /** New day → new challenges. */
  ensureDay(today = dayNumber(new Date())): void {
    const d = this.save.data;
    if (d.chDay !== today) {
      d.chDay = today;
      d.chProg = [0, 0, 0];
      d.chDone = 0;
      d.chBonus = 0;
      this.save.save();
    }
  }

  private ascended(): boolean {
    return this.save.data.ascended > 0;
  }

  daily(): GoalView[] {
    this.ensureDay();
    const d = this.save.data;
    return dailyChallenges(d.chDay, this.ascended()).map((c, i) => ({ goal: c.goal, text: goalText(c.goal), progress: d.chProg[i], done: !!(d.chDone & (1 << i)), reward: c.reward }));
  }

  missions(): GoalView[] {
    const d = this.save.data;
    return missionGoals(d.mLevel).map((g, i) => ({ goal: g, text: goalText(g), progress: d.mProg[i], done: d.mProg[i] >= g.target }));
  }

  /** How many of today's challenges are done (for the menu badge). */
  dailyDoneCount(): number {
    return this.daily().filter((c) => c.done).length;
  }

  /** Call when a run starts. */
  startRun(): void {
    this.ensureDay();
    this.chBase = [...this.save.data.chProg];
    this.mBase = [...this.save.data.mProg];
    this.offset = emptyStats();
  }

  /** Call during a run (live) and when it ends, with everything the run has achieved so far. */
  update(stats: RunStats): MissionEvent[] {
    const events: MissionEvent[] = [];
    const d = this.save.data;
    let changed = false;
    // daily challenges
    const today = dailyChallenges(d.chDay, this.ascended());
    today.forEach((c, i) => {
      const p = progressAfter(c.goal, this.chBase[i], stats);
      if (p !== d.chProg[i]) {
        d.chProg[i] = p;
        changed = true;
      }
      if (p >= c.goal.target && !(d.chDone & (1 << i))) {
        d.chDone |= 1 << i;
        this.pay(c.reward);
        events.push({ kind: 'daily', text: goalText(c.goal), reward: c.reward });
      }
    });
    if (d.chDone === 7 && !d.chBonus) {
      d.chBonus = 1;
      this.pay(DAILY_REWARDS.allThree);
      events.push({ kind: 'dailyAll', reward: DAILY_REWARDS.allThree });
    }
    // missions: only what happened since this level started counts
    const rel = this.relative(stats);
    const goals = missionGoals(d.mLevel);
    goals.forEach((g, i) => {
      const before = d.mProg[i];
      const p = progressAfter(g, this.mBase[i], rel);
      if (p !== before) {
        d.mProg[i] = p;
        changed = true;
        if (p >= g.target && before < g.target) events.push({ kind: 'mission', text: goalText(g) });
      }
    });
    if (goals.every((g, i) => d.mProg[i] >= g.target)) {
      const level = d.mLevel;
      const reward = missionReward(level);
      this.pay(reward);
      d.mLevel = level + 1;
      d.mProg = [0, 0, 0];
      this.mBase = [0, 0, 0];
      this.offset = { ...stats };
      const unlock = MISSION_UNLOCKS.find((u) => u.level === d.mLevel);
      if (unlock && !d.owned.includes(unlock.item)) d.owned.push(unlock.item);
      events.push({ kind: 'missionLevel', level: d.mLevel, reward, unlock: unlock ? itemById(unlock.item)?.name : undefined });
      changed = true;
    }
    if (changed || events.length) this.save.save();
    return events;
  }

  /** Stats counted from the moment the current mission level began (if it began mid-run). */
  private relative(s: RunStats): RunStats {
    const r = { ...s };
    for (const k of NUMERIC) (r as unknown as Record<string, number>)[k] = Math.max(0, (s[k] as number) - (this.offset[k] as number));
    if (this.offset.reachedGod) r.reachedGod = false;
    if (this.offset.passedJudgment) r.passedJudgment = false;
    return r;
  }

  private pay(coins: number): void {
    this.save.data.wallet += coins;
    this.save.data.totalCoins += coins;
  }
}
