import { describe, expect, it } from 'vitest';
import { CloudBackup, CloudSaveClient, CODE_ALPHABET, formatCode, newRecoveryCode, normalizeCode } from '../src/systems/CloudSave';
import { SaveData, type KeyValueStore } from '../src/systems/SaveData';

/** A pretend server that behaves like supabase/add-cloud-save.sql. */
function fakeServer() {
  const db = new Map<string, unknown>();
  let online = true;
  const valid = (c: unknown) => typeof c === 'string' && /^[A-HJKMNP-Z2-9]{12}$/.test(c);
  const fetchFn = async (url: string, init: { body: string }) => {
    if (!online) throw new Error('offline');
    const fn = url.split('/').pop();
    const b = JSON.parse(init.body);
    let out: unknown;
    if (fn === 'backup_save') {
      if (!valid(b.p_code) || JSON.stringify(b.p_data).length > 32768) out = { ok: false };
      else { db.set(`h:${b.p_code}`, JSON.parse(JSON.stringify(b.p_data))); out = { ok: true }; }
    } else if (fn === 'restore_save') {
      out = db.has(`h:${b.p_code}`) ? { ok: true, data: db.get(`h:${b.p_code}`) } : { ok: false, error: 'notfound' };
    } else if (fn === 'delete_save') { db.delete(`h:${b.p_code}`); out = { ok: true }; }
    return { ok: true, status: 200, json: async () => out };
  };
  return { db, fetchFn, setOnline: (v: boolean) => { online = v; } };
}

const memStore = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
const CFG = { url: 'https://x.supabase.co', anonKey: 'sb_publishable_test' };

describe('Recovery codes', () => {
  it('look like K7QM-3XPA-WN9R and only use letters that can’t be confused', () => {
    for (let i = 0; i < 200; i++) {
      const c = newRecoveryCode();
      expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect([...c.replace(/-/g, '')].every((ch) => CODE_ALPHABET.includes(ch))).toBe(true);
      expect(c).not.toMatch(/[01OIL]/);
    }
  });
  it('are different every time', () => {
    const set = new Set(Array.from({ length: 1000 }, () => newRecoveryCode()));
    expect(set.size).toBe(1000);
  });
  it('are forgiving when typed: lower case, spaces, missing dashes', () => {
    expect(normalizeCode(' k7qm 3xpa-wn9r ')).toBe('K7QM3XPAWN9R');
    expect(formatCode('K7QM3XPAWN9R')).toBe('K7QM-3XPA-WN9R');
    expect(normalizeCode('K7QM-3XPA')).toBe(''); // too short
    expect(normalizeCode('K7QM-3XPA-WN9O')).toBe(''); // O is never in a code
  });
});

describe('Cloud save: lose your phone, keep your progress', () => {
  it('backs up automatically and restores everything on a new phone', async () => {
    const server = fakeServer();
    const client = new CloudSaveClient(CFG, server.fetchFn);
    // old phone
    const oldPhone = new SaveData(memStore());
    oldPhone.data.cloudCode = newRecoveryCode();
    const backup = new CloudBackup(client, () => oldPhone.data.cloudCode, () => oldPhone.backupData(), () => {}, 1);
    oldPhone.onSave = () => backup.schedule();
    Object.assign(oldPhone.data, { wallet: 5432, ascended: 1, owned: ['angel', 'firewings'], outfit: 'angel', mLevel: 7, playerName: 'Fearless Halo 83', playerId: 'abc-123' });
    oldPhone.save();
    await new Promise((r) => setTimeout(r, 20));
    expect(server.db.size).toBe(1);
    // the phone's own bookkeeping isn't uploaded
    const stored = [...server.db.values()][0] as Record<string, unknown>;
    expect(stored.cloudCode).toBeUndefined();

    // new phone: fresh game, types the old code
    const newPhone = new SaveData(memStore());
    newPhone.data.cloudCode = newRecoveryCode();
    const r = await client.restore(oldPhone.data.cloudCode.toLowerCase());
    expect(r.ok).toBe(true);
    if (r.ok) newPhone.restoreFrom(r.data, normalizeCode(oldPhone.data.cloudCode));
    const d = newPhone.data;
    expect([d.wallet, d.ascended, d.outfit, d.mLevel, d.playerName, d.playerId]).toEqual([5432, 1, 'angel', 7, 'Fearless Halo 83', 'abc-123']);
    expect(d.owned).toEqual(['angel', 'firewings']);
    // the new phone now uses the old code, so both stay the same player
    expect(normalizeCode(d.cloudCode)).toBe(normalizeCode(oldPhone.data.cloudCode));
  });

  it('a wrong code finds nothing; no internet is reported as offline', async () => {
    const server = fakeServer();
    const client = new CloudSaveClient(CFG, server.fetchFn);
    expect(await client.restore('AAAA-BBBB-CCCC')).toEqual({ ok: false, error: 'notfound' });
    expect(await client.restore('nope')).toEqual({ ok: false, error: 'badcode' });
    server.setOnline(false);
    expect(await client.restore('AAAA-BBBB-CCCC')).toEqual({ ok: false, error: 'offline' });
  });

  it('a backup that fails (no internet) is tried again on the next change', async () => {
    const server = fakeServer();
    const client = new CloudSaveClient(CFG, server.fetchFn);
    const save = new SaveData(memStore());
    save.data.cloudCode = newRecoveryCode();
    const results: boolean[] = [];
    const backup = new CloudBackup(client, () => save.data.cloudCode, () => save.backupData(), (ok) => results.push(ok), 1);
    save.onSave = () => backup.schedule();
    server.setOnline(false);
    save.data.wallet = 10;
    save.save();
    await new Promise((r) => setTimeout(r, 20));
    expect(results).toEqual([false]);
    server.setOnline(true);
    save.data.wallet = 20;
    save.save();
    await new Promise((r) => setTimeout(r, 20));
    expect(results).toEqual([false, true]);
    expect(([...server.db.values()][0] as { wallet: number }).wallet).toBe(20);
  });

  it('a bad backup can’t break the game: junk values are ignored', () => {
    const save = new SaveData(memStore());
    expect(save.restoreFrom(null, 'AAAABBBBCCCC')).toBe(false);
    save.restoreFrom({ wallet: 'lots', owned: [1, 'angel'], mLevel: Infinity, outfit: 'angel' }, 'AAAABBBBCCCC');
    expect(save.data.wallet).toBe(0);
    expect(save.data.owned).toEqual(['angel']);
    expect(save.data.mLevel).toBe(1);
    expect(save.data.outfit).toBe('angel');
  });

  it('reset progress keeps your code (the backup then holds the fresh start)', () => {
    const save = new SaveData(memStore());
    save.data.cloudCode = 'AAAABBBBCCCC';
    save.data.wallet = 99;
    save.resetProgress();
    expect(save.data.cloudCode).toBe('AAAABBBBCCCC');
    expect(save.data.wallet).toBe(0);
  });
});
