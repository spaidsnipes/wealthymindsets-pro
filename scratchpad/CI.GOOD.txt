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
/**
 * "24X7" is the continuous-market session for instruments that never close
 * (crypto). RTH/EXTENDED are US-equity concepts and must never be applied to
 * a continuous market — see canonicalSession().
 */
export type CanonicalSession = "RTH" | "EXTENDED" | "OVERNIGHT" | "CLOSED" | "24X7";

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

  // Continuous markets never close. Echoing the requested RTH/EXTENDED filter
  // here produced "session RTH" for BTCUSD, and the weekend branch below would
  // additionally have claimed "market closed" while crypto was actively
  // trading — two false statements from one fall-through.
  if (assetClass === "crypto") {
    return {
      value: "24X7",
      detail: input.connected ? "continuous market · connected" : "continuous market · no data connection",
      activity: "UNKNOWN",
    };
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

export const US_CASH_SESSION_CLOSED_LABEL = "US CASH SESSION · CLOSED" as const;

/**
 * The one writer for the bottom index bar's session chip.
 *
 * "STATUS UNKNOWN" is honest on a Tuesday — this codebase holds no intraday
 * exchange calendar, so it genuinely cannot prove RTH from ETH. But printing
 * it on a Saturday is false humility: closure IS established there, and canon
 * §8 is equally violated by withholding a fact we hold as by inventing one.
 *
 * @param at `null` before mount (and on the server) — the caller must not read
 *   the clock during render; see useSessionClockDate. `null` yields the
 *   unknown label, so the settle can only ever sharpen the claim.
 */
export function selectUsCashSessionBarLabel(
  at: Date | null,
): typeof US_CASH_SESSION_UNKNOWN_LABEL | typeof US_CASH_SESSION_CLOSED_LABEL {
  if (!at) return US_CASH_SESSION_UNKNOWN_LABEL;
  // Delegated on purpose: the weekend rules live in exactly one function, so
  // a future holiday calendar lands here and in the badges simultaneously.
  // "SPY" stands for the US cash market this bar reports on.
  return provenSessionClosure("SPY", at) === false
    ? US_CASH_SESSION_CLOSED_LABEL
    : US_CASH_SESSION_UNKNOWN_LABEL;
}

/** Continuous markets have no session to close. */
export const SESSION_TOKEN_CONTINUOUS = "24X7" as const;
/** Closure is ESTABLISHED — see provenSessionClosure's day rules. */
export const SESSION_TOKEN_CLOSED = "CLOSED" as const;
/** Not established. Honest on a weekday; this codebase holds no intraday calendar. */
export const SESSION_TOKEN_UNKNOWN = "SESSION ?" as const;

export interface CanonicalSessionTokenInput {
  readonly symbol: string;
  /**
   * Local wall-clock time, or `null` on the server and the first client
   * render. See useSessionClockDate — reading the clock during render is the
   * mechanism behind five prior React #418 hydration bugs here.
   */
  readonly at: Date | null;
  readonly assetClass?: CanonicalAssetClass;
}

export interface CanonicalSessionTokenResult {
  /** The compact chip text. Safe for 8px chrome; never longer than "SESSION ?". */
  readonly token: string;
  /** Why the token says what it says — for the title/aria, never invented. */
  readonly detail: string;
  /** True when the token rests on an established fact, not on the absence of one. */
  readonly established: boolean;
}

/**
 * The ONE writer for a compact session chip in tight chrome.
 *
 * THE DEFECT, AS FOUND (live, 2026-09-05, a Saturday)
 *
 *   MobileSessionPill — the phone header, and mobile is the PRIMARY form
 *   factor — decided its session chip with a single ternary:
 *
 *     const sessionToken = futuresTruth ? "SESSION ?" : session;
 *
 *   Both halves were wrong, in opposite directions, on the same day:
 *
 *     futures     → printed "SESSION ?" while /charts, one element away and
 *                   for the SAME instrument, printed "SESSION CLOSED". A
 *                   one-screen contradiction, and the shrug was the false
 *                   one: provenSessionClosure("GC1!", saturday) is `false`,
 *                   i.e. PROVEN CLOSED.
 *     non-futures → printed `identity.session`, which is
 *                   canonicalSession(extHours, cls) — a STORE KEY, not a
 *                   display truth. It returns "RTH" for every non-crypto
 *                   instrument on every day of the week, so the phone header
 *                   asserted the US Regular session was running on a Saturday.
 *
 *   `futuresTruth` is also a dead predicate: selectCanonicalFuturesSessionTruth
 *   returns a non-nullable object, so for futures that ternary was a constant.
 *   The branch tested the RESULT'S EXISTENCE and discarded everything the
 *   canonical owner had computed — the same "check written against presence
 *   rather than shape" defect this codebase has now found five times.
 *
 * WHY "SESSION ?" IS STILL RIGHT ON A TUESDAY
 *
 *   §8 is violated symmetrically. Inventing RTH is an overclaim; withholding
 *   an established Saturday closure is false humility. This codebase holds no
 *   INTRADAY exchange calendar, so it genuinely cannot separate RTH from ETH
 *   at 11am — but the weekend it can prove. The token therefore only ever
 *   sharpens: `at: null` and every unproven weekday yield the unknown token,
 *   exactly as selectUsCashSessionBarLabel does for the index bar.
 *
 *   The extHours toggle is a USER PREFERENCE, not a market fact, and so can
 *   never appear here. That is what made "RTH" reachable on a weekend.
 */
export function selectCanonicalSessionToken(
  input: CanonicalSessionTokenInput,
): CanonicalSessionTokenResult {
  const cls = input.assetClass ?? canonicalAssetClass(input.symbol);

  // Asked first: a continuous market has no session to close, so "CLOSED"
  // could never be right for it and "SESSION ?" would be false humility of
  // its own — 24/7 IS the established answer.
  if (cls === "crypto") {
    return {
      token: SESSION_TOKEN_CONTINUOUS,
      detail: "continuous market — this instrument has no session to close",
      established: true,
    };
  }

  // Delegated on purpose, like the index bar above: the weekend rules live in
  // exactly one function, so a future holiday calendar reaches every surface
  // at once. `=== false` and not a truthiness test — provenSessionClosure
  // returns `false | null`, and `null` must NOT be read as "open".
  if (input.at && provenSessionClosure(input.symbol, input.at) === false) {
    return {
      token: SESSION_TOKEN_CLOSED,
      detail: "closure is established for this market today",
      established: true,
    };
  }

  return {
    token: SESSION_TOKEN_UNKNOWN,
    detail: "no exchange calendar — the current session is not established",
    established: false,
  };
}

/**
 * Bare cash-index names. Each names an INDEX, not a tradeable contract.
 *
 * Held as data because the rule below has to be executable: a comment saying
 * "don't call ES1! the S&P 500" is not enforceable, and this exact mislabel
 * shipped to production and was read off the Founder's screen on 2026-09-05.
 */
export const CASH_INDEX_DISPLAY_NAMES = [
  "S&P 500", "SPX", "NASDAQ", "NASDAQ 100", "NDX",
  "DOW JONES", "DOW", "DJIA", "RUSSELL 2000", "RUT",
] as const;

/**
 * True when `label` names a cash index while `symbol` is a futures contract.
 *
 * The distinction is not pedantry. ES1! and the S&P 500 differ by basis, they
 * keep different sessions, and they settle differently — so a bar that prints
 * one number under both names teaches the trader they are the same instrument.
 * They are not, and on the first night the trader acts on a futures move as if
 * the cash index had moved, the product has lied to him about what he owns.
 */
export function labelMisnamesInstrument(label: string, symbol: string): boolean {
  if (canonicalAssetClass(symbol) !== "futures") return false;
  const norm = label.trim().toUpperCase().replace(/\s+/g, " ");
  return CASH_INDEX_DISPLAY_NAMES.some((n) => n === norm);
}

/**
 * The one owner of the bottom index bar's symbol -> label pairing.
 *
 * OBSERVED LIVE 2026-09-05 on the Founder's screen: this bar rendered
 *   "NASDAQ 29565.25 +40.50 +0.14%"   and   "S&P 500 7722.00 -32.75 -0.42%"
 * while the ticker rail on the SAME screen carried byte-identical changes as
 *   "NQ1! SESSION CLOSED - LAST VERIFIED"  and  "ES1! SESSION CLOSED - LAST VERIFIED".
 * One price, two identities, one screen — the label named an instrument the
 * pixel did not hold, which is the LIVING-PIXEL LAW violation in its purest
 * form. The component was already careful about WHETHER to paint a number
 * (it renders an em-dash without a verified quote); nobody had checked WHAT
 * the number was called.
 *
 * Fixed by renaming the pixel, deliberately NOT by switching to a cash-index
 * feed: this codebase holds no such feed, and inventing one to satisfy a label
 * would trade an honest mislabel for fabricated data.
 *
 * Pairs live here, not in the component, so the symbol and the name it is
 * displayed under cannot drift apart in a later edit.
 */
export const US_INDEX_BAR_INSTRUMENTS = [
  { symbol: "YM1!", label: "Dow Futures" },
  { symbol: "NQ1!", label: "Nasdaq Futures" },
  { symbol: "ES1!", label: "S&P Futures" },
] as const;

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
 * Establish session closure WITHOUT an authoritative exchange calendar.
 *
 * Deliberately asymmetric — it returns only:
 *   false → the session is PROVEN closed
 *   null  → not established (a weekday, an unseen holiday, an intraday hour
 *           for which this codebase holds no calendar)
 *
 * It never returns `true`. Proving a session OPEN needs a real calendar plus
 * intraday hours, and §8 forbids implying an active session that has not been
 * established. Downstream, only an explicit `false` may change a label — so
 * this helper can retire a false ACTIVE claim and can never manufacture one.
 *
 * Day rules, narrowed to what is certain:
 *   Saturday — closed for every non-continuous market.
 *   Sunday   — closed for US cash markets only. Futures and FX reopen Sunday
 *              evening, so claiming Sunday closure for them would be the same
 *              overreach in the opposite direction.
 *   Crypto   — continuous; there is no session to close, ever.
 */
export function provenSessionClosure(symbol: string, at: Date): false | null {
  const cls = canonicalAssetClass(symbol);
  if (cls === "crypto") return null;
  const day = at.getDay();
  if (day === 6) return false;
  if (day === 0 && (cls === "equity" || cls === "etf" || cls === "options")) return false;
  return null;
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
/**
 * Map the requested-hours toggle to a canonical session.
 *
 * Real from-USE defect (2026-09-03): /command-deck rendered
 * "session RTH · connected" for BTCUSD. RTH means US Regular Trading Hours
 * (09:30–16:00 ET) — an equity concept with no meaning for a 24/7 crypto
 * instrument. The extHours toggle does not apply to a continuous market at
 * all, so the asset class decides.
 *
 * `assetClass` is optional for backward compatibility; omit it only where the
 * instrument is known not to be continuous.
 */
/**
 * KNOWN GAP — do NOT "fix" this by returning "CLOSED" on a weekend.
 *
 * `CanonicalSession` includes "CLOSED", but this function can never produce
 * it, so the canonical store records `session: "RTH"` on a Saturday and
 * `sessionOpenFrom()` maps that to `true`. That is a genuine §8 overclaim.
 *
 * It is NOT repairable here: `session` is part of `canonicalMarketStateKey`
 * (see canonicalMarketStateIdentity below). Making this calendar-dependent
 * would move the key under producers and readers at different moments —
 * precisely the "reader looks up a key nothing ever writes" P0 documented
 * there. Closure is a property of the STATE, not of the IDENTITY.
 *
 * The fix is to stop encoding session in the key, or to carry closure as a
 * separate state field, with a producer/reader contract test. Until then the
 * user-visible surfaces get their truth from `provenSessionClosure()`, which
 * is calendar-dependent by design and touches no key.
 */
export function canonicalSession(
  extHours: boolean,
  assetClass?: CanonicalAssetClass,
): CanonicalSession {
  if (assetClass === "crypto") return "24X7";
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
    // MUST pass the asset class. `session` is part of canonicalMarketStateKey,
    // so producer and reader have to agree exactly. Omitting `cls` here made
    // the chart publish a crypto snapshot under session "24X7" while every
    // reader looked it up under "RTH" — the canvas would read a key nothing
    // ever writes and silently render as unresolved.
    session: canonicalSession(input.extHours === true, cls),
    timeframeContext: [normalized],
  };
}
