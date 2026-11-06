import { describe, expect, it } from "vitest";
import { selectBarCandleReadings } from "./barCandleReadings";

const bars = Array.from({ length: 40 }, (_, k) => {
  const open = 100 + Math.sin(k) * 2;
  const close = open + (k % 3 === 0 ? 1.5 : -0.4);
  return { time: 1_000 + k * 300, open, high: Math.max(open, close) + 0.5, low: Math.min(open, close) - 0.5, close, volume: k === 30 ? 5000 : 1000 + (k % 5) * 100 };
});
const base = {
  bars, barTime: bars[30].time, forming: false, effortOn: true, keelOn: true, sessionOn: true,
  volumeReal: true, noCentralVolume: false, tapeTotals: { buy: 300, sell: 900 }, providerSides: null,
};

describe("Garden 19 §28 — the inspected bar's candle readings", () => {
  it("prints effort→response with the numbers the glass withholds", () => {
    const er = selectBarCandleReadings(base).find(r => r.id === "EFFORT_RESPONSE")!;
    expect(er.klass).toBe("FULL");
    expect(er.value).toMatch(/× median volume/);
    expect(er.basis).toMatch(/finished bars ending at this one/);
  });
  it("keel: tape FULL, provider sides PARTIAL, nothing SILENT, spot FX SILENT", () => {
    const k = (o: object) => selectBarCandleReadings({ ...base, ...o }).find(r => r.id === "DELTA_KEEL")!;
    expect(k({}).klass).toBe("FULL");
    expect(k({}).value).toMatch(/^SELLERS won/);
    expect(k({}).value).toMatch(/bought 300 · sold 900/);
    expect(k({ tapeTotals: null, providerSides: { buy: 5, sell: 1 } }).klass).toBe("PARTIAL");
    expect(k({ tapeTotals: null }).klass).toBe("SILENT");
    expect(k({ noCentralVolume: true }).value).toMatch(/No signed evidence exists/);
  });
  it("no volume → effort silent with the owner's reason; forming bar → silent; off → absent", () => {
    expect(selectBarCandleReadings({ ...base, volumeReal: false, volumeSilenceWhy: "Spot FX has none." }).find(r => r.id === "EFFORT_RESPONSE")!.value).toBe("Spot FX has none.");
    expect(selectBarCandleReadings({ ...base, forming: true }).every(r => r.id === "SESSION" || r.klass === "SILENT")).toBe(true);
    expect(selectBarCandleReadings({ ...base, effortOn: false, keelOn: false, sessionOn: false })).toEqual([]);
  });
  it("session names the session from the clock", () => {
    // 2026-10-06 14:00 UTC = New York + London overlap
    const t = Date.UTC(2026, 9, 6, 14, 0) / 1000;
    const s = selectBarCandleReadings({ ...base, bars: [{ ...bars[0], time: t }], barTime: t, effortOn: false, keelOn: false })[0];
    expect(s.value).toMatch(/LONDON|NEW YORK|London|New York/);
  });
});

describe("census G19.DELTA_RATIO + G19.FAILED_AGG — read from the keel's own evidence", () => {
  const row = (id: string, o: object = {}) => selectBarCandleReadings({ ...base, ...o }).find(r => r.id === id);
  it("delta ratio = |bar delta| ÷ bar volume (registry formula), with coverage named when the tape saw part of the bar", () => {
    const r = row("DELTA_RATIO")!; // bar 30: volume 5000, tape 300 / 900 → |−600| / 5000
    expect(r.value).toMatch(/^0\.12 · \|−600\| of 5,000 traded/);
    expect(r.value).toMatch(/signed evidence saw 24% of this bar's volume/);
    expect(r.klass).toBe("PARTIAL");
    const full = row("DELTA_RATIO", { tapeTotals: { buy: 1000, sell: 4000 } })!;
    expect(full.klass).toBe("FULL");
    expect(full.value).toMatch(/^0\.60 /);
    expect(row("DELTA_RATIO", { tapeTotals: null, providerSides: { buy: 4000, sell: 1000 } })!.klass).toBe("PARTIAL");
  });
  it("no signed evidence, spot FX or a forming bar → no ratio and no failed-aggression verdict (silence, never guessed)", () => {
    for (const o of [{ tapeTotals: null }, { noCentralVolume: true }, { forming: true }, { keelOn: false }]) {
      expect(row("DELTA_RATIO", o)).toBeUndefined();
      expect(row("FAILED_AGGRESSION", o)).toBeUndefined();
    }
  });
  it("failed aggression is the keel's own verdict: a strong winner the bar did not follow", () => {
    // Bar 30 closes +1.5 from open (30 % 3 === 0). Buyers 0.8 of sided volume, bar went their way → not failed.
    expect(row("FAILED_AGGRESSION", { tapeTotals: { buy: 4500, sell: 500 } })!.value).toMatch(/^No — buyers won/);
    // Sellers 0.8 of sided volume, bar closed UP → failed.
    const f = row("FAILED_AGGRESSION", { tapeTotals: { buy: 500, sell: 4500 } })!;
    expect(f.value).toMatch(/^YES — sellers won 0\.80/);
    expect(f.klass).toBe("FULL");
    expect(row("FAILED_AGGRESSION", { tapeTotals: { buy: 1010, sell: 1000 } })!.value).toMatch(/^No — no side won/);
  });
});
