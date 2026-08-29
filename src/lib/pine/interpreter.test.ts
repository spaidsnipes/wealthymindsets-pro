import { describe, expect, it } from "vitest";
import { interpretPine } from "./interpreter";
import type { OHLCVBar } from "./types";

const bars: OHLCVBar[] = Array.from({ length: 6 }, (_, index) => ({
  time: index * 60,
  open: index + 0.5,
  high: index + 1.25,
  low: index + 0.25,
  close: index + 1,
  volume: 10 + index,
}));

describe("Pine request.security", () => {
  it("maps each higher-timeframe close back to its source bars", () => {
    const output = interpretPine(
      'indicator("MTF")\nplot(request.security("TEST", "5", close), "5m close")',
      bars,
    );

    expect(output.errors).toEqual([]);
    expect(output.plots).toHaveLength(1);
    expect(output.plots[0].values).toEqual([5, 5, 5, 5, 5, 6]);
  });

  it("uses the current series for a same-timeframe request", () => {
    const output = interpretPine(
      'indicator("Same TF")\nplot(request.security("TEST", "1", close), "1m close")',
      bars,
    );

    expect(output.errors).toEqual([]);
    expect(output.plots).toHaveLength(1);
    expect(output.plots[0].values).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
