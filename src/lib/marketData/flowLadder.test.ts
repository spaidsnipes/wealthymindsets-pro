import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFlowLadderPublisher, FLOW_LADDER_PUBLISH_MS, readLadderBar } from "./flowLadder";

describe("readLadderBar", () => {
  it("adds up a row's levels; null when empty", () => {
    expect(readLadderBar(new Map([[1, { bid: 2, ask: 5 }], [2, { bid: 1, ask: 0 }]]))).toEqual({
      buy: 5, sell: 3, delta: 2, levels: 2,
    });
    expect(readLadderBar(new Map())).toBeNull();
    expect(readLadderBar(null)).toBeNull();
  });
});

describe("createFlowLadderPublisher — the ticket never rests a batch behind its prints", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1_000_000); });
  afterEach(() => { vi.useRealTimers(); });

  it("publishes the first change at once", () => {
    const publish = vi.fn();
    createFlowLadderPublisher(publish).changed();
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it("a fold inside the throttle window is published by a trailing publish, not left for the next batch", () => {
    const publish = vi.fn();
    const pub = createFlowLadderPublisher(publish);
    pub.changed(); // t=0 → published
    vi.advanceTimersByTime(100);
    pub.changed(); // t=100 → inside the window: the last batch the ticket will see
    pub.changed(); // coalesced
    expect(publish).toHaveBeenCalledTimes(1);
    // No further batch arrives. The ladder must still catch up at the edge.
    vi.advanceTimersByTime(FLOW_LADDER_PUBLISH_MS - 100);
    expect(publish).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(5_000);
    expect(publish).toHaveBeenCalledTimes(2);
  });

  it("never publishes faster than the throttle", () => {
    const publish = vi.fn();
    const pub = createFlowLadderPublisher(publish);
    for (let t = 0; t < 1_000; t += 10) { pub.changed(); vi.advanceTimersByTime(10); }
    expect(publish.mock.calls.length).toBeLessThanOrEqual(1_000 / FLOW_LADDER_PUBLISH_MS + 1);
    expect(publish.mock.calls.length).toBeGreaterThanOrEqual(1_000 / FLOW_LADDER_PUBLISH_MS);
  });

  it("cancel drops the trailing publish (rebuild / unmount)", () => {
    const publish = vi.fn();
    const pub = createFlowLadderPublisher(publish);
    pub.changed();
    vi.advanceTimersByTime(50);
    pub.changed();
    pub.cancel();
    vi.advanceTimersByTime(1_000);
    expect(publish).toHaveBeenCalledTimes(1);
  });
});
