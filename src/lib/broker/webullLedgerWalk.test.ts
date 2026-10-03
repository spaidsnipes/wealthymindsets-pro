import { describe, expect, it } from "vitest";
import { SPLIT_AT, walkWebullHistory, type HistoryPage } from "./webullLedgerWalk";

const grp = (id: string, at: string) => ({
  client_order_id: id, combo_type: "NORMAL",
  orders: [{ order_id: `o-${id}`, symbol: "TSLA", side: "BUY", status: "FILLED", total_quantity: "1", filled_quantity: "1", filled_price: "1", filled_time_at: at, place_time_at: at, legs: [], fees: [] }],
});

/** A fake Webull: orders by placement date; a year window TRUNCATES to its first `cap` rows, as measured. */
function fakeWebull(all: ReturnType<typeof grp>[], cap = 2, pageSize = 2): { page: HistoryPage; calls: string[] } {
  const calls: string[] = [];
  const sorted = [...all].sort((a, b) => b.client_order_id.localeCompare(a.client_order_id));
  const page: HistoryPage = async (start, end, cursor) => {
    calls.push(`${start}..${end}|${cursor ?? "-"}`);
    const inWin = sorted.filter(g => g.orders[0].place_time_at.slice(0, 10) >= start && g.orders[0].place_time_at.slice(0, 10) < end);
    const yearLong = Date.parse(end) - Date.parse(start) > 40 * 86_400_000;
    const pool = yearLong ? inWin.slice(0, cap) : inWin;
    const from = cursor ? pool.findIndex(g => g.client_order_id === cursor) + 1 : 0;
    return { ok: true, payload: pool.slice(from, from + pageSize) };
  };
  return { page, calls };
}

const NOOP = { sleep: async () => {} };
const TODAY = new Date("2026-10-02T15:00:00Z");

describe("walkWebullHistory — a year is a probe, months are read, pages are followed", () => {
  it("reads every order even when the year window truncates (the measured Webull behaviour)", async () => {
    const all = [
      grp("aa", "2026-10-02T14:00:00Z"), grp("bb", "2026-10-01T14:00:00Z"), grp("cc", "2026-09-29T14:00:00Z"),
      grp("dd", "2026-09-08T14:00:00Z"), grp("ee", "2026-06-09T14:00:00Z"), grp("ff", "2026-01-23T14:00:00Z"),
    ];
    const { page, calls } = fakeWebull(all, 2, 2);
    const walk = await walkWebullHistory("ACC", page, { today: TODAY, ...NOOP });
    expect(walk.orders.map(o => o.orderId).sort()).toEqual(["o-aa", "o-bb", "o-cc", "o-dd", "o-ee", "o-ff"]);
    expect(calls[0]).toBe("2026-01-01..2026-10-03|-");          // the calendar-year probe (this year: to tomorrow)
    expect(calls[1]).toBe("2026-10-01..2026-10-03|-");          // this calendar month, inside the live week
    expect(calls).toContain("2026-09-01..2026-09-25|-");        // last month up to the week-old edge (keepable)
    expect(calls).toContain("2026-09-25..2026-10-01|-");        // and its part inside the live week
    expect(calls.some(c => !c.endsWith("|-"))).toBe(true);      // paged by the last client order id
    expect(walk.stoppedBecause).toBe("QUIET_YEARS");
    expect(walk.askedBackTo).toBe("2024-01-01");
  });

  it("a crowded month is halved down to days until every order is read (cash 2026-01, measured)", async () => {
    // 45 orders across January; any multi-day window answers only its first SPLIT_AT rows.
    const all = Array.from({ length: 45 }, (_, i) => grp(`id${String(i).padStart(3, "0")}`, `2026-01-${String(5 + (i % 20)).padStart(2, "0")}T14:${String(i % 60).padStart(2, "0")}:00Z`));
    const calls: string[] = [];
    const page: HistoryPage = async (start, end, cursor) => {
      calls.push(`${start}..${end}`);
      const inWin = all.filter(g => g.orders[0].place_time_at.slice(0, 10) >= start && g.orders[0].place_time_at.slice(0, 10) < end)
        .sort((a, b) => b.client_order_id.localeCompare(a.client_order_id));
      const oneDay = Date.parse(end) - Date.parse(start) <= 86_400_000;
      if (cursor) return { ok: true, payload: [] };   // the cursor recovers nothing, as measured
      return { ok: true, payload: oneDay ? inWin : inWin.slice(0, SPLIT_AT) };
    };
    const walk = await walkWebullHistory("ACC", page, { today: TODAY, ...NOOP });
    expect(walk.orders).toHaveLength(45);
  });

  it("a quiet year costs one probe, and two quiet years end the walk", async () => {
    const { page, calls } = fakeWebull([]);
    const walk = await walkWebullHistory("ACC", page, { today: TODAY, ...NOOP });
    expect(calls).toEqual(["2026-01-01..2026-10-03|-", "2025-01-01..2026-01-01|-"]);
    expect(walk).toMatchObject({ stoppedBecause: "QUIET_YEARS", orders: [] });
  });

  it("a refusal stops the walk and says so, keeping what it already read", async () => {
    const walk = await walkWebullHistory("ACC", async () => ({ ok: false, payload: null, reason: "HTTP 401" }), { today: TODAY, ...NOOP });
    expect(walk).toMatchObject({ stoppedBecause: "REFUSED", reason: "HTTP 401", orders: [] });
  });

  it("Webull's HTTP 429 is waited out with backoff, and pages are spaced", async () => {
    const waits: number[] = [];
    let n = 0;
    const { page } = fakeWebull([grp("k1", "2026-09-30T14:00:00Z")]);
    const walk = await walkWebullHistory("ACC", async (s, e, c) => (++n <= 2 ? { ok: false, payload: null, reason: "HTTP 429 TOO_MANY_REQUESTS" } : page(s, e, c)),
      { today: TODAY, sleep: async ms => { waits.push(ms); }, gapMs: 7, backoffMs: [100, 200, 300] });
    expect(walk.orders).toHaveLength(1);
    expect(waits.slice(0, 2)).toEqual([100, 200]);
    expect(waits).toContain(7);
  });

  it("finished months are kept and read back; the current month is always asked live", async () => {
    const all = [grp("aa", "2026-10-01T14:00:00Z"), grp("dd", "2026-07-08T14:00:00Z")];
    const store = new Map<string, string>();
    const cache = { get: async (k: string) => store.get(k) ?? null, put: async (k: string, v: string) => { store.set(k, v); } };
    const first = fakeWebull(all, 99, 99);
    const w1 = await walkWebullHistory("ACC", first.page, { today: TODAY, ...NOOP, cache });
    expect(w1.cachedMonths).toBe(0);
    expect(store.size).toBeGreaterThan(0);
    expect([...store.keys()].some(k => k.includes("2026-10-01:2026-10-03") && !k.endsWith(":live"))).toBe(false);   // the live week is never kept as history
    const second = fakeWebull(all, 99, 99);
    const w2 = await walkWebullHistory("ACC", second.page, { today: TODAY, ...NOOP, cache });
    expect(w2.orders.map(o => o.orderId).sort()).toEqual(["o-aa", "o-dd"]);
    expect(w2.cachedMonths).toBeGreaterThan(0);
    expect(second.calls.length).toBeLessThan(first.calls.length);
  });

  it("one year per call: startYearsBack + maxYears, YEAR_DONE, and whether that year was empty", async () => {
    const { page, calls } = fakeWebull([grp("aa", "2025-02-03T14:00:00Z")], 99, 99);
    const w = await walkWebullHistory("ACC", page, { today: TODAY, ...NOOP, startYearsBack: 1, maxYears: 1 });
    expect(calls[0]).toBe("2025-01-01..2026-01-01|-");
    expect(w).toMatchObject({ stoppedBecause: "YEAR_DONE", lastYearEmpty: false });
    expect(w.orders.map(o => o.orderId)).toEqual(["o-aa"]);
    const quiet = await walkWebullHistory("ACC", fakeWebull([], 99, 99).page, { today: TODAY, ...NOOP, startYearsBack: 2, maxYears: 1 });
    expect(quiet).toMatchObject({ stoppedBecause: "YEAR_DONE", lastYearEmpty: true, orders: [] });
  });

  it("probeOnly asks once; onlyMonth reads one month with no probe", async () => {
    const f = fakeWebull([grp("aa", "2026-09-10T14:00:00Z"), grp("bb", "2026-08-10T14:00:00Z")], 99, 99);
    const probe = await walkWebullHistory("ACC", f.page, { today: TODAY, ...NOOP, maxYears: 1, probeOnly: true });
    expect(probe).toMatchObject({ lastYearEmpty: false, orders: [], pages: 1 });
    const g = fakeWebull([grp("aa", "2026-09-10T14:00:00Z"), grp("bb", "2026-08-10T14:00:00Z")], 99, 99);
    const m1 = await walkWebullHistory("ACC", g.page, { today: TODAY, ...NOOP, maxYears: 1, onlyMonth: 2 });
    expect(g.calls[0]).toBe("2026-08-01..2026-09-01|-");
    expect(m1.orders.map(o => o.orderId)).toEqual(["o-bb"]);
    expect(m1.askedBackTo).toBe("2026-08-01");
  });

  it("resumable: fromMonth reads on from there, and a passed deadline returns where to continue", async () => {
    const all = [grp("aa", "2026-09-10T14:00:00Z"), grp("bb", "2026-08-10T14:00:00Z"), grp("cc", "2026-03-10T14:00:00Z")];
    const done = await walkWebullHistory("ACC", fakeWebull(all, 99, 99).page, { today: TODAY, ...NOOP, maxYears: 1, fromMonth: 0 });
    expect(done.nextMonth).toBeNull();
    expect(done.orders.map(o => o.orderId).sort()).toEqual(["o-aa", "o-bb", "o-cc"]);
    const cut = await walkWebullHistory("ACC", fakeWebull(all, 99, 99).page, { today: TODAY, ...NOOP, maxYears: 1, fromMonth: 2, deadlineAt: 0 });
    expect(cut.nextMonth).toBe(3);
    expect(cut.orders.map(o => o.orderId)).toEqual(["o-bb"]);
  });
});
