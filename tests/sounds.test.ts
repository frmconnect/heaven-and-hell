import { describe, expect, it } from 'vitest';
import { SOUNDS } from '../src/audio/sounds';
import { midi } from '../src/audio/Synth';

describe('Sound effects (Decisions log #36)', () => {
  it('every game moment has a sound with a readable name for the Preview list', () => {
    const needed = ['coin', 'jump', 'land', 'slide', 'lane', 'stumble', 'crash', 'fallLava', 'fallVoid', 'devilRoar', 'heartbeat', 'devilGivesUp', 'shadowRise', 'shadowGrab',
      'soulSaved', 'soulLost', 'temptation', 'resisted', 'miracle', 'shieldBreak', 'run', 'stage', 'gate', 'checkpoint', 'levelComplete', 'gameOver', 'judgePass', 'judgeFail',
      'multiplier', 'abilityReady', 'flight', 'slowmo', 'magnet', 'tap', 'buy', 'denied', 'daily'];
    for (const n of needed) {
      expect(SOUNDS[n], n).toBeDefined();
      expect(SOUNDS[n].label.length).toBeGreaterThan(2);
    }
  });
  it('note helper gives concert pitch', () => {
    expect(midi(69)).toBe(440);
    expect(midi(81)).toBeCloseTo(880);
  });
});
