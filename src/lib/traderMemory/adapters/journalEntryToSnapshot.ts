/**
 * journalEntryToSnapshot — adapter from local Journal entries into
 * DecisionMemorySnapshot[] the selectors consume.
 *
 * Bridges the existing localStorage journal (src/app/journal/page.tsx)
 * into the Founder loop:
 *   Journal entries → snapshots → selectMirror / selectPermission /
 *   selectProcessLandscape / selectATHOSIntervention
 *
 * Truthful projection:
 *   - JournalEntry has post-trade P&L + processQuality; adapter maps
 *     these to outcome.realizedR (R multiple derived from entry/exit/
 *     stop-implied-risk when possible) and review.processAdherence.
 *   - Fields NOT recorded in the journal (playbook version, external
 *     influence flag, market state summary dimensions) default to
 *     null / false / conservative defaults — never fabricated.
 *   - Owner scoping: caller passes ownerId. Adapter never invents one.
 *
 * Determinism: no wall-clock reads. All timestamps derive from the
 * entry's `date` field.
 */

import type { DecisionMemorySnapshot } from "../viewModels/selectProcessLandscape";
import {
  isJournalRecord,
  readStoredNumber,
  readStoredSide,
  readStoredText,
} from "@/lib/journal/journalRecordShape";

/**
 * ── WHY THIS ADAPTER STOPPED TRUSTING ITS PARAMETER TYPE ─────────────────────
 *
 * `readJournalStorage` hands back `readonly unknown[]` — it validates that the
 * parsed JSON is an array and nothing else. Three callers cast that straight to
 * an entry type. `useJournalSnapshots` was one, and its cast fed THIS function,
 * which then read `.symbol`, `.side`, `.pnl` and `.size` off whatever was in the
 * browser's localStorage. Measured, on real shapes a browser can hold:
 *
 *   null in the array          -> THREW "Cannot read properties of null
 *                                 (reading 'symbol')". Not a designed boundary:
 *                                 a crash, in a hook mounted by /journal,
 *                                 /profile, /morning-prep, /command-deck and
 *                                 the Market Canvas VM. One bad byte, four
 *                                 surfaces gone.
 *   no `side`                  -> direction "SHORT", plan "ENTER_SHORT". A
 *                                 short the trader never took.
 *   pnl: "250.00", size: "2"   -> realizedR 25. String division coerced a
 *                                 fabricated R multiple into the process
 *                                 landscape.
 *   no `id`                    -> decisionId: undefined. Two such rows share
 *                                 one identity — and DECISION_ID is the key the
 *                                 whole shared-position artery is built on.
 *   no `pnl`, exit > 0         -> realizedR 0. H1: absence is not zero. A trade
 *                                 whose return WM never learned was reported as
 *                                 a flat one.
 *
 * The parameter is `unknown` now, and every field question is asked of
 * `journalRecordShape.ts` — the one owner of "what is a stored record", rather
 * than a fourth private copy of the guards.
 */

/** Minimum shape the adapter needs — subset of app JournalEntry. */
export interface AdaptableJournalEntry {
  id: string;
  date: string;
  symbol: string;
  side: "long" | "short";
  entry: number;
  exit: number;
  size: number;
  pnl: number;
  pct: number;
  tags: readonly string[];
  setup: string;
  processQuality?: string;    // "GREAT" | "GOOD" | "MID" | "POOR" | "UNRESOLVED"
  processOutcome?: string;    // "PROFESSIONAL_WIN" | "PROFESSIONAL_LOSS" | "DANGEROUS_WIN" | "PREVENTABLE_LOSS" | "UNRESOLVED"
}

/**
 * Best-effort conversion. Returns null when the entry can't be meaningfully
 * projected (missing symbol or missing entry price).
 */
export function journalEntryToSnapshot(
  record: unknown,
  ownerId: string,
  sessionIdentity?: string,
): DecisionMemorySnapshot | null {
  // null, arrays and primitives are not records. This guard is the one that
  // used to be a thrown TypeError on four mounted surfaces.
  if (!isJournalRecord(record)) return null;

  const decisionId = readStoredText(record.id);
  if (decisionId === undefined) return null;

  const symbol = readStoredText(record.symbol);
  if (symbol === undefined) return null;

  // The side is REQUIRED, not defaulted. There is no honest snapshot of a
  // directional decision whose direction the record does not state, and the
  // old ternary answered SHORT for every one of them.
  const side = readStoredSide(record.side);
  if (side === undefined) return null;

  const entryPrice = readStoredNumber(record.entry);
  if (entryPrice === undefined || entryPrice <= 0) return null;

  const date = readStoredText(record.date);
  if (date === undefined) return null;

  const capturedAt = new Date(date).getTime();
  if (!Number.isFinite(capturedAt) || capturedAt <= 0) return null;

  const session = sessionIdentity ?? `session-${date}`;

  // R multiple derivation: without an explicit stop the journal doesn't
  // record risk, so we approximate via P&L per unit / entry price × 100
  // as a scale-free proxy. This is CANDIDATE evidence, not authoritative.
  //
  // `realizedR` is `number | undefined` on purpose. When the record does not
  // carry a P&L WM can do arithmetic with, the honest answer is that the return
  // is unknown — the old code wrote 0, which reads as a flat trade.
  const pnl = readStoredNumber(record.pnl);
  const size = readStoredNumber(record.size);
  const realizedR = derivePnlR(pnl, size, entryPrice);

  // Playbook id from setup — falls back to a stable "unspecified" so
  // ProcessLandscape's playbook axis has a bucket.
  const setup = readStoredText(record.setup);
  const playbookId = setup
    ? setup.toLowerCase().replace(/\s+/g, "-")
    : "unspecified";

  // Rule adherence: infer from processQuality.
  // Current canon (Top-Down §journalProcess): FOLLOWED_PLAN → adherence;
  // BROKE_RULES / UNRESOLVED → non-adherence.
  // Legacy ordinal (pre-2026-08 canon): GREAT/GOOD → adherence.
  // Never fabricates a self-report.
  const processQuality = record.processQuality;
  const ruleAdherenceAtDecision =
    processQuality === "FOLLOWED_PLAN" ||
    processQuality === "GREAT" ||
    processQuality === "GOOD";

  // Review composite: only populated for LEGACY ordinal processQuality
  // (GREAT/GOOD/MID/POOR) which encoded a 1-5 quality score. Current
  // canon FOLLOWED_PLAN/BROKE_RULES is binary discipline, not a quality
  // ordinal — so review stays undefined and callers read
  // ruleAdherenceAtDecision instead. Prevents fake per-dimension 1-5
  // scores from a binary source (canon §Truth Resolution Matrix).
  const reviewedAt = capturedAt;
  const legacyOrdinal: 5 | 4 | 3 | 2 | 1 | null =
    processQuality === "GREAT" ? 5 :
    processQuality === "GOOD"  ? 4 :
    processQuality === "MID"   ? 3 :
    processQuality === "POOR"  ? 2 :
    processQuality === "TERRIBLE" ? 1 :
    null;
  const review = legacyOrdinal !== null
    ? {
        reviewedAt,
        marketOpportunityQuality: legacyOrdinal,
        playbookMatch: legacyOrdinal,
        riskQuality: legacyOrdinal,
        executionQuality: legacyOrdinal,
        processAdherence: legacyOrdinal,
      }
    : undefined;

  // Outcome — only when the trade is closed (exit > 0) AND the return is
  // actually known. `selectProcessLandscape` types realizedR as a plain
  // `number` and reads it as WIN / LOSS / flat, so handing it a placeholder
  // would put a fabricated result on the process landscape. An unreadable P&L
  // leaves the decision open-ended instead, which is what it is.
  const exitPrice = readStoredNumber(record.exit);
  const outcome = exitPrice !== undefined && exitPrice > 0 && realizedR !== undefined
    ? {
        closedAt: capturedAt,
        realizedR,
        reason: "MANUAL" as const,
      }
    : undefined;

  return {
    decisionId,
    capturedAt,
    ownerId,
    sessionIdentity: session,
    marketStateSummary: {
      regime: null,
      direction: side === "long" ? "LONG" : "SHORT",
      location: null,
      volatility: null,
      session: null,
    },
    playbookId,
    playbookVersion: 1,
    plan: {
      action: side === "long" ? "ENTER_LONG" : "ENTER_SHORT",
      expectedR: 0,
    },
    ruleAdherenceAtDecision,
    externalInfluenceFlagged: false,
    tradeNumberInSession: 1,
    outcome,
    review,
  };
}

/**
 * The scale-free R proxy, or undefined when the record does not carry a P&L
 * WM can do arithmetic with.
 *
 * Undefined is the whole point. `"250.00" / "2"` is 125 in JavaScript, so a
 * stored string does not fail to divide — it produces a confident, wrong R.
 * And a missing pnl used to reach `Number.isFinite(NaN) ? … : 0`, reporting a
 * trade of unknown return as a flat one.
 */
function derivePnlR(
  pnl: number | undefined,
  size: number | undefined,
  entryPrice: number,
): number | undefined {
  if (pnl === undefined) return undefined;
  const perUnitPnl = size !== undefined && size > 0 ? pnl / size : pnl;
  const scaleFreeR = perUnitPnl / entryPrice * 20;
  return Number.isFinite(scaleFreeR) ? Number(scaleFreeR.toFixed(3)) : undefined;
}

/**
 * Batch adapter. Sorts snapshots by capturedAt (oldest first) so any
 * downstream detector that iterates in-order (e.g. detectSuccessRuleBending
 * in selectMirror) sees chronologically-correct data.
 *
 * Takes `unknown[]` — the same bytes `readJournalStorage` actually returns.
 * Callers do not get to assert a shape on the way in; that assertion is what
 * let a null into a property read.
 */
export function journalEntriesToSnapshots(
  entries: readonly unknown[],
  ownerId: string,
): readonly DecisionMemorySnapshot[] {
  return entries
    .map((e) => journalEntryToSnapshot(e, ownerId))
    .filter((s): s is DecisionMemorySnapshot => s !== null)
    .sort((a, b) => a.capturedAt - b.capturedAt);
}
