/**
 * PERSONAL EDGE × FVG — THE CONTEXT SPLITS. Garden 19 §23. PURE.
 *
 * The study list (planFvgStudy) groups decisions by WHEN / DEPTH / AGE. This
 * adds the context the decision was taken IN, each read from data that was
 * knowable at the decision (as of the decision — never later):
 *
 *   STRUCTURE        fvgRelationships: BROKE / RECLAIMED a swing confirmed before b2 opened,
 *                    a swing inside, none — or the structure owner's SILENCE
 *   PROFILE          fvgRelationships: POC / VAH / VAL or HVN / LVN inside or near (the
 *                    profile of the bars BEFORE formation), none — or SILENCE
 *   ORDER FLOW       fvgRelationships ORDER_FLOW family (§14): who took the larger share of the signed
 *                    volume on the latest touch bar the decision knew of (else the displacement bar),
 *                    in the side owner's word — or SILENT when no signed volume was held for those
 *                    bars. A record saved before that family existed falls back to the reference's
 *                    own evidence word for ORDER_FLOW (by reference).
 *   WALL             fvgRelationships WALL family (options wall, gamma flip, liquidity
 *                    pool), none — or SILENCE (bars carry no chain or book)
 *   EFFORT→RESPONSE  the Response Matrix cell of the displacement bar b2 (effortEvidence
 *                    thresholds, read over the bars up to b2) — or SILENT
 *   TOUCH EFFORT     the same owner's cell for the first bar of the latest interaction the
 *                    decision knew of (§13) — "no touch bar read" when there was none
 *   SESSION          New York time of the decision
 *   REGIME           the gap's regime tag at b2 (UNTAGGED when no regime reading was attached)
 *   TIMEFRAME, INSTRUMENT  from the reference
 *
 * Context a record does not carry is its own group ("NOT RECORDED …"), never
 * guessed and never dropped.
 *
 * Two outcomes are kept APART on every row:
 *   MARKET   how the territory itself responded in the decision's interaction
 *            (REJECTED / ACCEPTED / TRADED_THROUGH / NONE) — the market's answer;
 *   TRADER   the trader's own recorded R and plan adherence — the trader's answer.
 * Each is MEASURED only at ≥ 20 (STAT_SAMPLE_MIN), else INSUFFICIENT EVIDENCE.
 * Descriptive only — no edge, no forecast.
 */

import type { ResponseCell } from "@/lib/chart/effortEvidence";
import type { FvgInteractionResponse } from "@/lib/marketData/fvg/fvgDefinition";
import type { JournalFvgReference } from "./fvgDecisionReference";
import { DEPARTURES } from "./planAdherence";
import type { PlanVsActualResult } from "./planVsActual";
import { INSUFFICIENT, insufficientLine, isMeasured, STAT_SAMPLE_MIN } from "./statGuard";

export type SplitDimension = "STRUCTURE" | "PROFILE" | "ORDER FLOW" | "WALL" | "EFFORT→RESPONSE" | "TOUCH EFFORT" | "SESSION" | "REGIME" | "TIMEFRAME" | "INSTRUMENT";
export const SPLIT_DIMENSIONS: readonly SplitDimension[] = ["STRUCTURE", "PROFILE", "ORDER FLOW", "WALL", "EFFORT→RESPONSE", "TOUCH EFFORT", "SESSION", "REGIME", "TIMEFRAME", "INSTRUMENT"];

/** The part of a relationship reading the splits use — a full FvgRelationshipReading satisfies it. */
export interface SplitRelationships {
  readonly relationships: readonly { readonly family: string; readonly kind: string; readonly state?: string | null; readonly ownerState?: string | null }[];
  readonly sources: readonly { readonly family: string; readonly evidence: string }[];
}

export interface SplitInput {
  readonly ref: JournalFvgReference;
  /**
   * Relationships as of formation (fvgRelationshipsFor / fvgBarOnlyRelationships, or the context stored with
   * the journal entry — fvgDecisionContext); null = not recorded. Only family, kind and each owner's evidence
   * word are read.
   */
  readonly relationships?: SplitRelationships | null;
  /** Response Matrix cell of the displacement bar b2; "SILENT" when the owner could not read; null = not recorded. */
  readonly effortCell?: ResponseCell | "SILENT" | null;
  /** The gap's regime tag at b2 (FvgObject.regime); null = not recorded. */
  readonly regime?: string | null;
  /** MARKET outcome: the territory's own response in the decision's interaction; null = not known. */
  readonly marketResponse?: FvgInteractionResponse | null;
  /** TRADER outcome. */
  readonly realizedR?: number | null;
  readonly result?: PlanVsActualResult | null;
}

const NOT = "NOT RECORDED with this reference";

const ny = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" });
export function sessionGroupOf(ms: number): string {
  const p = ny.formatToParts(new Date(ms));
  const wd = p.find(x => x.type === "weekday")?.value ?? "";
  const m = Number(p.find(x => x.type === "hour")?.value) * 60 + Number(p.find(x => x.type === "minute")?.value);
  if (wd === "Sat" || wd === "Sun") return "Weekend (New York)";
  if (m >= 570 && m < 660) return "NY open 09:30–11:00 ET";
  if (m >= 660 && m < 840) return "NY midday 11:00–14:00 ET";
  if (m >= 840 && m < 960) return "NY afternoon 14:00–16:00 ET";
  return "Outside NY regular hours";
}

export function splitGroupsOf(x: SplitInput): Readonly<Record<SplitDimension, string>> {
  const rel = x.relationships;
  const fam = (f: "STRUCTURE" | "PROFILE" | "WALL") => {
    if (!rel) return NOT;
    const src = rel.sources.filter(s => s.family === f);
    const rs = rel.relationships.filter(r => r.family === f);
    if (rs.length) return null;
    return src.length && src.every(s => s.evidence === "SILENCE") ? `${f.toLowerCase()} owner SILENCE` : `No ${f.toLowerCase()} relationship`;
  };
  const structure = fam("STRUCTURE") ?? (() => {
    const kinds = new Set(rel!.relationships.filter(r => r.family === "STRUCTURE").map(r => r.kind));
    return kinds.has("BROKE_SWING") ? "Broke a confirmed swing" : kinds.has("RECLAIMED_SWING") ? "Reclaimed a confirmed swing" : "A confirmed swing inside";
  })();
  const profile = fam("PROFILE") ?? (() => {
    const kinds = new Set(rel!.relationships.filter(r => r.family === "PROFILE").map(r => r.kind));
    return kinds.has("POC") || kinds.has("VAH") || kinds.has("VAL") ? "POC / VAH / VAL inside or near" : "HVN / LVN inside or near";
  })();
  const wall = fam("WALL") ?? "A wall, flip or pool inside or near";
  const of = x.ref.snapshot.evidence.find(e => e.sense === "ORDER_FLOW");
  // §13 / §14 bar readings: the LATEST touch the decision knew of (rows are in time order), else the displacement bar.
  const word = (r: SplitRelationships["relationships"][number] | undefined) => r?.state ?? r?.ownerState ?? null;
  const last = (family: string, kind: string) => { const rs = rel?.relationships.filter(r => r.family === family && r.kind === kind) ?? []; return rs[rs.length - 1]; };
  const flowSrc = rel?.sources.filter(s => s.family === "ORDER_FLOW") ?? [];
  const flowWord = word(last("ORDER_FLOW", "TOUCH_FLOW"));
  const flowAtB2 = word(last("ORDER_FLOW", "DISPLACEMENT_FLOW"));
  const flow = !flowSrc.length ? null
    : flowWord ? `Touch bar signed volume: ${flowWord}`
    : flowAtB2 ? `Displacement bar signed volume: ${flowAtB2}`
    : "Order flow SILENT (no signed volume held for the gap's bars)";
  const effortSrc = rel?.sources.filter(s => s.family === "EFFORT_RESPONSE") ?? [];
  const touchCell = word(last("EFFORT_RESPONSE", "TOUCH_EFFORT"));
  const touch = !rel || !effortSrc.length ? NOT
    : effortSrc.every(s => s.evidence === "SILENCE") ? "Effort→response SILENT"
    : touchCell ? `Touch bar ${touchCell}` : "No touch bar read at the decision";
  return {
    STRUCTURE: structure,
    PROFILE: profile,
    "ORDER FLOW": flow ?? (of ? (of.state === "NOT_ATTACHED" ? "Order flow NOT ATTACHED" : `Order flow ${of.state}`) : NOT),
    WALL: wall,
    "EFFORT→RESPONSE": x.effortCell == null ? NOT : x.effortCell === "SILENT" ? "Effort→response SILENT" : `Displacement bar ${x.effortCell}`,
    "TOUCH EFFORT": touch,
    SESSION: sessionGroupOf(x.ref.decisionAtMs),
    REGIME: x.regime == null ? NOT : x.regime === "UNTAGGED" ? "Regime UNTAGGED (no regime reading attached)" : `Regime ${x.regime}`,
    TIMEFRAME: `Timeframe ${x.ref.timeframe}`,
    INSTRUMENT: x.ref.symbol,
  };
}

export interface MarketOutcome {
  readonly n: number;
  readonly rejected: number;
  readonly accepted: number;
  readonly tradedThrough: number;
  readonly other: number;
  readonly state: "MEASURED" | "INSUFFICIENT EVIDENCE";
  readonly line: string;
}
export interface TraderOutcome {
  readonly withR: number;
  readonly meanR: number | null;
  readonly decided: number;
  readonly followed: number;
  readonly state: "MEASURED" | "INSUFFICIENT EVIDENCE";
  readonly line: string;
}
export interface SplitRow {
  readonly dimension: SplitDimension;
  readonly group: string;
  readonly decisions: number;
  readonly market: MarketOutcome;
  readonly trader: TraderOutcome;
}

const pct = (a: number, n: number) => `${Math.round((a / n) * 100)}%`;

export function fvgContextSplits(rows: readonly SplitInput[]): SplitRow[] {
  const out: SplitRow[] = [];
  for (const dim of SPLIT_DIMENSIONS) {
    const groups = new Map<string, SplitInput[]>();
    for (const r of rows) { const g = splitGroupsOf(r)[dim]; (groups.get(g) ?? groups.set(g, []).get(g)!).push(r); }
    for (const [group, rs] of [...groups].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))) {
      const known = rs.map(r => r.marketResponse).filter((m): m is FvgInteractionResponse => m != null && m !== "OPEN");
      const c = (k: FvgInteractionResponse) => known.filter(m => m === k).length;
      const mState = isMeasured(known.length) ? "MEASURED" as const : "INSUFFICIENT EVIDENCE" as const;
      const market: MarketOutcome = {
        n: known.length, rejected: c("REJECTED"), accepted: c("ACCEPTED"), tradedThrough: c("TRADED_THROUGH"), other: c("NONE"), state: mState,
        line: mState === "MEASURED"
          ? `MARKET: the territory rejected on ${pct(c("REJECTED"), known.length)}, was accepted on ${pct(c("ACCEPTED"), known.length)} and traded through on ${pct(c("TRADED_THROUGH"), known.length)} of ${known.length}.`
          : `MARKET: ${INSUFFICIENT} — ${known.length} of ${STAT_SAMPLE_MIN} interactions with a settled response.`,
      };
      const rsR = rs.map(r => r.realizedR).filter((x): x is number => typeof x === "number" && Number.isFinite(x));
      const decided = rs.filter(r => r.result?.exitDecidable);
      const followed = decided.filter(r => !r.result!.findings.some(f => DEPARTURES.includes(f.id))).length;
      const tState = isMeasured(rsR.length) ? "MEASURED" as const : "INSUFFICIENT EVIDENCE" as const;
      const meanR = rsR.length ? Math.round((rsR.reduce((s, x) => s + x, 0) / rsR.length) * 100) / 100 : null;
      const trader: TraderOutcome = {
        withR: rsR.length, meanR, decided: decided.length, followed, state: tState,
        line: (tState === "MEASURED" ? `TRADER: mean ${meanR}R over ${rsR.length} recorded results` : `TRADER: ${insufficientLine(rsR.length)}`)
          + (isMeasured(decided.length) ? `; plan followed on ${followed} of ${decided.length} decided (${pct(followed, decided.length)}).` : `; plan adherence ${INSUFFICIENT} (${decided.length} decided).`),
      };
      out.push({ dimension: dim, group, decisions: rs.length, market, trader });
    }
  }
  return out;
}
