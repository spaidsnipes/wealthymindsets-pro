import { describe, expect, it } from "vitest";
import { isPersonalAdviceColumn } from "./marketRelevance";

describe("isPersonalAdviceColumn", () => {
  it("sets aside the column found on serving /news", () => {
    expect(isPersonalAdviceColumn({ title: "My wife never went back to work after raising our kids. Do I have to share my retirement savings 50/50?", sym: "MARKET", tags: [] })).toBe(true);
    expect(isPersonalAdviceColumn({ title: "Should I pay off my mortgage before retiring?", sym: "MARKET", tags: [] })).toBe(true);
  });
  it("keeps market news, even when it says 'my' or 'should'", () => {
    expect(isPersonalAdviceColumn({ title: "Here's who's joining the S&P 500 in the index's latest shakeup", sym: "MARKET", tags: [] })).toBe(false);
    expect(isPersonalAdviceColumn({ title: "Should TSLA bulls worry about deliveries?", sym: "TSLA", tags: ["Earnings"] })).toBe(false);
    expect(isPersonalAdviceColumn({ title: "Fed holds rates; Powell says inflation sticky", sym: "MARKET", tags: ["Macro"] })).toBe(false);
  });
});
