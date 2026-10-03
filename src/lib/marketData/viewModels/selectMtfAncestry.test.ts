import { describe, expect, it } from "vitest";

import { clockBucketOf, sessionWindowFor } from "@/lib/marketData/sessionWindow";
import {
  MAX_BAND_LOOKBACK,
  NODE_SHOULDER,
  completeHtfBars,
  selectMtfAncestry,
  type MtfBar,
} from "./selectMtfAncestry";

// January 2026: New York is on EST (UTC−5), so ET hh:mm = UTC hh:mm − 5h.
const et = (day: number, hh: number, mm = 0) => Date.UTC(2026, 0, day, hh + 5, mm) / 1000;
const M15 = 900;

/** One RTH day of 15m bars, 09:30 … 15:45 ET (26 bars), price walking by `drift`. */
function rthDay(day: number, base: number, drift = 0.1, volume: number | null = 1000): MtfBar[] {
  const out: MtfBar[] = [];
  let p = base;
  for (let k = 0; k < 26; k++) {
    const t = et(day, 9, 30) + k * M15;
    const o = p, c = p + drift;
    out.push({ time: t, open: o, high: Math.max(o, c) + 0.05, low: Math.min(o, c) - 0.05, close: c, volume });
    p = c;
  }
  return out;
}

const TSLA = sessionWindowFor("TSLA", "15m", false);
const TSLA_ETH = sessionWindowFor("TSLA", "15m", true);
const BTC = sessionWindowFor("BTC-USD", "15m", false);

describe("clock buckets come from the one session owner", () => {
  it("1H / 4H are ET-clock aligned and cut to the session", () => {
    const a = clockBucketOf(et(13, 9, 30), TSLA, 240)!;
    const b = clockBucketOf(et(13, 11, 45), TSLA, 240)!;
    const c = clockBucketOf(et(13, 12, 0), TSLA, 240)!;
    expect(a.key).toBe(b.key);
    expect(c.key).not.toBe(a.key);
    expect(a.startSec).toBe(et(13, 8, 0));
    expect(a.endSec).toBe(et(13, 12, 0));
    expect(clockBucketOf(et(13, 9, 30), TSLA, 60)!.key).toBe(clockBucketOf(et(13, 9, 45), TSLA, 60)!.key);
    expect(clockBucketOf(et(13, 10, 0), TSLA, 60)!.key).not.toBe(clockBucketOf(et(13, 9, 45), TSLA, 60)!.key);
    // Outside the session: no bucket.
    expect(clockBucketOf(et(13, 8, 0), TSLA, 60)).toBeNull();
  });

  it("a Globex 16:00–20:00 bucket never spans the session break", () => {
    const es = sessionWindowFor("/ES", "15m", false);
    const k1 = clockBucketOf(et(13, 16, 0), es, 240)!;
    const k2 = clockBucketOf(et(13, 18, 0), es, 240)!;
    expect(k1.key).not.toBe(k2.key);
    expect(clockBucketOf(et(13, 17, 15), es, 240)).toBeNull();
  });
});

describe("only COMPLETE higher-timeframe bars count", () => {
  it("the forming bucket is never a bar", () => {
    const bars = [...rthDay(12, 100), ...rthDay(13, 103).slice(0, 5)]; // 13th: 09:30 … 10:30
    const hours = completeHtfBars(bars, "1H", TSLA, M15, 3);
    // 10:00–11:00 on the 13th is forming (10:00, 10:15, 10:30 only): not counted.
    expect(hours[0].firstTime).toBe(et(13, 9, 30));
    expect(hours[0].bars).toBe(2);
    const days = completeHtfBars(bars, "D", TSLA, M15, 3);
    expect(days.map(d => d.key)).toEqual(["2026-01-12"]);
  });

  it("the last bucket of a closed session counts once the clock has passed its final slot", () => {
    const bars = rthDay(12, 100);
    // No clock (replay): no later bar, so nothing closes the day or its last hour.
    expect(completeHtfBars(bars, "D", TSLA, M15, 1)).toHaveLength(0);
    expect(completeHtfBars(bars, "1H", TSLA, M15, 1)[0].firstTime).toBe(et(12, 14, 0));
    // Clock at 16:05: the 15:45 bar has closed and 16:00 is outside the session.
    const asOf = et(12, 16, 5);
    expect(completeHtfBars(bars, "D", TSLA, M15, 1, asOf)[0].key).toBe("2026-01-12");
    expect(completeHtfBars(bars, "1H", TSLA, M15, 1, asOf)[0].firstTime).toBe(et(12, 15, 0));
    // Clock at 15:50: the 15:45 bar is still forming.
    expect(completeHtfBars(bars, "1H", TSLA, M15, 1, et(12, 15, 50))[0].firstTime).toBe(et(12, 14, 0));
  });

  it("history that begins mid-bucket does not build that bucket", () => {
    const day = rthDay(12, 100);
    const truncated = [...day.slice(3), ...rthDay(13, 104).slice(0, 2)]; // starts 10:15
    const hours = completeHtfBars(truncated, "1H", TSLA, M15, 99);
    expect(hours.some(h => h.firstTime === et(12, 10, 15))).toBe(false);
    expect(hours[hours.length - 1].firstTime).toBe(et(12, 11, 0));
    // The 12th's day and its 08:00–12:00 4H began before the history did.
    expect(completeHtfBars(truncated, "D", TSLA, M15, 9)).toHaveLength(0);
    expect(completeHtfBars(truncated, "4H", TSLA, M15, 9).map(b => b.firstTime)).toEqual([et(12, 12, 0)]);
    // From the 09:30 open the 08:00–12:00 bucket IS whole (08:00–09:30 is no session).
    const whole = [...day, ...rthDay(13, 104).slice(0, 2)];
    expect(completeHtfBars(whole, "4H", TSLA, M15, 9).map(b => b.firstTime)).toEqual([et(12, 12, 0), et(12, 9, 30)]);
  });

  it("the session day follows the chart's own mode: pre-market is outside RTH, inside ETH", () => {
    const pre: MtfBar = { time: et(12, 8, 0), open: 100, high: 150, low: 99, close: 100, volume: 10 };
    const bars = [pre, ...rthDay(12, 100), ...rthDay(13, 103).slice(0, 2)];
    expect(completeHtfBars(bars, "D", TSLA, M15, 1)[0].high).toBeLessThan(150);
    // ETH: the 08:00 bar is the day's — but the history began inside that day.
    expect(completeHtfBars(bars, "D", TSLA_ETH, M15, 1)).toHaveLength(0);
    const eth = [{ ...pre, time: et(12, 4, 0) }, ...bars];
    // 04:00 is the ETH open; the slot before it is outside the session → the day is whole.
    expect(completeHtfBars(eth, "D", TSLA_ETH, M15, 1)[0].high).toBe(150);
  });

  it("crypto 24/7: the day is the UTC day, whole only from 00:00 UTC", () => {
    const mk = (from: number, n: number): MtfBar[] =>
      Array.from({ length: n }, (_, k) => ({ time: from + k * M15, open: 50, high: 51 + (k % 7), low: 49, close: 50, volume: 5 }));
    const utc = (day: number, hh: number, mm = 0) => Date.UTC(2026, 0, day, hh, mm) / 1000;
    const fromMidnight = mk(utc(12, 0, 0), 96 + 8); // the 12th whole (UTC), then 2h of the 13th
    expect(completeHtfBars(fromMidnight, "D", BTC, M15, 3).map(d => d.key)).toEqual(["2026-01-12"]);
    expect(completeHtfBars(fromMidnight, "D", BTC, M15, 1)[0].bars).toBe(96);
    const fromAfternoon = mk(utc(12, 13, 15), 60);
    expect(completeHtfBars(fromAfternoon, "D", BTC, M15, 3)).toHaveLength(0);
    // 4H is clock-aligned on the UTC day: 12:00–16:00 is truncated (history
    // began 13:15); 16:00–20:00, 20:00–24:00 and 00:00–04:00 are closed by the
    // 04:00 bar; 04:00–08:00 forms.
    expect(completeHtfBars(fromAfternoon, "4H", BTC, M15, 9).map(b => b.firstTime)).toEqual([utc(13, 0, 0), utc(12, 20, 0), utc(12, 16, 0)]);
  });
});

describe("the three ancestry elements", () => {
  it("D SHELF: the completed day's PDH / PDL, the nearer one is the shelf, with its side", () => {
    const bars = [...rthDay(12, 100, 0.1), ...rthDay(13, 99, 0.01).slice(0, 4)];
    const vm = selectMtfAncestry({ bars, window: TSLA, chartSec: M15, precision: 2 });
    expect(vm.shelf.kind).toBe("SHELF");
    if (vm.shelf.kind !== "SHELF") return;
    expect(vm.shelf.day).toBe("2026-01-12");
    expect(vm.shelf.pdl).toBeCloseTo(99.95, 6);
    expect(vm.shelf.pdh).toBeCloseTo(102.65, 6);
    expect(vm.shelf.level).toBe("PDL");
    expect(vm.shelf.side).toBe("BELOW");
  });

  it("4H BAND: the newest completed 4H body price is inside; else the nearest; which bar is stated", () => {
    const d12 = rthDay(12, 100, 0.1); // 09:30–12:00 body 100→101, 12:00–16:00 body 101→102.6
    const inside = [...d12, { time: et(13, 9, 30), open: 100.5, high: 100.6, low: 100.4, close: 100.5, volume: 1 }];
    const a = selectMtfAncestry({ bars: inside, window: TSLA, chartSec: M15, precision: 2 });
    expect(a.band).toMatchObject({ kind: "BAND", relation: "INSIDE", firstTime: et(12, 9, 30), age: 1 });
    const above = [...d12, { time: et(13, 9, 30), open: 104, high: 104.1, low: 103.9, close: 104, volume: 1 }];
    const b = selectMtfAncestry({ bars: above, window: TSLA, chartSec: M15, precision: 2 });
    expect(b.band).toMatchObject({ kind: "BAND", relation: "NEAREST", firstTime: et(12, 12, 0), age: 0 });
    if (b.band.kind === "BAND") expect(b.band.distance).toBeCloseTo(104 - 102.6, 6);
    expect(MAX_BAND_LOOKBACK).toBeGreaterThanOrEqual(2);
  });

  it("1H NODE: the highest-volume row of the last completed hour, at the chart's price step", () => {
    const d12 = rthDay(12, 100, 0.1);
    // The 15:00 hour: four bars; the heavy one sits at 102.00–102.10.
    const h = d12.filter(b => b.time >= et(12, 15, 0));
    const bars = d12.map(b => (b.time === h[0].time ? { ...b, open: 102, close: 102.1, high: 102.1, low: 102, volume: 50_000 } : b));
    const vm = selectMtfAncestry({ bars, window: TSLA, chartSec: M15, precision: 2, asOfSec: et(12, 16, 1) });
    expect(vm.node.kind).toBe("NODE");
    if (vm.node.kind !== "NODE") return;
    expect(vm.node.firstTime).toBe(et(12, 15, 0));
    expect(vm.node.bin).toBe(0.01);
    expect(vm.node.price).toBeGreaterThanOrEqual(102);
    expect(vm.node.price).toBeLessThanOrEqual(102.1);
    expect(vm.node.low).toBeGreaterThanOrEqual(101.99);
    expect(vm.node.high).toBeLessThanOrEqual(102.11);
    expect(vm.node.share).toBeGreaterThan(0.8);
    expect(NODE_SHOULDER).toBeGreaterThan(0.5);
  });

  it("1H NODE without volume is a named silence, never a guess", () => {
    const bars = [...rthDay(12, 100, 0.1, null), ...rthDay(13, 103, 0.1, 0).slice(0, 3)];
    const vm = selectMtfAncestry({ bars, window: TSLA, chartSec: M15, precision: 2 });
    expect(vm.node).toEqual({ kind: "SILENT", tf: "1H", reason: "NO_VOLUME" });
    // The shelf and band do not need volume.
    expect(vm.shelf.kind).toBe("SHELF");
    expect(vm.band.kind).toBe("BAND");
  });

  it("history too short for a complete HTF bar names the silence per element", () => {
    const bars = rthDay(13, 100).slice(0, 3); // 09:30 … 10:00 of the 13th, no clock
    const vm = selectMtfAncestry({ bars, window: TSLA, chartSec: M15, precision: 2 });
    expect(vm.shelf).toEqual({ kind: "SILENT", tf: "D", reason: "NO_COMPLETE_BAR" });
    expect(vm.band).toEqual({ kind: "SILENT", tf: "4H", reason: "NO_COMPLETE_BAR" });
    expect(vm.node.kind).toBe("NODE"); // 09:30–10:00 is whole: the 10:00 bar closed it
    expect(vm.receipt).toMatch(/^SHELF:D:SILENT:NO_COMPLETE_BAR\|BAND:4H:SILENT:NO_COMPLETE_BAR\|NODE:1H:@/);
  });

  it("only timeframes strictly above the chart's", () => {
    const bars = [...rthDay(12, 100), ...rthDay(13, 103).slice(0, 8)];
    const h1 = selectMtfAncestry({ bars, window: sessionWindowFor("TSLA", "1h", false), chartSec: 3600, precision: 2 });
    expect(h1.node).toEqual({ kind: "SILENT", tf: "1H", reason: "CHART_TF_NOT_BELOW" });
    expect(h1.shelf.kind).toBe("SHELF");
    const h4 = selectMtfAncestry({ bars, window: sessionWindowFor("TSLA", "4h", false), chartSec: 14400, precision: 2 });
    expect(h4.band).toEqual({ kind: "SILENT", tf: "4H", reason: "CHART_TF_NOT_BELOW" });
    expect(h4.node.kind).toBe("SILENT");
    expect(h4.shelf.kind).toBe("SHELF");
    const d = selectMtfAncestry({ bars, window: sessionWindowFor("TSLA", "1D", false), chartSec: 86400, precision: 2 });
    for (const e of [d.shelf, d.band, d.node]) expect(e).toMatchObject({ kind: "SILENT", reason: "CHART_TF_NOT_BELOW" });
  });

  it("no bars, or no bar in any session, are their own silences", () => {
    const none = selectMtfAncestry({ bars: [], window: TSLA, chartSec: M15, precision: 2 });
    expect(none.price).toBeNull();
    expect(none.receipt).toBe("SHELF:D:SILENT:NO_BARS|BAND:4H:SILENT:NO_BARS|NODE:1H:SILENT:NO_BARS");
    const night: MtfBar[] = [0, 1, 2].map(k => ({ time: et(12, 20, 0) + k * M15, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
    const vm = selectMtfAncestry({ bars: night, window: TSLA, chartSec: M15, precision: 2 });
    expect(vm.shelf).toEqual({ kind: "SILENT", tf: "D", reason: "NO_SESSION" });
  });

  it("the receipt names each element at the market's precision", () => {
    const bars = [...rthDay(12, 100, 0.1), ...rthDay(13, 99, 0.01).slice(0, 4)];
    const vm = selectMtfAncestry({ bars, window: TSLA, chartSec: M15, precision: 2 });
    expect(vm.receipt).toMatch(/^SHELF:D:PDL@99\.95\|BAND:4H:@\d+:(INSIDE|NEAREST)\|NODE:1H:@\d+\.\d{2}$/);
  });

  it("is pure: the memo changes nothing but the work", () => {
    const bars = [...rthDay(12, 100, 0.1), ...rthDay(13, 99, 0.01).slice(0, 9)];
    const memo = new Map<string, string | null>();
    const a = selectMtfAncestry({ bars, window: TSLA, chartSec: M15, precision: 2, memo });
    const b = selectMtfAncestry({ bars, window: TSLA, chartSec: M15, precision: 2, memo });
    const c = selectMtfAncestry({ bars, window: TSLA, chartSec: M15, precision: 2 });
    expect(b).toEqual(a);
    expect(c).toEqual(a);
    expect(memo.size).toBeGreaterThan(0);
  });
});
