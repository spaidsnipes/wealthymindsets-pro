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
    expect(calls[0]).toBe("2025-10-03..2026-10-03|-");          // the year probe
    expect(calls[1]).toBe("2026-09-03..2026-10-03|-");          // then its newest month
    expect(calls).toContain("2026-09-03..2026-10-03|cc");       // paged by the last client order id
    expect(walk.stoppedBecause).toBe("QUIET_YEARS");
    expect(walk.askedBackTo).toBe("2023-10-03");
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
    expect(calls).toEqual(["2025-10-03..2026-10-03|-", "2024-10-03..2025-10-03|-"]);
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
});
