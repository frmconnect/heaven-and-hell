import { CONFIG } from '../core/config';

/** The moral record of one journey (Decisions log #16, #17). */
export interface MoralRecord {
  soulsHelped: number;
  soulsMissed: number;
  temptationsResisted: number;
  temptationsTaken: number;
  miracles: number;
}

export const emptyRecord = (): MoralRecord => ({ soulsHelped: 0, soulsMissed: 0, temptationsResisted: 0, temptationsTaken: 0, miracles: 0 });

export type Verdict = 'fail' | 'pass' | 'extra' | 'perfect';

export interface Judgment {
  percent: number; // 0..100, whole number
  verdict: Verdict;
  passed: boolean;
  rewardCoins: number;
  /** Plain-language reasons, so the player always understands the result. */
  reasons: string[];
}

/** Keeps count of Grace and Sin during the journey. Stumbles and crashes never count as Sin. */
export class SinGrace {
  record: MoralRecord;

  constructor(start?: MoralRecord) {
    this.record = { ...(start ?? emptyRecord()) };
  }

  helpSoul(): void {
    this.record.soulsHelped++;
  }
  missSoul(): void {
    this.record.soulsMissed++;
  }
  resist(): void {
    this.record.temptationsResisted++;
  }
  takeTemptation(): void {
    this.record.temptationsTaken++;
  }
  miracle(): void {
    this.record.miracles++;
  }

  get grace(): number {
    const r = this.record;
    return r.soulsHelped + r.temptationsResisted + r.miracles;
  }
  get sin(): number {
    return this.record.temptationsTaken;
  }
  get choices(): number {
    const r = this.record;
    return r.soulsHelped + r.soulsMissed + r.temptationsResisted + r.temptationsTaken + r.miracles;
  }
  /** Grace % so far; 100 before you've met anything. */
  get percent(): number {
    return this.choices === 0 ? 100 : Math.floor((this.grace / this.choices) * 100);
  }
}

/** God's judgment at the end of the journey (Decisions log #17, #19). */
export function judge(record: MoralRecord): Judgment {
  const sg = new SinGrace(record);
  const percent = sg.percent;
  const t = CONFIG.judgment;
  const verdict: Verdict = percent >= t.perfect ? 'perfect' : percent >= t.extra ? 'extra' : percent >= t.pass ? 'pass' : 'fail';
  const r = record;
  const reasons: string[] = [];
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  reasons.push(`You helped ${plural(r.soulsHelped, 'lost soul', 'lost souls')} and resisted ${plural(r.temptationsResisted, 'temptation', 'temptations')}.`);
  if (r.miracles) reasons.push(`You gathered ${plural(r.miracles, 'Miracle', 'Miracles')}.`);
  if (r.temptationsTaken) reasons.push(`You gave in to ${plural(r.temptationsTaken, 'temptation', 'temptations')}.`);
  if (r.soulsMissed) reasons.push(`You passed by ${plural(r.soulsMissed, 'soul', 'souls')} in need.`);
  if (verdict === 'fail') reasons.push(`You needed ${t.pass}% Grace, and you had ${percent}%.`);
  else if (verdict === 'perfect') reasons.push('Your journey was perfect.');
  else reasons.push(`You needed ${t.pass}% Grace, and you had ${percent}%.`);
  const rewardCoins = verdict === 'fail' ? 0 : t.rewardCoins[verdict];
  return { percent, verdict, passed: verdict !== 'fail', rewardCoins, reasons };
}
