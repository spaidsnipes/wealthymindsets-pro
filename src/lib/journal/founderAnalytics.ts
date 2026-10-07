/**
 * FOUNDER'S PERSONAL ANALYTICS — Drive Garden 18 snapshot 2026-10-02 §I. PURE.
 *
 * Every broker round trip the ledger owners already reconstruct (tastytrade:
 * `buildTtRoundTrips`; Webull: `reconstructEpisodes`) becomes one analytics
 * trip with a PER-RECORD provenance, a PROPOSED Model 1 / Model 2 tag with the
 * evidence it used, and a no-shame mistake-pattern summary counted only from
 * facts the ledger or the journal actually hold.
 *
 * ── The model definitions (Drive "01_Trading_Strategy_and_Top_Down_Process",
 *    CURRENT AUTHORITY — Options Day Models, 2026-08-18) ──────────────────────
 *   Model 1 — TREND / EXPANSION: full chain aligned; 3R minimum clean runway,
 *             4R+ preferred; hold earned by structure/order flow.
 *   Model 2 — CHOP / ROTATION: only from a legitimate range edge with
 *             sufficient CLC; 1R baseline objective, 2R+ only if fresh
 *             expansion develops. No middle-of-range guessing.
 *   Model 0 — NO TRADE.
 * The model is a PRE-TRADE entry contract decided from regime / structure /
 * location. Fills cannot show it, and the same Drive section warns that
 * "calling the day Model 2 after entries creates hindsight risk". So this
 * classifier NEVER infers a model from the result, the hold time or the size.
 * It proposes MODEL_1 / MODEL_2 only from a model the trader recorded (an
 * episode mark, or a journal entry's day model for the same day and symbol),
 * and says UNCLASSIFIED otherwise. Every tag is PROPOSED until the Founder
 * confirms the definitions and the mapping.
 */

import type { TtRoundTrip } from "@/lib/broker/tastytradeLedger";
import type { Episode } from "@/lib/broker/webullLedger";
import type { BehaviourTag } from "./behaviorTags";
import type { ModelMark } from "./episodeModel";
import type { PlanVsActualResult } from "./planVsActual";

export type RecordProvenance = "PROVIDER-RETRIEVED" | "USER-IMPORTED" | "RECONSTRUCTED WITH EVIDENCE" | "UNKNOWN";
export type EvidenceKind = "FACT FROM BROKER HISTORY" | "MODEL/RULE MATCH" | "INFERENCE" | "HUMAN JOURNAL NOTE" | "UNKNOWN";

export interface AnalyticsEvidence { readonly kind: EvidenceKind; readonly text: string }

export interface AnalyticsTrip {
  readonly id: string;
  readonly broker: "tastytrade" | "webull";
  readonly account: string | null;
  readonly symbol: string;
  readonly instrumentType: string | null;
  readonly direction: "LONG" | "SHORT";
  readonly openedAt: string;
  readonly closedAt: string | null;
  readonly maxQty: number;
  /** After fees; null while open or when the broker history cannot settle it. */
  readonly net: number | null;
  readonly provenance: RecordProvenance;
  readonly provenanceWhy: string;
  /** Webull's entry order said whether a bracket was attached; tastytrade's transactions do not. */
  readonly bracketAtEntry: boolean | null;
}

/* ── adapters: one per ledger owner ─────────────────────────────────────── */

export function tripFromTastytrade(t: TtRoundTrip, accountTail: string | null): AnalyticsTrip | null {
  if (!t.openedAt) return null;
  const closed = t.truth === "ACTUAL BROKER RESULT";
  return {
    id: `tt|${accountTail ?? "?"}|${t.symbol}|${t.openedAt}`,
    broker: "tastytrade", account: accountTail, symbol: t.symbol, instrumentType: t.instrumentType,
    direction: t.direction, openedAt: t.openedAt, closedAt: t.closedAt, maxQty: t.maxQty,
    net: closed ? t.net : null,
    provenance: closed ? "RECONSTRUCTED WITH EVIDENCE" : "UNKNOWN",
    provenanceWhy: closed
      ? `Paired flat-to-flat from ${t.fills} tastytrade trade transactions (provider-retrieved); the net is tastytrade's cash and fees.`
      : "Still open in tastytrade's transactions — no result.",
    bracketAtEntry: null,
  };
}

export function tripFromWebull(e: Episode): AnalyticsTrip {
  const closed = e.label === "RECONSTRUCTED" && e.net != null;
  return {
    id: e.id, broker: "webull", account: e.accountId ? e.accountId.slice(-4) : null, symbol: e.symbol, instrumentType: e.instrumentType,
    direction: e.direction, openedAt: e.openedAt, closedAt: e.closedAt, maxQty: e.maxQuantity,
    net: closed ? e.net : null,
    provenance: closed ? "RECONSTRUCTED WITH EVIDENCE" : "UNKNOWN",
    provenanceWhy: closed
      ? `Reconstructed from ${e.entries.length + e.exits.length} filled Webull orders (provider-retrieved).`
      : e.note ?? "Not settled in Webull's order history.",
    bracketAtEntry: e.entries[0] ? e.entries[0].comboType === "MASTER" : null,
  };
}

/** A journal row the trader typed (USER-IMPORTED). Only the fields this file reads. */
export interface JournalFact {
  readonly id: string;
  readonly date: string;
  readonly symbol: string;
  readonly dayModel?: ModelMark;
  readonly plannedRDollars?: number;
  readonly realizedR?: number;
  readonly mfeR?: number;
}

/* ── Model 1 / Model 2 — PROPOSED, from recorded models only ────────────── */

export type ProposedModel = "MODEL_1" | "MODEL_2" | "UNCLASSIFIED";

export interface ModelProposal {
  readonly tripId: string;
  readonly model: ProposedModel;
  readonly status: "PROPOSED";
  readonly evidence: readonly AnalyticsEvidence[];
}

const nyDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
/** `/MNQZ6` → `MNQ`, `TSLA  261002C00305000` → `TSLA`, `MNQ1!` → `MNQ`, `NQ` → `NQ`. */
export function symbolRoot(s: string): string {
  const t = s.trim().toUpperCase().replace(/^\.?\//, "");
  const fut = /^([A-Z0-9]{1,4}?)[FGHJKMNQUVXZ]\d{1,2}$/.exec(t);
  if (fut) return fut[1];
  return (t.split(/\s+/)[0] ?? t).replace(/\d*!$/, "");
}

const MAP: Readonly<Record<ModelMark, ProposedModel>> = { M1: "MODEL_1", M2: "MODEL_2", M0: "UNCLASSIFIED" };

export function proposeModel(trip: AnalyticsTrip, mark: ModelMark | undefined, journal: readonly JournalFact[]): ModelProposal {
  const evidence: AnalyticsEvidence[] = [];
  const day = nyDay(trip.openedAt);
  const root = symbolRoot(trip.symbol);
  const notes = journal.filter(j => j.dayModel && j.date.slice(0, 10) === day && symbolRoot(j.symbol) === root);
  const noted = [...new Set(notes.map(j => j.dayModel as ModelMark))];

  if (mark) evidence.push({ kind: "HUMAN JOURNAL NOTE", text: `You marked this trade ${mark} on the ledger.` });
  for (const m of noted) evidence.push({ kind: "HUMAN JOURNAL NOTE", text: `A journal entry for ${root} on ${day} records the day as ${m}.` });

  const candidates = [...new Set([mark, ...noted].filter((m): m is ModelMark => !!m))];
  if (candidates.length > 1) {
    evidence.push({ kind: "UNKNOWN", text: `The records disagree (${candidates.join(" vs ")}). Left unclassified for you to settle.` });
    return { tripId: trip.id, model: "UNCLASSIFIED", status: "PROPOSED", evidence };
  }
  const only = candidates[0];
  if (!only) {
    evidence.push({ kind: "UNKNOWN", text: "No model was recorded for this trade. Fills cannot show regime, structure or location, so WM does not guess one from the result." });
    return { tripId: trip.id, model: "UNCLASSIFIED", status: "PROPOSED", evidence };
  }
  if (only === "M0") {
    evidence.push({ kind: "MODEL/RULE MATCH", text: "Model 0 is NO TRADE — a filled trade under an M0 record is a plan mismatch to review, not a Model 1 or 2 trade." });
    return { tripId: trip.id, model: "UNCLASSIFIED", status: "PROPOSED", evidence };
  }
  evidence.push({ kind: "MODEL/RULE MATCH", text: only === "M1"
    ? "Model 1 (trend / expansion) requires 3R+ clean runway at entry. Runway at entry is not in the broker record — not verified."
    : "Model 2 (chop / rotation) requires a qualified range edge with CLC; 1R baseline. Location at entry is not in the broker record — not verified." });
  if (trip.net != null) evidence.push({ kind: "FACT FROM BROKER HISTORY", text: `Result ${trip.net >= 0 ? "+" : "−"}$${Math.abs(trip.net).toFixed(2)} after fees (shown, never used to classify).` });
  return { tripId: trip.id, model: MAP[only], status: "PROPOSED", evidence };
}

/* ── mistake patterns — facts only, no shame ────────────────────────────── */

export const PATTERN_SAMPLE_MIN = 20;
export const REENTRY_AFTER_LOSS_MS = 5 * 60_000;

export type PatternId =
  | "NO_PROTECTION_AT_ENTRY" | "SIZE_ABOVE_USUAL" | "LOSS_BEYOND_PLANNED_1R" | "EXIT_BEFORE_MODEL_OBJECTIVE"
  | "REENTRY_SOON_AFTER_LOSS" | "TRADING_PAST_DAILY_STOP" | "TRADE_ON_NO_TRADE_RECORD"
  | "EXIT_BEFORE_PLANNED_CONDITION" | "HELD_THROUGH_INVALIDATION";

export interface PatternSummary {
  readonly id: PatternId;
  readonly label: string;
  /** Records where the pattern appeared. */
  readonly occurrences: number;
  /** Records where the pattern COULD be checked from held facts — the denominator. */
  readonly sample: number;
  readonly share: number | null;
  readonly state: "MEASURED" | "INSUFFICIENT EVIDENCE";
  readonly evidenceKind: EvidenceKind;
  /** Where the facts came from and what was left out. */
  readonly basis: string;
}

const LABEL: Readonly<Record<PatternId, string>> = {
  NO_PROTECTION_AT_ENTRY: "Entered without protection attached",
  SIZE_ABOVE_USUAL: "Size at least twice your usual",
  LOSS_BEYOND_PLANNED_1R: "A loss larger than the planned 1R",
  EXIT_BEFORE_MODEL_OBJECTIVE: "Exited before the model's objective while the move had reached it",
  REENTRY_SOON_AFTER_LOSS: "A new trade within 5 minutes of a loss",
  TRADING_PAST_DAILY_STOP: "A trade opened after two losses that day",
  TRADE_ON_NO_TRADE_RECORD: "A trade taken where the record said Model 0",
  EXIT_BEFORE_PLANNED_CONDITION: "Exited before the plan's recorded condition",
  HELD_THROUGH_INVALIDATION: "Held past the plan's invalidation",
};

function summary(id: PatternId, occurrences: number, sample: number, evidenceKind: EvidenceKind, basis: string): PatternSummary {
  return {
    id, label: LABEL[id], occurrences, sample,
    share: sample > 0 ? Math.round((occurrences / sample) * 1000) / 1000 : null,
    state: sample >= PATTERN_SAMPLE_MIN ? "MEASURED" : "INSUFFICIENT EVIDENCE",
    evidenceKind, basis,
  };
}

export interface PatternInput {
  readonly trips: readonly AnalyticsTrip[];
  /** Webull behaviour tags (behaviorTags owner), by episode id. */
  readonly webullTags: ReadonlyMap<string, readonly BehaviourTag[]>;
  readonly marks: Readonly<Record<string, ModelMark>>;
  readonly journal: readonly JournalFact[];
  /**
   * Garden 19 §28/§29: plan-vs-actual results (planVsActual) for trades with
   * a frozen plan. Only those whose exit was DECIDABLE (plan levels + price
   * path + fill times) are counted; the rest are left out of the sample.
   */
  readonly planReviews?: readonly PlanVsActualResult[];
}

export function mistakePatterns(input: PatternInput): PatternSummary[] {
  const closed = input.trips.filter(t => t.closedAt && t.net != null).sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  const out: PatternSummary[] = [];

  // 1. Protection at entry — only where the broker record says (Webull's entry order).
  const bracketKnown = closed.filter(t => t.bracketAtEntry != null);
  out.push(summary("NO_PROTECTION_AT_ENTRY", bracketKnown.filter(t => t.bracketAtEntry === false).length, bracketKnown.length, "FACT FROM BROKER HISTORY",
    "Webull entry orders (bracket attached or not). tastytrade transactions do not show a resting stop, so its trips are not counted."));

  // 2. Size vs usual — the behaviour-tag owner's ABOVE_USUAL_SIZE (no size plan is recorded on fills).
  const tagged = closed.filter(t => t.broker === "webull" && input.webullTags.has(t.id));
  out.push(summary("SIZE_ABOVE_USUAL", tagged.filter(t => (input.webullTags.get(t.id) ?? []).some(x => x.id === "ABOVE_USUAL_SIZE")).length, tagged.length, "INFERENCE",
    "Against your median size on Webull; no planned size is recorded with fills, so this is size vs usual, not vs plan."));

  // 3/4. From the journal (USER-IMPORTED): planned 1R, realized R, MFE.
  const withR = input.journal.filter(j => typeof j.plannedRDollars === "number" && j.plannedRDollars > 0 && typeof j.realizedR === "number" && Number.isFinite(j.realizedR));
  out.push(summary("LOSS_BEYOND_PLANNED_1R", withR.filter(j => (j.realizedR as number) < -1.1).length, withR.length, "HUMAN JOURNAL NOTE",
    "Journal entries with a planned 1R and a realized R (beyond −1.1R counts)."));
  const objective = (m: ModelMark | undefined) => (m === "M1" ? 3 : m === "M2" ? 1 : null);
  const withMfe = input.journal.filter(j => objective(j.dayModel) != null && typeof j.realizedR === "number" && typeof j.mfeR === "number" && Number.isFinite(j.mfeR));
  out.push(summary("EXIT_BEFORE_MODEL_OBJECTIVE",
    withMfe.filter(j => (j.mfeR as number) >= (objective(j.dayModel) as number) && (j.realizedR as number) < (objective(j.dayModel) as number)).length,
    withMfe.length, "MODEL/RULE MATCH",
    "Journal entries with a day model, realized R and MFE: the move reached 3R (M1) / 1R (M2) and the exit came before it. The rule allows trailing — review, not verdict."));

  // 5/6. Timing, from broker times (both brokers).
  // Losses ordered by close; trips are ordered by open, so one pointer walks both (linear).
  const losses = closed.filter(t => t.net! < 0).sort((a, b) => a.closedAt!.localeCompare(b.closedAt!));
  let soon = 0, afterLossSample = 0, pastStop = 0, k = 0;
  let lastLoss: AnalyticsTrip | null = null;
  const lossesClosedOnDay = new Map<string, number>();
  for (const t of closed) {
    while (k < losses.length && losses[k].closedAt! <= t.openedAt) {
      lastLoss = losses[k];
      const d = nyDay(lastLoss.closedAt!);
      lossesClosedOnDay.set(d, (lossesClosedOnDay.get(d) ?? 0) + 1);
      k++;
    }
    if (lastLoss) {
      afterLossSample++;
      if (Date.parse(t.openedAt) - Date.parse(lastLoss.closedAt!) <= REENTRY_AFTER_LOSS_MS) soon++;
    }
    if ((lossesClosedOnDay.get(nyDay(t.openedAt)) ?? 0) >= 2) pastStop++;
  }
  out.push(summary("REENTRY_SOON_AFTER_LOSS", soon, afterLossSample, "FACT FROM BROKER HISTORY",
    "Broker open/close times across both brokers: trades opened after a losing trade had closed."));
  out.push(summary("TRADING_PAST_DAILY_STOP", pastStop, closed.length, "MODEL/RULE MATCH",
    "Strategy rule: two authorized losses in a day = stop (−2R). Counted from broker results per New York day; whether each loss was a full 1R is not in fills."));

  // 7. Trades on an M0 record.
  const marked = closed.filter(t => input.marks[t.id]);
  out.push(summary("TRADE_ON_NO_TRADE_RECORD", marked.filter(t => input.marks[t.id] === "M0").length, marked.length, "HUMAN JOURNAL NOTE",
    "Trades you marked with a model on the ledger."));

  // 8/9. Plan vs actual — the frozen plan against the fills and the price path.
  const decidable = (input.planReviews ?? []).filter(r => r.exitDecidable);
  const has = (r: PlanVsActualResult, id: string) => r.findings.some(f => f.id === id);
  out.push(summary("EXIT_BEFORE_PLANNED_CONDITION", decidable.filter(r => has(r, "EXITED_BEFORE_PLANNED_CONDITION")).length, decidable.length, "MODEL/RULE MATCH",
    "Trades with a frozen plan whose exit could be compared (plan levels, fill times and the price path): no target, invalidation or time condition had printed at the exit. Why is yours to record."));
  out.push(summary("HELD_THROUGH_INVALIDATION", decidable.filter(r => has(r, "HELD_THROUGH_INVALIDATION")).length, decidable.length, "MODEL/RULE MATCH",
    "Same trades: the position was still open more than a bar after the plan's invalidation printed."));
  return out;
}

/* ── provenance census ──────────────────────────────────────────────────── */

/**
 * How many records of each provenance the analysis stands on: provider fills
 * (PROVIDER-RETRIEVED), journal rows the trader typed (USER-IMPORTED), round
 * trips paired from those fills (RECONSTRUCTED WITH EVIDENCE) and trips with
 * no settled result (UNKNOWN).
 */
export function provenanceCensus(trips: readonly AnalyticsTrip[], providerFills: number, journalRows: number): Readonly<Record<RecordProvenance, number>> {
  const out: Record<RecordProvenance, number> = { "PROVIDER-RETRIEVED": providerFills, "USER-IMPORTED": journalRows, "RECONSTRUCTED WITH EVIDENCE": 0, UNKNOWN: 0 };
  for (const t of trips) out[t.provenance]++;
  return out;
}
