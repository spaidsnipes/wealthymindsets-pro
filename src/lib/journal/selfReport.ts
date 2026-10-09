/**
 * THE TRADER'S OWN LABELS — Garden 19 §29 "Psychology without fake mind reading" (2026-10-09). PURE.
 *
 * The order: WM may help a trader study fear, impatience, FOMO, revenge behavior, over-management,
 * hesitation, overconfidence and plan deviation "ONLY when supported by trader self-report, observable
 * action, explicit plan comparison, legitimate historical behavior … Evidence before psychology labels."
 *
 * So these words exist in WM in exactly ONE place — this module — and only as labels the TRADER puts on
 * his own decision, by his own press, in Review:
 *   · WM never chooses, suggests, pre-selects or infers one. Nothing here reads price, P&L or a finding.
 *   · The chooser is not on the glass until the trader asks for it ("Label it yourself").
 *   · A label is counted only BESIDE the factual departure it was attached to (plan comparison), and a
 *     share is MEASURED only at ≥ 20 trades with that departure; below that it is a count.
 *   · Erasing a decision's plan clears its labels with the "why did the plan change?" answer.
 * Every sentence says "you labelled" — a fact about what the trader wrote, never about what he felt.
 */

import { DEPARTURES } from "./planAdherence";
import { DEVIATION_LABEL, type DeviationId, type PlanVsActualResult } from "./planVsActual";
import { INSUFFICIENT, isMeasured, STAT_SAMPLE_MIN } from "./statGuard";

/** The eight the order names, in its order. `words` is what the chip and the count say. */
export const SELF_REPORT_LABELS = [
  { id: "FEAR", words: "fear" },
  { id: "IMPATIENCE", words: "impatience" },
  { id: "FOMO", words: "FOMO" },
  { id: "REVENGE", words: "revenge" },
  { id: "OVER_MANAGEMENT", words: "over-management" },
  { id: "HESITATION", words: "hesitation" },
  { id: "OVERCONFIDENCE", words: "overconfidence" },
  { id: "DELIBERATE_CHANGE", words: "a deliberate change of plan" },
] as const;
export type SelfReportId = (typeof SELF_REPORT_LABELS)[number]["id"];
const IDS: readonly string[] = SELF_REPORT_LABELS.map(l => l.id);
export const selfReportWords = (id: SelfReportId): string => SELF_REPORT_LABELS.find(l => l.id === id)!.words;

export const SELF_REPORT_ASK = "Label it yourself (optional)";
export const SELF_REPORT_RULE = "Only you choose these. WM never picks one, and never reads one from a price or a result.";

/** Stored labels, cleaned: known ids only, each once, in the order's order. Anything else is dropped. */
export function readSelfReport(raw: unknown): readonly SelfReportId[] {
  if (!Array.isArray(raw)) return [];
  const have = new Set(raw.filter((x): x is string => typeof x === "string" && IDS.includes(x)));
  return SELF_REPORT_LABELS.map(l => l.id).filter(id => have.has(id));
}

/** The trader pressed a chip: add it, or take it off. */
export function toggleSelfReport(current: readonly SelfReportId[] | undefined, id: SelfReportId): readonly SelfReportId[] {
  const now = readSelfReport(current ?? []);
  return readSelfReport(now.includes(id) ? now.filter(x => x !== id) : [...now, id]);
}

/** "You labelled this: impatience, fear." — or null when the trader has not labelled it. */
export function selfReportLine(labels: readonly SelfReportId[] | undefined): string | null {
  const l = readSelfReport(labels ?? []);
  return l.length ? `You labelled this: ${l.map(selfReportWords).join(", ")}.` : null;
}

export interface SelfReportRow {
  readonly departure: DeviationId;
  /** Decided trades with this departure. */
  readonly trades: number;
  /** Of those, how many the trader labelled at all. */
  readonly labelled: number;
  readonly counts: readonly { readonly id: SelfReportId; readonly count: number }[];
  readonly state: "MEASURED" | "INSUFFICIENT EVIDENCE";
  readonly line: string;
}

/**
 * The trader's labels, counted beside the departure they were attached to. Only DECIDED trades with a
 * departure are rows; a departure nobody labelled still appears (0 labelled) so silence is visible.
 */
export function selfReportByDeparture(rows: readonly { readonly result: PlanVsActualResult; readonly labels?: readonly SelfReportId[] }[]): SelfReportRow[] {
  const out: SelfReportRow[] = [];
  for (const dep of DEPARTURES) {
    const here = rows.filter(r => r.result.decisionId && r.result.exitDecidable && r.result.findings.some(f => f.id === dep));
    if (!here.length) continue;
    const labelled = here.filter(r => readSelfReport(r.labels ?? []).length > 0);
    const counts = SELF_REPORT_LABELS.map(l => ({ id: l.id as SelfReportId, count: labelled.filter(r => readSelfReport(r.labels ?? []).includes(l.id)).length })).filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count);
    const n = here.length;
    const state = isMeasured(n) ? "MEASURED" as const : "INSUFFICIENT EVIDENCE" as const;
    const what = DEVIATION_LABEL[dep].toLowerCase();
    const list = counts.map(c => `${selfReportWords(c.id)} ${c.count}${state === "MEASURED" ? ` (${Math.round((c.count / n) * 100)}%)` : ""}`).join(", ");
    const body = labelled.length
      ? `you labelled ${labelled.length} yourself — ${list}; ${n - labelled.length} carry no label`
      : "you labelled none";
    out.push({
      departure: dep, trades: n, labelled: labelled.length, counts, state,
      line: state === "MEASURED"
        ? `Of ${n} decided trades with “${what}”, ${body}.`
        : `“${what[0].toUpperCase()}${what.slice(1)}” on ${n} decided ${n === 1 ? "trade" : "trades"}: ${body}. ${INSUFFICIENT} — ${n} of ${STAT_SAMPLE_MIN} for a share.`,
    });
  }
  return out.sort((a, b) => b.trades - a.trades);
}
