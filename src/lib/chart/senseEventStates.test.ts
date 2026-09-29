import { describe, expect, it } from "vitest";
import { senseEventStates, senseIsQuiet, SENSE_NO_EVENT, SENSE_ON_CAMERA, SENSE_UNAVAILABLE } from "./senseEventStates";

describe("no silent nothing — receipts become human states", () => {
  it("absorption with no zone is NO CURRENT EVENT, with zones it is ON CAMERA", () => {
    expect(senseEventStates({ absorptionZones: "0" }).ABSORPTION).toBe(SENSE_NO_EVENT);
    expect(senseEventStates({ absorptionZones: "2" }).ABSORPTION).toBe(`${SENSE_ON_CAMERA} · 2 ZONES`);
  });
  it("an unmeasured tape is UNAVAILABLE ON THIS FEED, never DRAWING", () => {
    const s = senseEventStates({ imbalanceStack: "UNMEASURED", deltaDivergence: "UNMEASURED", valueCandle: "UNMEASURED" });
    expect(s.IMBALANCE_STACK).toBe(SENSE_UNAVAILABLE);
    expect(s.DELTA_DIVERGENCE).toBe(SENSE_UNAVAILABLE);
    expect(s.VALUE_CANDLE).toBe(SENSE_UNAVAILABLE);
    expect(senseIsQuiet(s.IMBALANCE_STACK)).toBe(true);
  });
  it("no receipt, no word", () => {
    expect(senseEventStates({})).toEqual({});
    expect(senseIsQuiet(undefined)).toBe(false);
  });
});
