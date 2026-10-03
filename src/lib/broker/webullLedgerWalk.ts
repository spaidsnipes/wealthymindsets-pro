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
  readonly stoppedBecause: "QUIET_YEARS" | "FLOOR" | "REFUSED" | "PAGE_BUDGET" | "YEAR_DONE";
  readonly reason: string | null;
  /** Finished months read from the cache instead of Webull. */
  readonly cachedMonths: number;
  /** Whether the last year asked about held no orders at all (its probe came back empty). */
  readonly lastYearEmpty: boolean;
  /** With `fromMonth`: the month to continue from, or null when the year is done. */
  readonly nextMonth?: number | null;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
/** Rows at which a window is halved rather than trusted (see readWindow). */
export const SPLIT_AT = 30;
/** Cache key prefix; bump the version if the raw-row shape kept here changes. */
export const CACHE_PREFIX = "wbledger:v2:";
const rowsOf = (p: unknown): unknown[] => Array.isArray(p) ? p : Array.isArray((p as { data?: unknown })?.data) ? (p as { data: unknown[] }).data : [];

class Stop extends Error { constructor(readonly why: AccountWalk["stoppedBecause"], readonly detail: string) { super(detail); } }

export async function walkWebullHistory(
  accountId: string,
  page: HistoryPage,
  opts: {
    readonly today: Date; readonly floor?: string; readonly quietYears?: number; readonly pageBudget?: number;
    /**
     * Read one stretch of years per call: start `startYearsBack` years before
     * today and stop after `maxYears` (YEAR_DONE). A caller steps through the
     * years across requests so no single request runs for minutes.
     */
    readonly startYearsBack?: number; readonly maxYears?: number;
    /** Ask only whether the year has orders (one call); read nothing. */
    readonly probeOnly?: boolean;
    /** Read only this month of the year (0 = newest), skipping the probe — one bounded request per month. */
    readonly onlyMonth?: number;
    /**
     * Resumable: read months `fromMonth`..11 of the year (skipping the probe),
     * stopping after the first month that ends past `deadlineAt` (ms). The
     * answer's `nextMonth` says where to continue, or null when the year is done.
     */
    readonly fromMonth?: number; readonly deadlineAt?: number;
    readonly sleep?: (ms: number) => Promise<void>; readonly gapMs?: number; readonly backoffMs?: readonly number[];
    /**
     * Finished months are history: a month that ended more than a week ago is
     * kept as Webull's own raw rows and read from here next time. The current
     * month is always asked live.
     */
    readonly cache?: { get(key: string): Promise<string | null>; put(key: string, value: string, ttlSec?: number): Promise<void> };
  },
): Promise<AccountWalk> {
  const floor = opts.floor ?? "2014-01-01";
  const quietNeeded = opts.quietYears ?? 2;
  const budget = opts.pageBudget ?? 400;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)));
  const gap = opts.gapMs ?? 1_100;
  const backoff = opts.backoffMs ?? [3_000, 6_000, 12_000, 20_000, 30_000, 45_000];
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
  let collect: unknown[] | null = null;
  let cachedMonths = 0;
  const take = (payload: unknown) => {
    if (collect) collect.push(...rowsOf(payload));
    let added = 0;
    for (const o of readWebullHistory(payload, accountId)) if (!seen.has(o.orderId)) { seen.add(o.orderId); orders.push(o); added++; }
    return added;
  };
  /**
   * Every order of one window. A window that answers with SPLIT_AT or more
   * rows is not trusted to be whole — Webull truncated 115- and 178-row
   * answers, and its cursor did not recover the rest (cash 2026-01: the 01-12
   * 14:33 buy came back only from a one-day window) — so it is halved and each
   * half read again, down to one day. A one-day window is read with the cursor.
   */
  const readWindow = async (s: string, e: string): Promise<void> => {
    windows++;
    let payload = await ask(s, e, null);
    const days = Math.round((Date.parse(e) - Date.parse(s)) / 86_400_000);
    if (rowsOf(payload).length >= SPLIT_AT && days > 1) {
      const mid = ymd(new Date(Date.parse(s) + Math.floor(days / 2) * 86_400_000));
      await readWindow(mid, e);
      await readWindow(s, mid);
      take(payload);
      return;
    }
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
  // CALENDAR-ALIGNED: year k back is calendar year (this year − k) — Jan 1 to
  // the next Jan 1 (this year: Jan 1 to tomorrow) — and months are calendar
  // months, so every finished window keeps the same key forever. Windows
  // measured back from "today" shifted every UTC midnight and re-read the
  // whole history (measured 2026-10-03 00:05Z: one cash year took 67 s).
  const k0 = opts.startYearsBack ?? 0;
  const thisYear = opts.today.getUTCFullYear();
  const tomorrow = new Date(Date.UTC(thisYear, opts.today.getUTCMonth(), opts.today.getUTCDate() + 1));
  let end = k0 === 0 ? tomorrow : new Date(Date.UTC(thisYear - k0 + 1, 0, 1));
  let yearsDone = 0;
  let lastYearEmpty = false;
  let askedBackTo = ymd(end);
  let quiet = 0;
  try {
    while (true) {
      const start = end.getTime() === tomorrow.getTime() ? new Date(Date.UTC(thisYear, 0, 1)) : new Date(Date.UTC(end.getUTCFullYear() - 1, 0, 1));
      const s = ymd(start) < floor ? floor : ymd(start);
      askedBackTo = s;
      const resumable = opts.fromMonth != null;
      // A year's "any orders?" answer is kept a day (ten minutes for the current year).
      const probeKey = `${CACHE_PREFIX}probe:${accountId}:${s}:${ymd(end)}`;
      const probeHit = opts.onlyMonth == null && !resumable && opts.cache ? await opts.cache.get(probeKey).catch(() => null) : null;
      const probe = opts.onlyMonth != null || resumable ? [] : probeHit != null ? (probeHit === "1" ? [{}] : []) : await ask(s, ymd(end), null);
      if (probeHit == null && opts.onlyMonth == null && !resumable && opts.cache) {
        await opts.cache.put(probeKey, rowsOf(probe).length ? "1" : "0", ymd(end) > ymd(opts.today) ? 600 : 86_400).catch(() => {});
      }
      lastYearEmpty = opts.onlyMonth == null && !resumable && rowsOf(probe).length === 0;
      if (opts.probeOnly) return { accountId, orders, windows, pages, askedBackTo, stoppedBecause: "YEAR_DONE", reason: null, cachedMonths, lastYearEmpty };
      if (lastYearEmpty) {
        quiet++;
      } else {
        quiet = 0;
        // The year has orders: read it month by month, newest first.
        let mEnd = new Date(end);
        for (let mi = 0; ymd(mEnd) > s; mi++) {
          // The calendar month that ends at mEnd (mEnd on the 1st → the month before).
          const last = new Date(mEnd.getTime() - 1);
          const mStart = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), 1));
          const ms = ymd(mStart) < s ? s : ymd(mStart);
          if (opts.onlyMonth != null && mi !== opts.onlyMonth) { mEnd = mStart; continue; }
          if (resumable && mi < opts.fromMonth!) { mEnd = mStart; continue; }
          askedBackTo = ms;
          // Anything that ended more than a week ago is history and may be kept;
          // the most recent week is always asked live. A month straddling that
          // edge is read as two windows (kept part + live part).
          const edge = ymd(new Date(opts.today.getTime() - 7 * 86_400_000));
          const parts: [string, string, boolean][] = ymd(mEnd) <= edge ? [[ms, ymd(mEnd), true]]
            : ms < edge ? [[ms, edge, true], [edge, ymd(mEnd), false]]
            : [[ms, ymd(mEnd), false]];
          for (const [ps, pe, keep] of parts) {
            const key = `${CACHE_PREFIX}${accountId}:${ps}:${pe}`;
            // The live week is kept only ten minutes, so a re-open is quick but never stale for long.
            const hit = opts.cache ? await opts.cache.get(keep ? key : `${key}:live`).catch(() => null) : null;
            if (hit) {
              take(JSON.parse(hit));
              cachedMonths++;
            } else {
              collect = [];
              await readWindow(ps, pe);
              const rows = collect;
              collect = null;
              if (opts.cache) await opts.cache.put(keep ? key : `${key}:live`, JSON.stringify(rows), keep ? undefined : 600).catch(() => {});
            }
          }
          mEnd = mStart;
          if (resumable && opts.deadlineAt != null && Date.now() > opts.deadlineAt && ymd(mEnd) > s) {
            return { accountId, orders, windows, pages, askedBackTo, stoppedBecause: "YEAR_DONE", reason: null, cachedMonths, lastYearEmpty: false, nextMonth: mi + 1 };
          }
        }
        if (resumable) return { accountId, orders, windows, pages, askedBackTo, stoppedBecause: "YEAR_DONE", reason: null, cachedMonths, lastYearEmpty: false, nextMonth: null };
        // Anything the probe saw that the months somehow did not (never expected) still counts.
        take(probe);
      }
      yearsDone++;
      if (s <= floor) return { accountId, orders, windows, pages, askedBackTo, stoppedBecause: "FLOOR", reason: null, cachedMonths, lastYearEmpty };
      if (opts.maxYears != null && yearsDone >= opts.maxYears) return { accountId, orders, windows, pages, askedBackTo, stoppedBecause: "YEAR_DONE", reason: null, cachedMonths, lastYearEmpty };
      if (quiet >= quietNeeded) return { accountId, orders, windows, pages, askedBackTo, stoppedBecause: "QUIET_YEARS", reason: null, cachedMonths, lastYearEmpty };
      end = new Date(start);
    }
  } catch (e) {
    if (e instanceof Stop) return { accountId, orders, windows, pages, askedBackTo, stoppedBecause: e.why, reason: e.detail, cachedMonths, lastYearEmpty };
    throw e;
  }
}
