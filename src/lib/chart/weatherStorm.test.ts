import { describe, expect, it } from "vitest";
import { renderStormPixels, stormDensity, stormSeed } from "./weatherStorm";

describe("F08B storm texture", () => {
  it("is deterministic: same seed and phase, same density (STILL holds exactly)", () => {
    for (const [u, v] of [[0.2, 0.3], [0.5, 0.5], [0.81, 0.07]]) {
      expect(stormDensity(u, v, 42, 0.12)).toBe(stormDensity(u, v, 42, 0.12));
    }
  });

  it("stays in [0, 1] and has real structure (lanes and cores, not an even fog)", () => {
    const vals: number[] = [];
    for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) vals.push(stormDensity(i / 40, j / 40, 7, 0));
    expect(Math.min(...vals)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...vals)).toBeLessThanOrEqual(1);
    expect(vals.filter(v => v < 0.15).length).toBeGreaterThan(40);
    expect(vals.filter(v => v > 0.7).length).toBeGreaterThan(40);
  });

  it("LIVE drift moves the field; the seed is stable per market", () => {
    expect(stormDensity(0.4, 0.4, 9, 0)).not.toBe(stormDensity(0.4, 0.4, 9, 0.3));
    expect(stormSeed("TSLA|5m")).toBe(stormSeed("TSLA|5m"));
    expect(stormSeed("TSLA|5m")).not.toBe(stormSeed("BTC-USD|1m"));
  });

  it("paints only inside the disc, only where a measured cell exists, in the measured hue family", () => {
    const S = 32;
    const out = new Uint8ClampedArray(S * S * 4);
    const gold: [number, number, number] = [214, 180, 86];
    renderStormPixels(out, S, 3, 0, u => (u < 0.5 ? { rgb: gold, weight: 1 } : { rgb: [0, 0, 0], weight: 0 }));
    expect(out[3]).toBe(0); // corner: outside the disc
    for (let py = 0; py < S; py++) for (let px = S / 2 + 1; px < S; px++) expect(out[(py * S + px) * 4 + 3]).toBe(0); // clear air
    let seen = 0;
    for (let py = 0; py < S; py++) for (let px = 0; px < S / 2; px++) {
      const i = (py * S + px) * 4;
      if (out[i + 3] > 0) { seen++; expect(out[i]).toBeGreaterThanOrEqual(out[i + 2]); }
    }
    expect(seen).toBeGreaterThan(50);
  });
});
