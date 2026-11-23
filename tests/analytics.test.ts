import { describe, expect, it } from 'vitest';
import { Analytics, clean, RecordingSink } from '../src/systems/Analytics';

describe('Analytics events', () => {
  it('records a journey: start, each stage, and where the player failed', () => {
    const sink = new RecordingSink();
    const a = new Analytics(sink);
    a.runStart('journey', 'hell');
    a.stageReached('journey', 'stairway', 2100);
    a.runEnd('journey', 'caught', 2650.7, 3100, 42, 160.4);
    expect(sink.events).toEqual([
      'design:run:start:journey',
      'progression:Start:journey:hell',
      'progression:Complete:journey:hell=2100',
      'progression:Start:journey:stairway',
      'progression:Fail:journey:stairway=3100',
      'design:run:end:journey:caught:stairway=2650',
      'design:run:seconds:journey=160',
      'resource:Source:coins:42:run:journey',
    ]);
  });
  it('records judgment and coins spent', () => {
    const sink = new RecordingSink();
    const a = new Analytics(sink);
    a.judgment(true, 88, 1000, 15, 1);
    a.coinsOut(1200, 'shop', 'angelwings');
    expect(sink.events).toContain('design:judgment:pass=88');
    expect(sink.events).toContain('resource:Source:coins:1000:judgment:pass');
    expect(sink.events).toContain('resource:Sink:coins:1200:shop:angelwings');
  });
  it('keeps event names to the characters GameAnalytics accepts', () => {
    expect(clean("Heaven's Gate!")).toBe('Heaven_s_Gate_');
    expect(clean('')).toBe('none');
  });
});
