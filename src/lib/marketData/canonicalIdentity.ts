/**
 * Canonical market-data identity — the ONE source of truth for
 * instrumentId / session / timeframe strings that flow through the
 * canonical market state store.
 *
 * Founder Aug-16 XX (Data-Identity Law): "Every market datum must have a
 * canonical identity. Never scatter conventions like TSLA / TSLA:NASDAQ /
 * NASDAQ:TSLA / tsla / TSLA.US across different producers... internal
 * systems should use canonical types. Provider-specific values belong in
 * adapters. Add contract tests for identity."
 *
 * Root-cause context: b46fa64 fixed a P0 where /command-deck read
 * {instrumentId: "TSLA:NASDAQ", session: "REGULAR"} while
 * chartMarketStatePublisher wrote {instrumentId: "TSLA", session: "RTH"} —
 * causing the Nectar surfaces to be structurally silent. The fix worked
 * but the two call-sites still constructed identity independently. This
 * module makes THAT class of drift a compile-time and test-time failure:
 * every canonical-store caller MUST route through canonicalMarketStateIdentity().
 */

import { normalizeTFId } from "../timeframes";

export type CanonicalAssetClass = "crypto" | "equity" | "etf" | "futures" | "forex" | "options";
export type CanonicalSession = "RTH" | "EXTENDED" | "OVERNIGHT" | "CLOSED";

export interface CanonicalMarketStateIdentity {
  readonly instrumentId: string;
  readonly session: CanonicalSession;
  readonly timeframeContext: readonly string[];
}

const CRYPTO_TICKERS = new Set([
  "BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX",
  "LINK", "DOT", "LTC", "ATOM", "UNI",
]);

/** Deterministic asset-class inference from a raw symbol string. */
export function canonicalAssetClass(symbol: string): CanonicalAssetClass {
  const upper = symbol.trim().toUpperCase();
  if (!upper) return "equity";
  if (upper.endsWith("1!") || upper.includes("=F")) return "futures";
  if (CRYPTO_TICKERS.has(upper)) return "crypto";
  if (upper.includes("/")) return "forex";
  return "equity";
}

/**
 * Canonical instrument identifier — the string used as the primary key of
 * the canonical market state store and coverage records. Provider adapters
 * may translate to/from this form, but every canonical consumer MUST use
 * the value returned here.
 *
 * Rules:
 *   crypto  → "<TICKER>-USD" (e.g. "BTC-USD")
 *   futures → the futures ticker as-is, uppercased (e.g. "NQ1!")
 *   forex   → the pair as-is, uppercased (e.g. "EUR/USD")
 *   else    → the plain uppercased ticker (e.g. "TSLA")
 *
 * Never suffix with an exchange (":NASDAQ") — the identity is exchange-
 * agnostic at this layer.
 */
export function canonicalInstrumentId(symbol: string, assetClass?: CanonicalAssetClass): string {
  const upper = symbol.trim().toUpperCase();
  if (!upper) throw new Error("canonicalInstrumentId: symbol is required");
  const cls = assetClass ?? canonicalAssetClass(upper);
  if (cls === "crypto") return `${upper}-USD`;
  return upper;
}

/** Canonical session — narrow enum with a deterministic default. */
export function canonicalSession(extHours: boolean): CanonicalSession {
  return extHours ? "EXTENDED" : "RTH";
}

/**
 * The full canonical identity tuple used as the store key. Both writers
 * (chartMarketStatePublisher) and readers (/command-deck, /charts) MUST
 * construct their identity via this helper — never assemble literals like
 * `${symbol}:NASDAQ` inline.
 */
export function canonicalMarketStateIdentity(input: {
  readonly symbol: string;
  readonly timeframe: string;
  readonly extHours?: boolean;
  readonly assetClass?: CanonicalAssetClass;
}): CanonicalMarketStateIdentity {
  const cls = input.assetClass ?? canonicalAssetClass(input.symbol);
  // Timeframe normalization delegates to the app's TFId registry so
  // '1D' stays '1D' (not lowercased to legacy '1d'), '60m' becomes '1h',
  // '1wk' becomes '1W', and unknown ids fail loudly instead of silently
  // producing a store key nothing else will match.
  const raw = input.timeframe.trim();
  const normalized = normalizeTFId(raw);
  if (!normalized) {
    throw new Error(
      `canonicalMarketStateIdentity: unknown timeframe "${raw}" — see @/lib/timeframes TFId registry.`
    );
  }
  return {
    instrumentId: canonicalInstrumentId(input.symbol, cls),
    session: canonicalSession(input.extHours === true),
    timeframeContext: [normalized],
  };
}
