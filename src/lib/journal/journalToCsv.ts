/**
 * journalToCsv — pure CSV serializer for Journal entries.
 *
 * SHIFT-I I-Bkt 4 Orkin: the prior inline exporter dropped every Proof
 * Lane field (dayModel, plannedRDollars, realizedR, contractType,
 * processQuality, processOutcome) AND used naïve `"..."` wrapping that
 * failed on embedded quotes / newlines / commas. Founder's Week-One
 * live-launch review outside the app would have been silently wrong.
 * This module ships a state-matrix-tested pure serializer.
 *
 * Rejection guarantees:
 *  - Every field emitted below the Proof Lane block is included by-name
 *    in the header; a reader can never accidentally interpret an
 *    unlabeled column.
 *  - CSV cells are escaped per RFC 4180: cells containing comma,
 *    double-quote, CR or LF are quoted; embedded quotes are doubled.
 *  - Number cells preserve fixed decimals for pnl/pct/plannedR so a
 *    spreadsheet reader gets stable columns.
 *  - Missing Proof Lane fields render as empty cells, NEVER fabricated
 *    zeroes (canon §4 opt-in R math).
 */

export interface JournalCsvEntry {
  date: string;
  symbol: string;
  side: "long" | "short";
  entry: number;
  exit: number;
  size: number;
  pnl: number;
  pct: number;
  result: string;
  setup: string;
  tags: readonly string[];
  notes: string;
  mistakes?: string;
  lessons?: string;
  // Proof Lane fields (canon §3 / §4 / §6 / §24). Optional so pre-launch
  // legacy entries serialize without noise.
  dayModel?: "M0" | "M1" | "M2";
  plannedRDollars?: number;
  realizedR?: number;
  contractType?: "stock" | "option";
  processQuality?: "FOLLOWED_PLAN" | "BROKE_RULES" | "UNRESOLVED";
  processOutcome?: string;
}

export const JOURNAL_CSV_COLUMNS = [
  "Date",
  "Symbol",
  "Side",
  "ContractType",
  "Entry",
  "Exit",
  "Size",
  "PnL",
  "PctChange",
  "Result",
  "DayModel",
  "PlannedRDollars",
  "RealizedR",
  "ProcessQuality",
  "ProcessOutcome",
  "Setup",
  "Tags",
  "Notes",
  "Mistakes",
  "Lessons",
] as const;

/** RFC 4180 CSV cell escape. */
export function csvEscape(value: unknown): string {
  if (value === undefined || value === null) return "";
  const s = String(value);
  if (s === "") return "";
  const needsQuote = /[",\r\n]/.test(s);
  if (!needsQuote) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function fmtNum(n: number | undefined, decimals: number): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return "";
  return n.toFixed(decimals);
}

/** Serialize a Journal entry to a single CSV row. Pure. */
export function journalRowToCsv(e: JournalCsvEntry): string {
  const cells: string[] = [
    csvEscape(e.date),
    csvEscape(e.symbol),
    csvEscape(e.side),
    csvEscape(e.contractType ?? ""),
    fmtNum(e.entry, 4),
    fmtNum(e.exit, 4),
    csvEscape(String(e.size)),
    fmtNum(e.pnl, 2),
    fmtNum(e.pct, 4),
    csvEscape(e.result),
    csvEscape(e.dayModel ?? ""),
    fmtNum(e.plannedRDollars, 2),
    fmtNum(e.realizedR, 4),
    csvEscape(e.processQuality ?? ""),
    csvEscape(e.processOutcome ?? ""),
    csvEscape(e.setup),
    csvEscape(e.tags.join(";")),
    csvEscape(e.notes),
    csvEscape(e.mistakes ?? ""),
    csvEscape(e.lessons ?? ""),
  ];
  return cells.join(",");
}

/** Serialize the full entry set as an RFC 4180 CSV document. */
export function journalToCsv(entries: readonly JournalCsvEntry[]): string {
  const header = JOURNAL_CSV_COLUMNS.join(",");
  const rows = entries.map(journalRowToCsv);
  return [header, ...rows].join("\n");
}
