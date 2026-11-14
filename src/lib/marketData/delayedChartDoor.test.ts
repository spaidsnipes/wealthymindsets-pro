import { describe, expect, it } from "vitest";
import { delayedDoorServes, DELAYED_SECONDS_RULE } from "./delayedChartDoor";

// 2026-11-13 customer-candles pass: a member with no broker on NQ1! 15s saw "WM Pro uses no delayed bar source"
// (false since the 11-12 delayed door) and the proxy's 400. Seconds sizes are not asked; the rule names the way out.
describe("delayed chart door — which sizes it serves", () => {
  it("serves minute and longer bars", () => {
    for (const tf of ["1m", "5m", "15m", "1h", "4h", "1D", "1W"]) expect(delayedDoorServes(tf)).toBe(true);
  });
  it("does not ask for seconds bars", () => {
    for (const tf of ["1s", "5s", "15s", "30s"]) expect(delayedDoorServes(tf)).toBe(false);
  });
  it("tells the member the way out", () => {
    expect(DELAYED_SECONDS_RULE).toMatch(/1m or higher/);
    expect(DELAYED_SECONDS_RULE).toMatch(/connect a broker/);
  });
});
