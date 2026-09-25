/**
 * A SELECTED SHELF OR MARK — which anatomy object the trader picked, and what
 * the window in view says about it NOW.
 *
 * Child: ANATOMY SELECTION. Parent: F06 Order Flow › Effort → Response.
 * Class: INSPECTOR feed. The absorption shelves and exhaustion marks on the
 * glass become selectable; the ONE selection reducer holds which one, and
 * this module answers "is it still there?" each frame.
 *
 * ── WHY AN ID IS NOT ENOUGH ────────────────────────────────────────────────
 *
 * Both readings are measured over the bars IN VIEW, normalised to that
 * window's own peak effort and displacement, and the window follows the
 * camera and includes the forming bar. So an object the trader clicked can
 * change without anything being wrong:
 *
 *   · an absorbing run GROWS by a bar — same shelf, later end;
 *   · a pan brings a bigger bar into view and the run no longer grades;
 *   · a fourth exhausted push arrives and the mark cap drops the oldest,
 *     which is still on screen;
 *   · the camera leaves it altogether.
 *
 * "Id not found → out of view" would be false in three of those four. The
 * resolver names which one happened, from the owners' own output:
 *
 *   SAME                  the same object is drawn.
 *   RESHAPED              a same-kind object overlapping its span is drawn —
 *                         the largest overlap (the growing live run).
 *   NOT_GRADED_IN_WINDOW  some of its bars are in view, but nothing drawn
 *                         matches. For a mark, the push covering its span is
 *                         still carried — a near miss, or an exhausted push
 *                         the cap left off the glass.
 *   OUT_OF_VIEW           none of its bars are in view.
 *   UNMEASURED            nothing can be graded in this window at all.
 *
 * Inspect reads the CURRENT resolution, never a frozen at-click snapshot that
 * would disagree with the glass as the window re-measures; the selection
 * keeps the last drawn reading beside it for when nothing is drawn.
 *
 * ── WHAT THIS MODULE COMPUTES ──────────────────────────────────────────────
 *
 * Nothing about the market. It matches spans and filters the owners' arrays:
 * zones and per-bar effort/displacement from `selectAbsorptionAnatomy`,
 * marks and pushes from `selectExhaustion`, the four metrics from
 * `selectAnatomyCards` asked about this one object. Hit rects are the canvas's
 * (what it painted this frame); this only chooses among them.
 *
 * PURE. DETERMINISTIC. Window-sized work — never the whole history.
 */

import type {
  AbsorptionAnatomyVM,
  AbsorptionZone,
  AnatomyBar,
  EffortBasis,
} from "@/lib/marketData/selectAbsorptionAnatomy";
import selectAnatomyCards, { ANATOMY_CARDS_VERSION, type AnatomyCard } from "./selectAnatomyCards";
import { EXHAUSTION_VERSION, type ExhaustionReading, type ExhaustionVM, type PushDirection } from "./selectExhaustion";

export const ANATOMY_SELECTION_VERSION = 1;

/** What the trader picked, by the owners' own coordinates. */
export type AnatomyTarget =
  | { readonly reading: "ABSORPTION"; readonly startTime: number; readonly endTime: number }
  | {
      readonly reading: "EXHAUSTION";
      readonly direction: PushDirection;
      /** The push's extreme bar — where the mark hangs. */
      readonly time: number;
      /** The push's own first and last bar. */
      readonly startTime: number;
      readonly endTime: number;
    };

export type AnatomyResolution = "SAME" | "RESHAPED" | "NOT_GRADED_IN_WINDOW" | "OUT_OF_VIEW" | "UNMEASURED";

/** The window a reading was measured on — its fidelity and asOf. */
export interface AnatomyWindowStamp {
  readonly basis: EffortBasis;
  readonly bars: number;
  /** First and last bar of the window (unix seconds); null when it has none. */
  readonly from: number | null;
  readonly to: number | null;
  /** The view held more bars than the field draws; the right-hand end was kept. */
  readonly capped: boolean;
}

export interface AnatomyInspectVM {
  readonly version: number;
  /** The selected object's id — stable for the selection. */
  readonly id: string;
  readonly target: AnatomyTarget;
  readonly state: AnatomyResolution;
  /** The id of the object drawn for it in this window; null when none is. */
  readonly currentId: string | null;
  readonly window: AnatomyWindowStamp;
  /** ABSORPTION: the drawn zone (SAME / RESHAPED). */
  readonly zone: AbsorptionZone | null;
  /**
   * The window's bars over the drawn zone's span — or, when none is drawn but
   * its bars are in view, over the selected span, as the window grades them now.
   */
  readonly bars: readonly AnatomyBar[];
  /**
   * EXHAUSTION: the drawn mark (SAME / RESHAPED); when NOT_GRADED, the push
   * covering its span if the owner still measures one.
   */
  readonly push: ExhaustionReading | null;
  /** The cards owner's four metrics about THIS object; null when there is nothing current to read. */
  readonly card: AnatomyCard | null;
  readonly exhaustionVersion: number;
  readonly cardsVersion: number;
}

export function anatomyTargetId(target: AnatomyTarget): string {
  return target.reading === "ABSORPTION"
    ? `abs:${target.startTime}`
    : `exh:${target.direction}:${target.time}`;
}

export function zoneTarget(zone: AbsorptionZone): AnatomyTarget {
  return { reading: "ABSORPTION", startTime: zone.startTime, endTime: zone.endTime };
}

export function markTarget(mark: ExhaustionReading): AnatomyTarget {
  return {
    reading: "EXHAUSTION",
    direction: mark.direction,
    time: mark.time,
    startTime: mark.pushStartTime,
    endTime: mark.pushEndTime,
  };
}

/** Is the selected object drawn on the glass in this reading? */
export function anatomyReadingDrawn(vm: AnatomyInspectVM | null | undefined): boolean {
  return vm?.state === "SAME" || vm?.state === "RESHAPED";
}

const inSpan = (t: number, s: number, e: number) => t >= s && t <= e;

/** Bars of the window inside both spans; -1 when the spans do not meet. */
function overlapBars(bars: readonly AnatomyBar[], s1: number, e1: number, s2: number, e2: number): number {
  const s = Math.max(s1, s2), e = Math.min(e1, e2);
  if (s > e) return -1;
  let n = 0;
  for (const b of bars) if (inSpan(b.time, s, e)) n++;
  return n;
}

/** The candidate whose span shares the most window bars with [s, e]; null when none meets it. */
function largestOverlap<T>(
  items: readonly T[],
  span: (x: T) => readonly [number, number],
  bars: readonly AnatomyBar[],
  s: number,
  e: number,
): T | null {
  let best: T | null = null;
  let bestN = -1;
  for (const x of items) {
    const [xs, xe] = span(x);
    const n = overlapBars(bars, xs, xe, s, e);
    if (n > bestN) { best = x; bestN = n; }
  }
  return bestN >= 0 ? best : null;
}

/**
 * Resolve the selected object against this frame's owners. `anatomy` and
 * `exhaustion` must be the SAME frame's readings the glass drew from.
 */
export function selectAnatomyInspect(
  target: AnatomyTarget,
  anatomy: AbsorptionAnatomyVM | null | undefined,
  exhaustion: ExhaustionVM | null | undefined,
  windowCapped: boolean,
): AnatomyInspectVM {
  const winBars = anatomy?.measured ? anatomy.bars : [];
  const window: AnatomyWindowStamp = {
    basis: anatomy?.basis ?? "UNMEASURED",
    bars: anatomy?.windowBars ?? 0,
    from: winBars[0]?.time ?? null,
    to: winBars.at(-1)?.time ?? null,
    capped: windowCapped,
  };
  const base = {
    version: ANATOMY_SELECTION_VERSION,
    id: anatomyTargetId(target),
    target,
    window,
    exhaustionVersion: exhaustion?.version ?? EXHAUSTION_VERSION,
    cardsVersion: ANATOMY_CARDS_VERSION,
  };
  const none = { currentId: null, zone: null, bars: [] as AnatomyBar[], push: null, card: null };
  const barsIn = (s: number, e: number) => winBars.filter(b => inSpan(b.time, s, e));
  const outOrUngraded = (): AnatomyInspectVM => {
    const inView = barsIn(target.startTime, target.endTime);
    return inView.length > 0
      ? { ...base, ...none, state: "NOT_GRADED_IN_WINDOW", bars: inView }
      : { ...base, ...none, state: "OUT_OF_VIEW" };
  };

  if (!anatomy || !anatomy.measured) return { ...base, ...none, state: "UNMEASURED" };

  if (target.reading === "ABSORPTION") {
    const same = anatomy.zones.find(z => z.startTime === target.startTime && z.endTime === target.endTime) ?? null;
    const zone = same
      ?? largestOverlap(anatomy.zones, z => [z.startTime, z.endTime] as const, winBars, target.startTime, target.endTime);
    if (!zone) return outOrUngraded();
    return {
      ...base,
      state: same ? "SAME" : "RESHAPED",
      currentId: anatomyTargetId(zoneTarget(zone)),
      zone,
      bars: barsIn(zone.startTime, zone.endTime),
      push: null,
      card: selectAnatomyCards(anatomy, exhaustion, { zone }).absorption,
    };
  }

  if (!exhaustion || !exhaustion.measured) return { ...base, ...none, state: "UNMEASURED" };
  const sameDir = (m: ExhaustionReading) => m.direction === target.direction;
  const pushSpan = (m: ExhaustionReading) => [m.pushStartTime, m.pushEndTime] as const;
  const same = exhaustion.marks.find(m =>
    sameDir(m) && m.time === target.time && m.pushStartTime === target.startTime && m.pushEndTime === target.endTime) ?? null;
  const mark = same
    ?? largestOverlap(exhaustion.marks.filter(sameDir), pushSpan, winBars, target.startTime, target.endTime);
  if (mark) {
    return {
      ...base,
      state: same ? "SAME" : "RESHAPED",
      currentId: anatomyTargetId(markTarget(mark)),
      zone: null,
      bars: barsIn(mark.pushStartTime, mark.pushEndTime),
      push: mark,
      card: selectAnatomyCards(anatomy, exhaustion, { push: mark }).exhaustion,
    };
  }
  // Not drawn. The push behind it may still be measured: a near miss, or an
  // exhausted push the mark cap left off the glass. Carried, not drawn.
  const push = largestOverlap(exhaustion.pushes.filter(sameDir), pushSpan, winBars, target.startTime, target.endTime);
  const ungraded = outOrUngraded();
  if (!push || ungraded.state === "OUT_OF_VIEW") return ungraded;
  return { ...ungraded, push, card: selectAnatomyCards(anatomy, exhaustion, { push }).exhaustion };
}

/** A change detector for the frame loop: equal keys, nothing new to tell Inspect. */
export function anatomyReadingKey(vm: AnatomyInspectVM | null | undefined): string {
  return vm ? JSON.stringify(vm) : "";
}

/* ── HIT-TESTING WHAT THE GLASS PAINTED ─────────────────────────────────── */

export interface AnatomyHitRect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/** One painted object: its own body first, then anything attached (its chip). */
export interface AnatomyHit {
  readonly target: AnatomyTarget;
  readonly rects: readonly AnatomyHitRect[];
}

/** Phone-first: a thin shelf or a 13px mark still gets a finger-sized target. */
export const MIN_ANATOMY_HIT_PX = 28;

export function padHitRect(r: AnatomyHitRect, min = MIN_ANATOMY_HIT_PX): AnatomyHitRect {
  const w = Math.max(r.w, min), h = Math.max(r.h, min);
  return { x: r.x - (w - r.w) / 2, y: r.y - (h - r.h) / 2, w, h };
}

/**
 * The object under (x, y). Marks are painted after shelves, so a mark wins
 * where the two overlap; then the smaller body (the more specific object).
 */
export function pickAnatomyHit(hits: readonly AnatomyHit[], x: number, y: number): AnatomyHit | null {
  const inside = (r: AnatomyHitRect) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const area = (h: AnatomyHit) => (h.rects[0] ? h.rects[0].w * h.rects[0].h : Infinity);
  let best: AnatomyHit | null = null;
  for (const h of hits) {
    if (!h.rects.some(inside)) continue;
    if (!best) { best = h; continue; }
    const hEx = h.target.reading === "EXHAUSTION", bEx = best.target.reading === "EXHAUSTION";
    if (hEx !== bEx) { if (hEx) best = h; continue; }
    if (area(h) < area(best)) best = h;
  }
  return best;
}

export default selectAnatomyInspect;
