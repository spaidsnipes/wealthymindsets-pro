import { describe, expect, it } from "vitest";
import { applyTickToLiveBar } from "./liveBarPolicy";

describe("forward-only live bar policy", () => {
  it("creates the containing interval bar", () => {
    const result = applyTickToLiveBar(null, null, { price: 100, size: 2, time: 61_500 }, 60);
    expect(result).toEqual({
      status: "ACCEPTED",
      bar: { time: 60, open: 100, high: 100, low: 100, close: 100, volume: 2 },
      lastEventAt: 61_500,
    });
  });

  it("updates a current bar with a later event", () => {
    const current = { time: 60, open: 100, high: 100, low: 100, close: 100, volume: 2 };
    const result = applyTickToLiveBar(current, 61_500, { price: 103, size: 1, time: 62_000 }, 60);
    expect(result.status).toBe("ACCEPTED");
    expect(result.bar).toMatchObject({ time: 60, high: 103, low: 100, close: 103, volume: 3 });
  });

  it("opens a new bar only when time moves forward", () => {
    const current = { time: 60, open: 100, high: 103, low: 100, close: 103, volume: 3 };
    const result = applyTickToLiveBar(current, 62_000, { price: 104, size: 1, time: 120_100 }, 60);
    expect(result).toMatchObject({
      status: "ACCEPTED",
      bar: { time: 120, open: 104, high: 104, low: 104, close: 104, volume: 1 },
    });
  });

  it("does not let an older bar move the chart backward", () => {
    const current = { time: 120, open: 104, high: 104, low: 104, close: 104, volume: 1 };
    const result = applyTickToLiveBar(current, 120_100, { price: 99, size: 10, time: 61_900 }, 60);
    expect(result).toEqual({ status: "LATE_EVENT_IGNORED", bar: current, lastEventAt: 120_100 });
  });

  it("does not let an out-of-order event overwrite a bar close", () => {
    const current = { time: 120, open: 104, high: 106, low: 103, close: 106, volume: 4 };
    const result = applyTickToLiveBar(current, 125_000, { price: 103, size: 1, time: 124_000 }, 60);
    expect(result).toEqual({ status: "LATE_EVENT_IGNORED", bar: current, lastEventAt: 125_000 });
  });
});
