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
