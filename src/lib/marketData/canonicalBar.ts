/**
 * THE CANONICAL BAR — one past, with its identity attached.
 *
 * Source: SUPPORT — DECISION_ID Lifecycle + CanonicalBar + Connected Gates
 * (2026-09-18), §3. The canon's instruction is one sentence:
 *
 *   "No invention ships its own bar builder."
 *
 * ── WHAT THIS REPO ACTUALLY LOOKS LIKE TODAY ─────────────────────────────────
 *
 * WRITTEN when seventeen files under src/ declared or destructured an OHLC
 * shape and at least three declared the SAME anonymous six fields under three
 * different names — `LiveBar` in liveBarPolicy.ts, `Bar` in markov.ts,
 * `OHLCVBar` in types/index.ts. The defect that made that intolerable was that
 * they were structurally identical and semantically unrelated, which is the
 * worst of both: TypeScript let any one be passed where another was expected,
 * and nothing in the type said whether the number in `close` was a live print,
 * a delayed print, a synthetic aggregate, or the last value a closed session
 * happened to leave behind.
 *
 * CORRECTED 2026-09-18, and the correction matters more than the original.
 * ALL THREE OF THOSE NAMES ARE NOW RETIRED, along with fifteen others; the
 * census in `canonicalBarAdoption.sentinel.test.ts` fell from twenty-two to
 * four and NOT ONE BYTE-FOR-BYTE DUPLICATE OF `LegacyOhlcvTuple` REMAINS.
 *
 * AND THIS FILE STILL HAS ZERO PRODUCTION CONSUMERS. Read those two sentences
 * together, because apart they are both misleading. The duplicate-NAMING defect
 * is fixed. The defect this file exists to fix — that a bar cannot say which
 * symbol, session, fidelity, source, provenance or truth epoch it belongs to —
 * is EXACTLY as open as it was at twenty-two. Consolidating twenty-two labels
 * onto one legacy tuple moved every ingress no closer to the artery. Anyone
 * reading the falling census as adoption progress is reading it wrong, and this
 * paragraph is here so that misreading has to survive an explicit denial.
 *
 * That is the cut the DECISION_ID doc names. A second bar shape is a second
 * past, and two pasts that disagree produce a chart and a receipt that disagree
 * about the same instant, with capital attached to the difference.
 *
 * ── WHAT A CANONICAL BAR CARRIES THAT AN OHLCV TUPLE DOES NOT ────────────────
 *
 *   barId        Deterministic. The same bar redelivered is the SAME id.
 *   symbolId     Which instrument. An OHLCV tuple does not know.
 *   sessionId    Which session. A 09:30 bar from Tuesday is not Monday's.
 *   timeframe    A 1m bar and a 1D bar are not comparable observations.
 *   asOf         When the MARKET did it.
 *   receivedAt   When WE heard. A different clock. Never the tiebreaker.
 *   fidelity     Whether this number may be painted, and at what treatment.
 *   source       Which provider said so.
 *   provenance   How it got here — LIVE_STREAM, REST_BACKFILL, REPLAY, DERIVED.
 *   truthEpoch   Monotonic. Bumped when the pipeline's truth changed under us.
 *
 * ── THE TWO CLOCKS, AGAIN ────────────────────────────────────────────────────
 *
 * `asOf` and `receivedAt` are the same lesson `decisionLifecycle.ts` learned at
 * the recon door: arrival order is not authority order. A backfilled bar for
 * 09:31 arriving at 14:00 is not newer than the live 13:59 bar. If any code
 * here sorted by `receivedAt`, the chart would render the trader's morning at
 * the end of their afternoon.
 *
 * ── AND WHY NO DERIVED FIELD LIVES HERE ──────────────────────────────────────
 *
 * There is no `delta`, no `vwap`, no `imbalance`, no `isAbsorption`. An
 * invention COMPUTES from bars; it does not stash its answer inside one. The
 * moment a bar carries a reading, two inventions disagree about which reading
 * the bar "has", and the bar has quietly become a second opinion wearing the
 * costume of a fact. This is `marketObjectKinds.ts`'s "attachments reprint
 * bars" rule pointed in the other direction.
 */

import { MARKET_FIDELITIES, type MarketFidelity } from "./marketFidelityAlgebra";

/* ── SESSION IDENTITY, AND THE WALL THE MIGRATION HIT ──────────────────────── */

/**
 * MEASURED 2026-09-18, while attempting M8's first real ingress migration.
 *
 * This artery has zero production consumers, and the reason turned out not to
 * be neglect. `sessionId` is REQUIRED above, and NOTHING in this product
 * produces one. The only place a session is known at all is
 * `CanonicalMarketEvent.sessionId`, which is OPTIONAL and is populated by
 * exactly one adapter — `webullTicksBrowser.ts`, passing through the provider's
 * own `tradingSession` string. Every other ingress has no idea which session a
 * print belongs to.
 *
 * So a migrating ingress faced two bad doors: invent a session (launder unknown
 * data into a canonical field, which is the exact failure `toLegacyTuple`'s
 * missing inverse was written to prevent), or refuse every bar that is not
 * Webull's (amputate the live chart). Neither is acceptable, so the wall is
 * named here instead of being climbed quietly.
 *
 * The third door: an ingress may say IT DOES NOT KNOW, out loud, in the field
 * itself. `SESSION_UNKNOWN` is not a default and not a placeholder to be
 * cleaned up later — it is an assertion of ignorance that travels with the bar,
 * and the house treats it as the limitation it is (see `admitBar`).
 */
export const SESSION_UNKNOWN = "SESSION_UNKNOWN";

/**
 * The venue does not segment its trading into sessions. ADDED 2026-09-18 by the
 * SECOND ingress migration, and it is the opposite kind of statement to
 * `SESSION_UNKNOWN` — which is why it must not be spelled the same way.
 *
 * `SESSION_UNKNOWN` says WE DO NOT KNOW which session a print belongs to.
 * `SESSION_CONTINUOUS` says THERE IS NO SUCH THING HERE: the public crypto spot
 * venues behind `/api/exchange` run without an open, a close, an auction, or a
 * pre/post distinction. Yahoo's chart feed genuinely withholds the session;
 * Coinbase is not withholding anything, because the question does not apply to
 * a book that never stops. Answering "unknown" for a continuous venue would be
 * its own small lie — we would be reporting an absence of information where the
 * information exists and is "none."
 *
 * ── THE CONSEQUENCE, STATED BECAUSE IT IS A LOOSENING ────────────────────────
 *
 * `isSessionKnown` returns TRUE for this value, which means `admitBar` no
 * longer refuses an EXECUTABLE claim on such a bar. That is deliberate and it
 * is narrow. The reason `admitBar` blocks EXECUTABLE on a sessionless bar is
 * written there: "a price is a different fact inside RTH than outside it." On a
 * venue with no RTH there is no outside, so that specific objection genuinely
 * does not arise and enforcing it anyway would be superstition rather than
 * rigour.
 *
 * It does NOT follow that crypto bars are executable. `exchangeCandleIngress.ts`
 * mints INDICATIVE and can mint nothing else, for a completely separate reason
 * that this constant does not touch: `/api/exchange` is a public REST proxy and
 * no execution adapter routes through it, so nobody can say its price is the one
 * an order would meet. Two independent reasons to withhold EXECUTABLE; this
 * constant retires exactly one of them, and the other still binds.
 */
export const SESSION_CONTINUOUS = "SESSION_CONTINUOUS";

/**
 * Does this bar know which session it belongs to?
 *
 * Blank counts as unknown, deliberately. An empty string is how "we never set
 * this" reaches production looking like a value.
 */
export function isSessionKnown(sessionId: string): boolean {
  const trimmed = sessionId.trim();
  return trimmed !== "" && trimmed !== SESSION_UNKNOWN;
}

/* ── PROVENANCE ────────────────────────────────────────────────────────────── */

/**
 * How the bar reached us. Not the same question as fidelity.
 *
 * Fidelity answers "may this be painted / traded on". Provenance answers "what
 * path did it take", and the two come apart in both directions: a REST_BACKFILL
 * bar from a certified provider can be perfectly good history, while a
 * LIVE_STREAM bar from a degraded socket can be worthless. Collapsing them
 * would mean the house could no longer say WHY a bar is only INDICATIVE.
 */
export const BAR_PROVENANCES = {
  /** Arrived on an open socket as the market printed it. */
  LIVE_STREAM: "LIVE_STREAM",
  /** Fetched after the fact. Legitimate history; not evidence of a live feed. */
  REST_BACKFILL: "REST_BACKFILL",
  /** Replayed from stored truth. Must never be mistaken for a live print. */
  REPLAY: "REPLAY",
  /** Built by aggregating finer bars. Real, but not something a venue printed. */
  DERIVED: "DERIVED",
} as const;

export type BarProvenance = (typeof BAR_PROVENANCES)[keyof typeof BAR_PROVENANCES];

/* ── THE BAR ───────────────────────────────────────────────────────────────── */

export interface CanonicalBar {
  readonly barId: string;
  readonly symbolId: string;
  readonly sessionId: string;
  /** e.g. "1m", "5m", "1D". Two timeframes are two observations, never one. */
  readonly timeframe: string;

  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;

  /**
   * When the market did it. EPOCH MILLISECONDS.
   *
   * The unit is stated because it was not, and the omission is load-bearing:
   * `LegacyOhlcvTuple.time` below is epoch SECONDS throughout this repo, and
   * the two fields are both bare `number`. See `toLegacyTuple`'s warning.
   */
  readonly asOf: number;
  /**
   * When we heard. EPOCH MILLISECONDS, the same clock unit as `asOf` — two
   * clocks meant to be compared to each other cannot be measured in different
   * units. Explicitly NOT an ordering authority.
   */
  readonly receivedAt: number;

  readonly fidelity: MarketFidelity;
  readonly source: string;
  readonly provenance: BarProvenance;
  /** Monotonic. A bump means the pipeline's truth changed underneath. */
  readonly truthEpoch: number;
}

/**
 * The identity/lineage half of a CanonicalBar, published beside renderer
 * tuples without copying OHLC into a second market record.
 *
 * A chart is allowed to discard this when it only paints candles. A
 * MarketObject is not: `birthBarId` must resolve back to the exact admitted
 * bar, so object selection needs this sidecar to survive the HTTP boundary.
 */
export type CanonicalBarIdentity = Readonly<Pick<CanonicalBar,
  | "barId"
  | "symbolId"
  | "sessionId"
  | "timeframe"
  | "asOf"
  | "receivedAt"
  | "fidelity"
  | "source"
  | "provenance"
  | "truthEpoch"
>>;

export function canonicalBarIdentity(bar: CanonicalBar): CanonicalBarIdentity {
  return {
    barId: bar.barId,
    symbolId: bar.symbolId,
    sessionId: bar.sessionId,
    timeframe: bar.timeframe,
    asOf: bar.asOf,
    receivedAt: bar.receivedAt,
    fidelity: bar.fidelity,
    source: bar.source,
    provenance: bar.provenance,
    truthEpoch: bar.truthEpoch,
  };
}

/* ── IDENTITY ──────────────────────────────────────────────────────────────── */

/**
 * The bar's id, derived rather than assigned.
 *
 * Deterministic on purpose: the same bar redelivered across a reconnect must
 * produce the SAME id, because an id minted per-arrival is the double-count
 * family with a fresh coat of paint — the chart would hold two 09:31 bars and
 * the volume profile would count that minute twice.
 *
 * `truthEpoch` is inside the id, which is the part worth arguing about. It
 * means a backfill that CORRECTS 09:31 is a DIFFERENT bar rather than a silent
 * overwrite of the one the trader already looked at and may already have acted
 * on. The old bar stays addressable; the correction is a new fact with its own
 * name, and the two can be shown side by side instead of one quietly replacing
 * the other between renders.
 */
export function mintBarId(input: {
  readonly symbolId: string;
  readonly timeframe: string;
  readonly asOf: number;
  readonly truthEpoch: number;
}): string | null {
  const symbolId = input.symbolId.trim();
  const timeframe = input.timeframe.trim();
  if (symbolId === "" || timeframe === "") return null;
  if (!Number.isFinite(input.asOf) || !Number.isFinite(input.truthEpoch)) return null;
  if (!Number.isInteger(input.truthEpoch) || input.truthEpoch < 0) return null;
  return `${symbolId}|${timeframe}|${input.asOf}|e${input.truthEpoch}`;
}

/* ── GEOMETRY ──────────────────────────────────────────────────────────────── */

export type BarVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * Is this OHLC internally coherent?
 *
 * It REFUSES rather than repairs, and that is the whole design. The tempting
 * alternative — clamp `high` up to `close` when a provider sends them
 * inconsistent — produces a bar that is shaped like a fact and is not one, and
 * it produces it silently, at the exact moment the house has learned its feed
 * is wrong. A refused bar is a visible gap the trader can be told about. A
 * repaired bar is a lie with a timestamp.
 */
export function checkBarGeometry(bar: {
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}): BarVerdict {
  for (const [name, v] of [
    ["open", bar.open], ["high", bar.high], ["low", bar.low],
    ["close", bar.close], ["volume", bar.volume],
  ] as const) {
    if (!Number.isFinite(v)) {
      return { ok: false, reason: `${name} is not a finite number — this bar is not on the chart.` };
    }
  }
  if (bar.volume < 0) {
    return { ok: false, reason: "volume is negative. A bar cannot un-trade." };
  }
  if (bar.high < bar.low) {
    return { ok: false, reason: "high is below low — the bar is inside out." };
  }
  if (bar.high < bar.open || bar.high < bar.close) {
    return {
      ok: false,
      reason:
        "high is below open or close. Clamping it would manufacture a wick the "
        + "market never printed, so the bar is refused instead.",
    };
  }
  if (bar.low > bar.open || bar.low > bar.close) {
    return {
      ok: false,
      reason:
        "low is above open or close. Clamping it would manufacture a wick the "
        + "market never printed, so the bar is refused instead.",
    };
  }
  return { ok: true };
}

/* ── ADMISSION ─────────────────────────────────────────────────────────────── */

export type BarAdmission =
  | { readonly admitted: true; readonly bar: CanonicalBar }
  | { readonly admitted: false; readonly reason: string };

/**
 * Admit an incoming bar against the one already held for that slot.
 *
 * The same law as `admitReconPacket`, because it is the same bug: newest
 * ARRIVAL does not win, newest TRUTH does.
 *
 *   - A higher truthEpoch supersedes. The pipeline's truth changed.
 *   - An EQUAL epoch for the same asOf is the same bar arriving twice, and is
 *     refused. Admitting it again is the double-count family.
 *   - A LOWER epoch is stale, however late it landed.
 *
 * `receivedAt` is consulted nowhere in this function, and the test suite proves
 * that directly by handing it wildly divergent arrival times.
 */
export function admitBar(current: CanonicalBar | null, incoming: CanonicalBar): BarAdmission {
  const geometry = checkBarGeometry(incoming);
  if (!geometry.ok) return { admitted: false, reason: geometry.reason };

  if (!Number.isFinite(incoming.asOf) || !Number.isFinite(incoming.truthEpoch)) {
    return { admitted: false, reason: "A bar without a finite asOf and truthEpoch cannot be ordered." };
  }

  // A bar that does not know its session may still be admitted — the live chart
  // has to keep drawing — but it may NOT claim EXECUTABLE. EXECUTABLE means
  // "this surface's price is the one the adapter will use", and that is not a
  // claim anyone can make about a print they cannot place in a session: the
  // same number is a different fact inside RTH than it is in extended hours,
  // and capital gets attached to the difference. The bar is refused rather than
  // quietly downgraded, because silently rewriting a fidelity would hide from
  // the caller that the house disagreed with it.
  if (
    !isSessionKnown(incoming.sessionId)
    && incoming.fidelity === MARKET_FIDELITIES.EXECUTABLE
  ) {
    return {
      admitted: false,
      reason:
        "This bar claims EXECUTABLE fidelity but does not know which session it "
        + "belongs to. A price is a different fact inside RTH than outside it, so "
        + "the claim cannot be backed. Admit it as INDICATIVE, or supply the session.",
    };
  }

  if (!current) return { admitted: true, bar: incoming };

  // Two different instruments, or two different timeframes, are not two
  // versions of one observation. Without this, a 1m bar would supersede the 1D
  // bar it lives inside.
  if (
    current.symbolId !== incoming.symbolId
    || current.timeframe !== incoming.timeframe
  ) {
    return {
      admitted: false,
      reason:
        "This bar describes a different symbol or timeframe. Two timeframes are "
        + "two observations, not two versions of one.",
    };
  }

  if (current.asOf !== incoming.asOf) {
    return {
      admitted: false,
      reason:
        "This bar is for a different instant. Admission resolves a COLLISION at one "
        + "asOf; a new instant is an append, not a supersede.",
    };
  }

  if (incoming.truthEpoch > current.truthEpoch) {
    return { admitted: true, bar: incoming };
  }

  return {
    admitted: false,
    reason:
      `truthEpoch ${incoming.truthEpoch} does not supersede ${current.truthEpoch}. `
      + "Newest arrival does not win; newest truth does.",
  };
}

/* ── THE ONE SANCTIONED DOOR OUT ───────────────────────────────────────────── */

/**
 * The legacy six-field shape, named once so the seventeen files that speak it
 * have somewhere to be adapted FROM rather than a reason to keep redeclaring it.
 */
export interface LegacyOhlcvTuple {
  readonly time: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

/**
 * Narrow a CanonicalBar down to what a dumb renderer needs.
 *
 * This direction is safe and is the only one offered. The INVERSE — building a
 * CanonicalBar out of a bare tuple — is deliberately absent, because it would
 * require inventing a symbolId, a fidelity, a source and a provenance that the
 * tuple does not contain. A function that manufactures those four would be the
 * single most effective way to launder unknown data into canonical data, and it
 * would be called everywhere within a month precisely because it is convenient.
 *
 * A caller holding only a tuple does not have a canonical bar. It has six
 * numbers, and the honest move is to go back to whoever produced them.
 *
 * ── UNITS, ADDED 2026-09-18 BY THE FIRST REAL CONSUMER ───────────────────────
 *
 * `asOf` is epoch MILLISECONDS; `time` is whatever unit the CALLER's renderer
 * expects, and this function copies one into the other unchanged. That is
 * correct only for a caller in milliseconds. Most of this repo — Yahoo's chart
 * feed, lightweight-charts, every `LegacyOhlcvTuple` in the census — is in
 * epoch SECONDS, and passing a millisecond `asOf` into a seconds `time` places
 * the bar roughly fifty thousand years in the future without a single type
 * error, because both fields are bare `number`.
 *
 * `yahooCandleIngress.ts::toLegacySecondsTuple` therefore does NOT call this
 * function; it states the ÷1000 instead of inheriting it. Any new ingress on
 * the seconds side must do the same. This is the census defect exactly — two
 * structurally identical, semantically unrelated shapes the compiler cannot
 * tell apart — reappearing one level down, in the units rather than the fields.
 */
export function toLegacyTuple(bar: CanonicalBar): LegacyOhlcvTuple {
  return {
    time: bar.asOf,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  };
}
