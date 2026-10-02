/**
 * THE LIFETIME WALK (Garden 18 v2 §29) — every order Webull's order history
 * will return for one account, newest year first, back until the history goes
 * quiet. Measured on the owner's accounts 2026-10-02: the endpoint answers a
 * one-year window, orders inside a window come in client-order-id order (not
 * time order), and `last_client_order_id` pages through a window.
 *
 * The walk never claims "since the account opened": it reports the earliest
 * fill it actually received and the date it stopped asking. Page function
 * injected so the walk is tested without a network.
 */
import { readWebullHistory, type LedgerOrder } from "./webullLedger";

export type HistoryPage = (start: string, end: string, cursor: string | null) => Promise<{ readonly ok: boolean; readonly payload: unknown; readonly reason?: string }>;

export interface AccountWalk {
  readonly accountId: string;
  readonly orders: LedgerOrder[];
  readonly windows: number;
  readonly pages: number;
  /** The earliest date asked about — the walk's own floor, not the account's opening. */
  readonly askedBackTo: string;
  readonly stoppedBecause: "QUIET_YEARS" | "FLOOR" | "REFUSED" | "PAGE_BUDGET";
  readonly reason: string | null;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export async function walkWebullHistory(
  accountId: string,
  page: HistoryPage,
  opts: { readonly today: Date; readonly floor?: string; readonly quietYears?: number; readonly pageBudget?: number },
): Promise<AccountWalk> {
  const floor = opts.floor ?? "2014-01-01";
  const quietNeeded = opts.quietYears ?? 2;
  const budget = opts.pageBudget ?? 60;
  const orders: LedgerOrder[] = [];
  const seen = new Set<string>();
  // end_date reads as EXCLUSIVE (a window ending today omitted today's orders,
  // measured 2026-10-02), so the first window ends tomorrow and each next one
  // ends on the previous start — a one-day overlap the order-id dedupe absorbs.
  let end = new Date(Date.UTC(opts.today.getUTCFullYear(), opts.today.getUTCMonth(), opts.today.getUTCDate() + 1));
  let windows = 0, pages = 0, quiet = 0;
  let askedBackTo = ymd(end);
  while (true) {
    const start = new Date(end); start.setUTCFullYear(start.getUTCFullYear() - 1);
    const s = ymd(start) < floor ? floor : ymd(start);
    windows++;
    askedBackTo = s;
    let cursor: string | null = null;
    let found = 0;
    while (true) {
      if (pages >= budget) return { accountId, orders, windows, pages, askedBackTo, stoppedBecause: "PAGE_BUDGET", reason: `Stopped after ${budget} pages.` };
      pages++;
      const r = await page(s, ymd(end), cursor);
      if (!r.ok) return { accountId, orders, windows, pages, askedBackTo, stoppedBecause: "REFUSED", reason: r.reason ?? "Webull refused the history request." };
      const rows = readWebullHistory(r.payload, accountId);
      let added = 0;
      for (const o of rows) { const k = o.orderId; if (!seen.has(k)) { seen.add(k); orders.push(o); added++; } }
      found += added;
      const top = Array.isArray(r.payload) ? r.payload : Array.isArray((r.payload as { data?: unknown })?.data) ? (r.payload as { data: unknown[] }).data : [];
      const last = top.length ? (top[top.length - 1] as Record<string, unknown>)?.client_order_id : null;
      if (added === 0 || typeof last !== "string" || last === cursor) break;
      cursor = last;
    }
    quiet = found === 0 ? quiet + 1 : 0;
    if (s <= floor) return { accountId, orders, windows, pages, askedBackTo, stoppedBecause: "FLOOR", reason: null };
    if (quiet >= quietNeeded) return { accountId, orders, windows, pages, askedBackTo, stoppedBecause: "QUIET_YEARS", reason: null };
    end = new Date(start);
  }
}
