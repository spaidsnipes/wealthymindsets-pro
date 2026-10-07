/**
 * FVG ENGINE — the ONE detector and the ONE lifecycle (the ONE HISTORY).
 *
 * Every rule this file applies is published in `fvgDefinition.ts` (and in
 * docs/operations/FVG-METHODOLOGY.md). This file only runs them.
 *
 * ── SHAPE ──────────────────────────────────────────────────────────────────
 *
 *   createFvgEngine(config)  incremental: `push(closedBar)` is an O(1)
 *                            detection check plus one step for each live
 *                            object; `snapshot()` folds the ledger.
 *   detectFvgs(bars, config) the history scan — the SAME engine fed once,
 *                            cached per bars array, so incremental and full
 *                            scan cannot disagree.
 *   fvgStateAsOf(ledger, t)  exactly what was knowable at t.
 *   selectFvgVisibility      the visibility budget (never hundreds of boxes).
 *   fvgMarketObject          projection onto the shared GAP_FVG drawer.
 *   attachFvgSenseReference  records another owner's state BY REFERENCE.
 *
 * ── ONE HISTORY ────────────────────────────────────────────────────────────
 *
 * Every lifecycle fact is an `FvgEvent` stamped with the close time of the bar
 * that revealed it (`knownAt`) and that bar's index. An `FvgObject` is the fold
 * of its events by `foldFvgObject`; the live snapshot folds all of them and
 * `fvgStateAsOf` folds the ones known at t. One reducer, so the replay and the
 * live chart cannot see two different pasts. The object is never respawned:
 * its OBJECT_ID is minted once at birth and every later fact is appended to
 * the same event list.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

import { checkBarGeometry, type CanonicalBar } from "@/lib/marketData/canonicalBar";
import type { MarketObject, MarketObjectState } from "@/lib/marketData/marketObjectKinds";
import type { MarketFidelity } from "@/lib/marketData/marketFidelityAlgebra";
import {
  sessionKeyOf,
  sessionWindowFor,
  type SessionWindow,
  type SessionWindowKind,
} from "@/lib/marketData/sessionWindow";
import { instrumentTickFor } from "@/lib/chart/pricePrecision";
import { getTimeframe, normalizeTFId } from "@/lib/timeframes";
import {
  FVG_ACCEPT_CLOSES,
  FVG_APPROACH_ATR_FRACTION,
  FVG_APPROACH_SIZE_FRACTION,
  FVG_ATR_PERIOD,
  FVG_DEFINITION_ID,
  FVG_DEFINITION_VERSION,
  FVG_DISPLACEMENT_WINDOW_BARS,
  FVG_IDLE_MEMORY_BARS,
  FVG_REJECTION_WINDOW_BARS,
  FVG_SCAR_MEMORY_BARS,
  FVG_VISIBLE_OPEN_BUDGET,
  FVG_VISIBLE_SCAR_BUDGET,
  fvgHorizonFor,
  fvgMitigationFor,
  fvgSize,
  fvgStateForMitigation,
  mintFvgObjectId,
  testFvgGeometry,
  type FvgDirection,
  type FvgHorizon,
  type FvgInteractionResponse,
  type FvgMinimum,
  type FvgMitigation,
  type FvgSize,
  type FvgState,
} from "./fvgDefinition";

/* ── CONFIG ─────────────────────────────────────────────────────────────── */

export interface FvgEngineConfig {
  /** The CanonicalBar `symbolId` this engine reads. Bars for any other id are refused. */
  readonly symbolId: string;
  /** The CanonicalBar `timeframe`. Bars of any other timeframe are refused. */
  readonly timeframe: string;
  /** Session window for equities: ETH (true, default) keys pre/post bars too. */
  readonly extendedHours?: boolean;
  /** Override the session owner's window (tests, or a caller that already holds one). */
  readonly sessionWindow?: SessionWindow;
  /**
   * When a bar CLOSED (epoch ms). Default: `asOf` + the timeframe registry's
   * candle interval. A timeframe the registry has no clock for (tick bars)
   * must supply this, or every bar is refused NO_CLOCK — a creation time is
   * never guessed.
   */
  readonly closeTimeOf?: (bar: CanonicalBar) => number;
  /** Optional regime tag at b2, read from the regime owner by the caller. Default "UNTAGGED". */
  readonly regimeOf?: (b2: CanonicalBar, index: number) => string;
  /** Override the tick (else `instrumentTickFor(symbolId, b2.close)`); null = none on file. */
  readonly tickSize?: number | null;
}

/* ── EVENTS (the one history) ───────────────────────────────────────────── */

interface FvgEventBase {
  /** Close time (epoch ms) of the bar that revealed this fact. */
  readonly knownAt: number;
  /** Series index of that bar. */
  readonly barIndex: number;
  readonly barId: string;
}

export type FvgEvent =
  | (FvgEventBase & { readonly kind: "BORN" })
  | (FvgEventBase & { readonly kind: "OPENED" })
  | (FvgEventBase & { readonly kind: "APPROACH"; readonly distance: number })
  | (FvgEventBase & { readonly kind: "RECEDE" })
  | (FvgEventBase & {
      readonly kind: "TOUCH_START";
      readonly episode: number;
      readonly penetration: number;
      readonly price: number;
      readonly sessionsAfterBirth: number | null;
    })
  | (FvgEventBase & { readonly kind: "PENETRATION"; readonly episode: number; readonly penetration: number; readonly price: number })
  | (FvgEventBase & { readonly kind: "RESPONSE"; readonly episode: number; readonly response: "REJECTED" | "ACCEPTED"; readonly close: number })
  | (FvgEventBase & { readonly kind: "EPISODE_END"; readonly episode: number })
  | (FvgEventBase & { readonly kind: "TRADED_THROUGH"; readonly episode: number; readonly close: number })
  | (FvgEventBase & { readonly kind: "DISPLACEMENT"; readonly episode: number; readonly atr: number; readonly complete: boolean });

/* ── THE OBJECT ─────────────────────────────────────────────────────────── */

export interface FvgBarRef {
  readonly barId: string;
  /** Bar open time, epoch ms. */
  readonly asOf: number;
  /** The CanonicalBar's own sessionId (provider's statement). */
  readonly sessionId: string;
  /** The session owner's key for this bar, or null (outside every session / no clock). */
  readonly sessionKey: string | null;
  readonly fidelity: MarketFidelity;
}

/** Evidence per sense. Price geometry is FULL (read from OHLC); every other sense is
 *  recorded only BY REFERENCE to its own owner's state — the FVG never upgrades it. */
export type FvgSense = "PRICE_GEOMETRY" | "ORDER_FLOW" | "DERIVATIVES";

export type FvgSenseEvidence =
  | { readonly sense: "PRICE_GEOMETRY"; readonly state: "FULL"; readonly source: "OHLC" }
  | { readonly sense: Exclude<FvgSense, "PRICE_GEOMETRY">; readonly state: "NOT_ATTACHED" }
  | {
      readonly sense: Exclude<FvgSense, "PRICE_GEOMETRY">;
      readonly state: "BY_REFERENCE";
      /** The owning module, e.g. "selectAbsorption". */
      readonly owner: string;
      /** That owner's state word, verbatim. */
      readonly ownerState: string;
      /** That owner's object / reading id. */
      readonly ref: string;
    };

export interface FvgSenses {
  readonly PRICE_GEOMETRY: Extract<FvgSenseEvidence, { sense: "PRICE_GEOMETRY" }>;
  readonly ORDER_FLOW: Exclude<FvgSenseEvidence, { sense: "PRICE_GEOMETRY" }>;
  readonly DERIVATIVES: Exclude<FvgSenseEvidence, { sense: "PRICE_GEOMETRY" }>;
}

/** Everything fixed at birth. */
export interface FvgBirth {
  readonly objectId: string;
  readonly definitionId: typeof FVG_DEFINITION_ID;
  readonly definitionVersion: number;
  readonly symbolId: string;
  readonly timeframe: string;
  readonly direction: FvgDirection;
  /** Territory [bottom, top]. */
  readonly bottom: number;
  readonly top: number;
  /** Edge price returns to first (bullish: top; bearish: bottom). */
  readonly nearEdge: number;
  /** A close beyond this edge is TRADED_THROUGH (the invalidation). */
  readonly farEdge: number;
  readonly size: FvgSize;
  readonly minimum: FvgMinimum;
  /** DISPLACEMENT CONTEXT — recorded, never a grade. */
  readonly displacement: {
    /** |close − open| ÷ (high − low) of b2. */
    readonly bodyRatio: number;
    /** (high − low) of b2 ÷ ATR(14) at b2. */
    readonly rangeAtr: number;
    /** ATR(14) at b2, price units. */
    readonly atr: number;
  };
  readonly bars: { readonly b1: FvgBarRef; readonly b2: FvgBarRef; readonly b3: FvgBarRef };
  /** Close time of b3 — the object does not exist before this instant. */
  readonly createdAt: number;
  /** Series index of b3. */
  readonly createdBarIndex: number;
  readonly session: {
    /** b2's session key. */
    readonly key: string | null;
    /** "RTH" / "EXTENDED" for US equities, else the window kind. */
    readonly segment: string;
    readonly window: SessionWindowKind;
    /** b1..b3 span a session boundary (an opening gap). Detected and flagged. */
    readonly crossesSession: boolean;
  };
  readonly regime: string;
  /** Weakest of b1..b3 (STALE < DEGRADED < PARTIAL < INDICATIVE < EXECUTABLE). */
  readonly fidelityAtBirth: MarketFidelity;
  /** max(0.5 × size, 0.25 × ATR at b2). */
  readonly approachDistance: number;
  readonly senses: FvgSenses;
}

export interface FvgInteraction {
  readonly episode: number;
  readonly startAt: number;
  readonly startBarIndex: number;
  readonly startBarId: string;
  /** Close time of the bar that ended the episode, or null while it runs. */
  readonly endAt: number | null;
  /** Last bar of the episode, or null while it runs. */
  readonly endBarIndex: number | null;
  /** Bars inside so far (start .. end, or .. the reading's last bar). */
  readonly bars: number;
  /** Deepest penetration in this episode, fraction of size [0, 1]. */
  readonly depth: number;
  readonly depthPrice: number;
  /** The FIRST response observed (REJECTED / ACCEPTED); TRADED_THROUGH only if the close
   *  through the far edge came before any response; NONE when it ended without one; OPEN while running. */
  readonly response: FvgInteractionResponse;
  readonly responseAt: number | null;
  readonly responseBarId: string | null;
  /** This episode ended with a close beyond the far edge (whatever its first response was). */
  readonly tradedThrough: boolean;
  /** Post-touch displacement on the origin side, ATR(14)-at-b2 units. */
  readonly displacementAtr: number;
  /** True once the displacement window has fully elapsed. */
  readonly displacementComplete: boolean;
}

export interface FvgObject extends FvgBirth {
  /** The latest observed lifecycle event, with the MEMORY aging overlay. */
  readonly state: FvgState;
  /** `state` without the aging overlay. */
  readonly coreState: Exclude<FvgState, "MEMORY">;
  readonly mitigation: FvgMitigation;
  /** Deepest cumulative penetration, fraction of size [0, 1]. */
  readonly maxPenetration: number;
  readonly maxPenetrationPrice: number | null;
  /** The band no wick has visited yet; null once fully mitigated. */
  readonly remaining: { readonly bottom: number; readonly top: number } | null;
  readonly firstApproach: { readonly at: number; readonly barsAfterBirth: number } | null;
  readonly firstTouch: {
    readonly at: number;
    readonly barIndex: number;
    readonly barsAfterBirth: number;
    readonly msAfterBirth: number;
    readonly sessionsAfterBirth: number | null;
  } | null;
  readonly horizon: FvgHorizon;
  readonly interactions: readonly FvgInteraction[];
  readonly tradedThrough: { readonly at: number; readonly barIndex: number; readonly barId: string; readonly close: number } | null;
  /** Bar index at which the object became a scar (traded through, or first full mitigation). */
  readonly scarBarIndex: number | null;
  readonly ageBars: number;
  readonly barsSinceInteraction: number;
  /** Close time of the newest bar this reading includes. */
  readonly asOf: number;
  readonly events: readonly FvgEvent[];
}

export type FvgRefusalReason =
  | "FOREIGN_INSTRUMENT"
  | "FOREIGN_TIMEFRAME"
  | "MALFORMED"
  | "OUT_OF_ORDER"
  | "REWIND_REQUIRED"
  | "NO_CLOCK";

export interface FvgRefusal {
  readonly reason: FvgRefusalReason;
  readonly barId: string;
  readonly barAsOf: number;
  /** Closed bars accepted before this refusal. */
  readonly atBarCount: number;
}

export interface FvgLedger {
  readonly definitionId: typeof FVG_DEFINITION_ID;
  readonly definitionVersion: number;
  readonly symbolId: string;
  readonly timeframe: string;
  readonly sessionWindow: SessionWindowKind;
  readonly barCount: number;
  /** Close time per accepted bar (epoch ms), oldest first. */
  readonly closeTimes: readonly number[];
  readonly closes: readonly number[];
  /** ATR(14) per bar, null in warm-up. */
  readonly atrs: readonly (number | null)[];
  /** Close time of the newest bar, or null when empty. */
  readonly asOf: number | null;
  /** Bar triples not examined because ATR(14) did not exist at b2 yet. */
  readonly warmupTriples: number;
  readonly refusals: readonly FvgRefusal[];
  readonly objects: readonly FvgObject[];
}

export type FvgPushVerdict =
  | { readonly ok: true; readonly duplicate: boolean; readonly born: readonly string[] }
  | { readonly ok: false; readonly reason: FvgRefusalReason };

export interface FvgEngine {
  push(bar: CanonicalBar): FvgPushVerdict;
  snapshot(): FvgLedger;
}

/* ── INTERNALS ──────────────────────────────────────────────────────────── */

const FIDELITY_ORDER: readonly MarketFidelity[] = ["STALE", "DEGRADED", "PARTIAL", "INDICATIVE", "EXECUTABLE"];

function weakestFidelity(fs: readonly MarketFidelity[]): MarketFidelity {
  let best = fs[0];
  for (const f of fs) if (FIDELITY_ORDER.indexOf(f) < FIDELITY_ORDER.indexOf(best)) best = f;
  return best;
}

function isDailyOrLonger(win: SessionWindow): boolean {
  return win.kind === "DAILY_WINDOW";
}

interface Window {
  readonly episode: number;
  readonly start: number;
  best: number;
  done: boolean;
}

interface Tracker {
  readonly birth: FvgBirth;
  readonly birthOrdinal: number;
  readonly events: FvgEvent[];
  opened: boolean;
  approaching: boolean;
  everTouched: boolean;
  inEpisode: boolean;
  episode: number;
  epStart: number;
  epMax: number;
  insideRun: number;
  responded: boolean;
  globalMax: number;
  terminal: boolean;
  windows: Window[];
  cache: { n: number; len: number; obj: FvgObject } | null;
}

const isBull = (b: FvgBirth) => b.direction === "BULLISH";

function stepTracker(t: Tracker, bar: CanonicalBar, i: number, knownAt: number, ordinal: number | null): void {
  const b = t.birth;
  const bull = isBull(b);
  const size = b.top - b.bottom;
  const atr = b.displacement.atr;
  const base = { knownAt, barIndex: i, barId: bar.barId };

  // Post-touch displacement windows keep measuring even after a terminal event.
  for (const w of t.windows) {
    if (w.done || i <= w.start || i > w.start + FVG_DISPLACEMENT_WINDOW_BARS) continue;
    const exc = bull ? Math.max(0, bar.high - b.top) : Math.max(0, b.bottom - bar.low);
    const x = atr > 0 ? exc / atr : 0;
    const grew = x > w.best;
    if (grew) w.best = x;
    if (i === w.start + FVG_DISPLACEMENT_WINDOW_BARS) {
      w.done = true;
      t.events.push({ ...base, kind: "DISPLACEMENT", episode: w.episode, atr: w.best, complete: true });
    } else if (grew) {
      t.events.push({ ...base, kind: "DISPLACEMENT", episode: w.episode, atr: w.best, complete: false });
    }
  }
  if (t.terminal) return;

  const depth = bull ? b.top - bar.low : bar.high - b.bottom;
  const touch = depth >= 0;
  if (touch) {
    const pen = size > 0 ? Math.min(1, depth / size) : 1;
    const price = bull ? Math.max(bar.low, b.bottom) : Math.min(bar.high, b.top);
    if (!t.inEpisode) {
      t.inEpisode = true;
      t.episode += 1;
      t.epStart = i;
      t.epMax = pen;
      t.insideRun = 0;
      t.responded = false;
      t.approaching = false;
      t.everTouched = true;
      t.events.push({
        ...base,
        kind: "TOUCH_START",
        episode: t.episode,
        penetration: pen,
        price,
        sessionsAfterBirth: ordinal === null ? null : ordinal - t.birthOrdinal,
      });
      t.windows.push({ episode: t.episode, start: i, best: 0, done: false });
    } else if (pen > t.epMax) {
      t.epMax = pen;
      t.events.push({ ...base, kind: "PENETRATION", episode: t.episode, penetration: pen, price });
    }
    t.globalMax = Math.max(t.globalMax, pen);
  }

  if (t.inEpisode) {
    const beyondFar = bull ? bar.close < b.bottom : bar.close > b.top;
    const originSide = bull ? bar.close > b.top : bar.close < b.bottom;
    if (beyondFar) {
      t.events.push({ ...base, kind: "TRADED_THROUGH", episode: t.episode, close: bar.close });
      t.terminal = true;
      t.inEpisode = false;
      return;
    }
    if (!originSide) {
      t.insideRun += 1;
      if (!t.responded && t.insideRun >= FVG_ACCEPT_CLOSES) {
        t.responded = true;
        t.events.push({ ...base, kind: "RESPONSE", episode: t.episode, response: "ACCEPTED", close: bar.close });
      }
    } else {
      t.insideRun = 0;
      if (!t.responded && i - t.epStart < FVG_REJECTION_WINDOW_BARS && t.globalMax < 1) {
        t.responded = true;
        t.events.push({ ...base, kind: "RESPONSE", episode: t.episode, response: "REJECTED", close: bar.close });
      }
    }
    if (!touch) {
      t.events.push({ ...base, kind: "EPISODE_END", episode: t.episode });
      t.inEpisode = false;
    }
    t.opened = true;
    return;
  }

  if (!t.everTouched) {
    const distance = bull ? bar.low - b.top : b.bottom - bar.high;
    if (distance <= b.approachDistance) {
      if (!t.approaching) {
        t.approaching = true;
        t.events.push({ ...base, kind: "APPROACH", distance });
      }
    } else if (t.approaching) {
      t.approaching = false;
      t.events.push({ ...base, kind: "RECEDE" });
    } else if (!t.opened) {
      t.events.push({ ...base, kind: "OPENED" });
    }
  }
  t.opened = true;
}

/* ── THE FOLD (one reducer for live and as-of) ──────────────────────────── */

interface MutableInteraction {
  episode: number;
  startAt: number;
  startBarIndex: number;
  startBarId: string;
  endAt: number | null;
  endBarIndex: number | null;
  depth: number;
  depthPrice: number;
  response: FvgInteractionResponse;
  responseAt: number | null;
  responseBarId: string | null;
  tradedThrough: boolean;
  displacementAtr: number;
  displacementComplete: boolean;
}

/**
 * Fold `events` (already restricted to what is known) into the object as of a
 * reading whose newest bar index is `lastIndex` and whose newest close time is
 * `asOf`. This is the ONLY place lifecycle words are chosen.
 */
export function foldFvgObject(
  birth: FvgBirth,
  events: readonly FvgEvent[],
  lastIndex: number,
  asOf: number,
): FvgObject {
  const bull = isBull(birth);
  let state: Exclude<FvgState, "MEMORY"> = "BORN";
  let mitigation: FvgMitigation = "NONE";
  let maxPen = 0;
  let maxPenPrice: number | null = null;
  let firstApproach: FvgObject["firstApproach"] = null;
  let firstTouch: FvgObject["firstTouch"] = null;
  let tradedThrough: FvgObject["tradedThrough"] = null;
  let scarBarIndex: number | null = null;
  let lastInteraction = birth.createdBarIndex;
  const interactions: MutableInteraction[] = [];
  const at = (ep: number) => interactions[ep - 1];

  const deepen = (pen: number, price: number, barIndex: number): boolean => {
    const before = mitigation;
    if (pen > maxPen || maxPenPrice === null) {
      maxPen = Math.max(maxPen, pen);
      maxPenPrice = maxPenPrice === null ? price : bull ? Math.min(maxPenPrice, price) : Math.max(maxPenPrice, price);
    }
    mitigation = fvgMitigationFor(maxPen);
    if (mitigation === "FULL" && scarBarIndex === null) scarBarIndex = barIndex;
    return mitigation !== before;
  };

  for (const e of events) {
    switch (e.kind) {
      case "BORN":
        state = "BORN";
        break;
      case "OPENED":
      case "RECEDE":
        state = "OPEN";
        break;
      case "APPROACH":
        state = "APPROACHING";
        if (!firstApproach) firstApproach = { at: e.knownAt, barsAfterBirth: e.barIndex - birth.createdBarIndex };
        break;
      case "TOUCH_START": {
        interactions.push({
          episode: e.episode,
          startAt: e.knownAt,
          startBarIndex: e.barIndex,
          startBarId: e.barId,
          endAt: null,
          endBarIndex: null,
          depth: e.penetration,
          depthPrice: e.price,
          response: "OPEN",
          responseAt: null,
          responseBarId: null,
          tradedThrough: false,
          displacementAtr: 0,
          displacementComplete: false,
        });
        if (!firstTouch) {
          firstTouch = {
            at: e.knownAt,
            barIndex: e.barIndex,
            barsAfterBirth: e.barIndex - birth.createdBarIndex,
            msAfterBirth: e.knownAt - birth.createdAt,
            sessionsAfterBirth: e.sessionsAfterBirth,
          };
        }
        deepen(e.penetration, e.price, e.barIndex);
        state = fvgStateForMitigation(mitigation) as Exclude<FvgState, "MEMORY">;
        lastInteraction = e.barIndex;
        break;
      }
      case "PENETRATION": {
        const it = at(e.episode);
        if (it) { it.depth = e.penetration; it.depthPrice = e.price; }
        if (deepen(e.penetration, e.price, e.barIndex)) state = fvgStateForMitigation(mitigation) as Exclude<FvgState, "MEMORY">;
        lastInteraction = e.barIndex;
        break;
      }
      case "RESPONSE": {
        const it = at(e.episode);
        if (it) { it.response = e.response; it.responseAt = e.knownAt; it.responseBarId = e.barId; }
        state = e.response;
        lastInteraction = e.barIndex;
        break;
      }
      case "EPISODE_END": {
        const it = at(e.episode);
        if (it) {
          it.endAt = e.knownAt;
          it.endBarIndex = e.barIndex - 1;
          if (it.response === "OPEN") it.response = "NONE";
        }
        lastInteraction = e.barIndex - 1;
        break;
      }
      case "TRADED_THROUGH": {
        const it = at(e.episode);
        if (it) {
          it.endAt = e.knownAt;
          it.endBarIndex = e.barIndex;
          it.tradedThrough = true;
          if (it.response === "OPEN") {
            it.response = "TRADED_THROUGH";
            it.responseAt = e.knownAt;
            it.responseBarId = e.barId;
          }
        }
        tradedThrough = { at: e.knownAt, barIndex: e.barIndex, barId: e.barId, close: e.close };
        maxPen = 1;
        mitigation = "FULL";
        scarBarIndex = e.barIndex;
        state = "TRADED_THROUGH";
        lastInteraction = e.barIndex;
        break;
      }
      case "DISPLACEMENT": {
        const it = at(e.episode);
        if (it) { it.displacementAtr = e.atr; it.displacementComplete = e.complete; }
        break;
      }
    }
  }

  const openEpisode = interactions.some(it => it.endBarIndex === null);
  const barsSinceInteraction = openEpisode ? 0 : Math.max(0, lastIndex - lastInteraction);

  let memory = false;
  if (tradedThrough) memory = lastIndex - tradedThrough.barIndex >= FVG_SCAR_MEMORY_BARS;
  else if (mitigation === "FULL" && scarBarIndex !== null) memory = !openEpisode && lastIndex - scarBarIndex >= FVG_SCAR_MEMORY_BARS;
  else memory = !openEpisode && barsSinceInteraction >= FVG_IDLE_MEMORY_BARS;

  let remaining: FvgObject["remaining"];
  if (mitigation === "FULL") remaining = null;
  else if (maxPenPrice === null) remaining = { bottom: birth.bottom, top: birth.top };
  else remaining = bull ? { bottom: birth.bottom, top: maxPenPrice } : { bottom: maxPenPrice, top: birth.top };

  const frozen: FvgInteraction[] = interactions.map(it => ({
    ...it,
    bars: (it.endBarIndex ?? lastIndex) - it.startBarIndex + 1,
  }));

  return {
    ...birth,
    state: memory ? "MEMORY" : state,
    coreState: state,
    mitigation,
    maxPenetration: maxPen,
    maxPenetrationPrice: maxPenPrice,
    remaining,
    firstApproach,
    firstTouch,
    horizon: fvgHorizonFor(firstTouch),
    interactions: frozen,
    tradedThrough,
    scarBarIndex,
    ageBars: lastIndex - birth.createdBarIndex,
    barsSinceInteraction,
    asOf,
    events,
  };
}

/* ── THE ENGINE ─────────────────────────────────────────────────────────── */

function defaultCloseTimeOf(timeframe: string): ((bar: CanonicalBar) => number) | null {
  const id = normalizeTFId(timeframe.trim());
  if (!id) return null;
  const ms = getTimeframe(id).candleIntervalSec * 1000;
  return (bar: CanonicalBar) => bar.asOf + ms;
}

export function createFvgEngine(config: FvgEngineConfig): FvgEngine {
  const symbolId = config.symbolId.trim();
  const timeframe = config.timeframe.trim();
  const win = config.sessionWindow ?? sessionWindowFor(symbolId, timeframe, config.extendedHours !== false);
  const rthWin = win.kind === "US_EQUITY_ETH" ? sessionWindowFor(symbolId, timeframe, false) : null;
  const closeTimeOf = config.closeTimeOf ?? defaultCloseTimeOf(timeframe);

  const closeTimes: number[] = [];
  const closes: number[] = [];
  const atrs: (number | null)[] = [];
  const ordinals: (number | null)[] = [];
  const refusals: FvgRefusal[] = [];
  const recent: CanonicalBar[] = [];
  const keys: (string | null)[] = [];
  const trackers: Tracker[] = [];
  let active: Tracker[] = [];
  let warmupTriples = 0;
  let atr: number | null = null;
  let atrSeed = 0;
  let lastKey: string | null = null;
  let ordinal = 0;
  let snap: FvgLedger | null = null;

  const refuse = (reason: FvgRefusalReason, bar: CanonicalBar): FvgPushVerdict => {
    refusals.push({ reason, barId: String(bar?.barId ?? ""), barAsOf: Number(bar?.asOf), atBarCount: closeTimes.length });
    snap = null;
    return { ok: false, reason };
  };

  function push(bar: CanonicalBar): FvgPushVerdict {
    if (!closeTimeOf) return refuse("NO_CLOCK", bar);
    if (bar.symbolId.trim() !== symbolId) return refuse("FOREIGN_INSTRUMENT", bar);
    if (bar.timeframe.trim() !== timeframe) return refuse("FOREIGN_TIMEFRAME", bar);
    if (!checkBarGeometry(bar).ok || !Number.isFinite(bar.asOf)) return refuse("MALFORMED", bar);
    const prev = recent[recent.length - 1];
    if (prev) {
      if (bar.asOf === prev.asOf) {
        if (bar.barId === prev.barId) return { ok: true, duplicate: true, born: [] };
        return refuse("REWIND_REQUIRED", bar);
      }
      if (bar.asOf < prev.asOf) return refuse("OUT_OF_ORDER", bar);
    }
    const knownAt = closeTimeOf(bar);
    if (!Number.isFinite(knownAt)) return refuse("NO_CLOCK", bar);

    const i = closeTimes.length;
    // Wilder ATR — the marketBreathing.atrSeries rule, one step at a time.
    const pc = prev ? prev.close : bar.close;
    const tr = Math.max(bar.high - bar.low, Math.abs(bar.high - pc), Math.abs(bar.low - pc));
    if (i < FVG_ATR_PERIOD) {
      atrSeed += tr;
      if (i === FVG_ATR_PERIOD - 1) atr = atrSeed / FVG_ATR_PERIOD;
    } else {
      atr = ((atr as number) * (FVG_ATR_PERIOD - 1) + tr) / FVG_ATR_PERIOD;
    }

    // Session ordinal from the ONE session owner.
    let key: string | null;
    let ord: number | null;
    if (win.kind === "NO_CLOCK") {
      key = null;
      ord = null;
    } else if (isDailyOrLonger(win)) {
      key = String(bar.asOf);
      ord = i;
    } else {
      key = sessionKeyOf(Math.floor(bar.asOf / 1000), win);
      if (key !== null && key !== lastKey) {
        if (lastKey !== null) ordinal += 1;
        lastKey = key;
      }
      ord = ordinal;
    }

    closeTimes.push(knownAt);
    closes.push(bar.close);
    atrs.push(i >= FVG_ATR_PERIOD - 1 ? atr : null);
    ordinals.push(ord);
    keys.push(key);
    recent.push(bar);
    if (recent.length > 3) recent.shift();
    snap = null;

    // 1. Lifecycle of every live object born before this bar.
    for (const t of active) stepTracker(t, bar, i, knownAt, ord);
    active = active.filter(t => !t.terminal || t.windows.some(w => !w.done));

    // 2. Detection: O(1) on the newest three closed bars.
    const born: string[] = [];
    if (recent.length === 3) {
      const [b1, b2, b3] = recent;
      const atrB2 = atrs[i - 1];
      if (atrB2 == null) {
        warmupTriples += 1;
      } else {
        const tick = config.tickSize !== undefined ? config.tickSize : instrumentTickFor(symbolId, b2.close);
        const v = testFvgGeometry(b1, b2, b3, atrB2, tick);
        if (v.ok) {
          const objectId = mintFvgObjectId({ symbolId, timeframe, b2AsOf: b2.asOf, direction: v.direction });
          if (objectId) {
            const ref = (bar0: CanonicalBar, k: number): FvgBarRef => ({
              barId: bar0.barId, asOf: bar0.asOf, sessionId: bar0.sessionId, sessionKey: keys[k], fidelity: bar0.fidelity,
            });
            const range = b2.high - b2.low;
            const size = v.top - v.bottom;
            const ordB1 = ordinals[i - 2];
            const ordB3 = ordinals[i];
            const segment = rthWin
              ? (sessionKeyOf(Math.floor(b2.asOf / 1000), rthWin) !== null ? "RTH" : "EXTENDED")
              : win.kind === "US_EQUITY_RTH" ? "RTH" : win.kind;
            const birth: FvgBirth = {
              objectId,
              definitionId: FVG_DEFINITION_ID,
              definitionVersion: FVG_DEFINITION_VERSION,
              symbolId,
              timeframe,
              direction: v.direction,
              bottom: v.bottom,
              top: v.top,
              nearEdge: v.direction === "BULLISH" ? v.top : v.bottom,
              farEdge: v.direction === "BULLISH" ? v.bottom : v.top,
              size: fvgSize(symbolId, size, tick, atrB2),
              minimum: v.minimum,
              displacement: {
                bodyRatio: range > 0 ? Math.abs(b2.close - b2.open) / range : 0,
                rangeAtr: atrB2 > 0 ? range / atrB2 : 0,
                atr: atrB2,
              },
              bars: { b1: ref(b1, i - 2), b2: ref(b2, i - 1), b3: ref(b3, i) },
              createdAt: knownAt,
              createdBarIndex: i,
              session: {
                key: keys[i - 1],
                segment,
                window: win.kind,
                crossesSession: !isDailyOrLonger(win) && ordB1 !== null && ordB3 !== null && ordB1 !== ordB3,
              },
              regime: config.regimeOf ? config.regimeOf(b2, i - 1) : "UNTAGGED",
              fidelityAtBirth: weakestFidelity([b1.fidelity, b2.fidelity, b3.fidelity]),
              approachDistance: Math.max(FVG_APPROACH_SIZE_FRACTION * size, FVG_APPROACH_ATR_FRACTION * atrB2),
              senses: {
                PRICE_GEOMETRY: { sense: "PRICE_GEOMETRY", state: "FULL", source: "OHLC" },
                ORDER_FLOW: { sense: "ORDER_FLOW", state: "NOT_ATTACHED" },
                DERIVATIVES: { sense: "DERIVATIVES", state: "NOT_ATTACHED" },
              },
            };
            const t: Tracker = {
              birth,
              birthOrdinal: ord ?? 0,
              events: [{ knownAt, barIndex: i, barId: bar.barId, kind: "BORN" }],
              opened: false,
              approaching: false,
              everTouched: false,
              inEpisode: false,
              episode: 0,
              epStart: -1,
              epMax: 0,
              insideRun: 0,
              responded: false,
              globalMax: 0,
              terminal: false,
              windows: [],
              cache: null,
            };
            trackers.push(t);
            active.push(t);
            born.push(objectId);
          }
        }
      }
    }
    return { ok: true, duplicate: false, born };
  }

  function snapshot(): FvgLedger {
    if (snap) return snap;
    const n = closeTimes.length;
    const last = n - 1;
    const asOf = n ? closeTimes[last] : null;
    const objects = trackers.map(t => {
      if (t.cache && t.cache.n === n && t.cache.len === t.events.length) return t.cache.obj;
      const obj = foldFvgObject(t.birth, t.events.slice(), last, asOf as number);
      t.cache = { n, len: t.events.length, obj };
      return obj;
    });
    snap = {
      definitionId: FVG_DEFINITION_ID,
      definitionVersion: FVG_DEFINITION_VERSION,
      symbolId,
      timeframe,
      sessionWindow: win.kind,
      barCount: n,
      closeTimes: closeTimes.slice(),
      closes: closes.slice(),
      atrs: atrs.slice(),
      asOf,
      warmupTriples,
      refusals: refusals.slice(),
      objects,
    };
    return snap;
  }

  return { push, snapshot };
}

/* ── HISTORY SCAN (once, cached) ────────────────────────────────────────── */

const scanCache = new WeakMap<readonly CanonicalBar[], Map<string, FvgLedger>>();

/**
 * The history scan: the same engine, fed once. Cached per bars array when the
 * config carries no callbacks (a callback cannot be part of a cache key).
 * Bars are oldest → newest and CLOSED; the caller drops the forming bar.
 */
export function detectFvgs(bars: readonly CanonicalBar[], config: FvgEngineConfig): FvgLedger {
  const cacheable = !config.closeTimeOf && !config.regimeOf && !config.sessionWindow;
  const key = `${config.symbolId}|${config.timeframe}|${config.extendedHours !== false}|${config.tickSize === undefined ? "auto" : String(config.tickSize)}`;
  if (cacheable) {
    const hit = scanCache.get(bars)?.get(key);
    if (hit) return hit;
  }
  const engine = createFvgEngine(config);
  for (const b of bars) engine.push(b);
  const ledger = engine.snapshot();
  if (cacheable) {
    let m = scanCache.get(bars);
    if (!m) { m = new Map(); scanCache.set(bars, m); }
    m.set(key, ledger);
  }
  return ledger;
}

/* ── AS-OF-TIME TRUTH ───────────────────────────────────────────────────── */

/**
 * Exactly what was knowable at `t` (epoch ms): bars that had CLOSED by t,
 * objects CREATED by t (b3's close ≤ t), and only the events revealed by t,
 * folded by the same reducer the live snapshot uses. Replay, Backtest and
 * Academy read gaps through this and nothing else.
 */
export function fvgStateAsOf(ledger: FvgLedger, t: number): FvgLedger {
  // Count of closed bars with closeTime ≤ t (closeTimes is ascending).
  let lo = 0;
  let hi = ledger.closeTimes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ledger.closeTimes[mid] <= t) lo = mid + 1;
    else hi = mid;
  }
  const n = lo;
  const last = n - 1;
  const asOf = n ? ledger.closeTimes[last] : null;
  const objects: FvgObject[] = [];
  for (const o of ledger.objects) {
    if (o.createdBarIndex >= n) continue;
    const known = o.events.filter(e => e.barIndex < n);
    objects.push(foldFvgObject(o, known, last, asOf as number));
  }
  return {
    ...ledger,
    barCount: n,
    closeTimes: ledger.closeTimes.slice(0, n),
    closes: ledger.closes.slice(0, n),
    atrs: ledger.atrs.slice(0, n),
    asOf,
    warmupTriples: Math.min(ledger.warmupTriples, Math.max(0, n - 2)),
    refusals: ledger.refusals.filter(r => r.atBarCount <= n && (Number.isFinite(r.barAsOf) ? r.barAsOf <= t : true)),
    objects,
  };
}

/* ── VISIBILITY BUDGET ──────────────────────────────────────────────────── */

export interface FvgVisibility {
  /** Live objects (not MEMORY, not a scar), nearest remaining territory to the last close first. */
  readonly open: readonly FvgObject[];
  /** Most recent scars (traded through / fully mitigated), newest first. */
  readonly scars: readonly FvgObject[];
  readonly hidden: { readonly open: number; readonly scars: number; readonly memory: number };
  readonly rule: string;
}

/**
 * The visibility budget. An ORDERING, not a grade: live objects by distance
 * from the last close to their remaining territory (0 inside), then newest
 * first; scars newest first. Everything past the budget is counted, never
 * deleted.
 */
export function selectFvgVisibility(
  ledger: FvgLedger,
  opts: { readonly openBudget?: number; readonly scarBudget?: number } = {},
): FvgVisibility {
  const openBudget = opts.openBudget ?? FVG_VISIBLE_OPEN_BUDGET;
  const scarBudget = opts.scarBudget ?? FVG_VISIBLE_SCAR_BUDGET;
  const price = ledger.closes.length ? ledger.closes[ledger.closes.length - 1] : null;
  const live: FvgObject[] = [];
  const scars: FvgObject[] = [];
  let memory = 0;
  for (const o of ledger.objects) {
    if (o.state === "MEMORY") { memory += 1; continue; }
    if (o.tradedThrough || o.mitigation === "FULL") scars.push(o);
    else live.push(o);
  }
  const dist = (o: FvgObject) => {
    const r = o.remaining;
    if (!r || price === null) return Number.POSITIVE_INFINITY;
    return price > r.top ? price - r.top : price < r.bottom ? r.bottom - price : 0;
  };
  live.sort((a, b) => dist(a) - dist(b) || b.createdBarIndex - a.createdBarIndex);
  scars.sort((a, b) => (b.scarBarIndex ?? 0) - (a.scarBarIndex ?? 0) || b.createdBarIndex - a.createdBarIndex);
  return {
    open: live.slice(0, openBudget),
    scars: scars.slice(0, scarBudget),
    hidden: { open: Math.max(0, live.length - openBudget), scars: Math.max(0, scars.length - scarBudget), memory },
    rule:
      `${openBudget} live gaps nearest the last close (then newest), ${scarBudget} most recent scars; `
      + `MEMORY after ${FVG_SCAR_MEMORY_BARS} bars for a scar, ${FVG_IDLE_MEMORY_BARS} idle bars otherwise.`,
  };
}

/* ── THE SHARED DRAWER ──────────────────────────────────────────────────── */

const MARKET_OBJECT_STATE: Readonly<Record<Exclude<FvgState, "MEMORY">, MarketObjectState>> = {
  BORN: "ALIVE",
  OPEN: "ALIVE",
  APPROACHING: "ALIVE",
  TOUCHED: "TESTED",
  PARTIALLY_MITIGATED: "TESTED",
  DEEPLY_MITIGATED: "TESTED",
  REJECTED: "DEFENDED",
  FULLY_MITIGATED: "CONSUMED",
  ACCEPTED: "CONSUMED",
  TRADED_THROUGH: "INVALID",
};

/** Project an FVG onto the shared MarketObject slots (kind GAP_FVG). OHLC is never copied. */
export function fvgMarketObject(o: FvgObject): MarketObject {
  const testBarIds = o.interactions.map(it => it.startBarId);
  const responded = [...o.interactions].reverse().find(it => it.responseBarId !== null);
  return {
    objectId: o.objectId,
    kind: "GAP_FVG",
    symbolId: o.symbolId,
    sessionId: o.bars.b2.sessionId,
    priceLow: o.bottom,
    priceHigh: o.top,
    birthBarId: o.bars.b3.barId,
    testBarIds,
    lastResponseBarId: responded?.responseBarId ?? null,
    invalidationPrice: o.farEdge,
    state: MARKET_OBJECT_STATE[o.coreState],
    evidenceIds: [o.bars.b1.barId, o.bars.b2.barId, o.bars.b3.barId, ...testBarIds],
    decay: o.ageBars,
    asOf: o.asOf,
    fidelityAtBirth: o.fidelityAtBirth,
  };
}

/* ── EVIDENCE BY REFERENCE ──────────────────────────────────────────────── */

/**
 * Record another owner's reading on a non-price sense. The FVG copies the
 * owner's own state word and id and NOTHING else — it never upgrades, merges
 * or re-grades that evidence. PRICE_GEOMETRY cannot be overwritten.
 */
export function attachFvgSenseReference<O extends FvgBirth>(
  o: O,
  sense: Exclude<FvgSense, "PRICE_GEOMETRY">,
  ref: { readonly owner: string; readonly ownerState: string; readonly ref: string },
): O {
  return {
    ...o,
    senses: {
      ...o.senses,
      [sense]: { sense, state: "BY_REFERENCE", owner: ref.owner, ownerState: ref.ownerState, ref: ref.ref },
    },
  };
}
