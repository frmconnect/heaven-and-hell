import type { AnalyticsSink, ProgressStatus } from './Analytics';
import { CURRENCIES, ITEM_TYPES, PLAYER_TYPES } from './Analytics';

/** The parts of the GameAnalytics SDK this game uses. */
interface GANamespace {
  GameAnalytics: {
    configureBuild(b: string): void;
    configureAvailableResourceCurrencies(c: string[]): void;
    configureAvailableResourceItemTypes(t: string[]): void;
    configureAvailableCustomDimensions01(d: string[]): void;
    initialize(key: string, secret: string): void;
    addProgressionEvent(status: number, p1: string, p2: string, p3: string, score: number): void;
    addDesignEvent(id: string, value?: number): void;
    addResourceEvent(flow: number, currency: string, amount: number, itemType: string, itemId: string): void;
    setCustomDimension01(d: string): void;
    onStop(): void;
    onResume(): void;
  };
  EGAProgressionStatus: { Start: number; Complete: number; Fail: number };
  EGAResourceFlowType: { Source: number; Sink: number };
}

/**
 * Sends events to GameAnalytics (Decisions log #39). The SDK is loaded on demand,
 * so players without analytics keys configured never download it.
 * Never throws: analytics must never break the game.
 */
export async function createGameAnalyticsSink(gameKey: string, secretKey: string, build: string): Promise<AnalyticsSink | null> {
  try {
    const mod = (await import('gameanalytics')) as unknown as { gameanalytics: GANamespace };
    const GA = mod.gameanalytics.GameAnalytics;
    const P = mod.gameanalytics.EGAProgressionStatus;
    const F = mod.gameanalytics.EGAResourceFlowType;
    GA.configureBuild(build);
    GA.configureAvailableResourceCurrencies(CURRENCIES);
    GA.configureAvailableResourceItemTypes(ITEM_TYPES);
    GA.configureAvailableCustomDimensions01(PLAYER_TYPES);
    GA.initialize(gameKey, secretKey);
    const safe = (fn: () => void) => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    };
    return {
      progression: (status: ProgressStatus, p1: string, p2?: string, p3?: string, score?: number) =>
        safe(() => GA.addProgressionEvent(status === 'Start' ? P.Start : status === 'Complete' ? P.Complete : P.Fail, p1, p2 ?? '', p3 ?? '', score ?? 0)),
      design: (id: string, value?: number) => safe(() => GA.addDesignEvent(id, value)),
      resource: (flow: 'Source' | 'Sink', currency: string, amount: number, itemType: string, itemId: string) =>
        safe(() => GA.addResourceEvent(flow === 'Source' ? F.Source : F.Sink, currency, amount, itemType, itemId)),
      setPlayerType: (type: string) => safe(() => GA.setCustomDimension01(type)),
      pause: () => safe(() => GA.onStop()),
      resume: () => safe(() => GA.onResume()),
    };
  } catch {
    return null;
  }
}
