/**
 * SPAIDBOT — THE FVG FACT BLOCK (Garden 19 §23–§24).
 *
 * When the chart's selected object is a GAP_FVG (or the scene holds FVGs), the
 * SpaidBot chart context carries a compact fact block READ FROM THE OBJECT the
 * one engine produced (FVG_3C) — never re-detected, never graded.
 *
 * Two halves, so a client cannot talk the model into prose:
 *   1. `spaidbotFvgScene` / `fvgFactsForSpaidbot` (CLIENT) project FvgObjects
 *      onto a small STRUCTURED record (numbers, enums, ids) for the chart's
 *      `data-ctx` as `fvg`.
 *   2. `formatFvgFactBlock` (SERVER, called by formatChartContextNote) re-validates
 *      every field and WRITES the words. A field that fails validation is
 *      dropped; a record that fails is dropped whole.
 *
 * Every line is tagged OBSERVED FACT (what the bars showed) or DERIVED
 * MEASUREMENT (arithmetic on those facts). Evidence is given per sense —
 * FULL / PARTIAL / DEGRADED / SILENCE — with its provenance; another owner's
 * reading is carried verbatim BY REFERENCE and never re-graded. The block
 * names its limitations, and says outright that price does not have to fill
 * the gap.
 *
 * PURE. No IO, no clock (the server passes nothing; times are printed as ISO).
 */

import { FVG_STATES, type FvgMitigation, type FvgState } from "@/lib/marketData/fvg/fvgDefinition";
import type { FvgObject } from "@/lib/marketData/fvg/fvgEngine";

export type FvgSenseEvidenceWord = "FULL" | "PARTIAL" | "DEGRADED" | "SILENCE";

export interface SpaidbotFvgSense {
  readonly sense: "PRICE_GEOMETRY" | "ORDER_FLOW" | "DERIVATIVES";
  /** FULL / PARTIAL / DEGRADED / SILENCE — or, BY REFERENCE, the owner's own word verbatim. */
  readonly evidence: string;
  readonly byReference: boolean;
  readonly provenance: string;
}

export interface SpaidbotFvgFacts {
  readonly v: 1;
  readonly selected: boolean;
  readonly objectId: string;
  readonly definitionId: string;
  readonly definitionVersion: number;
  readonly direction: "BULLISH" | "BEARISH";
  readonly timeframe: string;
  readonly formedAt: number;
  readonly bottom: number;
  readonly top: number;
  readonly size: { readonly price: number; readonly ticks: number | null; readonly pips: number | null; readonly unit: "TICKS" | "POINTS" | "PIPS" };
  readonly remaining: { readonly bottom: number; readonly top: number } | null;
  readonly firstTouchAt: number | null;
  readonly state: FvgState;
  readonly mitigation: FvgMitigation;
  readonly maxPenetration: number;
  readonly ageBars: number;
  readonly displacement: { readonly bodyRatio: number; readonly rangeAtr: number };
  readonly crossesSession: boolean;
  readonly fidelityAtBirth: string;
  readonly senses: readonly SpaidbotFvgSense[];
  /** The latest few interactions, oldest first. */
  readonly interactions: readonly { readonly response: string; readonly depth: number; readonly tradedThrough: boolean }[];
  readonly interactionsTotal: number;
  /** Close time of the newest bar the object was read at. */
  readonly readAsOf: number;
  /** Decimals the instrument's prices print at (pricePrecision.displayPrecisionFor), or null. */
  readonly priceDp: number | null;
}

const MAX_INTERACTIONS = 4;
const MAX_OBJECTS = 3;

function priceEvidence(fidelity: string): FvgSenseEvidenceWord {
  if (fidelity === "DEGRADED" || fidelity === "STALE") return "DEGRADED";
  if (fidelity === "PARTIAL") return "PARTIAL";
  return "FULL";
}

/** Project one engine object onto the structured record (client side). */
export function fvgFactsForSpaidbot(o: FvgObject, selected: boolean, priceDp: number | null = null): SpaidbotFvgFacts {
  const senses: SpaidbotFvgSense[] = [
    {
      sense: "PRICE_GEOMETRY",
      evidence: priceEvidence(o.fidelityAtBirth),
      byReference: false,
      provenance: `OHLC bars, fidelity at birth ${o.fidelityAtBirth}`,
    },
  ];
  for (const sense of ["ORDER_FLOW", "DERIVATIVES"] as const) {
    const s = o.senses[sense];
    senses.push(s.state === "BY_REFERENCE"
      ? { sense, evidence: s.ownerState, byReference: true, provenance: `${s.owner} ${s.ref}` }
      : { sense, evidence: "SILENCE", byReference: false, provenance: "no owner reading attached" });
  }
  return {
    v: 1,
    selected,
    objectId: o.objectId,
    definitionId: o.definitionId,
    definitionVersion: o.definitionVersion,
    direction: o.direction,
    timeframe: o.timeframe,
    formedAt: o.createdAt,
    bottom: o.bottom,
    top: o.top,
    size: { price: o.size.price, ticks: o.size.ticks, pips: o.size.pips, unit: o.size.unit },
    remaining: o.remaining,
    firstTouchAt: o.firstTouch?.at ?? null,
    state: o.state,
    mitigation: o.mitigation,
    maxPenetration: o.maxPenetration,
    ageBars: o.ageBars,
    displacement: { bodyRatio: o.displacement.bodyRatio, rangeAtr: o.displacement.rangeAtr },
    crossesSession: o.session.crossesSession,
    fidelityAtBirth: o.fidelityAtBirth,
    senses,
    interactions: o.interactions.slice(-MAX_INTERACTIONS).map(it => ({ response: it.response, depth: it.depth, tradedThrough: it.tradedThrough })),
    interactionsTotal: o.interactions.length,
    readAsOf: o.asOf,
    priceDp,
  };
}

/**
 * The scene's FVG block for `data-ctx.fvg`: the SELECTED object first (when the
 * selection is a GAP_FVG), then the nearest visible ones, at most three.
 * Empty when the scene holds no FVG.
 */
export function spaidbotFvgScene(input: {
  readonly objects: readonly FvgObject[];
  readonly selectedObjectId: string | null;
  /** The chart's display decimals (pricePrecision.displayPrecisionFor). */
  readonly priceDp?: number | null;
}): SpaidbotFvgFacts[] {
  const dp = input.priceDp ?? null;
  const sel = input.selectedObjectId ? input.objects.find(o => o.objectId === input.selectedObjectId) ?? null : null;
  const rest = input.objects.filter(o => o !== sel);
  return [...(sel ? [fvgFactsForSpaidbot(sel, true, dp)] : []), ...rest.map(o => fvgFactsForSpaidbot(o, false, dp))].slice(0, MAX_OBJECTS);
}

/* ── SERVER: validate + write the words ──────────────────────────────────── */

const ID_RE = /^FVG\|[^|\s[\]]{1,40}\|[^|\s[\]]{1,12}\|-?\d{1,16}\|(BULLISH|BEARISH)\|v[1-9]\d{0,3}$/;
const WORD_RE = /^[A-Za-z0-9 _.,:()@\-/|]{1,80}$/;
const STATES = new Set<string>(FVG_STATES);
const MITIGATIONS = new Set(["NONE", "TOUCHED", "PARTIAL", "DEEP", "FULL"]);
const RESPONSES = new Set(["REJECTED", "ACCEPTED", "TRADED_THROUGH", "NONE", "OPEN"]);

const fin = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const word = (v: unknown): string | null => (typeof v === "string" && WORD_RE.test(v.trim()) ? v.trim() : null);
const iso = (ms: number) => {
  const d = new Date(ms);
  return Number.isFinite(d.getTime()) ? d.toISOString().replace(/:\d{2}\.\d{3}Z$/, "Z") : "an unknown time";
};
const pct = (x: number) => `${Math.round(Math.max(0, Math.min(1, x)) * 100)}%`;
/** Price words: the chart's decimals when stated, else 7 significant figures (float noise is not a quote). */
let pxDp: number | null = null;
const cnt = (x: number) => String(Number(x.toPrecision(7)));
const px = (x: number) => (pxDp !== null ? x.toFixed(pxDp) : String(Number(x.toPrecision(7))));

function rec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** One object's block, or null when the record does not validate. */
export function formatOneFvgFact(raw: unknown): string | null {
  const r = rec(raw);
  if (!r || r.v !== 1) return null;
  pxDp = typeof r.priceDp === "number" && Number.isInteger(r.priceDp) && r.priceDp >= 0 && r.priceDp <= 10 ? r.priceDp : null;
  const objectId = typeof r.objectId === "string" && ID_RE.test(r.objectId) ? r.objectId : null;
  const direction = r.direction === "BULLISH" || r.direction === "BEARISH" ? r.direction : null;
  const defId = word(r.definitionId);
  const defV = fin(r.definitionVersion);
  const tf = word(r.timeframe);
  const formedAt = fin(r.formedAt);
  const bottom = fin(r.bottom);
  const top = fin(r.top);
  const state = typeof r.state === "string" && STATES.has(r.state) ? r.state : null;
  const mitigation = typeof r.mitigation === "string" && MITIGATIONS.has(r.mitigation) ? r.mitigation : null;
  const maxPen = fin(r.maxPenetration);
  const age = fin(r.ageBars);
  const readAsOf = fin(r.readAsOf);
  if (!objectId || !direction || !defId || defV === null || !tf || formedAt === null || bottom === null || top === null
    || !(top > bottom) || !state || !mitigation || maxPen === null || age === null || readAsOf === null) return null;

  const size = rec(r.size);
  const sizePrice = fin(size?.price);
  const ticks = fin(size?.ticks);
  const pips = fin(size?.pips);
  const unit = size?.unit === "TICKS" || size?.unit === "PIPS" || size?.unit === "POINTS" ? size.unit : "POINTS";
  const sizeWords = sizePrice === null ? "size unknown"
    : unit === "TICKS" && ticks !== null ? `${cnt(ticks)} ticks (${px(sizePrice)} points)`
    : unit === "PIPS" && pips !== null ? `${cnt(pips)} pips (${px(sizePrice)} in price)`
    : `${px(sizePrice)} points${ticks !== null ? ` (${cnt(ticks)} ticks)` : ""}`;
  const rem = rec(r.remaining);
  const remB = fin(rem?.bottom), remT = fin(rem?.top);
  const remainingWords = rem && remB !== null && remT !== null ? `${px(remB)}–${px(remT)}` : "none (every part visited)";
  const firstTouchAt = fin(r.firstTouchAt);
  const disp = rec(r.displacement);
  const body = fin(disp?.bodyRatio), rangeAtr = fin(disp?.rangeAtr);
  const fid = word(r.fidelityAtBirth) ?? "UNKNOWN";

  const ints = Array.isArray(r.interactions) ? r.interactions.map(rec).filter(Boolean) as Record<string, unknown>[] : [];
  const total = fin(r.interactionsTotal) ?? ints.length;
  const intWords = ints
    .map(it => {
      const resp = typeof it.response === "string" && RESPONSES.has(it.response) ? it.response : null;
      const depth = fin(it.depth);
      if (!resp || depth === null) return null;
      return `${resp}${it.tradedThrough === true ? " then closed through" : ""} (deepest ${pct(depth)})`;
    })
    .filter(Boolean)
    .join(", ");

  const senses = (Array.isArray(r.senses) ? r.senses : [])
    .map(rec)
    .filter(Boolean)
    .map(s => {
      const sense = s!.sense === "PRICE_GEOMETRY" || s!.sense === "ORDER_FLOW" || s!.sense === "DERIVATIVES" ? s!.sense : null;
      const ev = word(s!.evidence);
      const prov = word(s!.provenance) ?? "provenance not stated";
      if (!sense || !ev) return null;
      return s!.byReference === true
        ? `${sense} ${ev} (owner's own word, by reference — ${prov}; not re-graded)`
        : `${sense} ${ev} (${prov})`;
    })
    .filter(Boolean)
    .join("; ");

  const observed = [
    `${direction.toLowerCase()} gap on ${tf}, formed ${iso(formedAt)} (close of its third bar)`,
    `boundaries ${px(bottom)}–${px(top)}`,
    firstTouchAt !== null ? `first touched ${iso(firstTouchAt)}` : "not touched as of the reading",
    total > 0 ? `${total} interaction${total === 1 ? "" : "s"}${intWords ? `: ${intWords}` : ""}` : "no prior interaction",
    `latest lifecycle state ${state}`,
  ].join("; ");
  const derived = [
    `size ${sizeWords}`,
    `remaining territory ${remainingWords}`,
    `mitigation depth ${mitigation} (deepest penetration ${pct(maxPen)} of size)`,
    `age ${Math.round(age)} bars`,
    body !== null && rangeAtr !== null ? `displacement context: middle-bar body/range ${body.toFixed(2)}, range ${rangeAtr.toFixed(2)}× ATR(14) — context, not a grade` : "displacement context not stated",
    `opening gap across a session boundary: ${r.crossesSession === true ? "yes" : "no"}`,
  ].join("; ");
  return `${r.selected === true ? "SELECTED " : ""}${objectId} — definition ${defId} v${defV}. `
    + `OBSERVED FACT: ${observed}. `
    + `DERIVED MEASUREMENT: ${derived}. `
    + `EVIDENCE PER SENSE: ${senses || "not stated"}. `
    + `LIMITATIONS: read as of ${iso(readAsOf)} from bars of fidelity ${fid}; a descriptive object, not a forecast — price does not have to fill it; a sense marked SILENCE says nothing either way.`;
}

/** The whole block for the chart note, or "" when there is nothing valid. */
export function formatFvgFactBlock(raw: unknown): string {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_OBJECTS) : [];
  const parts = list.map(formatOneFvgFact).filter((x): x is string => x !== null);
  if (!parts.length) return "";
  return ` [FVG facts from the chart's one FVG engine — tag every claim you make from these as OBSERVED FACT, DERIVED MEASUREMENT, INFERENCE or HYPOTHESIS: ${parts.join(" | ")}]`;
}
