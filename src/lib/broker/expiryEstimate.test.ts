import { describe, expect, it } from "vitest";
import { expiryEstimate, parseOptionKey, summarizeExpiries } from "./expiryEstimate";
import type { Episode } from "./webullLedger";

const bar = (ymd: string, close: number) => ({ time: Date.parse(`${ymd}T13:30:00Z`) / 1000, open: close, high: close, low: close, close, volume: 1 });
const ep = (key: string, direction = "LONG", entryCost = 90, fees = 0.05) => ({ id: key, instrumentKey: key, direction, entryCost, fees } as unknown as Episode);

describe("unsettled options at expiry — ESTIMATED from the underlying's close", () => {
  it("reads the key; classifies by the close on the expiry date; long OTM loses what was paid", () => {
    expect(parseOptionKey("SPY 2026-01-28 692P")).toEqual({ underlying: "SPY", expiry: "2026-01-28", strike: 692, right: "P" });
    const daily = [bar("2026-01-28", 695.3)];
    expect(expiryEstimate(ep("SPY 2026-01-28 692P"), daily)).toMatchObject({ close: 695.3, moneyness: "OUT OF THE MONEY", estimatedNet: -90.05 });
    expect(expiryEstimate(ep("SPY 2026-01-28 690C"), daily)).toMatchObject({ moneyness: "IN THE MONEY", estimatedNet: null });
    expect(expiryEstimate(ep("SPY 2026-01-29 690C"), daily)).toMatchObject({ moneyness: "UNKNOWN", close: null });
    expect(expiryEstimate(ep("NVDA"), daily)).toBeNull();
  });
  it("summary counts and the long-OTM estimate", () => {
    const daily = [bar("2026-01-28", 695.3)];
    const xs = [expiryEstimate(ep("SPY 2026-01-28 692P"), daily)!, expiryEstimate(ep("SPY 2026-01-28 690C"), daily)!, expiryEstimate(ep("SPY 2026-01-29 690C"), daily)!];
    expect(summarizeExpiries(xs)).toEqual({ otm: 1, itm: 1, unknown: 1, estimatedLongOtmNet: -90.05 });
  });
});
