/**
 * MARKET FIELD FRESHNESS — does the room's chart still mean what it shows?
 *
 * ── The failure this exists to close ─────────────────────────────────────────
 *
 * DeckMarketChart fetches candles once per (symbol, timeframe, bars) and then
 * holds them. There is no refetch and, until this owner, no AS_OF. A trader
 * who opened /command-deck at 09:31 and glanced at it again at 15:40 saw the
 * IDENTICAL chart, rendered with the identical confidence, drawn from candles
 * that stopped six hours earlier.
 *
 * That is the Founder's named failure exactly: a stale chart that is visually
 * indistinguishable from a live one is a prettier lie than no chart. The file
 * already refused to draw a placeholder silhouette on EMPTY — but it drew a
 * real silhouette of a market that had moved on, which is worse, because the
 * candles are genuine and therefore believable.
 *
 * MOTION / MEANING RECEIPT (Founder motion law):
 *   MOTION_OWNER      this module + the deck's age ticker
 *   SOURCE_EVENT      wall-clock time advancing past the fetch timestamp
 *   FIDELITY_ROLE     staleness — how much to trust the geometry on screen
 *   AS_OF             fetchedAtMs, the moment the candles actually landed
 *   AFFECTED_SURFACE  the MARKET field's as-of line (TEXT ONLY)
 *
 * The label is the only thing that changes as time passes. Price geometry
 * never moves here: PRICE MAY ONLY MOVE WHEN TRUTH MOVES, and time passing is
 * truth about AGE, not truth about PRICE.
 *
 * ── Why CLOSED is not STALE ──────────────────────────────────────────────────
 *
 * When the tape is shut, the last bar IS the market. Calling it "stale" would
 * be its own lie — it would tell the trader to distrust a number that is
 * perfectly current for the state the world is in. So a CLOSED session
 * produces FINAL, not STALE, no matter how old the fetch is.
 *
 * The inverse is the trap, and this module refuses it: an UNKNOWN session is
 * NOT treated as closed. Not knowing whether the market is open is never a
 * licence to stop aging the data, because the most dangerous case — live tape,
 * silent session signal, six-hour-old candles — lives precisely there.
 */

import type { SanctuarySessionSignal } from "./sanctuarySessionContext";

export type MarketFieldFreshnessKind =
  /** Inside one bar-interval of the fetch. The geometry is current. */
  | "FRESH"
  /** Past one interval but under the stale budget. Trust it, but know its age. */
  | "AGING"
  /** Past the budget. The room must say so in words, not imply it. */
  | "STALE"
  /** Session is CLOSED — the last bar is final, not decayed. */
  | "FINAL";

export interface MarketFieldFreshness {
  readonly kind: MarketFieldFreshnessKind;
  readonly ageMs: number;
  /** Human sentence for the as-of line. Never abbreviated into a bare number. */
  readonly label: string;
  /**
   * True when the timeframe string could not be parsed into a bar interval, so
   * the budget below is a documented fallback rather than a derived one. The
   * surface should be able to admit this rather than present a guessed budget
   * as if it were computed.
   */
  readonly budgetIsAssumed: boolean;
  readonly budgetMs: number;
}

/**
 * Fallback bar interval used when `timeframe` is unparseable. Five minutes is
 * chosen to be SHORT: an over-eager STALE warning costs the trader a glance,
 * while an over-generous one costs them a decision made on dead candles.
 */
export const ASSUMED_BAR_INTERVAL_MS = 5 * 60_000;

/** Below this, per-bar cadence is too fast to be a useful staleness budget. */
const MIN_BUDGET_MS = 60_000;

/** AGING becomes STALE at this multiple of one bar interval. */
const STALE_MULTIPLE = 3;

/**
 * PURE. Parses the timeframe tokens this app actually uses ("1m", "5m", "15m",
 * "1h", "4h", "1d", "1w"). Returns null — never a guess — when it cannot.
 */
export function parseTimeframeMs(timeframe: string): number | null {
  const m = /^(\d+)\s*([mhdwMD])$/.exec(timeframe.trim());
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  switch (m[2]) {
    case "m": return n * 60_000;
    case "h": return n * 60 * 60_000;
    case "d":
    case "D": return n * 24 * 60 * 60_000;
    case "w": return n * 7 * 24 * 60 * 60_000;
    // "M" is ambiguous between minute and month in trading UIs. Rather than
    // pick, we refuse — the caller gets budgetIsAssumed and can say so.
    default: return null;
  }
}

/** Plain-English duration. "just now" / "4m ago" / "2h 10m ago". */
export function describeAge(ageMs: number): string {
  if (ageMs < 0) return "just now";
  const s = Math.floor(ageMs / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const mins = Math.floor(s / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs < 24) return rem === 0 ? `${hrs}h ago` : `${hrs}h ${rem}m ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

/**
 * PURE. The whole decision, isolated from React so it is testable without a
 * DOM, a clock, or a network.
 */
export function classifyMarketFieldFreshness(input: {
  readonly fetchedAtMs: number;
  readonly nowMs: number;
  readonly timeframe: string;
  readonly session: SanctuarySessionSignal;
}): MarketFieldFreshness {
  const ageMs = Math.max(0, input.nowMs - input.fetchedAtMs);
  const parsed = parseTimeframeMs(input.timeframe);
  const budgetIsAssumed = parsed === null;
  const interval = parsed ?? ASSUMED_BAR_INTERVAL_MS;
  const budgetMs = Math.max(interval, MIN_BUDGET_MS);
  const age = describeAge(ageMs);

  // CLOSED short-circuits before any age arithmetic. See the header note.
  if (input.session === "CLOSED") {
    return {
      kind: "FINAL",
      ageMs,
      budgetMs,
      budgetIsAssumed,
      label: `Session closed · final bars, read ${age}`,
    };
  }

  if (ageMs <= budgetMs) {
    return { kind: "FRESH", ageMs, budgetMs, budgetIsAssumed, label: `Read ${age}` };
  }
  if (ageMs <= budgetMs * STALE_MULTIPLE) {
    return { kind: "AGING", ageMs, budgetMs, budgetIsAssumed, label: `Read ${age}` };
  }
  return {
    kind: "STALE",
    ageMs,
    budgetMs,
    budgetIsAssumed,
    label: `STALE · these candles were read ${age} and have not refreshed`,
  };
}
