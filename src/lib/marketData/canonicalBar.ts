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
 * Seventeen files under src/ declare or destructure an OHLC shape, and at least
 * three of them declare the SAME anonymous six fields under three different
 * names — `LiveBar` in liveBarPolicy.ts, `Bar` in markov.ts, `OHLCVBar` in
 * types/index.ts. They are structurally identical and semantically unrelated,
 * which is the worst of both: TypeScript will let any one of them be passed
 * where another is expected, and nothing in the type says whether the number in
 * `close` is a live print, a delayed print, a synthetic aggregate, or the last
 * value a closed session happened to leave behind.
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

import type { MarketFidelity } from "./marketFidelityAlgebra";

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

  /** When the market did it. */
  readonly asOf: number;
  /** When we heard. Explicitly NOT an ordering authority. */
  readonly receivedAt: number;

  readonly fidelity: MarketFidelity;
  readonly source: string;
  readonly provenance: BarProvenance;
  /** Monotonic. A bump means the pipeline's truth changed underneath. */
  readonly truthEpoch: number;
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
