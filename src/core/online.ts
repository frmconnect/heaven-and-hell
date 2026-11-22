import type { OnlineConfig } from '../systems/Leaderboard';

/**
 * Online leaderboard settings (Supabase project URL + "anon public" key).
 * These are public values, designed to be inside the app. Empty = leaderboard not switched on yet.
 * (VITE_SUPABASE_URL / VITE_SUPABASE_KEY can override them, e.g. to test against a pretend server.)
 */
const URL = (import.meta.env?.VITE_SUPABASE_URL as string | undefined) ?? 'https://aiwocmrtanrrhvzeugrw.supabase.co';
const KEY = (import.meta.env?.VITE_SUPABASE_KEY as string | undefined) ?? 'sb_publishable_bKbh2Wthvv1dSFO35mIqPA_3lGwnmPK';

export const ONLINE: OnlineConfig | null = URL && KEY ? { url: URL, anonKey: KEY } : null;
