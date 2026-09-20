import { describe, expect, it } from "vitest";
import {
  COUNTDOWN_DIRECT_INSTRUMENT_MIN_WIDTH,
  candleCountdownUsesPillShell,
} from "./candleCountdownMaterial";

describe("candle countdown material — FL-06 desktop instrument", () => {
  it("keeps the filled pill on narrow charts", () => {
    expect(candleCountdownUsesPillShell(0)).toBe(true);
    expect(candleCountdownUsesPillShell(320)).toBe(true);
    expect(candleCountdownUsesPillShell(COUNTDOWN_DIRECT_INSTRUMENT_MIN_WIDTH - 1)).toBe(true);
  });

  it("removes only the pill shell at the 960px desktop boundary", () => {
    expect(COUNTDOWN_DIRECT_INSTRUMENT_MIN_WIDTH).toBe(960);
    expect(candleCountdownUsesPillShell(960)).toBe(false);
    expect(candleCountdownUsesPillShell(1440)).toBe(false);
  });

  it("fails safe when layout has not produced a finite width", () => {
    expect(candleCountdownUsesPillShell(Number.NaN)).toBe(true);
    expect(candleCountdownUsesPillShell(Number.POSITIVE_INFINITY)).toBe(true);
  });
});
