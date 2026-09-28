import { describe, expect, it } from "vitest";
import { brokerRowFromRead, positionRowFromRead } from "./brokerBookRows";

describe("the deck's broker book rows say what was read", () => {
  it("not read yet → null (the surface keeps NOT READ / UNOBSERVED)", () => {
    expect(brokerRowFromRead(null)).toBeNull();
    expect(positionRowFromRead(null, "TSLA")).toBeNull();
  });
  it("CONNECTED names the account count and types; a refusal names its code", () => {
    expect(brokerRowFromRead({ httpStatus: 200, body: { connected: true, accountCount: 3, accountTypes: ["CASH", "MARGIN"] } })).toMatchObject({ state: "CONNECTED", detail: expect.stringContaining("3 accounts (CASH, MARGIN)") });
    expect(brokerRowFromRead({ httpStatus: 403, body: { code: "BROKER_OWNER_NOT_CONFIGURED" } })).toMatchObject({ state: "REFUSED", detail: expect.stringContaining("BROKER_OWNER_NOT_CONFIGURED") });
  });
  it("FLAT only when the read succeeded and held nothing for this symbol; a failed read is never flat", () => {
    expect(positionRowFromRead({ httpStatus: 200, body: { state: "NO_POSITIONS", accountsQueried: 3, positions: [] } }, "tsla")).toMatchObject({ state: "FLAT" });
    expect(positionRowFromRead({ httpStatus: 200, body: { state: "TIMEOUT" } }, "TSLA")).toMatchObject({ state: "UNOBSERVED" });
    expect(positionRowFromRead({ httpStatus: 403, body: { code: "X" } }, "TSLA")).toMatchObject({ state: "UNOBSERVED" });
  });
  it("a held position is named as the broker reported it", () => {
    const r = positionRowFromRead({ httpStatus: 200, body: { state: "OBSERVED", positions: [{ symbol: "TSLA", quantity: 10, costPrice: 250.5, instrumentType: "STOCK" }] } }, "TSLA");
    expect(r).toMatchObject({ state: "LONG", detail: expect.stringContaining("LONG 10 @ 250.5") });
  });
});

describe("the deck matches the broker's symbol spelling", () => {
  it("reads Webull's ETHUSD holding on the ETH-USD chart — never a false FLAT", async () => {
    const { positionRowFromRead } = await import("./brokerBookRows");
    const row = positionRowFromRead({
      httpStatus: 200,
      body: { state: "OBSERVED", accountsQueried: 3, checkedAt: "t", positions: [{ symbol: "ETHUSD", quantity: 0.5, costPrice: 2600, instrumentType: "CRYPTO" }] },
    }, "ETH-USD");
    expect(row?.state).toBe("LONG");
  });
});

describe("ORDERS reads the keeper's open-order reconciliation", () => {
  const at = 1_790_556_341_975;
  const st = (rec: Record<string, unknown>) => ({ httpStatus: 200, body: { connected: true, sessionKeeper: { reconciliation: { accounts: 3, openOrders: 0, external: 0, unresolved: 0, atMs: at, ...rec } as never } } });
  it("NONE WORKING only on a full, fresh read", async () => {
    const { ordersRowFromStatus } = await import("./brokerBookRows");
    expect(ordersRowFromStatus(st({ state: "OK" }), at + 60_000)?.state).toBe("NONE WORKING");
    expect(ordersRowFromStatus(st({ state: "OK", openOrders: 2 }), at + 60_000)?.state).toBe("2 WORKING");
  });
  it("a partial read names who did not answer and never says none", async () => {
    const { ordersRowFromStatus } = await import("./brokerBookRows");
    const row = ordersRowFromStatus(st({ state: "PARTIAL", unreadable: ["CASH:429"] }), at + 60_000);
    expect(row?.state).toBe("PARTIAL");
    expect(row?.detail).toContain("CASH:429");
  });
  it("a stale read is UNOBSERVED; no keeper record → null", async () => {
    const { ordersRowFromStatus, ORDERS_READ_FRESH_MS } = await import("./brokerBookRows");
    expect(ordersRowFromStatus(st({ state: "OK" }), at + ORDERS_READ_FRESH_MS + 1)?.state).toBe("UNOBSERVED");
    expect(ordersRowFromStatus({ httpStatus: 200, body: { connected: true } })).toBeNull();
  });
});
