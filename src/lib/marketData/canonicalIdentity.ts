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

export type RequestedSessionFilter = "RTH" | "EXTENDED";
export type FuturesActivityState = "OBSERVED" | "UNKNOWN";

export interface AuthoritativeSessionFact {
  readonly instrumentId: string;
  readonly session: CanonicalSession;
  readonly source: string;
  readonly version: string;
  readonly effectiveFrom: number;
  readonly effectiveTo: number;
}

export interface CanonicalFuturesSessionTruthInput {
  readonly instrumentId: string;
  readonly assetClass: CanonicalAssetClass;
  readonly requestedFilter: RequestedSessionFilter;
  readonly observedActivityAt: number | null;
  readonly evaluatedAt: number;
  readonly authoritativeCalendarFact?: AuthoritativeSessionFact | null;
}

export type CanonicalFuturesSessionTruth =
  | {
      readonly resolution: "RESOLVED";
      readonly session: CanonicalSession;
      readonly requestedFilter: RequestedSessionFilter;
      readonly activity: FuturesActivityState;
      readonly label: CanonicalSession;
      readonly detail: string;
      readonly reasons: readonly [];
    }
  | {
      readonly resolution: "UNKNOWN";
      readonly session: null;
      readonly requestedFilter: RequestedSessionFilter;
      readonly activity: FuturesActivityState;
      readonly label: "FUTURES ACTIVITY OBSERVED" | "SESSION UNKNOWN";
      readonly detail: "session classification unavailable — no authoritative calendar";
      readonly reasons: readonly string[];
    };

/**
 * Fail-closed futures-session truth. Observed activity is evidence that a
 * price event exists; it is never evidence of RTH, EXTENDED, OVERNIGHT, or
 * CLOSED. Only a matching, versioned, effective calendar fact may resolve a
 * session. Pure and deterministic: callers inject evaluatedAt.
 */
export function selectCanonicalFuturesSessionTruth(
  input: CanonicalFuturesSessionTruthInput,
): CanonicalFuturesSessionTruth {
  const activityObserved = Number.isFinite(input.observedActivityAt)
    && (input.observedActivityAt ?? 0) > 0
    && Number.isFinite(input.evaluatedAt)
    && input.observedActivityAt! <= input.evaluatedAt;
  const activity: FuturesActivityState = activityObserved ? "OBSERVED" : "UNKNOWN";
  const reasons: string[] = [];
  const fact = input.authoritativeCalendarFact;

  if (input.assetClass !== "futures") reasons.push("Asset is not classified as futures.");
  if (!Number.isFinite(input.evaluatedAt)) reasons.push("Evaluation time is invalid.");
  if (!fact) {
    reasons.push("No authoritative futures calendar fact is available.");
  } else {
    if (fact.instrumentId !== input.instrumentId) reasons.push("Calendar fact instrument does not match.");
    if (!fact.source.trim()) reasons.push("Calendar fact source is missing.");
    if (!fact.version.trim()) reasons.push("Calendar fact version is missing.");
    if (!Number.isFinite(fact.effectiveFrom) || !Number.isFinite(fact.effectiveTo)
      || fact.effectiveFrom > input.evaluatedAt || fact.effectiveTo < input.evaluatedAt) {
      reasons.push("Calendar fact is outside its effective window.");
    }
  }

  if (reasons.length === 0 && fact) {
    return {
      resolution: "RESOLVED",
      session: fact.session,
      requestedFilter: input.requestedFilter,
      activity,
      label: fact.session,
      detail: `${fact.source} · ${fact.version}`,
      reasons: [],
    };
  }

  return {
    resolution: "UNKNOWN",
    session: null,
    requestedFilter: input.requestedFilter,
    activity,
    label: activity === "OBSERVED" ? "FUTURES ACTIVITY OBSERVED" : "SESSION UNKNOWN",
    detail: "session classification unavailable — no authoritative calendar",
    reasons,
  };
}

export interface CanonicalSessionPresentationInput {
  readonly symbol: string;
  readonly requestedSession: string;
  readonly connected: boolean;
  readonly dayOfWeek: number;
  readonly observedActivityAt: number | null;
  readonly evaluatedAt: number;
  readonly authoritativeCalendarFact?: AuthoritativeSessionFact | null;
}

/** One production presenter shared by the Command ribbon and its tests. */
export function selectCanonicalSessionPresentation(
  input: CanonicalSessionPresentationInput,
): { readonly value: string; readonly detail: string; readonly activity: FuturesActivityState } {
  const assetClass = canonicalAssetClass(input.symbol);
  const requestedFilter: RequestedSessionFilter = input.requestedSession.toUpperCase() === "EXTENDED"
    || input.requestedSession.toUpperCase() === "ETH" ? "EXTENDED" : "RTH";

  if (assetClass === "futures") {
    const truth = selectCanonicalFuturesSessionTruth({
      instrumentId: canonicalInstrumentId(input.symbol, assetClass),
      assetClass,
      requestedFilter,
      observedActivityAt: input.observedActivityAt,
      evaluatedAt: input.evaluatedAt,
      authoritativeCalendarFact: input.authoritativeCalendarFact,
    });
    return { value: truth.label, detail: truth.detail, activity: truth.activity };
  }

  const session = input.requestedSession.toUpperCase();
  const isWeekend = input.dayOfWeek === 0 || input.dayOfWeek === 6;
  return {
    value: session,
    detail: session === "CLOSED" || isWeekend
      ? "market closed"
      : input.connected ? "connected" : "no data connection",
    activity: "UNKNOWN",
  };
}

export const US_CASH_SESSION_UNKNOWN_LABEL = "US CASH SESSION · STATUS UNKNOWN" as const;

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
