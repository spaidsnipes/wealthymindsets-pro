/**
 * FVG ON THE GLASS — the pure half of the /charts FVG / Imbalance layer
 * (Garden 19 FVG lane D, "MARKET MANIFESTATION", Founder order 2026-10-07
 * §8–§10, §19, §43–§51, §58).
 *
 * The ONE detector and the ONE lifecycle are `src/lib/marketData/fvg/`
 * (FVG_3C v1); the chart reads them through the ONE camera door
 * (`fvgCamera.fvgSceneForCamera`, with its live increment memo and the replay
 * cursor). This file never detects, ages or grades a gap: it
 *
 *   1. projects a ledger object to screen geometry under the PHYSICAL GRAMMAR
 *      (territory, not a label): remaining territory dense, visited part a
 *      hatched scar, approach = a soft glow on the near edge, rejection = a
 *      short tick at the response bar, acceptance = filled interior with a
 *      quiet inner line, traded through = the far edge breaks (dashed);
 *   2. names the clear zone (§15): no band reaches the newest candle's slot,
 *      the last price or a position / order / broker line;
 *   3. writes the receipts and the Inspect rows (numbers live THERE, never on
 *      the glass).
 *
 * PURE. No React, no canvas, no clock.
 */

import {
  FVG_DEFINITION_ID,
  FVG_DEFINITION_VERSION,
  FVG_IDLE_MEMORY_BARS,
  FVG_SCAR_MEMORY_BARS,
} from "@/lib/marketData/fvg/fvgDefinition";
import type { FvgObject, FvgVisibility } from "@/lib/marketData/fvg/fvgEngine";

/** The stored preference (default OFF) and the Tool Finder / education id. */
export const FVG_PREF_KEY = "wm_fvg";
export const FVG_INSTRUMENT_ID = "FVG_IMBALANCE" as const;
/** Paint + compute budget per frame (receipt `fvgCost`). */
export const FVG_COST_BUDGET_MS = 1.5;

/* ── 1. GEOMETRY ────────────────────────────────────────────────────────── */

/**
 * The opacity ladder this layer paints on (Garden 19: price ink > structure >
 * territory > memory). Every alpha is a rung × the object's age factor, and
 * never below the floor — memory is quiet, never invisible.
 */
export const FVG_OPACITY = {
  remainingFill: 0.2,
  visitedHatch: 0.34,
  visitedFill: 0.05,
  edge: 0.62,
  acceptedFill: 0.13,
  innerLine: 0.32,
  glow: 0.34,
  tick: 0.85,
  floor: 0.05,
} as const;

export type FvgForm = "LIVE" | "SCAR" | "MEMORY";

export interface FvgCamera {
  readonly timeToX: (timeSec: number) => number | null;
  readonly priceToY: (price: number) => number | null;
  /** The clear zone's left edge (§15): nothing is painted at or right of this x. */
  readonly xStop: number;
}

export interface FvgBandGeometry {
  readonly objectId: string;
  readonly bullish: boolean;
  readonly form: FvgForm;
  readonly x0: number;
  readonly x1: number;
  /** Territory on screen, yTop < yBottom. */
  readonly yTop: number;
  readonly yBottom: number;
  /** Unvisited territory (dense), or null once fully visited. */
  readonly remaining: { readonly y0: number; readonly y1: number } | null;
  /** The visited part (hatched scar), or null when untouched. */
  readonly visited: { readonly y0: number; readonly y1: number } | null;
  readonly nearY: number;
  readonly farY: number;
  /** A close went beyond the far edge — it is drawn dashed. */
  readonly farBroken: boolean;
  /** Untouched and price is near: the near edge glows (outward, toward price). */
  readonly approach: boolean;
  /** The latest response was acceptance: filled interior + a quiet inner line. */
  readonly accepted: boolean;
  /** x of each rejection's response bar, inside [x0, x1]. */
  readonly rejectTicks: readonly number[];
  /** Age factor ∈ (0, 1] applied to every rung. */
  readonly age: number;
  /** Tap target (≥ minHit tall). */
  readonly hit: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
}

/** The ledger bar index whose close time is `ms` (closeTimes ascending), or null. */
export function fvgIndexAtClose(closeTimes: readonly number[], ms: number): number | null {
  let lo = 0, hi = closeTimes.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (closeTimes[m] === ms) return m;
    if (closeTimes[m] < ms) lo = m + 1; else hi = m - 1;
  }
  return null;
}

export function fvgFormOf(o: Pick<FvgObject, "state" | "tradedThrough" | "mitigation">): FvgForm {
  if (o.state === "MEMORY") return "MEMORY";
  return o.tradedThrough || o.mitigation === "FULL" ? "SCAR" : "LIVE";
}

/** Age factor: live objects fade toward 0.5 over the idle-memory horizon; scars from 0.55 toward 0.35; memory 0.3. */
export function fvgAgeFactor(o: Pick<FvgObject, "state" | "tradedThrough" | "mitigation" | "barsSinceInteraction" | "scarBarIndex">, newestIndex: number): number {
  const form = fvgFormOf(o);
  if (form === "MEMORY") return 0.3;
  if (form === "SCAR") {
    const since = o.scarBarIndex == null ? FVG_SCAR_MEMORY_BARS : Math.max(0, newestIndex - o.scarBarIndex);
    return 0.55 - 0.2 * Math.min(1, since / FVG_SCAR_MEMORY_BARS);
  }
  return 1 - 0.5 * Math.min(1, Math.max(0, o.barsSinceInteraction) / FVG_IDLE_MEMORY_BARS);
}

/** One rung at one age, never below the floor. */
export function fvgAlpha(rung: number, age: number): number {
  return Math.max(FVG_OPACITY.floor, Math.min(1, rung * age));
}

/**
 * One object's band on screen, or null when none of it is in front of the
 * clear zone. `timeOfIndex` maps a ledger bar index to renderer time
 * (`FvgCameraScene.barTimesSec`); `closeTimes` is the ledger's own clock.
 */
export function fvgBandGeometry(
  o: FvgObject,
  cam: FvgCamera,
  timeOfIndex: (barIndex: number) => number | null,
  opts: { readonly newestIndex: number; readonly minHit?: number; readonly closeTimes?: readonly number[] },
): FvgBandGeometry | null {
  const b2Sec = Math.floor(o.bars.b2.asOf / 1000);
  const xb2 = cam.timeToX(b2Sec);
  const yA = cam.priceToY(o.top), yB = cam.priceToY(o.bottom);
  if (xb2 == null || yA == null || yB == null || !Number.isFinite(xb2) || !Number.isFinite(yA) || !Number.isFinite(yB)) return null;
  const form = fvgFormOf(o);
  // A scar's territory ends where it became one (traded through / fully visited).
  let xEnd = cam.xStop;
  const endIdx = o.tradedThrough ? o.tradedThrough.barIndex : o.mitigation === "FULL" ? o.scarBarIndex : null;
  if (endIdx != null) {
    const te = timeOfIndex(endIdx);
    const xe = te == null ? null : cam.timeToX(te);
    if (xe != null && Number.isFinite(xe)) xEnd = Math.min(xEnd, xe);
  }
  const x0 = Math.max(0, xb2);
  const x1 = Math.min(cam.xStop, xEnd);
  if (!(x1 - x0 >= 2)) return null;
  let yTop = Math.min(yA, yB), yBottom = Math.max(yA, yB);
  if (yBottom - yTop < 1) { const m = (yTop + yBottom) / 2; yTop = m - 0.5; yBottom = m + 0.5; }
  const bullish = o.direction === "BULLISH";
  const py = (p: number) => { const y = cam.priceToY(p); return y == null || !Number.isFinite(y) ? null : y; };
  const span = (lo: number, hi: number) => {
    const a = py(hi), b = py(lo);
    if (a == null || b == null) return null;
    const y0 = Math.max(yTop, Math.min(a, b)), y1 = Math.min(yBottom, Math.max(a, b));
    return y1 - y0 >= 0.5 ? { y0, y1 } : null;
  };
  const remaining = o.remaining ? span(o.remaining.bottom, o.remaining.top) : null;
  let visited: { y0: number; y1: number } | null = null;
  if (!o.remaining) visited = { y0: yTop, y1: yBottom };
  else if (bullish && o.remaining.top < o.top) visited = span(o.remaining.top, o.top);
  else if (!bullish && o.remaining.bottom > o.bottom) visited = span(o.bottom, o.remaining.bottom);
  const nearY = bullish ? yTop : yBottom;
  const farY = bullish ? yBottom : yTop;
  const ticks: number[] = [];
  for (const it of o.interactions) {
    if (it.response !== "REJECTED" || it.responseAt == null) continue;
    const k = fvgIndexAtClose(opts.closeTimes ?? [], it.responseAt);
    const t = k == null ? null : timeOfIndex(k);
    const x = t == null ? null : cam.timeToX(t);
    if (x != null && Number.isFinite(x) && x >= x0 && x <= x1) ticks.push(x);
  }
  const lastResponse = [...o.interactions].reverse().find(it => it.response === "REJECTED" || it.response === "ACCEPTED");
  const accepted = o.coreState === "ACCEPTED" || (lastResponse?.response === "ACCEPTED" && !o.tradedThrough);
  const minHit = opts.minHit ?? 10;
  const h = Math.max(minHit, yBottom - yTop);
  const cy = (yTop + yBottom) / 2;
  return {
    objectId: o.objectId, bullish, form, x0, x1, yTop, yBottom, remaining, visited, nearY, farY,
    farBroken: o.tradedThrough != null,
    approach: o.coreState === "APPROACHING" && form === "LIVE",
    accepted,
    rejectTicks: ticks,
    age: fvgAgeFactor(o, opts.newestIndex),
    hit: { x: x0, y: cy - h / 2, w: x1 - x0, h },
  };
}

/* ── 2. THE CLEAR ZONE (§15) ────────────────────────────────────────────── */

/**
 * The left edge of the newest candle's slot, less half a slot of air: no band
 * reaches the newest candle (or its last-price label beside the axis).
 */
export function fvgClearZoneX(newestX: number | null, barSpacing: number, plotRight: number): number {
  const sp = Number.isFinite(barSpacing) && barSpacing > 0 ? barSpacing : 6;
  if (newestX == null || !Number.isFinite(newestX)) return plotRight;
  return Math.max(0, Math.min(plotRight, newestX - sp * 1.5));
}

/**
 * Horizontal keep-out strips around the last price and every position / order
 * / broker line — merged, so an even-odd clip can never re-open an overlap.
 */
export function fvgKeepOutStrips(ys: readonly (number | null | undefined)[], half = 3): { y0: number; y1: number }[] {
  const s = ys.filter((y): y is number => y != null && Number.isFinite(y)).map(y => ({ y0: y - half, y1: y + half })).sort((a, b) => a.y0 - b.y0);
  const out: { y0: number; y1: number }[] = [];
  for (const r of s) {
    const p = out[out.length - 1];
    if (p && r.y0 <= p.y1) p.y1 = Math.max(p.y1, r.y1);
    else out.push({ ...r });
  }
  return out;
}

/* ── 3. RECEIPTS ────────────────────────────────────────────────────────── */

export function fvgReceipt(vis: FvgVisibility): string {
  const hidden = vis.hidden.open + vis.hidden.scars + vis.hidden.memory;
  return `OPEN:${vis.open.length}|SCARS:${vis.scars.length}|HIDDEN:${hidden}|DEF:${FVG_DEFINITION_ID}@${FVG_DEFINITION_VERSION}`;
}

export function fvgCostReceipt(ms: number, acc: { n: number; sum: number; longest: number }): string {
  const mean = acc.n ? acc.sum / acc.n : 0;
  return `${ms.toFixed(2)}ms|mean${mean.toFixed(2)}|longest${acc.longest.toFixed(2)}|budget${FVG_COST_BUDGET_MS}|${mean <= FVG_COST_BUDGET_MS ? "MET" : "OVER"}`;
}

/** An object id is an FVG's (the GAP_FVG drawer's) — `FVG|…` by the definition's minting rule. */
export function isFvgObjectId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("FVG|");
}

/* ── 4. INSPECT (the numbers the glass withholds) ───────────────────────── */

export interface FvgInspectRow {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

const STATE_WORDS: Record<string, string> = {
  BORN: "Born — created at the third bar's close",
  OPEN: "Open — price has not come near it",
  APPROACHING: "Approaching — price is within reach of the near edge",
  TOUCHED: "Touched — a wick reached the near edge",
  PARTIALLY_MITIGATED: "Partially mitigated — under half the territory visited",
  DEEPLY_MITIGATED: "Deeply mitigated — half or more visited",
  FULLY_MITIGATED: "Fully mitigated — a wick reached the far edge",
  REJECTED: "Rejected — a close went back out on the origin side",
  ACCEPTED: "Accepted — consecutive closes held inside",
  TRADED_THROUGH: "Traded through — a close beyond the far edge (invalidated)",
  MEMORY: "Memory — aged out of the live view; kept, never deleted",
};

const HORIZON_WORDS: Record<string, string> = {
  IMMEDIATE: "Immediate (≤ 3 bars, same session)",
  SAME_SESSION: "Same session",
  NEXT_SESSION: "Next session",
  LATER_SESSION: "2–4 sessions later",
  MULTI_DAY: "5+ sessions later",
  STILL_OPEN_WITHIN_HORIZON: "Not touched yet",
  SESSION_UNKNOWN: "Touched — session distance unknown on this series",
};

export function fvgStateWords(state: string): string {
  return STATE_WORDS[state] ?? state;
}

const pct = (f: number) => `${Math.round(f * 100)}%`;

/**
 * Every row Inspect prints for one FVG, from the ledger object alone. `fmt`
 * is the market's price precision; `clock` the room's time formatter.
 */
export function fvgInspectRows(o: FvgObject, fmt: (p: number) => string, clock: (ms: number) => string): FvgInspectRow[] {
  const bull = o.direction === "BULLISH";
  const s = o.size;
  const sizeWords = [
    s.ticks != null ? `${+s.ticks.toFixed(2)} ticks` : null,
    s.pips != null ? `${+s.pips.toFixed(2)} pips` : null,
    `${fmt(s.points)} points`,
  ].filter(Boolean).join(" · ") + ` · ${s.atr.toFixed(2)}× ATR14`;
  const rows: FvgInspectRow[] = [
    { id: "definition", label: "Definition", value: `${o.definitionId} v${o.definitionVersion} — three closed bars, a wick gap, the middle bar's body pointing the gap's way, size ≥ max(1 tick, 0.10 × ATR14).` },
    { id: "direction", label: "Direction", value: bull ? "Bullish — the territory sits BELOW the displacement; its near edge is the top." : "Bearish — the territory sits ABOVE the displacement; its near edge is the bottom." },
    { id: "boundaries", label: "Boundaries", value: `${fmt(o.bottom)} – ${fmt(o.top)} · near edge ${fmt(o.nearEdge)} · far edge ${fmt(o.farEdge)}` },
    { id: "created", label: "Created", value: `${clock(o.createdAt)} (third bar's close)${o.session.key ? ` · session ${o.session.key}` : ""}${o.session.crossesSession ? " · crosses a session boundary (opening gap)" : ""}` },
    { id: "size", label: "Size", value: `${sizeWords} · minimum ${fmt(o.minimum.price)} by ${o.minimum.basis === "TICK" ? "the instrument tick" : "0.10 × ATR14"}` },
    { id: "displacement", label: "Displacement (context, not a grade)", value: `body ${pct(o.displacement.bodyRatio)} of range · range ${o.displacement.rangeAtr.toFixed(2)}× ATR14` },
    { id: "age", label: "Age", value: `${o.ageBars} bars · ${o.barsSinceInteraction} since last interaction` },
    { id: "lifecycle", label: "Lifecycle", value: fvgStateWords(o.state) },
    { id: "penetration", label: "Deepest penetration", value: o.maxPenetrationPrice == null ? "None — never visited" : `${pct(o.maxPenetration)} of the territory · at ${fmt(o.maxPenetrationPrice)} · ${o.mitigation.toLowerCase()}` },
    { id: "remaining", label: "Remaining territory", value: o.remaining ? `${fmt(o.remaining.bottom)} – ${fmt(o.remaining.top)}` : "None — every price in it was visited" },
    { id: "horizon", label: "Time to return", value: `${HORIZON_WORDS[o.horizon] ?? o.horizon}${o.firstTouch ? ` · first touch ${o.firstTouch.barsAfterBirth} bars after creation` : ""}` },
  ];
  if (o.interactions.length === 0) rows.push({ id: "interactions", label: "Interactions", value: "None yet." });
  o.interactions.forEach((it, k) => rows.push({
    id: `interaction-${k + 1}`,
    label: `Interaction ${k + 1}`,
    value: `${clock(it.startAt)} · depth ${pct(it.depth)} · ${it.response === "OPEN" ? "running" : it.response.toLowerCase().replace("_", " ")}${it.tradedThrough ? " · closed through" : ""} · moved ${it.displacementAtr.toFixed(2)}× ATR away${it.displacementComplete ? "" : " (window still open)"} · ${it.bars} bars`,
  }));
  if (o.tradedThrough) rows.push({ id: "traded-through", label: "Traded through", value: `${clock(o.tradedThrough.at)} · close ${fmt(o.tradedThrough.close)}` });
  const sense = (k: "PRICE_GEOMETRY" | "ORDER_FLOW" | "DERIVATIVES") => {
    const e = o.senses[k];
    if (e.state === "FULL") return `FULL — read from OHLC wicks of bars ${o.bars.b1.barId}, ${o.bars.b2.barId}, ${o.bars.b3.barId} · fidelity at birth ${o.fidelityAtBirth}`;
    if (e.state === "NOT_ATTACHED") return "NOT ATTACHED — the FVG does not read this sense; its own owner speaks for it.";
    return `BY REFERENCE — ${e.owner} said ${e.ownerState} (${e.ref}); not upgraded or re-graded here.`;
  };
  rows.push(
    { id: "sense-price", label: "Evidence · price geometry", value: sense("PRICE_GEOMETRY") },
    { id: "sense-flow", label: "Evidence · order flow", value: sense("ORDER_FLOW") },
    { id: "sense-derivatives", label: "Evidence · derivatives", value: sense("DERIVATIVES") },
    { id: "honesty", label: "What this does not say", value: "No guaranteed return should be assumed. WM Pro records what price did here — never a fill target, never a score." },
  );
  return rows;
}

/* Types the chart's React readers need, re-exported so a component never
   reaches into the engine (fvgCamera.sentinel: chart code reads FVG objects
   only from the scene the camera door produced). */
export type { FvgObject } from "@/lib/marketData/fvg/fvgEngine";
export type { FvgCameraScene } from "@/lib/marketData/fvg/fvgCamera";
