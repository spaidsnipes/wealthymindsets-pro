import { beforeEach, describe, expect, it } from "vitest";
import { memoProfile, profileMemoKey, resetProfileMemo } from "./profileMemo";

const bar = (time: number, close: number, volume = 10) => ({ time, open: close, high: close + 1, low: close - 1, close, volume });

describe("memoProfile — one profile build per bar reading", () => {
  beforeEach(() => resetProfileMemo());

  it("the same bars and options reuse the build", () => {
    const bars = [bar(1, 100), bar(2, 101)];
    let builds = 0;
    const a = memoProfile(profileMemoKey("BTC-USD", bars, { rows: 80 }), () => ({ n: ++builds }));
    const b = memoProfile(profileMemoKey("BTC-USD", [...bars], { rows: 80 }), () => ({ n: ++builds }));
    expect(builds).toBe(1);
    expect(b).toBe(a);
  });

  it("a tick on the forming bar, a new bar, another symbol or other options rebuild", () => {
    const bars = [bar(1, 100), bar(2, 101)];
    const k = profileMemoKey("BTC-USD", bars, { rows: 80 });
    expect(profileMemoKey("BTC-USD", [bar(1, 100), bar(2, 101, 11)], { rows: 80 })).not.toBe(k);
    expect(profileMemoKey("BTC-USD", [bar(1, 100), bar(2, 101.5)], { rows: 80 })).not.toBe(k);
    expect(profileMemoKey("BTC-USD", [...bars, bar(3, 101)], { rows: 80 })).not.toBe(k);
    expect(profileMemoKey("ETH-USD", bars, { rows: 80 })).not.toBe(k);
    expect(profileMemoKey("BTC-USD", bars, { rows: 120 })).not.toBe(k);
  });

  it("holds a bounded number of builds", () => {
    let builds = 0;
    for (let i = 0; i < 20; i++) memoProfile(`k${i}`, () => ++builds);
    memoProfile("k0", () => ++builds); // evicted long ago → rebuilt
    expect(builds).toBe(21);
  });
});
