import { describe, expect, it } from "vitest";
import { scannerQuoteTruth } from "./scannerQuoteTruth";

describe("scannerQuoteTruth", () => {
  it("labels a freshly received scanner row as the LAST LIVE price — never delayed (2026-10-12)", () => {
    expect(scannerQuoteTruth({ receivedAt: 1_786_435_000_000, reusedPrevious: false }).quality).toBe("LAST LIVE");
  });

  it("downgrades a reused quote to stale", () => {
    expect(scannerQuoteTruth({ receivedAt: 1_786_435_000_000, reusedPrevious: true }).quality).toBe("STALE");
  });

  it("fails closed without a valid receipt timestamp", () => {
    expect(scannerQuoteTruth({ receivedAt: undefined, reusedPrevious: false }).quality).toBe("UNAVAILABLE");
    expect(scannerQuoteTruth({ receivedAt: Number.NaN, reusedPrevious: false }).quality).toBe("UNAVAILABLE");
  });
});
