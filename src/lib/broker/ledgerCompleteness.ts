/**
 * BROKER-HISTORY IMPORT — COMPLETENESS REPORT (shift order §30, 2026-11-05) — PURE.
 *
 * The import chain already exists, one owner per step:
 *   walk (webullLedgerWalk: probe year → calendar months → halve ≥ SPLIT_AT
 *   rows → cursor on one-day windows → 429 backoff) → normalize
 *   (readWebullHistory: fees, multiplier, ISO-UTC instants) → dedupe
 *   (dedupeOrders: account + order id) → positions (reconstructEpisodes:
 *   flat-to-flat) → summary (summarizeLedger).
 * Nothing said, in one place, how COMPLETE the result is. This module reads
 * those owners' outputs and says it — per account and overall — without
 * re-deciding anything they decided.
 *
 * EVIDENCE KINDS ARE NEVER MIXED. Every row this report counts is
 * EXECUTED_HISTORY — the broker's own orders and fills. Replay, simulation and
 * backtest are other kinds, with their own owners; the report refuses input
 * marked as any of them rather than folding it in.
 *
 * MODEL 1 / 2 come only from the trader's SAVED marks (episodeModel,
 * `wm_ledger_models_v1`). With none saved the model section is UNAVAILABLE —
 * WM never infers a model from the fills.
 */
import { dedupeOrders, ledgerCoverageLine, reconstructEpisodes, summarizeLedger, type Episode, type LedgerOrder, type LedgerSummary } from "./webullLedger";
import { SPLIT_AT, type AccountWalk } from "./webullLedgerWalk";
import { resultsByModel, type ModelMark, type ModelResult } from "@/lib/journal/episodeModel";

export type EvidenceKind = "EXECUTED_HISTORY" | "REPLAY" | "SIMULATION" | "BACKTEST";
export const EVIDENCE_KIND_LABEL: Readonly<Record<EvidenceKind, string>> = {
  EXECUTED_HISTORY: "EXECUTED HISTORY · the broker's own orders and fills",
  REPLAY: "REPLAY · historical bars walked again — nothing was traded",
  SIMULATION: "SIMULATION · paper / hypothetical fills — not the broker's",
  BACKTEST: "BACKTEST · a rule applied to past bars — descriptive, not executed",
};

export type AccountCompleteness = "COMPLETE_FOR_WINDOW_READ" | "INCOMPLETE";

export interface AccountReport {
  readonly accountTail: string;
  readonly verdict: AccountCompleteness;
  /** Why INCOMPLETE (empty when complete for the window read). */
  readonly gaps: readonly string[];
  readonly coverage: string;
  readonly windows: number;
  readonly pages: number;
  readonly splits: number;
  readonly throttled: number;
  readonly cachedMonths: number;
}

export interface CompletenessReport {
  readonly kind: "EXECUTED_HISTORY";
  readonly kindLabel: string;
  readonly accounts: readonly AccountReport[];
  readonly verdict: AccountCompleteness;
  readonly rowsRead: number;
  readonly uniqueOrders: number;
  readonly duplicatesRemoved: number;
  readonly byStatus: Readonly<Record<string, number>>;
  readonly filledOrders: number;
  /** Filled orders with no fill time — placement time stands in, flagged on the fill. */
  readonly fillTimeMissing: number;
  /** Filled orders whose fees Webull did not state (UNREPORTED, never "$0"). */
  readonly feesUnreported: number;
  readonly feesReportedTotal: number;
  /** Every instant normalised to ISO-8601 UTC; months bucketed in New York. */
  readonly timezone: "UTC instants · America/New_York months";
  readonly positions: {
    readonly closed: number;
    readonly open: number;
    readonly unsettled: number;
    /** Instruments with a non-zero reconstructed position at the end of the history read. */
    readonly heldAtEnd: readonly { readonly accountTail: string; readonly instrumentKey: string; readonly direction: "LONG" | "SHORT"; readonly quantity: number; readonly label: string }[];
  };
  readonly summary: LedgerSummary;
  readonly models:
    | { readonly state: "UNAVAILABLE"; readonly why: string }
    | { readonly state: "FROM_SAVED_MARKS"; readonly marked: number; readonly rows: readonly ModelResult[] };
  readonly lines: readonly string[];
}

export interface CompletenessInput {
  readonly walks: readonly AccountWalk[];
  /** Raw rows each walk read, BEFORE dedupe (the walk's own orders array is already unique per account). */
  readonly rowsRead?: number;
  readonly nowMs: number;
  /** The trader's saved model marks (episode id → M0/M1/M2), or null when none are saved. */
  readonly savedModelMarks: Readonly<Record<string, ModelMark>> | null;
  /** Declared kind of the input. Anything but EXECUTED_HISTORY is refused. */
  readonly kind?: EvidenceKind;
}

const tail = (id: string) => `·${id.slice(-4)}`;

export function ledgerCompletenessReport(input: CompletenessInput): CompletenessReport {
  const kind = input.kind ?? "EXECUTED_HISTORY";
  if (kind !== "EXECUTED_HISTORY") {
    throw new Error(`ledgerCompletenessReport reads EXECUTED_HISTORY only — refused ${kind} (${EVIDENCE_KIND_LABEL[kind]}).`);
  }
  const all: LedgerOrder[] = input.walks.flatMap(w => w.orders);
  const unique = dedupeOrders(all);
  const rowsRead = input.rowsRead ?? all.length;
  const byStatus: Record<string, number> = {};
  for (const o of unique) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
  const filled = unique.filter(o => o.filledQuantity > 0 && o.filledPrice != null);
  const episodes: Episode[] = reconstructEpisodes(unique, input.nowMs);
  const summary = summarizeLedger(episodes);

  const accounts: AccountReport[] = input.walks.map(w => {
    const gaps: string[] = [];
    if (w.stoppedBecause === "REFUSED") gaps.push(`Webull refused${w.reason ? ` (${w.reason})` : ""} — older history not read`);
    if (w.stoppedBecause === "PAGE_BUDGET") gaps.push("page budget reached — older history not read");
    if (w.nextMonth != null) gaps.push(`resumable walk not finished — continue from month ${w.nextMonth}`);
    for (const d of w.dayWindowsAtCap ?? []) gaps.push(`${d}: a one-day window still answered ${SPLIT_AT}+ rows — rests on Webull's cursor, which was measured not to recover truncated rows`);
    return {
      accountTail: tail(w.accountId),
      verdict: gaps.length ? "INCOMPLETE" : "COMPLETE_FOR_WINDOW_READ",
      gaps,
      coverage: ledgerCoverageLine(w, input.nowMs),
      windows: w.windows, pages: w.pages, splits: w.splits ?? 0, throttled: w.throttled ?? 0, cachedMonths: w.cachedMonths,
    };
  });

  // Reconstructed position at the end of the history read = every episode not yet flat.
  const heldAtEnd = episodes.filter(e => e.closedAt == null).map(e => {
    const q = e.entries.reduce((s, f) => s + f.quantity, 0) - e.exits.reduce((s, f) => s + f.quantity, 0);
    return { accountTail: tail(e.accountId), instrumentKey: e.instrumentKey, direction: e.direction, quantity: q, label: e.label };
  });

  const marks = input.savedModelMarks;
  const byModel = marks && Object.keys(marks).length ? resultsByModel(episodes, marks) : null;
  const models: CompletenessReport["models"] = !byModel || byModel.marked === 0
    ? { state: "UNAVAILABLE", why: marks && Object.keys(marks).length
        ? "Model marks are saved, but none is on a closed round trip in this history — no result by model."
        : "No Model 1 / Model 2 marks are saved. Results by model come only from the trader's own saved marks; WM does not infer a model from fills." }
    : { state: "FROM_SAVED_MARKS", marked: byModel.marked, rows: byModel.rows };

  const verdict: AccountCompleteness = accounts.some(a => a.verdict === "INCOMPLETE") || accounts.length === 0 ? "INCOMPLETE" : "COMPLETE_FOR_WINDOW_READ";
  const feesUnreported = filled.filter(o => o.feesReported === false).length;
  const report: Omit<CompletenessReport, "lines"> = {
    kind: "EXECUTED_HISTORY",
    kindLabel: EVIDENCE_KIND_LABEL.EXECUTED_HISTORY,
    accounts,
    verdict,
    rowsRead,
    uniqueOrders: unique.length,
    duplicatesRemoved: Math.max(0, rowsRead - unique.length),
    byStatus,
    filledOrders: filled.length,
    fillTimeMissing: filled.filter(o => !o.filledAt).length,
    feesUnreported,
    feesReportedTotal: Math.round(filled.reduce((s, o) => s + o.feeTotal + o.commission, 0) * 100) / 100,
    timezone: "UTC instants · America/New_York months",
    positions: { closed: summary.closed, open: summary.open, unsettled: summary.unsettled, heldAtEnd },
    summary,
    models,
  };
  const lines = [
    `${report.kindLabel} — ${verdict === "INCOMPLETE" ? "INCOMPLETE" : "complete for the window read (never 'since the account opened')"}`,
    ...accounts.map(a => `${a.accountTail} · ${a.coverage} · ${a.windows} windows, ${a.pages} pages, ${a.splits} halved, ${a.throttled} throttled${a.gaps.length ? ` · GAPS: ${a.gaps.join("; ")}` : ""}`),
    `orders: ${rowsRead} rows read → ${unique.length} unique (${report.duplicatesRemoved} duplicates removed) · ${filled.length} filled`,
    `fills: ${report.fillTimeMissing} without a fill time (placement stands in) · ${feesUnreported} with fees UNREPORTED · stated fees $${report.feesReportedTotal.toFixed(2)}`,
    `positions: ${summary.closed} closed round trips · ${summary.open} open · ${summary.unsettled} unsettled (not in realised P&L)`,
    models.state === "UNAVAILABLE" ? `models: UNAVAILABLE — ${models.why}` : `models: from ${models.marked} saved marks`,
  ];
  return { ...report, lines };
}
