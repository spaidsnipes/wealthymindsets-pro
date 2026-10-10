/**
 * THE JOURNAL'S DAY LEDGER — calendar days and a running curve from the ONE
 * journal book (house pass 2026-10-10, order §18). PURE.
 *
 * Reads the records the Journal already holds and nothing else:
 *   - LIVE only: `liveJournalRecords` leaves paper out (paperEntry.ts ruling),
 *     and how many paper records were left out is returned so the room can say.
 *   - TRADES only: `selectTradeRecords` holds M0 / no-trade days out — a day on
 *     which no trade was taken has no outcome to place on a calendar.
 *   - READABLE money only: a record whose `pnl` is not a finite number is
 *     counted as UNREADABLE on its day, never summed as $0 (selectRecordedTotal's
 *     law, applied per day).
 * A calendar day with no live trade is absent, not zero. The curve is the
 * cumulative sum of the readable daily nets in date order; drawdown is its fall
 * from the prior running high, reported as its own series (never a second axis).
 */
import { liveJournalRecords, paperRecordCount } from "./paperEntry";
import { selectTradeRecords, type DayModelRecord } from "./tradeRecords";

export interface DayLedgerRecord extends DayModelRecord {
  readonly date?: unknown;
  readonly pnl?: unknown;
  /** Read only by the paper predicate. */
  readonly capture?: unknown;
}

export interface JournalDay {
  readonly day: string;
  readonly trades: number;
  /** Sum of the readable P&L on this day; null when none of the day's trades is readable. */
  readonly net: number | null;
  readonly unreadable: number;
}

export interface JournalDayLedger {
  /** Newest first. */
  readonly days: readonly JournalDay[];
  readonly paperLeftOut: number;
  /** Trades whose date could not be read as a calendar day. */
  readonly undated: number;
}

const DAY = /^(\d{4}-\d{2}-\d{2})/;

export function selectJournalDayLedger(records: readonly DayLedgerRecord[]): JournalDayLedger {
  const paperLeftOut = paperRecordCount(records);
  const trades = selectTradeRecords(liveJournalRecords(records));
  const by = new Map<string, { trades: number; net: number; readable: number; unreadable: number }>();
  let undated = 0;
  for (const t of trades) {
    const m = typeof t.date === "string" ? DAY.exec(t.date) : null;
    if (!m) { undated += 1; continue; }
    const r = by.get(m[1]) ?? { trades: 0, net: 0, readable: 0, unreadable: 0 };
    r.trades += 1;
    if (typeof t.pnl === "number" && Number.isFinite(t.pnl)) { r.net += t.pnl; r.readable += 1; } else r.unreadable += 1;
    by.set(m[1], r);
  }
  const days = [...by.entries()]
    .map(([day, r]) => ({ day, trades: r.trades, net: r.readable ? Math.round(r.net * 100) / 100 : null, unreadable: r.unreadable }))
    .sort((a, b) => b.day.localeCompare(a.day));
  return { days, paperLeftOut, undated };
}

export interface CurvePoint { readonly day: string; readonly equity: number; readonly drawdown: number }

/** Running net and drawdown (≤ 0) across the days that have a readable net, oldest first. */
export function selectJournalCurve(days: readonly JournalDay[]): { points: CurvePoint[]; maxDrawdown: number } {
  let equity = 0, peak = 0, maxDrawdown = 0;
  const points = [...days].filter(d => d.net !== null).sort((a, b) => a.day.localeCompare(b.day)).map(d => {
    equity = Math.round((equity + (d.net as number)) * 100) / 100;
    peak = Math.max(peak, equity);
    const drawdown = Math.round((equity - peak) * 100) / 100;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
    return { day: d.day, equity, drawdown };
  });
  return { points, maxDrawdown };
}

/**
 * The cells of one "YYYY-MM" month, Monday-first, padded to whole weeks. All
 * seven days are drawn: futures and crypto trade on weekends, and a calendar
 * that dropped Saturday would hide a real trade.
 */
export function monthWeeks(ym: string): (string | null)[][] {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weeks: (string | null)[][] = [];
  let week: (string | null)[] = Array(7).fill(null);
  for (let d = 1; d <= last; d++) {
    const col = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Mon 0 … Sun 6
    week[col] = `${ym}-${String(d).padStart(2, "0")}`;
    if (col === 6) { weeks.push(week); week = Array(7).fill(null); }
  }
  if (week.some(Boolean)) weeks.push(week);
  return weeks;
}
