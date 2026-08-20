/**
 * Trade-freshness formatting — a single honest "last trade N ago" label.
 *
 * Reads the canonical `lastTradeAtMs` (the wall-clock ms of the most recent
 * observed trade, added to sessionSymbolStore in the freshness-proof shift).
 * Never invents freshness: with no trade time or no current clock it returns
 * `unknown` and a null label, so consumers render an honest gap rather than a
 * fabricated "0s ago".
 *
 * Thresholds match the MobileSessionPill freshness dot:
 *   fresh  : age < 30s
 *   stale  : age >= 5m
 * (between is "aging" — neither fresh nor stale).
 */

export const TRADE_FRESH_MS = 30_000 as const;
export const TRADE_STALE_MS = 300_000 as const;

export interface TradeFreshness {
  /** Human label like "8s ago" / "3m ago" / "2h ago", or null when unknown. */
  readonly label: string | null;
  /** Age in ms (clamped ≥ 0), or null when it cannot be computed. */
  readonly ageMs: number | null;
  readonly fresh: boolean;
  readonly stale: boolean;
  /** True when there is no trade time or no clock — render honestly, not "0s". */
  readonly unknown: boolean;
}

function formatAgo(ageMs: number): string {
  if (ageMs < 1_000) return `${ageMs}ms ago`;
  if (ageMs < 60_000) return `${Math.floor(ageMs / 1_000)}s ago`;
  if (ageMs < 3_600_000) return `${Math.floor(ageMs / 60_000)}m ago`;
  if (ageMs < 86_400_000) return `${(ageMs / 3_600_000).toFixed(1)}h ago`;
  return `${(ageMs / 86_400_000).toFixed(1)}d ago`;
}

export function formatTradeAge(
  lastTradeAtMs: number | null | undefined,
  nowMs: number | null | undefined,
): TradeFreshness {
  if (
    lastTradeAtMs == null || nowMs == null ||
    !Number.isFinite(lastTradeAtMs) || !Number.isFinite(nowMs) ||
    lastTradeAtMs <= 0 || nowMs <= 0
  ) {
    return { label: null, ageMs: null, fresh: false, stale: false, unknown: true };
  }
  const ageMs = Math.max(0, nowMs - lastTradeAtMs);
  return {
    label: formatAgo(ageMs),
    ageMs,
    fresh: ageMs < TRADE_FRESH_MS,
    stale: ageMs >= TRADE_STALE_MS,
    unknown: false,
  };
}
