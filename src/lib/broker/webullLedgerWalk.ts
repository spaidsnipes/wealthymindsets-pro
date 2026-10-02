/**
 * THE LIFETIME WALK (Garden 18 v2 §29) — every order Webull's order history
 * will return for one account, back until the history goes quiet.
 *
 * Measured on the owner's accounts, 2026-10-02:
 *  · a ONE-YEAR window answers, but SILENTLY TRUNCATES: margin 2025-10-03..
 *    2026-10-03 returned 178 orders ending 09-29 while the month 09-03..10-03
 *    alone returned 117 including October (and a 3-day window returned all 52
 *    of 09-29..10-02). So a year is only a PROBE — "is there anything here?"
 *    — and the orders themselves are read month by month;
 *  · inside a window orders come in client-order-id order, not time order, and
 *    `last_client_order_id` pages through it;
 *  · `end_date` is exclusive (a window ending today omitted today);
 *  · back-to-back reads draw HTTP 429, so pages are spaced and 429 backs off.
 *
 * The walk never claims "since the account opened": it reports how far back it
 * asked and why it stopped. The page function is injected so the walk is
 * tested without a network.
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
const rowsOf = (p: unknown): unknown[] => Array.isArray(p) ? p : Array.isArray((p as { data?: unknown })?.data) ? (p as { data: unknown[] }).data : [];

class Stop extends Error { constructor(readonly why: AccountWalk["stoppedBecause"], readonly detail: string) { super(detail); } }

export async function walkWebullHistory(
  accountId: string,
  page: HistoryPage,
  opts: {
    readonly today: Date; readonly floor?: string; readonly quietYears?: number; readonly pageBudget?: number;
    readonly sleep?: (ms: number) => Promise<void>; readonly gapMs?: number; readonly backoffMs?: readonly number[];
  },
): Promise<AccountWalk> {
  const floor = opts.floor ?? "2014-01-01";
  const quietNeeded = opts.quietYears ?? 2;
  const budget = opts.pageBudget ?? 120;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)));
  const gap = opts.gapMs ?? 1_100;
  const backoff = opts.backoffMs ?? [2_000, 4_000, 8_000, 15_000];
  const orders: LedgerOrder[] = [];
  const seen = new Set<string>();
  let windows = 0, pages = 0;

  const ask = async (s: string, e: string, cursor: string | null) => {
    if (pages >= budget) throw new Stop("PAGE_BUDGET", `Stopped after ${budget} pages.`);
    if (pages > 0) await sleep(gap);
    pages++;
    let r = await page(s, e, cursor);
    for (let i = 0; !r.ok && /\b429\b|TOO_MANY/i.test(r.reason ?? "") && i < backoff.length; i++) {
      await sleep(backoff[i]);
      r = await page(s, e, cursor);
    }
    if (!r.ok) throw new Stop("REFUSED", r.reason ?? "Webull refused the history request.");
    return r.payload;
  };
  const take = (payload: unknown) => {
    let added = 0;
    for (const o of readWebullHistory(payload, accountId)) if (!seen.has(o.orderId)) { seen.add(o.orderId); orders.push(o); added++; }
    return added;
  };
  /** Every page of one window, paged by the last client order id. */
  const readWindow = async (s: string, e: string, first?: unknown) => {
    windows++;
    let payload = first ?? await ask(s, e, null);
    let cursor: string | null = null;
    while (true) {
      const added = take(payload);
      const rows = rowsOf(payload);
      const last = rows.length ? (rows[rows.length - 1] as Record<string, unknown>)?.client_order_id : null;
      if (added === 0 || typeof last !== "string" || last === cursor) return;
      cursor = last;
      payload = await ask(s, e, cursor);
    }
  };

  // end_date is exclusive: the first year ends tomorrow; each next year ends on
  // the previous start (a one-day overlap the order-id dedupe absorbs).
  let end = new Date(Date.UTC(opts.today.getUTCFullYear(), opts.today.getUTCMonth(), opts.today.getUTCDate() + 1));
  let askedBackTo = ymd(end);
  let quiet = 0;
  try {
    while (true) {
      const start = new Date(end); start.setUTCFullYear(start.getUTCFullYear() - 1);
      const s = ymd(start) < floor ? floor : ymd(start);
      askedBackTo = s;
      const probe = await ask(s, ymd(end), null);
      if (rowsOf(probe).length === 0) {
        quiet++;
      } else {
        quiet = 0;
        // The year has orders: read it month by month, newest first.
        let mEnd = new Date(end);
        while (ymd(mEnd) > s) {
          const mStart = new Date(mEnd); mStart.setUTCMonth(mStart.getUTCMonth() - 1);
          const ms = ymd(mStart) < s ? s : ymd(mStart);
          await readWindow(ms, ymd(mEnd));
          mEnd = mStart;
        }
        // Anything the probe saw that the months somehow did not (never expected) still counts.
        take(probe);
      }
      if (s <= floor) return { accountId, orders, windows, pages, askedBackTo, stoppedBecause: "FLOOR", reason: null };
      if (quiet >= quietNeeded) return { accountId, orders, windows, pages, askedBackTo, stoppedBecause: "QUIET_YEARS", reason: null };
      end = new Date(start);
    }
  } catch (e) {
    if (e instanceof Stop) return { accountId, orders, windows, pages, askedBackTo, stoppedBecause: e.why, reason: e.detail };
    throw e;
  }
}
