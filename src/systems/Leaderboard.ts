import { NAME_PATTERN } from './Names';

/** Connection settings for the online leaderboard (public values; safe to be in the app). */
export interface OnlineConfig {
  url: string; // e.g. https://abcd.supabase.co
  anonKey: string; // the "anon public" key
}

export type Period = 'daily' | 'weekly' | 'alltime';

export interface ScoreEntry {
  playerId: string;
  name: string;
  score: number;
  distance: number;
  coins: number;
  duration: number; // seconds
}

export interface BoardRow {
  rank: number;
  name: string;
  score: number;
  isMe: boolean;
}

export interface MyRank {
  rank: number;
  score: number;
  players: number;
}

export type SubmitResult = { ok: true } | { ok: false; error: string };

/**
 * Client-side copy of the server's checks (supabase/setup.sql — keep both in step).
 * Impossible scores are never sent.
 */
export function plausible(e: ScoreEntry): string | null {
  if (!NAME_PATTERN.test(e.name)) return 'name';
  if (e.duration < 5 || e.distance > e.duration * 34) return 'speed';
  if (e.coins > e.distance || e.score > e.distance * 5 + e.coins * 50 + 100) return 'score';
  return null;
}

type FetchFn = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/**
 * Talks to the online leaderboard (Supabase). Never throws: if there's no internet or it isn't
 * set up, calls return null / an error and the game carries on.
 */
export class Leaderboard {
  constructor(private config: OnlineConfig | null, private fetchFn: FetchFn | null = typeof fetch === 'function' ? (fetch.bind(globalThis) as unknown as FetchFn) : null) {}

  get configured(): boolean {
    return !!(this.config?.url && this.config.anonKey && this.fetchFn);
  }

  private async rpc<T>(fn: string, body: Record<string, unknown>): Promise<T | null> {
    if (!this.configured || !this.config || !this.fetchFn) return null;
    try {
      const res = await this.fetchFn(`${this.config.url.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: { apikey: this.config.anonKey, Authorization: `Bearer ${this.config.anonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  async submit(e: ScoreEntry): Promise<SubmitResult> {
    const bad = plausible(e);
    if (bad) return { ok: false, error: bad };
    const r = await this.rpc<{ ok: boolean; error?: string }>('submit_score', {
      p_player: e.playerId, p_name: e.name, p_score: Math.floor(e.score), p_distance: Math.floor(e.distance), p_coins: Math.floor(e.coins), p_duration: e.duration,
    });
    if (!r) return { ok: false, error: 'offline' };
    return r.ok ? { ok: true } : { ok: false, error: r.error ?? 'refused' };
  }

  async top(period: Period, playerId: string, limit = 50): Promise<BoardRow[] | null> {
    const rows = await this.rpc<{ rank: number; name: string; score: number; is_me: boolean }[]>('get_leaderboard', { p_period: period, p_player: playerId, p_limit: limit });
    return rows ? rows.map((r) => ({ rank: Number(r.rank), name: r.name, score: r.score, isMe: !!r.is_me })) : null;
  }

  async myRank(period: Period, playerId: string): Promise<MyRank | null> {
    const rows = await this.rpc<{ rank: number; score: number; players: number }[]>('get_my_rank', { p_period: period, p_player: playerId });
    const r = rows?.[0];
    return r ? { rank: Number(r.rank), score: r.score, players: Number(r.players) } : null;
  }
}

/** A random anonymous id for this phone (Decisions log #32). */
export function newPlayerId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const h = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${h()}${h()}-${h()}-4${h().slice(1)}-a${h().slice(1)}-${h()}${h()}${h()}`;
}
