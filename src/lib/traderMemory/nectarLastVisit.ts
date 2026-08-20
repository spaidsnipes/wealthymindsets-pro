import type { NectarAggregate } from "./nectarComparison";

/**
 * Nectar Vault "since your last visit" persistence.
 *
 * When a trader opens /nectar/[symbol], we compare the current observations
 * against what was recorded the LAST time they visited — a durable-memory
 * promise: the Vault remembers when you last looked and shows what changed.
 *
 * Stored per symbol in localStorage. Only the fields the comparison needs are
 * kept (tradeCount, bigTradeCount, delta) + the capture time. Fail-closed:
 * malformed/absent records read back as null (no fabricated prior visit).
 */

export interface NectarVisit {
  readonly capturedAtMs: number;
  readonly tradeCount: number;
  readonly bigTradeCount: number;
  readonly delta: number;
}

const KEY_PREFIX = "wm_nectar_lastvisit_";

function keyFor(symbol: string): string {
  return `${KEY_PREFIX}${symbol.trim().toUpperCase()}`;
}

/** Pure: build a visit record from a current aggregate + capture time. */
export function visitFromAggregate(agg: NectarAggregate, capturedAtMs: number): NectarVisit {
  return {
    capturedAtMs,
    tradeCount: agg.tradeCount,
    bigTradeCount: agg.bigTradeCount,
    delta: agg.delta,
  };
}

/** Pure: validate a parsed JSON value into a NectarVisit or null. */
export function parseVisit(value: unknown): NectarVisit | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const nums = ["capturedAtMs", "tradeCount", "bigTradeCount", "delta"] as const;
  for (const k of nums) {
    if (typeof v[k] !== "number" || !Number.isFinite(v[k] as number)) return null;
  }
  if ((v.capturedAtMs as number) <= 0 || (v.tradeCount as number) < 0) return null;
  return {
    capturedAtMs: v.capturedAtMs as number,
    tradeCount: v.tradeCount as number,
    bigTradeCount: v.bigTradeCount as number,
    delta: v.delta as number,
  };
}

/** localStorage read (SSR-safe, fail-closed). */
export function readLastVisit(symbol: string): NectarVisit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(symbol));
    if (!raw) return null;
    return parseVisit(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** localStorage write (SSR-safe, best-effort). */
export function writeLastVisit(symbol: string, visit: NectarVisit): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(symbol), JSON.stringify(visit));
  } catch {
    // Quota / privacy mode — a missed write just means no "since last visit"
    // next time; never throws into the render path.
  }
}
