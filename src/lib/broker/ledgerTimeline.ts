/**
 * TEMPORAL PERSONAL EDGE (Garden 18 v2 §40/§41/§53) — PURE.
 *
 * The same closed broker episodes seen over time: the latest 20 / 50 / 100
 * trades beside the whole record, and each month's behaviour — trades per
 * trading day, win rate, average win and loss, share of days that went past a
 * second trade, how often a bracket was attached. A trader is not defined by
 * their oldest months: recent windows are shown next to lifetime, and old
 * months stay in the record without being repeated as a verdict.
 *
 * Numbers only. A change between windows is not proof of improvement until
 * the window is large enough; windows under MIN_WINDOW say so.
 */
import type { Episode } from "./webullLedger";

export const MIN_WINDOW = 20;

export interface WindowStats {
  readonly label: string;
  readonly n: number;
  readonly winRate: number | null;
  readonly expectancy: number | null;
  readonly avgWin: number | null;
  readonly avgLoss: number | null;
  readonly net: number;
  readonly enough: boolean;
}

export interface MonthBehaviour {
  readonly month: string;
  readonly trades: number;
  readonly days: number;
  readonly tradesPerDay: number;
  readonly winRate: number;
  readonly expectancy: number;
  readonly avgWin: number | null;
  readonly avgLoss: number | null;
  /** Share of trading days with a third or later trade. */
  readonly pastSecondShare: number;
  /** Share of trades whose entry carried a bracket. */
  readonly bracketShare: number;
}

const cents = (x: number) => Math.round(x * 100) / 100;
const nyDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

function stats(label: string, xs: readonly Episode[], need: number): WindowStats {
  const n = xs.length;
  const wins = xs.filter(e => e.net! > 0), losses = xs.filter(e => e.net! < 0);
  const net = xs.reduce((s, e) => s + e.net!, 0);
  return {
    label, n,
    winRate: n ? wins.length / n : null,
    expectancy: n ? cents(net / n) : null,
    avgWin: wins.length ? cents(wins.reduce((s, e) => s + e.net!, 0) / wins.length) : null,
    avgLoss: losses.length ? cents(losses.reduce((s, e) => s + e.net!, 0) / losses.length) : null,
    net: cents(net),
    enough: n >= need,
  };
}

export function ledgerTimeline(episodes: readonly Episode[]): { windows: WindowStats[]; months: MonthBehaviour[] } {
  const closed = episodes.filter(e => e.label === "RECONSTRUCTED" && e.net != null && e.closedAt)
    .sort((a, b) => a.closedAt!.localeCompare(b.closedAt!));
  const windows = [20, 50, 100].map(k => stats(`Last ${k} trades`, closed.slice(-k), k));
  windows.push(stats("Whole record", closed, MIN_WINDOW));

  const byMonth = new Map<string, Episode[]>();
  for (const e of closed) { const m = nyDay(e.openedAt).slice(0, 7); (byMonth.get(m) ?? byMonth.set(m, []).get(m)!).push(e); }
  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, xs]) => {
    const perDay = new Map<string, number>();
    for (const e of xs) { const d = nyDay(e.openedAt); perDay.set(d, (perDay.get(d) ?? 0) + 1); }
    const s = stats(month, xs, 1);
    return {
      month, trades: xs.length, days: perDay.size,
      tradesPerDay: Math.round((xs.length / perDay.size) * 10) / 10,
      winRate: s.winRate ?? 0, expectancy: s.expectancy ?? 0, avgWin: s.avgWin, avgLoss: s.avgLoss,
      pastSecondShare: [...perDay.values()].filter(c => c >= 3).length / perDay.size,
      bracketShare: xs.filter(e => e.entries[0]?.comboType === "MASTER").length / xs.length,
    };
  });
  return { windows, months };
}

/**
 * WHAT CHANGED (Garden 18 v2 §41) — month-to-month shifts in HOW the trader
 * traded, only between months that both carry at least MIN_WINDOW trades, and
 * only past a size that is not noise. Each change names the two months and
 * both values, so it opens its own evidence. Describes behaviour; never
 * claims a cause or calls it improvement.
 */
export interface Change { readonly month: string; readonly from: string; readonly measure: string; readonly before: string; readonly after: string }

export function whatChanged(months: readonly MonthBehaviour[]): Change[] {
  const big = months.filter(m => m.trades >= MIN_WINDOW);
  const out: Change[] = [];
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const usd = (v: number) => `${v < 0 ? "−" : ""}$${Math.abs(v).toFixed(2)}`;
  for (let i = 1; i < big.length; i++) {
    const a = big[i - 1], b = big[i];
    if (Math.abs(b.bracketShare - a.bracketShare) >= 0.25) out.push({ month: b.month, from: a.month, measure: "Entries with a bracket attached", before: pct(a.bracketShare), after: pct(b.bracketShare) });
    if (Math.abs(b.pastSecondShare - a.pastSecondShare) >= 0.25) out.push({ month: b.month, from: a.month, measure: "Days that went past a second trade", before: pct(a.pastSecondShare), after: pct(b.pastSecondShare) });
    if (a.tradesPerDay > 0 && Math.abs(b.tradesPerDay - a.tradesPerDay) / a.tradesPerDay >= 0.5) out.push({ month: b.month, from: a.month, measure: "Trades per trading day", before: String(a.tradesPerDay), after: String(b.tradesPerDay) });
    if (a.avgLoss != null && b.avgLoss != null && Math.abs(b.avgLoss - a.avgLoss) / Math.abs(a.avgLoss) >= 0.4) out.push({ month: b.month, from: a.month, measure: "Average losing trade", before: usd(a.avgLoss), after: usd(b.avgLoss) });
  }
  return out;
}
