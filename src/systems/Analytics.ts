/**
 * Analytics (Decisions log #39): records how people play — where they quit, how far they get,
 * what they buy — so the game can be tuned. Anonymous: no names or emails.
 *
 * The game calls these few methods; a "sink" sends them on. The real sink is GameAnalytics,
 * loaded only when keys are set (src/core/analyticsConfig.ts). Tests use a recording sink.
 */

export type ProgressStatus = 'Start' | 'Complete' | 'Fail';

export interface AnalyticsSink {
  progression(status: ProgressStatus, p1: string, p2?: string, p3?: string, score?: number): void;
  design(eventId: string, value?: number): void;
  resource(flow: 'Source' | 'Sink', currency: string, amount: number, itemType: string, itemId: string): void;
  setPlayerType(type: string): void;
  pause(): void;
  resume(): void;
}

/** GameAnalytics only allows letters, numbers, - and _ in event parts. */
export const clean = (s: string): string => s.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) || 'none';

export const CURRENCIES = ['coins'];
export const ITEM_TYPES = ['run', 'daily', 'judgment', 'temptation', 'gift', 'shop', 'upgrade', 'reset'];
export const PLAYER_TYPES = ['journey', 'ascended'];

/** Records events in memory (tests, and when analytics is switched off). */
export class RecordingSink implements AnalyticsSink {
  events: string[] = [];
  progression(status: ProgressStatus, p1: string, p2 = '', p3 = '', score?: number): void {
    this.events.push(`progression:${status}:${[p1, p2, p3].filter(Boolean).join(':')}${score !== undefined ? `=${score}` : ''}`);
  }
  design(id: string, value?: number): void {
    this.events.push(`design:${id}${value !== undefined ? `=${value}` : ''}`);
  }
  resource(flow: 'Source' | 'Sink', currency: string, amount: number, itemType: string, itemId: string): void {
    this.events.push(`resource:${flow}:${currency}:${amount}:${itemType}:${itemId}`);
  }
  setPlayerType(type: string): void {
    this.events.push(`player:${type}`);
  }
  pause(): void {}
  resume(): void {}
}

/** What the game reports. Keeps event names in one place so reports stay consistent. */
export class Analytics {
  private stage = '';
  constructor(private sink: AnalyticsSink = new RecordingSink()) {}

  setSink(sink: AnalyticsSink): void {
    this.sink = sink;
  }

  playerType(ascended: boolean): void {
    this.sink.setPlayerType(ascended ? 'ascended' : 'journey');
  }

  /** A run begins (journey from Hell or a checkpoint, or an Ascended run). */
  runStart(mode: 'journey' | 'ascended', stage: string, fromCheckpoint = false): void {
    this.stage = clean(stage);
    this.sink.design(`run:start:${mode}${fromCheckpoint ? ':checkpoint' : ''}`);
    this.sink.progression('Start', mode, this.stage);
  }

  /** The player reached a new stage/world. */
  stageReached(mode: 'journey' | 'ascended', stage: string, score: number): void {
    if (this.stage) this.sink.progression('Complete', mode, this.stage, undefined, score);
    this.stage = clean(stage);
    this.sink.progression('Start', mode, this.stage);
  }

  /** The run ended by crashing, falling or being caught. */
  runEnd(mode: 'journey' | 'ascended', reason: string, distance: number, score: number, coins: number, time: number): void {
    this.sink.progression('Fail', mode, this.stage || 'unknown', undefined, Math.floor(score));
    this.sink.design(`run:end:${mode}:${clean(reason)}:${this.stage || 'unknown'}`, Math.floor(distance));
    this.sink.design(`run:seconds:${mode}`, Math.round(time));
    if (coins > 0) this.sink.resource('Source', 'coins', Math.floor(coins), 'run', mode);
  }

  /** Reached God: the journey is complete; judgment follows. */
  journeyComplete(score: number, coins: number): void {
    if (this.stage) this.sink.progression('Complete', 'journey', this.stage, undefined, Math.floor(score));
    this.sink.progression('Complete', 'journey', 'all', undefined, Math.floor(score));
    if (coins > 0) this.sink.resource('Source', 'coins', Math.floor(coins), 'run', 'journey');
  }

  judgment(passed: boolean, gracePercent: number, rewardCoins: number, souls: number, temptationsTaken: number): void {
    this.sink.design(`judgment:${passed ? 'pass' : 'fail'}`, gracePercent);
    this.sink.design('judgment:souls_saved', souls);
    this.sink.design('judgment:temptations_taken', temptationsTaken);
    if (rewardCoins > 0) this.sink.resource('Source', 'coins', rewardCoins, 'judgment', passed ? 'pass' : 'fail');
  }

  event(id: string, value?: number): void {
    this.sink.design(id.split(':').map(clean).join(':'), value);
  }

  coinsIn(amount: number, from: 'daily' | 'gift' | 'temptation', id: string): void {
    if (amount > 0) this.sink.resource('Source', 'coins', Math.floor(amount), from, clean(id));
  }

  coinsOut(amount: number, on: 'shop' | 'upgrade', id: string): void {
    if (amount > 0) this.sink.resource('Sink', 'coins', Math.floor(amount), on, clean(id));
  }

  pause(): void {
    this.sink.pause();
  }
  resume(): void {
    this.sink.resume();
  }
}
