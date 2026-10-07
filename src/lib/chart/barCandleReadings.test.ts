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
