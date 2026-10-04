import { describe, expect, it } from "vitest";
import { secMarketCapFundamental } from "./scannerFundamental";

describe("market cap from SEC shares × price", () => {
  it("computes and names both sources and the filing date", () => {
    const f = secMarketCapFundamental(14_594_180_000, "2026-07-17", 255.5, "AAPL")!;
    expect(f.state).toBe("MEASURED");
    expect(f.text).toBe("3.7T");
    expect(f.reason).toContain("SEC");
    expect(f.reason).toContain("2026-07-17");
    expect(f.reason).toContain("WM calculation");
  });
  it("refuses without both inputs", () => {
    expect(secMarketCapFundamental(null, null, 100, "X")).toBeNull();
    expect(secMarketCapFundamental(1e9, null, 0, "X")).toBeNull();
  });
});
