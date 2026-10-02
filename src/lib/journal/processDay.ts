/**
 * PROCESS BEFORE P&L — the trading day graded by the trader (Garden 18 v2
 * §54/§55) — PURE.
 *
 * Five categories, 0–2 each, set by the trader (never inferred): preparation /
 * top-down, classification accuracy, authorization discipline, risk /
 * management discipline, journal / learning completion. 8–10 = A PROCESS DAY,
 * 6–7 = B, 4–5 = C, 0–3 = PROCESS FAILURE / REVIEW. Shown beside the day's
 * broker P&L and never mixed with it: a red P&L day can be an A process day,
 * a green one can be a process failure.
 */
import type { Episode } from "@/lib/broker/webullLedger";

export const PROCESS_CATEGORIES = [
  { id: "prep", label: "Preparation / top-down" },
  { id: "classify", label: "Classification accuracy" },
  { id: "authorize", label: "Authorization discipline" },
  { id: "risk", label: "Risk / management discipline" },
  { id: "journal", label: "Journal / learning completion" },
] as const;
export type ProcessCategory = (typeof PROCESS_CATEGORIES)[number]["id"];
export type ProcessScores = Partial<Record<ProcessCategory, 0 | 1 | 2>>;

export type ProcessGrade = "A PROCESS DAY" | "B" | "C" | "PROCESS FAILURE / REVIEW";

/** Null until all five categories are scored — a partial day is not graded. */
export function gradeDay(s: ProcessScores): { total: number; grade: ProcessGrade } | null {
  const vals = PROCESS_CATEGORIES.map(c => s[c.id]);
  if (vals.some(v => v == null)) return null;
  const total = (vals as number[]).reduce((a, b) => a + b, 0);
  return { total, grade: total >= 8 ? "A PROCESS DAY" : total >= 6 ? "B" : total >= 4 ? "C" : "PROCESS FAILURE / REVIEW" };
}

export interface TradingDay { readonly day: string; readonly trades: number; readonly net: number; readonly fees: number }

const nyDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

/** Closed episodes → New York trading days, newest first. */
export function tradingDays(episodes: readonly Episode[]): TradingDay[] {
  const m = new Map<string, { trades: number; net: number; fees: number }>();
  for (const e of episodes) {
    if (e.label !== "RECONSTRUCTED" || e.net == null) continue;
    const d = nyDay(e.openedAt);
    const r = m.get(d) ?? { trades: 0, net: 0, fees: 0 };
    r.trades++; r.net += e.net; r.fees += e.fees;
    m.set(d, r);
  }
  return [...m.entries()].map(([day, r]) => ({ day, trades: r.trades, net: Math.round(r.net * 100) / 100, fees: Math.round(r.fees * 100) / 100 }))
    .sort((a, b) => b.day.localeCompare(a.day));
}

export const PROCESS_DAYS_KEY = "wm_process_days_v1";

export function parseProcessDays(raw: string | null): Record<string, ProcessScores> {
  try {
    const v = raw ? JSON.parse(raw) : {};
    if (!v || typeof v !== "object") return {};
    const out: Record<string, ProcessScores> = {};
    for (const [day, s] of Object.entries(v as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !s || typeof s !== "object") continue;
      const clean: ProcessScores = {};
      for (const c of PROCESS_CATEGORIES) { const x = (s as Record<string, unknown>)[c.id]; if (x === 0 || x === 1 || x === 2) clean[c.id] = x; }
      out[day] = clean;
    }
    return out;
  } catch { return {}; }
}

/** Graded days × P&L sign — the matrix the law is about. */
export function processVsPnl(days: readonly TradingDay[], scores: Readonly<Record<string, ProcessScores>>) {
  const cells = { aRed: 0, aGreen: 0, failRed: 0, failGreen: 0, graded: 0 };
  for (const d of days) {
    const g = gradeDay(scores[d.day] ?? {});
    if (!g) continue;
    cells.graded++;
    const good = g.grade === "A PROCESS DAY" || g.grade === "B";
    if (good && d.net < 0) cells.aRed++;
    if (good && d.net >= 0) cells.aGreen++;
    if (!good && d.net < 0) cells.failRed++;
    if (!good && d.net >= 0) cells.failGreen++;
  }
  return cells;
}
