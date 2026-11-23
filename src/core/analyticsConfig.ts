/**
 * GameAnalytics keys (Decisions log #39). Empty = analytics switched off.
 * The game key and secret key are meant to be inside the game (GameAnalytics' web SDK works this way).
 * VITE_GA_KEY / VITE_GA_SECRET can override them.
 */
export const GA_GAME_KEY = (import.meta.env?.VITE_GA_KEY as string | undefined) ?? '';
export const GA_SECRET_KEY = (import.meta.env?.VITE_GA_SECRET as string | undefined) ?? '';
