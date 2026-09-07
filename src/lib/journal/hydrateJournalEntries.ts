/**
 * THE TRADER'S OWN BOOK, READ RATHER THAN ASSERTED.
 *
 * ── The last of the three casts ──────────────────────────────────────────────
 *
 * `readJournalStorage` verifies one thing about the saved journal — that the
 * parsed JSON is an array — and hands back `readonly unknown[]`. /journal cast
 * that to `JournalEntry[]` inside a `useState` initializer and immediately did:
 *
 *   saved.filter((e) => !LEGACY_DEMO_TRADES.has(`${e.id}|${e.date}|${e.symbol}`))
 *
 * A `null` in that array throws reading `.id`, INSIDE the initial state
 * computation, which means /journal does not partially fail — it never renders.
 * The trader's entire book becomes a blank screen, and the page whose whole job
 * is to be the record of what he did says nothing at all about why.
 *
 * The same cast then let unread rows into `entries`, which the persistence
 * effect writes straight back to localStorage. A shape nobody checked was being
 * re-saved as if WM had endorsed it.
 *
 * ── What this module refuses, and what it keeps ──────────────────────────────
 *
 * REFUSED (the row is not a trade at all without them): id, date, symbol, side,
 * and the four numbers the book is arithmetic on — entry, exit, size, pnl. Every
 * entry the app has ever written carries all eight. A row missing one is either
 * corrupt or predates the current shape, and either way WM cannot show it as a
 * trade.
 *
 * KEPT (a field WM cannot read is not a reason to delete a trade the trader
 * actually took): everything else is read with an explicit, documented fallback.
 * `processQuality` falls back to UNRESOLVED, never FOLLOWED_PLAN — the honest
 * default is neither pride nor shame. `result` is read, not derived from pnl:
 * §H13 keeps P&L and outcome as separate recorded facts, and deriving one from
 * the other is the drift the edge projection was fixed for.
 *
 * NOTHING IS SILENT. `coverage` counts what was refused so /journal can say so.
 * A book that quietly shrinks teaches the trader he traded less than he did.
 */

import type { DayModel } from "@/lib/proofLane/proofLaneR";
import type { ProcessOutcome, ProcessQuality } from "@/lib/journalProcess";
import {
  describeRecordCoverage,
  isJournalRecord,
  readStoredNumber,
  readStoredResult,
  readStoredSide,
  readStoredText,
  type JournalRecordCoverage,
  type StoredTradeResult,
} from "./journalRecordShape";

export type Mood = "confident" | "anxious" | "neutral" | "fomo" | "disciplined";
export type TradeResult = StoredTradeResult;

/** Captured from the canonical sessionSymbolStore when an entry is created. */
export interface NectarSnapshot {
  readonly capturedAtMs: number;
  readonly channels: number;
  readonly tradeCount: number;
  readonly delta: number;
  readonly buyVol: number;
  readonly sellVol: number;
  readonly bigTradeCount: number;
  readonly horizonSec: number | null;
  readonly lastTradeAtMs: number | null;
}

export interface JournalEntry {
  id:        string;
  date:      string;
  symbol:    string;
  side:      "long" | "short";
  entry:     number;
  exit:      number;
  size:      number;
  pnl:       number;
  pct:       number;
  tags:      string[];
  notes:     string;
  mood:      Mood;
  result:    TradeResult;
  processQuality: ProcessQuality;
  processOutcome: ProcessOutcome;
  starred:   boolean;
  images:    string[];
  voiceSec:  number;
  setup:     string;
  mistakes:  string;
  lessons:   string;
  emojis:    string[];
  nectarSnapshot?: NectarSnapshot | null;
  dayModel?: DayModel;
  plannedRDollars?: number;
  realizedR?: number;
  contractType?: "stock" | "option";
  mfeR?: number;
  maeR?: number;
}

const MOODS: readonly Mood[] = ["confident", "anxious", "neutral", "fomo", "disciplined"];
const PROCESS_QUALITIES: readonly ProcessQuality[] = ["FOLLOWED_PLAN", "BROKE_RULES", "UNRESOLVED"];
const PROCESS_OUTCOMES: readonly ProcessOutcome[] = [
  "EARNED_WIN", "PROFESSIONAL_LOSS", "DANGEROUS_WIN", "PREVENTABLE_LOSS", "UNRESOLVED",
];
const DAY_MODELS: readonly DayModel[] = ["M0", "M1", "M2"];

function oneOf<T extends string>(options: readonly T[], value: unknown): T | undefined {
  return options.includes(value as T) ? (value as T) : undefined;
}

/** An array of non-empty strings. A single string is not a list of tags. */
function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v !== "");
}

export interface JournalHydration {
  readonly entries: JournalEntry[];
  readonly coverage: JournalRecordCoverage;
}

/**
 * Project stored records into the book, preserving caller order (/journal
 * renders and re-saves in the order it read).
 */
export function hydrateJournalEntries(records: readonly unknown[]): JournalHydration {
  const entries: JournalEntry[] = [];

  for (const value of records) {
    const entry = hydrateJournalEntry(value);
    if (entry !== null) entries.push(entry);
  }

  return { entries, coverage: describeRecordCoverage(records.length, entries.length) };
}

/** One record, or null when it is not a trade WM can show. */
export function hydrateJournalEntry(value: unknown): JournalEntry | null {
  if (!isJournalRecord(value)) return null;

  const id = readStoredText(value.id);
  const date = readStoredText(value.date);
  const symbol = readStoredText(value.symbol);
  const side = readStoredSide(value.side);
  if (id === undefined || date === undefined || symbol === undefined || side === undefined) {
    return null;
  }

  const entry = readStoredNumber(value.entry);
  const exit = readStoredNumber(value.exit);
  const size = readStoredNumber(value.size);
  const pnl = readStoredNumber(value.pnl);
  if (entry === undefined || exit === undefined || size === undefined || pnl === undefined) {
    return null;
  }

  const processQuality = oneOf(PROCESS_QUALITIES, value.processQuality) ?? "UNRESOLVED";

  return {
    id,
    date,
    symbol,
    side,
    entry,
    exit,
    size,
    pnl,
    // `pct` is a display percentage recomputed from entry/exit; it carries no
    // truth of its own, so an unreadable one is not a reason to hide the trade.
    pct: readStoredNumber(value.pct) ?? 0,
    tags: readStringList(value.tags),
    notes: readStoredText(value.notes) ?? "",
    mood: oneOf(MOODS, value.mood) ?? "neutral",
    // Read, never derived from pnl. H13 keeps money and outcome as two
    // separately recorded facts; deriving one from the other is exactly the
    // drift the edge projection was fixed for.
    result: readStoredResult(value.result) ?? "be",
    processQuality,
    // UNRESOLVED unless the record actually says otherwise. Never inferred from
    // pnl here — `classifyProcessOutcome` is that question's owner, and it is
    // the journal's job to call it at save time, not this reader's at load time.
    processOutcome: oneOf(PROCESS_OUTCOMES, value.processOutcome) ?? "UNRESOLVED",
    starred: value.starred === true,
    images: readStringList(value.images),
    voiceSec: readStoredNumber(value.voiceSec) ?? 0,
    setup: readStoredText(value.setup) ?? "",
    mistakes: readStoredText(value.mistakes) ?? "",
    lessons: readStoredText(value.lessons) ?? "",
    emojis: readStringList(value.emojis),
    nectarSnapshot: isJournalRecord(value.nectarSnapshot)
      ? (value.nectarSnapshot as unknown as NectarSnapshot)
      : null,
    // Optional throughout. `undefined` means the record does not say — absent is
    // not M0, and an absent planned R is not zero risk.
    dayModel: oneOf(DAY_MODELS, value.dayModel),
    plannedRDollars: readStoredNumber(value.plannedRDollars),
    realizedR: readStoredNumber(value.realizedR),
    contractType: oneOf(["stock", "option"] as const, value.contractType),
    mfeR: readStoredNumber(value.mfeR),
    maeR: readStoredNumber(value.maeR),
  };
}
