import { describe, expect, it } from "vitest";
import { rowsInPriceOrder } from "./levelRowOrder";

describe("P110 · level words keep the order of their prices (serving NQ1! 1m: VAL printed above VAH)", () => {
  it("a narrow value area stacks VAH above POC above VAL, POC on its own row", () => {
    const r = rowsInPriceOrder([
      { key: "POC", y: 271 }, { key: "VAH", y: 268 }, { key: "VAL", y: 271 },
    ], 15, "POC");
    expect(r.get("POC")).toBe(271);
    expect(r.get("VAH")).toBe(256);
    expect(r.get("VAL")).toBe(286);
  });
  it("levels already far apart keep their own rows", () => {
    const r = rowsInPriceOrder([{ key: "VAH", y: 100 }, { key: "POC", y: 200 }, { key: "VAL", y: 300 }], 15, "POC");
    expect([r.get("VAH"), r.get("POC"), r.get("VAL")]).toEqual([100, 200, 300]);
  });
  it("missing or unmeasured levels are left out, never invented", () => {
    const r = rowsInPriceOrder([{ key: "VAH", y: NaN }, { key: "POC", y: 200 }], 15, "POC");
    expect(r.has("VAH")).toBe(false);
    expect(r.get("POC")).toBe(200);
  });
});
