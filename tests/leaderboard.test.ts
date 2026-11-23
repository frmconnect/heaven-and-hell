import { describe, expect, it } from 'vitest';
import { Leaderboard, newPlayerId, plausible, type ScoreEntry } from '../src/systems/Leaderboard';
import { NAME_PATTERN, nameChoices } from '../src/systems/Names';

const entry = (o: Partial<ScoreEntry> = {}): ScoreEntry => ({ playerId: '00000000-0000-4000-a000-000000000001', name: 'Radiant Pilgrim 42', score: 5000, distance: 2000, coins: 150, duration: 90, ...o });

describe('Heavenly names', () => {
  it('generates different names that match the server rule', () => {
    const names = nameChoices(6, 1);
    expect(new Set(names).size).toBe(6);
    for (const n of names) expect(n).toMatch(NAME_PATTERN);
  });
  it('typed names are not accepted', () => {
    expect(NAME_PATTERN.test('badword')).toBe(false);
    expect(NAME_PATTERN.test('Radiant Pilgrim 4200')).toBe(false);
  });
});

describe('Score checks (same as the server)', () => {
  it('accepts a normal run', () => expect(plausible(entry())).toBeNull());
  it('refuses impossible speed', () => expect(plausible(entry({ distance: 9000, duration: 60 }))).toBe('speed'));
  it('refuses too many points for the distance', () => expect(plausible(entry({ score: 999999 }))).toBe('score'));
  it('refuses a made-up name', () => expect(plausible(entry({ name: 'hello' }))).toBe('name'));
});

describe('Leaderboard client', () => {
  it('does nothing (and does not crash) when not set up', async () => {
    const lb = new Leaderboard(null);
    expect(lb.configured).toBe(false);
    expect(await lb.top('daily', 'x')).toBeNull();
    expect(await lb.submit(entry())).toEqual({ ok: false, error: 'offline' });
  });
  it('sends scores and reads boards from the server', async () => {
    const calls: { url: string; body: unknown; headers: Record<string, string> }[] = [];
    const fake = async (url: string, init: { headers: Record<string, string>; body: string }) => {
      calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
      const data = url.endsWith('submit_score') ? { ok: true }
        : url.endsWith('get_leaderboard') ? [{ rank: 1, name: 'Holy Dove 3', score: 9000, is_me: false }, { rank: 2, name: 'Radiant Pilgrim 42', score: 5000, is_me: true }]
        : [{ rank: 2, score: 5000, players: 17 }];
      return { ok: true, status: 200, json: async () => data };
    };
    const lb = new Leaderboard({ url: 'https://demo.supabase.co/', anonKey: 'eyJpublic-key' }, fake);
    expect(await lb.submit(entry())).toEqual({ ok: true });
    expect(calls[0].url).toBe('https://demo.supabase.co/rest/v1/rpc/submit_score');
    expect(calls[0].headers.apikey).toBe('eyJpublic-key');
    const rows = await lb.top('weekly', 'me');
    expect(rows?.[1]).toEqual({ rank: 2, name: 'Radiant Pilgrim 42', score: 5000, isMe: true });
    expect(await lb.myRank('alltime', 'me')).toEqual({ rank: 2, score: 5000, players: 17 });
  });
  it('sends new publishable keys only as apikey, old anon keys also as Bearer', async () => {
    const seen: Record<string, string>[] = [];
    const fake = async (_u: string, init: { headers: Record<string, string> }) => {
      seen.push(init.headers);
      return { ok: true, status: 200, json: async () => [] };
    };
    await new Leaderboard({ url: 'https://x.supabase.co', anonKey: 'sb_publishable_abc' }, fake).top('daily', 'me');
    await new Leaderboard({ url: 'https://x.supabase.co', anonKey: 'eyJhbGciOi.test' }, fake).top('daily', 'me');
    expect(seen[0].apikey).toBe('sb_publishable_abc');
    expect(seen[0].Authorization).toBeUndefined();
    expect(seen[1].Authorization).toBe('Bearer eyJhbGciOi.test');
  });
  it('treats a network failure as offline', async () => {
    const lb = new Leaderboard({ url: 'https://demo.supabase.co', anonKey: 'k' }, async () => { throw new Error('no internet'); });
    expect(await lb.submit(entry())).toEqual({ ok: false, error: 'offline' });
    expect(await lb.myRank('daily', 'me')).toBeNull();
  });
  it('"Delete my data" asks the server to remove this player\'s scores', async () => {
    const calls: string[] = [];
    const lb = new Leaderboard({ url: 'https://x.supabase.co', anonKey: 'sb_publishable_k' }, async (url: string, init: { body: string }) => {
      calls.push(url + ' ' + init.body);
      return { ok: true, status: 200, json: async () => ({ ok: true, deleted: 3 }) };
    });
    expect(await lb.deleteMine('me-123')).toBe(true);
    expect(calls[0]).toContain('/rpc/delete_my_scores');
    expect(calls[0]).toContain('me-123');
    expect(await new Leaderboard(null).deleteMine('x')).toBe(false);
  });
  it('player ids look like UUIDs and differ', () => {
    const a = newPlayerId(), b = newPlayerId();
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(a).not.toBe(b);
  });
});
