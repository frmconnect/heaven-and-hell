import { describe, expect, it } from 'vitest';
import { emptyRecord, judge, SinGrace } from '../src/systems/SinGrace';

describe('Sin & Grace', () => {
  it('starts at 100% and counts good and bad choices', () => {
    const sg = new SinGrace();
    expect(sg.percent).toBe(100);
    sg.helpSoul();
    sg.resist();
    sg.takeTemptation();
    sg.missSoul();
    expect(sg.grace).toBe(2);
    expect(sg.sin).toBe(1);
    expect(sg.percent).toBe(50);
  });
  it('Miracles add Grace', () => {
    const sg = new SinGrace();
    sg.takeTemptation();
    sg.miracle();
    sg.miracle();
    expect(sg.percent).toBe(66);
  });
  it('continues from a saved record (checkpoint)', () => {
    const sg = new SinGrace({ ...emptyRecord(), soulsHelped: 3, temptationsTaken: 1 });
    sg.helpSoul();
    expect(sg.record.soulsHelped).toBe(4);
    expect(sg.percent).toBe(80);
  });
});

describe('Judgment (70 / 85 / 100)', () => {
  const rec = (good: number, bad: number) => ({ ...emptyRecord(), soulsHelped: good, temptationsTaken: bad });
  it('fails below 70% and explains why', () => {
    const j = judge(rec(6, 4));
    expect(j.percent).toBe(60);
    expect(j.verdict).toBe('fail');
    expect(j.passed).toBe(false);
    expect(j.rewardCoins).toBe(0);
    expect(j.reasons.join(' ')).toContain('You needed 70% Grace, and you had 60%.');
    expect(j.reasons.join(' ')).toContain('gave in to 4 temptations');
  });
  it('passes at exactly 70%', () => {
    expect(judge(rec(7, 3)).verdict).toBe('pass');
    expect(judge(rec(7, 3)).rewardCoins).toBe(500);
  });
  it('extra reward from 85%', () => {
    expect(judge(rec(17, 3)).verdict).toBe('extra');
    expect(judge(rec(17, 3)).rewardCoins).toBe(1000);
  });
  it('perfect at 100%', () => {
    const j = judge(rec(10, 0));
    expect(j.verdict).toBe('perfect');
    expect(j.rewardCoins).toBe(2000);
    expect(j.reasons.join(' ')).toContain('perfect');
  });
  it('missing souls counts against you', () => {
    expect(judge({ ...emptyRecord(), soulsHelped: 5, soulsMissed: 5 }).passed).toBe(false);
  });
});
