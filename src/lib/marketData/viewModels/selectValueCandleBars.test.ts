/**
 * THE VALUE CANDLE, BAR BY BAR — and the glass plan that places it (UI-02).
 *
 * The per-bar split must be the SAME engine over exactly each bar's prints,
 * in the chart's own slot rule, and must refuse rather than guess: no bar
 * size, or an undated print, means no per-bar candles. The plan must never
 * invent a per-bar value, and its words are Inspect words.
 */

import { describe, expect, it } from "vitest";

import { selectValueCandle, selectValueCandleBars, type ValueCandleDatedTick } from "./selectValueCandle";
import { selectValueCandleGlassPlan } from "./selectValueCandleGlass";

const MIN = 60;
/** A print at `sec` seconds past a 1m-aligned epoch. */
const T0 = 1_790_000_040; // divisible by 60
const p = (sec: number, price: number, size = 1): ValueCandleDatedTick => ({
  time: (T0 + sec) * 1000,
  price,
  size,
});

describe("selectValueCandleBars — the same engine, per bar", () => {
  it("splits the tape into the chart's slots and runs selectValueCandle on each", () => {
    const tape = [p(1, 100, 2), p(20, 101, 1), p(59, 102, 1), p(61, 110, 3), p(90, 111, 1)];
    const vm = selectValueCandleBars(tape, MIN);
    expect(vm.reason).toBe("PER_BAR");
    expect(vm.bars.map(b => b.time)).toEqual([T0, T0 + MIN]);
    // Exactly the engine over exactly that bar's prints.
    expect(vm.bars[0]!.reading).toEqual(selectValueCandle(tape.slice(0, 3)));
    expect(vm.bars[1]!.reading).toEqual(selectValueCandle(tape.slice(3)));
    // Each bar's `last` is its own last print (its close so far).
    expect(vm.bars[0]!.reading.last).toBe(102);
    expect(vm.bars[1]!.reading.last).toBe(111);
    expect(vm.newestBarTime).toBe(T0 + MIN);
  });

  it("marks only the OLDEST bar partial — the tape began inside it", () => {
    const vm = selectValueCandleBars([p(5, 100), p(65, 101), p(125, 102)], MIN);
    expect(vm.bars.map(b => b.partial)).toEqual([true, false, false]);
  });

  it("refuses without a bar size", () => {
    const vm = selectValueCandleBars([p(1, 100)], null);
    expect(vm.reason).toBe("NO_INTERVAL");
    expect(vm.bars).toEqual([]);
  });

  it("refuses on ANY undated print, but still names the newest dated bar", () => {
    const vm = selectValueCandleBars([p(1, 100), { price: 101, size: 1 }, p(70, 102)], MIN);
    expect(vm.reason).toBe("UNDATED");
    expect(vm.bars).toEqual([]);
    expect(vm.newestBarTime).toBe(T0 + MIN);
  });

  it("an empty or sizeless tape is UNMEASURED, not a bar with a CoG of zero", () => {
    expect(selectValueCandleBars([], MIN).reason).toBe("UNMEASURED");
    expect(selectValueCandleBars(null, MIN).reason).toBe("UNMEASURED");
    const sizeless = selectValueCandleBars([{ time: T0 * 1000, price: 100, size: 0 }], MIN);
    expect(sizeless.reason).toBe("UNMEASURED");
    expect(sizeless.newestBarTime).toBeNull();
  });

  it("does not depend on tape order across slots", () => {
    const a = selectValueCandleBars([p(1, 100), p(61, 101)], MIN);
    const b = selectValueCandleBars([p(61, 101), p(1, 100)], MIN);
    expect(b.bars.map(x => x.time)).toEqual(a.bars.map(x => x.time));
  });
});

describe("selectValueCandleGlassPlan — which value candles to draw", () => {
  const tape = [p(1, 100, 5), p(10, 100.5, 5), p(30, 101, 1), p(61, 110, 3), p(70, 110.2, 3), p(119, 112, 1)];

  it("GLASS_PER_BAR: one value candle per measured bar, at its own prices", () => {
    const bars = selectValueCandleBars(tape, MIN);
    const plan = selectValueCandleGlassPlan(selectValueCandle(tape), bars, { priceDp: 2 });
    expect(plan.form).toBe("GLASS_PER_BAR");
    expect(plan.candles).toHaveLength(2);
    for (let i = 0; i < 2; i++) {
      const r = bars.bars[i]!.reading;
      const c = plan.candles[i]!;
      expect(c.time).toBe(bars.bars[i]!.time);
      expect(c.cog).toBe(r.centerOfGravity);
      expect(c.valueLow).toBe(Math.min(r.valueLow!, r.valueHigh!));
      expect(c.valueHigh).toBe(Math.max(r.valueLow!, r.valueHigh!));
    }
  });

  it("the caption leads with the CoG and says 'lagging price' only on LAGGED", () => {
    const plan = selectValueCandleGlassPlan(null, selectValueCandleBars(tape, MIN), { priceDp: 2 });
    for (const c of plan.candles) {
      expect(c.lines[0]).toMatch(/^VALUE CoG [\d,]+\.\d{2}/);
      expect(c.lines[0]!.includes("lagging price")).toBe(c.lagged);
      // Band coverage is the headline, never concentration.
      expect(c.lines[1]).toMatch(/^VALUE · BAND \d+% OF RANGE · \d+ PRINTS$/);
    }
    // The oldest bar says it was heard in part.
    expect(plan.candles[0]!.lines.some(l => l.includes("heard in part"))).toBe(true);
    expect(plan.candles[1]!.lines.some(l => l.includes("heard in part"))).toBe(false);
  });

  it("an ALIGNED bar is silent about migration, not reassured", () => {
    const flat = [p(1, 100, 1), p(2, 100.01, 1), p(3, 100, 1), p(4, 100.01, 1), p(5, 100.005, 1)];
    const plan = selectValueCandleGlassPlan(null, selectValueCandleBars(flat, MIN));
    const c = plan.candles[0]!;
    expect(c.lagged).toBe(false);
    expect(c.lines.join(" ")).not.toMatch(/lagging|agree|aligned|inside value/i);
  });

  it("GLASS_WINDOW: per-bar refused, the window reading placed at the newest dated bar", () => {
    const mixed = [p(1, 100, 2), { price: 101, size: 1 }, p(70, 102, 1)];
    const win = selectValueCandle(mixed);
    const plan = selectValueCandleGlassPlan(win, selectValueCandleBars(mixed, MIN));
    expect(plan.form).toBe("GLASS_WINDOW");
    expect(plan.candles).toHaveLength(1);
    expect(plan.candles[0]!.time).toBe(T0 + MIN);
    expect(plan.candles[0]!.cog).toBe(win.centerOfGravity);
    expect(plan.candles[0]!.high).toBe(win.high);
    expect(plan.candles[0]!.low).toBe(win.low);
    expect(plan.candles[0]!.lines.some(l => l.includes("not per bar"))).toBe(true);
  });

  it("NONE: nothing measured, or nothing that can be placed", () => {
    expect(selectValueCandleGlassPlan(null, null).form).toBe("NONE");
    const undatedOnly = [{ price: 100, size: 1 }];
    const plan = selectValueCandleGlassPlan(selectValueCandle(undatedOnly), selectValueCandleBars(undatedOnly, MIN));
    expect(plan.form).toBe("NONE");
    expect(plan.candles).toEqual([]);
  });
});
