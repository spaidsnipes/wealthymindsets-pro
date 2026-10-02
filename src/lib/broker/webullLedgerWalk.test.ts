import { describe, expect, it } from "vitest";
import { walkWebullHistory } from "./webullLedgerWalk";

const grp = (id: string, at: string) => ({
  client_order_id: id, combo_type: "NORMAL",
  orders: [{ order_id: `o-${id}`, symbol: "TSLA", side: "BUY", status: "FILLED", total_quantity: "1", filled_quantity: "1", filled_price: "1", filled_time_at: at, place_time_at: at, legs: [], fees: [] }],
});

describe("walkWebullHistory — every page, every year, until the history goes quiet", () => {
  it("pages a window by the last client order id and stops after two quiet years", async () => {
    const calls: string[] = [];
    const walk = await walkWebullHistory("ACC", async (start, end, cursor) => {
      calls.push(`${start}..${end}|${cursor ?? "-"}`);
      if (start.startsWith("2025-10")) {
        if (!cursor) return { ok: true, payload: [grp("z9", "2026-09-30T14:00:00Z"), grp("m5", "2026-06-01T14:00:00Z")] };
        if (cursor === "m5") return { ok: true, payload: [grp("a1", "2026-02-04T14:00:00Z")] };
        return { ok: true, payload: [] };
      }
      return { ok: true, payload: [] };
    }, { today: new Date("2026-10-02T15:00:00Z") });
    expect(walk.orders.map(o => o.orderId)).toEqual(["o-z9", "o-m5", "o-a1"]);
    expect(calls[0]).toBe("2025-10-03..2026-10-03|-");
    expect(calls[1]).toBe("2025-10-03..2026-10-03|m5");
    expect(walk.stoppedBecause).toBe("QUIET_YEARS");
    expect(walk.askedBackTo).toBe("2023-10-03");
  });

  it("a refusal stops the walk and says so, keeping what it already read", async () => {
    const walk = await walkWebullHistory("ACC", async () => ({ ok: false, payload: null, reason: "HTTP 401" }), { today: new Date("2026-10-02T15:00:00Z") });
    expect(walk).toMatchObject({ stoppedBecause: "REFUSED", reason: "HTTP 401", orders: [] });
  });
});
