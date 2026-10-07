import { describe, expect, it } from "vitest";
import { buildLivingProfileSnapshot, MIN_TRADES_FOR_TAPE_PROFILE, selectLivingProfileDevelopment } from "./selectLivingProfile";

const BAR = 300;
const T0 = 1_791_300_000;
const bars = Array.from({ length: 20 }, (_, i) => {
  const mid = 100 + i * 0.5;
  return { time: T0 + i * BAR, open: mid - 0.2, high: mid + 1, low: mid - 1, close: mid + 0.2, volume: 1000 + i * 10 };
});
/** 30 timed prints per bar from bar 10 on → the tape threshold is crossed mid-series. */
const prints = Array.from({ length: 10 * 30 }, (_, j) => {
  const b = 10 + Math.floor(j / 30);
  return { price: 100 + b * 0.5 + ((j % 5) - 2) * 0.1, size: 1 + (j % 3), side: (j % 2 ? "buy" : "sell") as "buy" | "sell", trade: true, time: (T0 + b * BAR) * 1000 + (j % 30) * 1000 };
});
const NOW = (T0 + 19 * BAR + 120) * 1000; // bar 19 is forming

describe("Garden 19 §8 — the Living Profile as it stood at each bar's close", () => {
  const dev = selectLivingProfileDevelopment({ prints, bars, barSec: BAR, now: NOW });

  it("one point per bar; the last is the forming bar", () => {
    expect(dev).toHaveLength(bars.length);
    expect(dev[dev.length - 1].forming).toBe(true);
    expect(dev.slice(0, -1).every(p => !p.forming)).toBe(true);
  });

  it("THE LAST POINT EQUALS THE LIVE SNAPSHOT (same prints, same bars, same engine)", () => {
    const live = buildLivingProfileSnapshot(prints, bars);
    const last = dev[dev.length - 1];
    expect(last.poc).toBe(live.poc);
    expect(last.vah).toBe(live.vah);
    expect(last.val).toBe(live.val);
    expect(last.basis).toBe(live.quality === "trade-based" ? "TAPE" : "ESTIMATED");
  });

  it("no lookahead: point k equals a snapshot of bars ≤ k and prints before its close", () => {
    for (const k of [0, 5, 12, 17]) {
      const close = (bars[k].time + BAR) * 1000;
      const snap = buildLivingProfileSnapshot(prints.filter(p => p.time < close), bars.slice(0, k + 1));
      expect(dev[k].poc, `bar ${k}`).toBe(snap.poc);
      expect(dev[k].vah).toBe(snap.vah);
    }
  });

  it("the basis switches ESTIMATED → TAPE when the tape threshold is crossed", () => {
    const firstTape = dev.findIndex(p => p.basis === "TAPE");
    expect(firstTape).toBeGreaterThan(0);
    expect(dev.slice(0, firstTape).every(p => p.basis === "ESTIMATED")).toBe(true);
    // crossed at the bar whose close holds ≥ MIN_TRADES_FOR_TAPE_PROFILE prints
    expect((firstTape - 10 + 1) * 30).toBeGreaterThanOrEqual(MIN_TRADES_FOR_TAPE_PROFILE);
  });

  it("memo: finished points are reused from `previous` (not recomputed, not repainted)", () => {
    const evicted = prints.slice(150); // the ring dropped the oldest prints
    const next = selectLivingProfileDevelopment({ prints: evicted, bars, barSec: BAR, now: NOW, previous: dev });
    for (let k = 0; k < bars.length - 1; k++) expect(next[k]).toBe(dev[k]);
  });

  it("no prints → every point ESTIMATED from bars", () => {
    const est = selectLivingProfileDevelopment({ prints: null, bars, barSec: BAR, now: NOW });
    expect(est.every(p => p.basis === "ESTIMATED" && p.poc != null)).toBe(true);
  });
});
