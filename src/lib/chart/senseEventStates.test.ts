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
  it("unmeasured absorption is unsupported even when its old zone count is zero", () => {
    expect(senseEventStates({ absorptionBasis: "UNMEASURED", absorptionZones: "0" }).ABSORPTION).toBe(SENSE_UNAVAILABLE);
    expect(senseEventStates({ liquidityWeather: "UNMEASURED" }).LIQUIDITY_WEATHER).toBe(SENSE_UNAVAILABLE);
  });
  it("a renderer fault overrides a successful stale receipt and remains separate from data support", () => {
    const states = senseEventStates({ valueCandle: "DRAWN", layerFaults: "1:VALUE_CANDLE: paint failed" });
    expect(states.VALUE_CANDLE).toBe("BROKEN / NOT WIRED");
    expect(senseIsQuiet(states.VALUE_CANDLE)).toBe(true);
    expect(senseIsQuiet("NOT ENTITLED")).toBe(true);
  });
});

describe("exhaustion and anatomy events have words (2026-10-04)", () => {
  it("reads the counts the chart publishes", async () => {
    const { senseEventStates, SENSE_NO_EVENT, SENSE_ON_CAMERA } = await import("./senseEventStates");
    expect(senseEventStates({ exhaustion: "0", dualAnatomy: "MARKET|EVENTS:0|BODIES:0" })).toMatchObject({ EXHAUSTION: SENSE_NO_EVENT, ANATOMY_CARDS: SENSE_NO_EVENT });
    expect(senseEventStates({ exhaustion: "2", dualAnatomy: "MARKET|EVENTS:3|BODIES:3" })).toMatchObject({ EXHAUSTION: `${SENSE_ON_CAMERA} · 2`, ANATOMY_CARDS: SENSE_ON_CAMERA });
  });
});

describe("per-bar stacked imbalances count as on camera (2026-10-04)", () => {
  it("reads RUNS from imbalanceStackBars", async () => {
    const { senseEventStates, SENSE_ON_CAMERA, SENSE_NO_EVENT } = await import("./senseEventStates");
    expect(senseEventStates({ imbalanceStack: "NO_STACK", imbalanceStackBars: "RUNS:4|BARS:54" }).IMBALANCE_STACK).toBe(`${SENSE_ON_CAMERA} · 4 STACKS`);
    expect(senseEventStates({ imbalanceStack: "NO_STACK", imbalanceStackBars: "RUNS:0|BARS:54" }).IMBALANCE_STACK).toBe(SENSE_NO_EVENT);
  });
});
