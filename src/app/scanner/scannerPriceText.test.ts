import { describe, expect, it } from "vitest";
import { scannerPriceText } from "./scannerPriceText";

describe("scanner prices carry units that are true", () => {
  it("futures read in points, not dollars", () => {
    expect(scannerPriceText("NQ1!", "$31,396.00")).toBe("31,396.00");
    expect(scannerPriceText("ES1!", "$7,850.25")).toBe("7,850.25");
  });
  it("equities keep their dollar sign; refusal words pass through", () => {
    expect(scannerPriceText("AAPL", "$336.53")).toBe("$336.53");
    expect(scannerPriceText("NQ1!", "UNAVAILABLE")).toBe("UNAVAILABLE");
  });
});
