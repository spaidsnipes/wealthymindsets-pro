/**
 * SEC EDGAR COMPANY FUNDAMENTALS — PURE.
 *
 * The company's own filed figures (10-Q / 10-K XBRL) from the SEC's free,
 * keyless API, so WM Pro's Profile / Financials / Corporate Actions do not
 * depend on a paid fundamentals key. Every number is what the company filed;
 * the one thing computed here is a fourth quarter, which companies do not file
 * on its own — it is the 10-K year minus the three filed quarters, and it is
 * marked DERIVED. Per-share figures are never derived (share counts move).
 */

export interface SecFactRow {
  readonly start?: string;
  readonly end: string;
  readonly val: number;
  readonly form?: string;
  readonly filed?: string;
  readonly fy?: number;
  readonly fp?: string;
  readonly frame?: string;
}

export interface SecQuarter {
  readonly end: string;
  readonly label: string;
  readonly revenue: number | null;
  readonly grossProfit: number | null;
  readonly operatingIncome: number | null;
  readonly netIncome: number | null;
  readonly epsDiluted: number | null;
  /** Fields computed as the year minus three quarters (never filed alone). */
  readonly derived: readonly string[];
}

export const SEC_FLOW_CONCEPTS = {
  revenue: ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet", "RevenueFromContractWithCustomerIncludingAssessedTax"],
  grossProfit: ["GrossProfit"],
  operatingIncome: ["OperatingIncomeLoss"],
  netIncome: ["NetIncomeLoss"],
} as const;
export const SEC_EPS_CONCEPT = "EarningsPerShareDiluted";
export const SEC_DIVIDEND_CONCEPT = "CommonStockDividendsPerShareDeclared";

const DAY = 86_400_000;
const days = (r: SecFactRow) => (r.start ? (Date.parse(r.end) - Date.parse(r.start)) / DAY : NaN);
const isQuarter = (r: SecFactRow) => days(r) > 80 && days(r) < 100;
const isYear = (r: SecFactRow) => days(r) > 350 && days(r) < 380;

/** Latest-filed value per (start,end) — restatements supersede earlier filings. */
function byPeriod(rows: readonly SecFactRow[], keep: (r: SecFactRow) => boolean): Map<string, SecFactRow> {
  const out = new Map<string, SecFactRow>();
  for (const r of rows) {
    if (!keep(r) || !Number.isFinite(r.val)) continue;
    const k = `${r.start}|${r.end}`;
    const prev = out.get(k);
    if (!prev || (r.filed ?? "") >= (prev.filed ?? "")) out.set(k, r);
  }
  return out;
}

/** End date → quarterly value, with fourth quarters derived from the year. */
export function quarterValues(rows: readonly SecFactRow[], derive: boolean): Map<string, { val: number; derived: boolean }> {
  const q = byPeriod(rows, isQuarter);
  const out = new Map<string, { val: number; derived: boolean }>();
  for (const r of q.values()) out.set(r.end, { val: r.val, derived: false });
  if (!derive) return out;
  for (const y of byPeriod(rows, isYear).values()) {
    if (out.has(y.end)) continue;
    // The three filed quarters inside this year, ending before its last quarter.
    const inside = [...q.values()].filter(r => r.start! >= y.start! && r.end < y.end);
    if (inside.length !== 3) continue;
    const covered = inside.reduce((s, r) => s + days(r), 0);
    if (covered < 250 || covered > 290) continue;
    out.set(y.end, { val: y.val - inside.reduce((s, r) => s + r.val, 0), derived: true });
  }
  return out;
}

/** Of several names a company may file revenue under, the one filed most recently. */
export function pickConcept(candidates: Readonly<Record<string, readonly SecFactRow[] | null>>): readonly SecFactRow[] {
  let best: readonly SecFactRow[] = [];
  let bestEnd = "";
  for (const rows of Object.values(candidates)) {
    if (!rows?.length) continue;
    const end = rows.reduce((m, r) => (r.end > m ? r.end : m), "");
    if (end > bestEnd) { best = rows; bestEnd = end; }
  }
  return best;
}

const quarterLabel = (end: string) => {
  const [y, m] = end.split("-").map(Number);
  return `Q${Math.ceil(m / 3)} ${y} (to ${end})`;
};

export function secQuarters(input: {
  readonly revenue: readonly SecFactRow[];
  readonly grossProfit: readonly SecFactRow[];
  readonly operatingIncome: readonly SecFactRow[];
  readonly netIncome: readonly SecFactRow[];
  readonly epsDiluted: readonly SecFactRow[];
}, limit = 5): SecQuarter[] {
  const flows = {
    revenue: quarterValues(input.revenue, true),
    grossProfit: quarterValues(input.grossProfit, true),
    operatingIncome: quarterValues(input.operatingIncome, true),
    netIncome: quarterValues(input.netIncome, true),
  };
  const eps = quarterValues(input.epsDiluted, false);
  const ends = new Set<string>([...flows.revenue.keys(), ...flows.netIncome.keys()]);
  return [...ends].sort().reverse().slice(0, limit).map(end => {
    const derived: string[] = [];
    const pick = (k: keyof typeof flows) => { const v = flows[k].get(end); if (v?.derived) derived.push(k); return v ? v.val : null; };
    return {
      end,
      label: quarterLabel(end),
      revenue: pick("revenue"),
      grossProfit: pick("grossProfit"),
      operatingIncome: pick("operatingIncome"),
      netIncome: pick("netIncome"),
      epsDiluted: eps.get(end)?.val ?? null,
      derived,
    };
  });
}

/** Dividends declared per share, newest first (quarterly filings only). */
export function secDividends(rows: readonly SecFactRow[], limit = 8): { end: string; perShare: number }[] {
  return [...byPeriod(rows, isQuarter).values()].sort((a, b) => b.end.localeCompare(a.end)).slice(0, limit).map(r => ({ end: r.end, perShare: r.val }));
}

/** Most recent shares-outstanding cover-page figure. */
export function latestShares(rows: readonly SecFactRow[]): { shares: number; asOf: string } | null {
  let best: SecFactRow | null = null;
  for (const r of rows) if (Number.isFinite(r.val) && (!best || r.end > best.end)) best = r;
  return best ? { shares: best.val, asOf: best.end } : null;
}

export const cikPad = (cik: number | string) => String(cik).padStart(10, "0");

/** SEC asks automated callers to identify themselves; no personal address is sent. */
export const SEC_USER_AGENT = "WealthyMindsetsPro/1.0 (+https://wealthymindsetspro.com)";
