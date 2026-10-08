import { describe, expect, it } from "vitest";
import { signedWhole, traderSourceWords } from "./traderSourceWords";

describe("trader words for a source (sheriff 2026-10-08)", () => {
  it("names the kind, not the vendor", () => {
    expect(traderSourceWords("tastytrade")).toBe("broker feed");
    expect(traderSourceWords("tastytrade futures options")).toBe("broker feed · options chain");
    expect(traderSourceWords("coinbase")).toBe("exchange data");
    expect(traderSourceWords("yahoo")).toBe("market-data vendor");
    expect(traderSourceWords(null)).toBe("not named by its owner");
  });
  it("never prints −0", () => {
    expect(signedWhole(-0.2, "sh")).toBe("0 sh");
    expect(signedWhole(-3.6)).toBe("−4");
    expect(signedWhole(1200)).toBe("+1,200");
  });
});
