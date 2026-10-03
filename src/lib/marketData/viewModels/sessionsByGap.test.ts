import { describe, expect, it } from "vitest";

import { continuousDayKeyFor } from "../sessionWindow";
import { sessionsByGap as split } from "./sessionsByGap";

describe("a 24/7 feed splits on its named day (crypto = 00:00 UTC)", () => {
  const t = (day: number, hh: number, mm = 0) => Date.UTC(2026, 0, day, hh, mm) / 1000;
  const times = [t(12, 23, 30), t(12, 23, 45), t(13, 0, 0), t(13, 0, 15)];
  it("crypto: two sessions across UTC midnight; without a day key, one", () => {
    expect(split(times, continuousDayKeyFor("BTCUSD"))).toEqual([0, 0, 1, 1]);
    expect(split(times)).toEqual([0, 0, 0, 0]);
  });
  it("only crypto gets a day key", () => {
    expect(continuousDayKeyFor("TSLA")).toBeUndefined();
    expect(continuousDayKeyFor("ES1!")).toBeUndefined();
    expect(continuousDayKeyFor("ETH-USD")).toBeTypeOf("function");
  });
});
