import type { OnlineConfig } from './Leaderboard';

/**
 * Cloud save with a recovery code (Decisions log #42).
 * Progress is backed up online automatically under a secret code (no account, no email).
 * On a new phone, typing the code brings everything back. Never throws.
 */

/** Letters and digits that can't be confused when copied by hand (no 0/O, 1/I/L). */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 12; // 31^12 ≈ 8×10^17 possible codes: impossible to guess

/** A new random recovery code, e.g. "K7QM-3XPA-WN9R". */
export function newRecoveryCode(randomInts: (n: number) => number[] = cryptoInts): string {
  const raw = randomInts(CODE_LENGTH).map((x) => CODE_ALPHABET[x % CODE_ALPHABET.length]).join('');
  return formatCode(raw);
}

/** Tidy what someone typed: capitals, no spaces or dashes. '' if it can't be a code. */
export function normalizeCode(input: string): string {
  const s = input.toUpperCase().replace(/[\s\-_.]/g, '');
  if (s.length !== CODE_LENGTH || [...s].some((c) => !CODE_ALPHABET.includes(c))) return '';
  return s;
}

export function formatCode(raw: string): string {
  const s = raw.replace(/-/g, '');
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

function cryptoInts(n: number): number[] {
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } }).crypto;
  const a = new Uint32Array(n);
  if (c?.getRandomValues) c.getRandomValues(a);
  else for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 2 ** 32);
  return [...a];
}

type FetchFn = (url: string, init: { method: string; headers: Record<string, string>; body: string; keepalive?: boolean }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export type RestoreResult = { ok: true; data: Record<string, unknown> } | { ok: false; error: 'badcode' | 'notfound' | 'offline' };

/** Talks to the backup functions on the server (supabase/add-cloud-save.sql). */
export class CloudSaveClient {
  constructor(private config: OnlineConfig | null, private fetchFn: FetchFn | null = typeof fetch === 'function' ? (fetch.bind(globalThis) as unknown as FetchFn) : null) {}

  get configured(): boolean {
    return !!(this.config?.url && this.config.anonKey && this.fetchFn);
  }

  private async rpc<T>(fn: string, body: Record<string, unknown>, keepalive = false): Promise<T | null> {
    if (!this.configured || !this.config || !this.fetchFn) return null;
    const key = this.config.anonKey;
    const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
    if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
    try {
      const res = await this.fetchFn(`${this.config.url.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(body), keepalive });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  async backup(code: string, data: unknown, keepalive = false): Promise<boolean> {
    const c = normalizeCode(code);
    if (!c) return false;
    const r = await this.rpc<{ ok: boolean }>('backup_save', { p_code: c, p_data: data }, keepalive);
    return !!r?.ok;
  }

  async restore(code: string): Promise<RestoreResult> {
    const c = normalizeCode(code);
    if (!c) return { ok: false, error: 'badcode' };
    const r = await this.rpc<{ ok: boolean; data?: Record<string, unknown> }>('restore_save', { p_code: c });
    if (!r) return { ok: false, error: 'offline' };
    return r.ok && r.data && typeof r.data === 'object' ? { ok: true, data: r.data } : { ok: false, error: 'notfound' };
  }

  async remove(code: string): Promise<boolean> {
    const c = normalizeCode(code);
    if (!c) return true;
    const r = await this.rpc<{ ok: boolean }>('delete_save', { p_code: c });
    return !!r?.ok;
  }
}

/**
 * Backs up automatically a few seconds after progress changes (and when the game is put away).
 * Keeps one upload going at a time; a change during an upload is sent right after.
 */
export class CloudBackup {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private busy = false;
  private again = false;
  dirty = false;

  constructor(
    private client: CloudSaveClient,
    private getCode: () => string,
    private getData: () => unknown,
    private onDone: (ok: boolean) => void,
    private delayMs = 4000,
  ) {}

  /** Progress changed: back up soon. */
  schedule(): void {
    if (!this.client.configured || !this.getCode()) return;
    this.dirty = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.delayMs);
  }

  /** Back up now (if anything changed). */
  async flush(keepalive = false): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.dirty) return;
    if (this.busy) {
      this.again = true;
      return;
    }
    this.busy = true;
    this.dirty = false;
    const ok = await this.client.backup(this.getCode(), this.getData(), keepalive);
    if (!ok) this.dirty = true; // try again next time
    this.busy = false;
    this.onDone(ok);
    if (this.again) {
      this.again = false;
      await this.flush();
    }
  }
}
