/**
 * FVG / IMBALANCE — THE ONE PUBLISHED DEFINITION.
 *
 * Garden 19 ATHOS super finish-line, "FVG / Imbalance Intelligence" (Founder
 * order, 2026-10-07). The law the order is written under:
 *
 *   "ONE OBJECT. ONE DEFINITION. ONE HISTORY. MANY VIEWS."
 *
 * This file is the DEFINITION. `fvgEngine.ts` is the one detector and the one
 * lifecycle (the HISTORY), `fvgStats.ts` is the one descriptive tally. Scanner,
 * Market Home, Inspect, Memory, Replay, Backtest, Journal, Review, Personal
 * Edge, Academy and SpaidBot READ these owners; none of them detects, ages or
 * counts a gap of its own. The human copy of every rule below is
 * docs/operations/FVG-METHODOLOGY.md — if the two disagree, this file is the
 * law and the doc is the defect.
 *
 * The shared drawer is `marketObjectKinds.ts`'s GAP_FVG kind — not a new kind,
 * not an "FVG room" (FVG_ROOM is on the rejected-kind list). `fvgMarketObject`
 * in the engine projects every FVG onto the shared MarketObject slots.
 *
 * ── WHAT THIS DEFINITION REFUSES TO SAY ────────────────────────────────────
 *
 * "Every FVG has to fill" is NOT market law, and nothing here encodes it. WM
 * measures what HAPPENED: whether price came back, how deep, what it did next.
 * There is no fill expectation, no "unfilled = target", and no magic number —
 * no "FVG STRENGTH 87". Displacement is recorded as CONTEXT (body/range, range
 * vs ATR) and is never folded into a grade.
 *
 * ── DEFINITION_ID "FVG_3C", DEFINITION_VERSION 1 ───────────────────────────
 *
 * Versioned. An object carries the version it was detected under, and its
 * OBJECT_ID carries it too, so a v2 rule can never silently rewrite a v1 past.
 *
 *  1. THREE CLOSED BARS b1, b2, b3, consecutive on ONE instrument and ONE
 *     timeframe. A forming bar is never read: the caller feeds closed bars.
 *  2. GEOMETRY — WICKS, NOT BODIES (high/low):
 *       BULLISH  low(b3)  > high(b1) → territory [high(b1), low(b3)]
 *       BEARISH  high(b3) < low(b1)  → territory [high(b3), low(b1)]
 *     Strict inequality: a gap of zero is not a gap.
 *  3. DISPLACEMENT BAR b2 — its BODY must point the gap's direction
 *     (bullish: close > open; bearish: close < open). A doji b2 is not an FVG
 *     under v1. body/range and range/ATR(14) are RECORDED as displacement
 *     context and are NOT a further filter.
 *  4. MINIMUM SIZE — size ≥ max(1 instrument tick, 0.10 × ATR(14) at b2).
 *     ATR is Wilder's (the `marketBreathing.atrSeries` rule: SMA seed of the
 *     first 14 true ranges, then (prev×13 + TR)/14), read AT b2 (b2's own true
 *     range included). The tick comes from the ONE tick owner
 *     (`pricePrecision.instrumentTickFor` → contractEconomics); where no tick is
 *     on file (crypto venues, spot FX) the ATR term stands alone and the object
 *     says `minimum.basis = "ATR"`. Until ATR(14) exists at b2 (the first 13
 *     bars of a series) NO object is detected — the warm-up is counted, not
 *     guessed through. Comparison is inclusive with a 1e-9 relative tolerance
 *     so float noise cannot move a boundary gap across the line.
 *  5. SIZE UNITS — price always; plus ticks where a tick is on file; points
 *     (one unit of quote currency) for every class; pips for FX (0.0001, or
 *     0.01 for JPY-quoted pairs — the FX quoting convention, stated here because
 *     no pip owner existed). `size.unit` names the class's primary unit:
 *     FUTURES → TICKS, FOREX → PIPS, everything else → POINTS.
 *  6. TIMEFRAME — the bars' own timeframe; two timeframes are two objects.
 *  7. SESSION — every bar is keyed by the ONE session owner
 *     (`sessionWindow.sessionKeyOf`; daily-and-longer bars are each their own
 *     session). The object records b2's session key and `crossesSession` when
 *     b1..b3 span a session boundary (an opening gap). Crossing gaps ARE
 *     detected and flagged — the statistics can split them — never silently
 *     dropped or silently mixed.
 *  8. CREATION — at the CLOSE of b3, never earlier. `createdAt` is b3's close
 *     time; at any instant before it the object does not exist.
 *
 * ── LIFECYCLE (the same object, never respawned) ───────────────────────────
 *
 * Near edge = the edge price returns to first (bullish: top; bearish: bottom).
 * Far edge = the other one. Penetration = depth past the near edge ÷ size,
 * clamped to [0, 1], read from wicks.
 *
 *   BORN              at b3's close.
 *   OPEN              a later bar closed without coming near.
 *   APPROACHING       (untouched only) a bar's wick came within
 *                     max(0.5 × size, 0.25 × ATR(14) at b2) of the near edge.
 *   TOUCHED           a bar's wick reached the near edge (penetration 0).
 *   PARTIALLY_MITIGATED  deepest penetration > 0 and < 50%.
 *   DEEPLY_MITIGATED     deepest penetration ≥ 50% and < 100%.
 *   FULLY_MITIGATED      a wick reached the far edge (100%) without a close
 *                        beyond it.
 *   REJECTED          within an interaction, inside the first 5 bars of it, a
 *                     bar CLOSED back outside on the origin side while the
 *                     object was not fully mitigated. ("RESPONDED".)
 *   ACCEPTED          within an interaction, 2 consecutive closes inside the
 *                     territory (before any rejection).
 *   TRADED_THROUGH    a bar CLOSED beyond the far edge. This is the
 *                     invalidation; the lifecycle stops there (terminal).
 *   MEMORY            aging (below). Not a deletion: the object, its scars and
 *                     its remaining territory stay addressable, and a later
 *                     interaction brings it straight back.
 *
 *   INTERACTION       an episode of consecutive bars that trade into the
 *                     territory, plus the bar that closes it out. Each carries:
 *                     start/end, deepest penetration, its FIRST response
 *                     (REJECTED / ACCEPTED; TRADED_THROUGH only if that close
 *                     came first; NONE if it ended without one; OPEN while it
 *                     runs), a `tradedThrough` flag, and
 *                     post-touch displacement: the furthest the wicks travelled
 *                     away from the near edge on the origin side over the 5 bars
 *                     after the episode's first bar, in ATR(14)-at-b2 units.
 *   REMAINING TERRITORY  the band no wick has visited yet (null once full).
 *
 * The reported `state` is the latest of those events — names derive ONLY from
 * observed interaction. Mitigation depth is cumulative and separate
 * (`mitigation`), so a shallow second touch never "un-mitigates".
 *
 * ── MEMORY / AGING ─────────────────────────────────────────────────────────
 *
 *   A scar (TRADED_THROUGH, or FULLY_MITIGATED) becomes MEMORY 20 closed bars
 *   after the terminal event. A live object becomes MEMORY after 300 closed
 *   bars with no interaction (birth counts as the last one). Visibility budget:
 *   at most 6 live objects (ordered by distance from the last close to their
 *   remaining territory, then newest first — an ORDERING, not a grade) and the
 *   3 most recent scars. Everything else is counted as hidden, never deleted.
 *
 * ── HORIZONS (descriptive, at first touch) ─────────────────────────────────
 *
 *   IMMEDIATE        ≤ 3 closed bars after creation, same session.
 *   SAME_SESSION     same session, later than that.
 *   NEXT_SESSION     the very next session.
 *   LATER_SESSION    2–4 sessions later.
 *   MULTI_DAY        5 or more sessions later.
 *   STILL_OPEN_WITHIN_HORIZON  not touched as of the reading.
 *   SESSION_UNKNOWN  touched after > 3 bars on a series with no session clock.
 *
 * ── AS-OF-TIME TRUTH ───────────────────────────────────────────────────────
 *
 * Every lifecycle fact is an EVENT stamped with the close time of the bar
 * that revealed it. The present object is the fold of all its events; the
 * object as of t is the fold of the events known at t (`fvgStateAsOf`). Same
 * reducer, so a replay cannot see a different past than the live chart saw.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { forexPairCodes } from "@/lib/marketData/canonicalIdentity";
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";

/* ── IDENTITY OF THE DEFINITION ─────────────────────────────────────────── */

export const FVG_DEFINITION_ID = "FVG_3C" as const;
export const FVG_DEFINITION_VERSION = 1 as const;

/* ── THE RULE CONSTANTS (each one is cited in the docblock above) ──────── */

export const FVG_ATR_PERIOD = 14;
/** Minimum size, ATR term: size ≥ 0.10 × ATR(14) at b2. */
export const FVG_MIN_ATR_FRACTION = 0.1;
/** Inclusive-boundary tolerance (relative) for the minimum-size test. */
export const FVG_SIZE_EPSILON = 1e-9;
/** APPROACHING: within max(0.5 × size, 0.25 × ATR at b2) of the near edge. */
export const FVG_APPROACH_SIZE_FRACTION = 0.5;
export const FVG_APPROACH_ATR_FRACTION = 0.25;
/** DEEPLY_MITIGATED at ≥ 50 % penetration. */
export const FVG_DEEP_FRACTION = 0.5;
/** REJECTED only if the origin-side close lands within this many bars of the episode's first bar. */
export const FVG_REJECTION_WINDOW_BARS = 5;
/** ACCEPTED after this many consecutive closes inside the territory. */
export const FVG_ACCEPT_CLOSES = 2;
/** Post-touch displacement is measured over this many bars after an episode's first bar. */
export const FVG_DISPLACEMENT_WINDOW_BARS = 5;
/** IMMEDIATE horizon: first touch within this many closed bars of creation. */
export const FVG_IMMEDIATE_BARS = 3;
/** Session distances for the horizon table. */
export const FVG_LATER_SESSION_MAX = 4;
/** A scar (traded through / fully mitigated) becomes MEMORY this many bars after the terminal event. */
export const FVG_SCAR_MEMORY_BARS = 20;
/** A live object becomes MEMORY after this many bars without interaction. */
export const FVG_IDLE_MEMORY_BARS = 300;
/** Visibility budget defaults. */
export const FVG_VISIBLE_OPEN_BUDGET = 6;
export const FVG_VISIBLE_SCAR_BUDGET = 3;

/* ── VOCABULARY ─────────────────────────────────────────────────────────── */

export type FvgDirection = "BULLISH" | "BEARISH";

export const FVG_STATES = [
  "BORN",
  "OPEN",
  "APPROACHING",
  "TOUCHED",
  "PARTIALLY_MITIGATED",
  "DEEPLY_MITIGATED",
  "FULLY_MITIGATED",
  "REJECTED",
  "ACCEPTED",
  "TRADED_THROUGH",
  "MEMORY",
] as const;
export type FvgState = (typeof FVG_STATES)[number];

/** Cumulative depth reached, separate from the latest-event `state`. */
export type FvgMitigation = "NONE" | "TOUCHED" | "PARTIAL" | "DEEP" | "FULL";

export type FvgInteractionResponse = "REJECTED" | "ACCEPTED" | "TRADED_THROUGH" | "NONE" | "OPEN";

export const FVG_HORIZONS = [
  "IMMEDIATE",
  "SAME_SESSION",
  "NEXT_SESSION",
  "LATER_SESSION",
  "MULTI_DAY",
  "STILL_OPEN_WITHIN_HORIZON",
  "SESSION_UNKNOWN",
] as const;
export type FvgHorizon = (typeof FVG_HORIZONS)[number];

export type FvgSizeUnit = "TICKS" | "POINTS" | "PIPS";

export interface FvgSize {
  /** top − bottom, in price. */
  readonly price: number;
  /** One unit of quote currency per point: equal to `price`, named for the reader. */
  readonly points: number;
  /** The instrument tick used, or null when none is on file. */
  readonly tick: number | null;
  readonly ticks: number | null;
  /** FX pip used, or null off FX. */
  readonly pip: number | null;
  readonly pips: number | null;
  /** The class's primary unit. */
  readonly unit: FvgSizeUnit;
  /** size ÷ ATR(14) at b2. Context, not a grade. */
  readonly atr: number;
}

export interface FvgMinimum {
  readonly price: number;
  /** Which term set the bar: the instrument tick or 0.10 × ATR. */
  readonly basis: "TICK" | "ATR";
}

/* ── IDENTITY MINTING ───────────────────────────────────────────────────── */

/**
 * OBJECT_ID = FVG|<instrument>|<tf>|<b2 open time ms>|<direction>|v<version>
 *
 * The `mintBarId` pattern: pipe-delimited, deterministic, null on any blank or
 * non-finite part — never a guessed id. The same three bars redelivered mint
 * the same id, and the id never changes through the lifecycle.
 */
export function mintFvgObjectId(input: {
  readonly symbolId: string;
  readonly timeframe: string;
  readonly b2AsOf: number;
  readonly direction: FvgDirection;
  readonly version?: number;
}): string | null {
  const symbolId = input.symbolId.trim();
  const timeframe = input.timeframe.trim();
  const version = input.version ?? FVG_DEFINITION_VERSION;
  if (symbolId === "" || timeframe === "") return null;
  if (!Number.isFinite(input.b2AsOf)) return null;
  if (input.direction !== "BULLISH" && input.direction !== "BEARISH") return null;
  if (!Number.isInteger(version) || version < 1) return null;
  return `FVG|${symbolId}|${timeframe}|${input.b2AsOf}|${input.direction}|v${version}`;
}

/* ── THE PURE GEOMETRY TEST (rules 2–4) ─────────────────────────────────── */

/** Only the four prices of the one bar shape (M8: no private bar shapes). */
export type FvgCandidateBar = Pick<CanonicalBar, "open" | "high" | "low" | "close">;

export type FvgGeometryVerdict =
  | {
      readonly ok: true;
      readonly direction: FvgDirection;
      readonly bottom: number;
      readonly top: number;
      readonly minimum: FvgMinimum;
    }
  | {
      readonly ok: false;
      readonly reason: "NO_GAP" | "BODY_AGAINST_GAP" | "BELOW_MINIMUM" | "NO_ATR";
    };

/** The minimum size under rule 4. */
export function fvgMinimumSize(tick: number | null, atrAtB2: number): FvgMinimum {
  const atrTerm = FVG_MIN_ATR_FRACTION * atrAtB2;
  const tickTerm = tick != null && tick > 0 ? tick : 0;
  return tickTerm > atrTerm ? { price: tickTerm, basis: "TICK" } : { price: atrTerm, basis: "ATR" };
}

/**
 * Rules 2–4 on three closed bars. Returns the territory or the reason there is
 * none. A bar triple can be at most one of bullish / bearish (b3 above b1 and
 * below it at once is impossible for a well-formed bar).
 */
export function testFvgGeometry(
  b1: FvgCandidateBar,
  b2: FvgCandidateBar,
  b3: FvgCandidateBar,
  atrAtB2: number | null,
  tick: number | null,
): FvgGeometryVerdict {
  let direction: FvgDirection;
  let bottom: number;
  let top: number;
  if (b3.low > b1.high) {
    direction = "BULLISH";
    bottom = b1.high;
    top = b3.low;
  } else if (b3.high < b1.low) {
    direction = "BEARISH";
    bottom = b3.high;
    top = b1.low;
  } else {
    return { ok: false, reason: "NO_GAP" };
  }
  if (direction === "BULLISH" ? !(b2.close > b2.open) : !(b2.close < b2.open)) {
    return { ok: false, reason: "BODY_AGAINST_GAP" };
  }
  if (atrAtB2 == null || !Number.isFinite(atrAtB2) || atrAtB2 < 0) return { ok: false, reason: "NO_ATR" };
  const minimum = fvgMinimumSize(tick, atrAtB2);
  const size = top - bottom;
  if (size < minimum.price * (1 - FVG_SIZE_EPSILON)) return { ok: false, reason: "BELOW_MINIMUM" };
  return { ok: true, direction, bottom, top, minimum };
}

/* ── SIZE UNITS (rule 5) ────────────────────────────────────────────────── */

/** The FX quoting convention: 0.01 for JPY-quoted pairs, 0.0001 otherwise; null off FX. */
export function fvgPipFor(symbol: string): number | null {
  const pair = forexPairCodes(symbol);
  if (!pair) return null;
  return pair[1] === "JPY" ? 0.01 : 0.0001;
}

export function fvgSize(symbol: string, price: number, tick: number | null, atrAtB2: number): FvgSize {
  const cls = classifySymbol(symbol);
  const pip = cls === "FOREX" ? fvgPipFor(symbol) : null;
  const t = tick != null && tick > 0 ? tick : null;
  const unit: FvgSizeUnit = cls === "FUTURES" && t != null ? "TICKS" : pip != null ? "PIPS" : "POINTS";
  return {
    price,
    points: price,
    tick: t,
    ticks: t != null ? Math.round((price / t) * 1e6) / 1e6 : null,
    pip,
    pips: pip != null ? Math.round((price / pip) * 1e6) / 1e6 : null,
    unit,
    atr: atrAtB2 > 0 ? price / atrAtB2 : 0,
  };
}

/* ── HORIZON TABLE ──────────────────────────────────────────────────────── */

export function fvgHorizonFor(
  firstTouch: { readonly barsAfterBirth: number; readonly sessionsAfterBirth: number | null } | null,
): FvgHorizon {
  if (!firstTouch) return "STILL_OPEN_WITHIN_HORIZON";
  const s = firstTouch.sessionsAfterBirth;
  if (firstTouch.barsAfterBirth <= FVG_IMMEDIATE_BARS && (s === 0 || s === null)) return "IMMEDIATE";
  if (s === null) return "SESSION_UNKNOWN";
  if (s === 0) return "SAME_SESSION";
  if (s === 1) return "NEXT_SESSION";
  if (s <= FVG_LATER_SESSION_MAX) return "LATER_SESSION";
  return "MULTI_DAY";
}

/** Mitigation tier for a cumulative penetration fraction (touched objects only). */
export function fvgMitigationFor(penetration: number): FvgMitigation {
  if (penetration >= 1) return "FULL";
  if (penetration >= FVG_DEEP_FRACTION) return "DEEP";
  if (penetration > 0) return "PARTIAL";
  return "TOUCHED";
}

export function fvgStateForMitigation(m: FvgMitigation): FvgState {
  switch (m) {
    case "FULL": return "FULLY_MITIGATED";
    case "DEEP": return "DEEPLY_MITIGATED";
    case "PARTIAL": return "PARTIALLY_MITIGATED";
    case "TOUCHED": return "TOUCHED";
    case "NONE": return "OPEN";
  }
}
