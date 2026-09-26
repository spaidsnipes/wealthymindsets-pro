import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { retainRecentTicks, type Tick } from "@/hooks/useWebSocket";
import { stripComments } from "@/lib/sourceScan";

import type { AggressorTick } from "./selectAggressorFlow";
import { chronologicalTape, compileOrderFlowReadings } from "./useOrderFlowReadings";
import { selectDeltaDivergence } from "./viewModels/selectDeltaDivergence";
import { selectStackedImbalance } from "./viewModels/selectStackedImbalance";

const prints = Array.from({ length: 120 }, (_, index): AggressorTick => ({
  price: 100 + index / 100,
  size: index < 60 ? 400 : 40,
  side: index % 2 === 0 ? "buy" : "sell",
  trade: true,
  marketEvent: { aggressorMethod: "NONE" },
}));

describe("compileOrderFlowReadings — raw prints are not erased with missing side", () => {
  it("measures Liquidity Weather while side-dependent readings remain gated", () => {
    const readings = compileOrderFlowReadings(prints, null);

    expect(readings.realTape).toBe(false);
    expect(readings.printsPresent).toBe(true);
    expect(readings.liquidityWeather.stage).not.toBe("UNMEASURED");
    expect(readings.valueCandle.measured).toBe(false);
    expect(readings.deltaDivergence.verdict).toBe("UNMEASURED");
    expect(readings.stackedImbalance.verdict).toBe("UNMEASURED");
  });

  it("still reports Liquidity Weather unmeasured when no prints exist", () => {
    const empty = compileOrderFlowReadings([], null);
    expect(empty.printsPresent).toBe(false);
    expect(empty.liquidityWeather.stage).toBe("UNMEASURED");
  });

  it("does not mistake quote transport events for prints", () => {
    const quotes = prints.map(tick => ({ ...tick, trade: false }));
    const readings = compileOrderFlowReadings(quotes, null);
    expect(readings.printsPresent).toBe(false);
    expect(readings.liquidityWeather.stage).toBe("UNMEASURED");
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   THE TAPE IS READ IN THE ORDER IT HAPPENED.

   Every fixture below is written CHRONOLOGICALLY — the way the selectors'
   own suites write theirs, and the way those selectors read — and then handed
   to the compilation the way production hands it: replayed through the
   stream's own `retainRecentTicks`, a few prints per flush. That is the step
   the selectors' suites never took, which is how a time-reversed stack edge
   and a swapped divergence reached the glass with every one of those suites
   green.
   ══════════════════════════════════════════════════════════════════════════ */

type Undated = Omit<Tick, "time">;

const T0 = 1_700_000_000_000;

/** One print per millisecond, in the order given. */
function dated(tape: readonly Undated[], perMs = 1): Tick[] {
  return tape.map((p, i) => ({ ...p, time: T0 + Math.floor(i / perMs) }));
}

/**
 * The stream's retention, replayed: `flush` prints arrive per RAF flush, and
 * each flush is handed to the real `retainRecentTicks`. What comes back is
 * exactly the array the chart room holds — newest flush first, each flush in
 * arrival order.
 */
function held(chronological: readonly Tick[], flush: number): Tick[] {
  let tape: Tick[] = [];
  for (let i = 0; i < chronological.length; i += flush) {
    tape = retainRecentTicks(chronological.slice(i, i + flush), tape);
  }
  return tape;
}

/**
 * Prints per flush. Divides neither fixture's length (70 and 180), so every
 * replay ends on a partial flush and no fixture lines up with a flush boundary
 * by luck.
 */
const FLUSH = 11;

/** A source whose aggressor tape the registry has reviewed, so the side gate opens. */
const SIDED_SOURCE = "coinbase";

function level(price: number, side: "buy" | "sell", size: number, count: number): Undated[] {
  return Array.from({ length: count }, () => ({ price, size, side, trade: true }));
}

function px(base: number, tick: number, k: number): number {
  return Number((base + k * tick).toPrecision(12));
}

/**
 * The formation shape from `selectStackedImbalance.test.ts`: heavy one-way
 * buying stacked on offsets 3–5 with nothing meaningful opposing it on the
 * diagonal, over ordinary two-sided trade on 0–2.
 */
function formation(base: number, tick: number): Undated[] {
  const p = (k: number) => px(base, tick, k);
  return [
    ...level(p(0), "buy", 25, 2),
    ...level(p(0), "sell", 25, 2),
    ...level(p(1), "buy", 25, 2),
    ...level(p(1), "sell", 25, 2),
    ...level(p(2), "buy", 30, 2),
    ...level(p(2), "sell", 50, 4),
    ...level(p(3), "buy", 150, 6),
    ...level(p(3), "sell", 25, 4),
    ...level(p(4), "buy", 150, 6),
    ...level(p(4), "sell", 25, 4),
    ...level(p(5), "buy", 150, 6),
    ...level(p(5), "sell", 25, 2),
  ];
}

/** Exactly the response the declared 60/40 split puts after a formation of `n`. */
function respond(n: number, base: number, tick: number, path: readonly number[]): Undated[] {
  return Array.from({ length: Math.round((n * 2) / 3) }, (_, i) => ({
    price: px(base, tick, path[i % path.length]),
    size: 40,
    side: (i % 2 === 0 ? "buy" : "sell") as "buy" | "sell",
    trade: true,
  }));
}

function stackTape(path: readonly number[]): Tick[] {
  const f = formation(100, 0.01);
  return dated([...f, ...respond(f.length, 100, 0.01, path)]);
}

/** Response shapes, in offsets from the base. The stack sits at offsets 3–5. */
const CAME_BACK_AND_HELD = [4, 3, 6, 7];
const TORE_THROUGH = [4, 2, -1, 0];

/**
 * The leg-walker from `selectDeltaDivergence.test.ts`, deterministic, with the
 * same 37× stride so each leg really carries the buy share it names.
 */
function legs(spec: ReadonlyArray<{ to: number; prints: number; buyShare: number }>): Undated[] {
  const out: Undated[] = [];
  let price = 100;
  for (const leg of spec) {
    const step = (leg.to - price) / leg.prints;
    for (let i = 0; i < leg.prints; i++) {
      price += step;
      const buy = ((i * 37) % 100) / 100 < leg.buyShare;
      out.push({ price: Number(price.toFixed(4)), size: 10, side: buy ? "buy" : "sell", trade: true });
    }
  }
  return out;
}

/** A higher high the buyers did not pay for — then a turn, so it is a pivot. */
const BEAR_LEGS = [
  { to: 104, prints: 45, buyShare: 0.9 },
  { to: 101, prints: 45, buyShare: 0.1 },
  { to: 106, prints: 45, buyShare: 0.52 },
  { to: 104.5, prints: 45, buyShare: 0.2 },
];

describe("chronologicalTape — the stream's held tape, put back in time order", () => {
  it("recovers arrival order from the tape the stream actually holds", () => {
    const chronological = dated(legs(BEAR_LEGS));
    const tape = held(chronological, FLUSH);

    // The fixture has to reproduce the real shape or this proves nothing: the
    // held tape is NEITHER time order NOR its simple reverse. Each flush is
    // prepended in arrival order, so a reversal would turn every flush inside
    // out — which is why the rule sorts rather than reverses.
    expect(tape).not.toEqual(chronological);
    expect([...tape].reverse()).not.toEqual(chronological);

    expect(chronologicalTape(tape)).toEqual(chronological);
  });

  it("keeps prints that share a millisecond in the order they arrived", () => {
    // Three prints per millisecond at three different prices, flushed six at a
    // time — the common case, where one socket message carries a burst. The
    // sort is stable, so the burst stays in the order it arrived in.
    const burst = Array.from({ length: 60 }, (_, i): Undated => ({
      price: 100 + i / 100,
      size: 1,
      side: i % 2 === 0 ? "buy" : "sell",
      trade: true,
    }));
    const chronological = dated(burst, 3);
    expect(chronological[0].time).toBe(chronological[2].time);

    expect(chronologicalTape(held(chronological, 6)).map(p => p.price)).toEqual(
      chronological.map(p => p.price),
    );
  });

  it("falls back to the retention contract when any print is undated", () => {
    // One print without a usable time. Sorting around it would put it wherever
    // the comparator's NaN happened to drop it, so nothing is sorted and the
    // newest-first contract is reversed instead. Flushed one print at a time,
    // the held tape is strictly newest-first, and reversing it is exact.
    const chronological = dated(legs(BEAR_LEGS));
    chronological[50] = { ...chronological[50], time: Number.NaN };
    const tape = held(chronological, 1);

    expect(chronologicalTape(tape)).toEqual(chronological);
  });

  it("returns a new array and leaves the stream's array alone", () => {
    // The stream's consumers memoise on this array's identity.
    const tape = held(dated(legs(BEAR_LEGS)), FLUSH);
    const before = [...tape];
    const ordered = chronologicalTape(tape);
    expect(ordered).not.toBe(tape);
    expect(tape).toEqual(before);
  });

  it("invents nothing from an absent or empty tape", () => {
    expect(chronologicalTape(null)).toBeNull();
    expect(chronologicalTape(undefined)).toBeNull();
    expect(chronologicalTape([])).toEqual([]);
  });
});

describe("compileOrderFlowReadings — order-sensitive readings read the tape forward", () => {
  it.each([
    ["DEFENDED", CAME_BACK_AND_HELD],
    ["BROKEN", TORE_THROUGH],
  ] as const)("grades a %s stack from the prints that built it, not the ones that tested it", (verdict, path) => {
    const chronological = stackTape(path);
    const expected = selectStackedImbalance(chronological);
    expect(expected.verdict, "the fixture must reach the verdict it is named for").toBe(verdict);

    const tape = held(chronological, FLUSH);
    // Read raw, the held tape is a DIFFERENT reading — the defect this closes.
    // If this ever stops being true the fixture no longer discriminates, and
    // the equality below would pass with the compile boundary doing nothing.
    expect(selectStackedImbalance(tape)).not.toEqual(expected);

    const readings = compileOrderFlowReadings(tape, SIDED_SOURCE);
    expect(readings.realTape).toBe(true);
    expect(readings.stackedImbalance.verdict).toBe(expected.verdict);
    expect(readings.stackedImbalance).toEqual(expected);
  });

  it("compares the newer delta-divergence pivot against the older one", () => {
    const chronological = dated(legs(BEAR_LEGS));
    const expected = selectDeltaDivergence(chronological);
    expect(expected.verdict).toBe("BEARISH");

    const tape = held(chronological, FLUSH);
    expect(selectDeltaDivergence(tape)).not.toEqual(expected);

    const divergence = compileOrderFlowReadings(tape, SIDED_SOURCE).deltaDivergence;
    expect(divergence).toEqual(expected);
    expect(divergence.verdict).toBe("BEARISH");
    // The recent pivot is the SECOND push, to 106, printed on the third leg;
    // the prior is the first push, to 104. Read backwards they swap, and the
    // "higher high" becomes a lower one.
    expect(divergence.recentPivot!.price).toBeCloseTo(106, 6);
    expect(divergence.priorPivot!.price).toBeCloseTo(104, 6);
    expect(divergence.recentPivot!.segment).toBeGreaterThan(divergence.priorPivot!.segment);
  });

  it("puts the value candle's last print on the newest print held", () => {
    const chronological = dated(legs(BEAR_LEGS));
    const readings = compileOrderFlowReadings(held(chronological, FLUSH), SIDED_SOURCE);
    expect(readings.valueCandle.measured).toBe(true);
    expect(readings.valueCandle.last).toBeCloseTo(chronological.at(-1)!.price, 6);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   SOURCE SENTINELS — the ordering has ONE owner, and every reader goes
   through it. Behaviour above proves the compilation; these catch the next
   reader added beside it that takes the stream's array raw.
   ══════════════════════════════════════════════════════════════════════════ */

describe("the tape's time order has one owner", () => {
  const read = (rel: string) => stripComments(readFileSync(resolve(__dirname, rel), "utf8"));

  it("compileOrderFlowReadings hands no selector the stream's raw array", () => {
    const src = read("./useOrderFlowReadings.ts");
    const start = src.indexOf("export function compileOrderFlowReadings(");
    const end = src.indexOf("export function useOrderFlowReadings(");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = src.slice(start, end);

    // Positive control: the scan is looking at the real compilation.
    expect(body.match(/\bselect[A-Z]\w*\(/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(body).toMatch(/chronologicalTape\(recentTicks\)/);

    // After the parameter and the one conversion, `recentTicks` is never read.
    const rest = body
      .replace(/recentTicks:\s*Ticks/, "")
      .replace(/chronologicalTape\(recentTicks\)/, "");
    expect(rest).not.toMatch(/\brecentTicks\b/);
  });

  it("the chart room hands the footprint worksheet the tape in time order", () => {
    const src = read("../../components/chart/ChartsDashboard.tsx");
    // Positive control: comments are gone, code is not.
    // 2026-09-26 · the room now also names its bar size (the Value Candle's
    // per-bar split, UI-02); the tape and its source are still the first two.
    expect(src).toContain("useOrderFlowReadings(recentTicks, tapeSource, valueCandleBarSec)");

    const calls = src.match(/selectFootprintWorksheet\(\s*\{[^}]*\}\s*\)/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call).toMatch(/prints:\s*chronologicalTape\(recentTicks\)/);
    }
  });
});
