import { describe, expect, it } from "vitest";
import { sizeUnitFor } from "./sizeUnit";

describe("one owner for what a print's size counts", () => {
  it("names contracts, shares and coins by asset class", () => {
    expect(sizeUnitFor("NQ1!", 12)).toBe("contracts");
    expect(sizeUnitFor("ES1!", 1)).toBe("contract");
    expect(sizeUnitFor("AAPL", 300)).toBe("shares");
    expect(sizeUnitFor("BTC-USD", 15.0757)).toBe("BTC");
  });
  it("claims no unit for spot FX", () => {
    expect(sizeUnitFor("EURUSD", 1000)).toBeNull();
  });
});
