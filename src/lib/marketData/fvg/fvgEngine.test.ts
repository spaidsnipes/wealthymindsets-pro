/**
 * FVG — ONE OBJECT. ONE DEFINITION. ONE HISTORY. Deterministic fixtures for
 * every rule published in fvgDefinition.ts.
 */

import { describe, expect, it } from "vitest";

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { atrSeries } from "@/lib/chart/marketBreathing";
import {
  FVG_DEFINITION_ID,
  FVG_DEFINITION_VERSION,
  FVG_IDLE_MEMORY_BARS,
  FVG_SCAR_MEMORY_BARS,
  fvgHorizonFor,
  fvgPipFor,
  fvgSize,
  mintFvgObjectId,
  testFvgGeometry,
} from "./fvgDefinition";
import {
  attachFvgSenseReference,
  createFvgEngine,
  detectFvgs,
  fvgMarketObject,
  fvgStateAsOf,
  selectFvgVisibility,
  type FvgEngineConfig,
  type FvgLedger,
} from "./fvgEngine";
import { describeFvgOutcomes, describeFvgOutcomesBy, FVG_STATS_LABEL } from "./fvgStats";

type Row = readonly [number, number, number, number];

const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 6, 10, 0, 0);
const SYM = "BTC-USD";
const CFG: FvgEngineConfig = { symbolId: SYM, timeframe: "1m", tickSize: 0.01 };

function series(rows: readonly Row[], t0 = T0, times?: readonly number[]): CanonicalBar[] {
  return rows.map(([o, h, l, c], i) => {
    const asOf = times ? times[i] : t0 + i * MIN;
    return {
      barId: `${SYM}|1m|${asOf}|e0`,
      symbolId: SYM,
      sessionId: "SESSION_CONTINUOUS",
      timeframe: "1m",
      open: o, high: h, low: l, close: c, volume: 1,
      asOf,
      receivedAt: asOf + MIN,
      fidelity: "INDICATIVE",
      source: "fixture",
      provenance: "REST_BACKFILL",
      truthEpoch: 0,
    };
  });
}

const FLAT: Row[] = Array.from({ length: 15 }, () => [100, 101, 99, 100] as Row);
/** b1, b2, b3 → bullish territory [101, 102], size 1. */
const BULL: Row[] = [[100, 101, 99, 100.5], [100.5, 104, 100.3, 103.8], [103.8, 105, 102, 104.5]];
/** b1, b2, b3 → bearish territory [98, 99], size 1. */
const BEAR: Row[] = [[100, 101, 99, 99.5], [99.5, 99.7, 96, 96.2], [96.2, 98, 95, 95.5]];
/** Parked well above the bullish gap; never makes a gap of its own. */
const AWAY: Row = [104.5, 105, 103.5, 104.5];
const BELOW: Row = [95.5, 96.5, 95, 95.5];

const B2 = FLAT.length + 1; // index of b2
const B3 = FLAT.length + 2; // index of b3
const run = (rows: readonly Row[], cfg = CFG) => detectFvgs(series(rows), cfg);
/** The fixture's gap (b3 at index B3). Later fixture bars may legitimately form gaps of their own. */
const only = (l: FvgLedger) => {
  const o = l.objects.find(x => x.createdBarIndex === B3);
  expect(o).toBeDefined();
  return o!;
};

describe("A · the published definition (FVG_3C v1)", () => {
  it("names itself and its version", () => {
    expect(FVG_DEFINITION_ID).toBe("FVG_3C");
    expect(FVG_DEFINITION_VERSION).toBe(1);
  });

  it("BULLISH: low(b3) > high(b1) → territory [high(b1), low(b3)], created at b3's CLOSE", () => {
    const bars = series([...FLAT, ...BULL]);
    const o = only(detectFvgs(bars, CFG));
    expect(o.direction).toBe("BULLISH");
    expect([o.bottom, o.top]).toEqual([101, 102]);
    expect(o.nearEdge).toBe(102);
    expect(o.farEdge).toBe(101);
    expect(o.createdAt).toBe(bars[B3].asOf + MIN);
    expect(o.createdBarIndex).toBe(B3);
    expect(o.state).toBe("BORN");
    expect(o.definitionId).toBe("FVG_3C");
    expect(o.definitionVersion).toBe(1);
    expect(o.bars.b2.barId).toBe(bars[B2].barId);
    expect(o.size.price).toBe(1);
    expect(o.size.ticks).toBe(100);
    expect(o.minimum.basis).toBe("ATR");
  });

  it("BEARISH: high(b3) < low(b1) → territory [high(b3), low(b1)]", () => {
    const o = only(run([...FLAT, ...BEAR]));
    expect(o.direction).toBe("BEARISH");
    expect([o.bottom, o.top]).toEqual([98, 99]);
    expect(o.nearEdge).toBe(98);
    expect(o.farEdge).toBe(99);
  });

  it("wicks, not bodies: bodies that overlap with wicks that do not still form a gap; wicks that overlap do not", () => {
    expect(testFvgGeometry({ open: 100, high: 101, low: 99, close: 100.9 }, { open: 101, high: 104, low: 100.5, close: 103.9 }, { open: 100.95, high: 105, low: 101.2, close: 104 }, 1, 0.01).ok).toBe(true);
    expect(testFvgGeometry({ open: 100, high: 101.5, low: 99, close: 100.5 }, { open: 100.5, high: 104, low: 100.3, close: 103.8 }, { open: 103.8, high: 105, low: 101.4, close: 104.5 }, 1, 0.01)).toEqual({ ok: false, reason: "NO_GAP" });
  });

  it("b2's body must point the gap's direction (a doji or counter body is not an FVG)", () => {
    const counter = [BULL[0], [103.8, 104, 100.3, 100.6] as Row, BULL[2]];
    expect(run([...FLAT, ...counter]).objects).toHaveLength(0);
    const doji = [BULL[0], [102, 104, 100.3, 102] as Row, BULL[2]];
    expect(run([...FLAT, ...doji]).objects).toHaveLength(0);
  });

  it("records displacement as CONTEXT (body/range, range vs ATR) — no grade", () => {
    const o = only(run([...FLAT, ...BULL]));
    const atr = (2 * 13 + 3.7) / 14;
    expect(o.displacement.atr).toBeCloseTo(atr, 12);
    expect(o.displacement.bodyRatio).toBeCloseTo(3.3 / 3.7, 12);
    expect(o.displacement.rangeAtr).toBeCloseTo(3.7 / atr, 12);
    expect(Object.keys(o).join(" ")).not.toMatch(/strength|score|probab|chance|fill/i);
  });

  it("minimum size boundary: max(1 tick, 0.10 × ATR) inclusive", () => {
    const b1 = { open: 100, high: 101, low: 99, close: 100.5 };
    const b2 = { open: 100.5, high: 104, low: 100.3, close: 103.8 };
    // ATR term binds: ATR 10 → minimum 1.0
    expect(testFvgGeometry(b1, b2, { open: 103, high: 105, low: 102, close: 104 }, 10, 0.01)).toMatchObject({ ok: true, minimum: { price: 1, basis: "ATR" } });
    expect(testFvgGeometry(b1, b2, { open: 103, high: 105, low: 101.999, close: 104 }, 10, 0.01)).toEqual({ ok: false, reason: "BELOW_MINIMUM" });
    // Float-noise at the boundary does not move the line: 0.1 × 3 = 0.30000000000000004
    expect(testFvgGeometry(b1, b2, { open: 103, high: 105, low: 101.3, close: 104 }, 3, 0.01).ok).toBe(true);
    // Tick term binds: tick 1 → minimum 1 even with tiny ATR
    expect(testFvgGeometry(b1, b2, { open: 103, high: 105, low: 102, close: 104 }, 0.5, 1)).toMatchObject({ ok: true, minimum: { price: 1, basis: "TICK" } });
    expect(testFvgGeometry(b1, b2, { open: 103, high: 105, low: 101.99, close: 104 }, 0.5, 1)).toEqual({ ok: false, reason: "BELOW_MINIMUM" });
    // On the engine: tick 1 admits a size-1 gap; tick 1.01 refuses it.
    expect(run([...FLAT, ...BULL], { ...CFG, tickSize: 1 }).objects).toHaveLength(1);
    expect(run([...FLAT, ...BULL], { ...CFG, tickSize: 1.01 }).objects).toHaveLength(0);
  });

  it("no ATR(14) at b2 → nothing detected; the warm-up is counted, not guessed through", () => {
    const l = run([...FLAT.slice(0, 5), ...BULL]);
    expect(l.objects).toHaveLength(0);
    expect(l.warmupTriples).toBeGreaterThan(0);
  });

  it("sizes in ticks / points / pips per asset class", () => {
    expect(fvgSize("NQ1!", 2.5, 0.25, 10)).toMatchObject({ unit: "TICKS", ticks: 10, points: 2.5 });
    expect(fvgSize("EUR/USD", 0.0012, null, 0.004)).toMatchObject({ unit: "PIPS", pip: 0.0001, ticks: null });
    expect(fvgSize("EUR/USD", 0.0012, null, 0.004).pips).toBeCloseTo(12, 6);
    expect(fvgPipFor("USD/JPY")).toBe(0.01);
    expect(fvgSize("TSLA", 1.5, 0.01, 3)).toMatchObject({ unit: "POINTS", ticks: 150 });
    expect(fvgSize(SYM, 12, null, 40)).toMatchObject({ unit: "POINTS", ticks: null, pips: null });
  });
});

describe("B · one detector, one identity", () => {
  it("OBJECT_ID = FVG|<instrument>|<tf>|<b2 open time>|<direction>|v1, minted once", () => {
    const bars = series([...FLAT, ...BULL]);
    const o = only(detectFvgs(bars, CFG));
    expect(o.objectId).toBe(`FVG|${SYM}|1m|${bars[B2].asOf}|BULLISH|v1`);
    expect(o.objectId).toBe(mintFvgObjectId({ symbolId: SYM, timeframe: "1m", b2AsOf: bars[B2].asOf, direction: "BULLISH" }));
    expect(mintFvgObjectId({ symbolId: " ", timeframe: "1m", b2AsOf: 1, direction: "BULLISH" })).toBeNull();
    expect(mintFvgObjectId({ symbolId: SYM, timeframe: "1m", b2AsOf: Number.NaN, direction: "BEARISH" })).toBeNull();
  });

  it("the ATR stepper equals the Wilder owner (marketBreathing.atrSeries) bar for bar", () => {
    const rows: Row[] = [...FLAT, ...BULL, [104, 104.2, 101.5, 101.8], [101.8, 103, 100.2, 102.9], AWAY, AWAY];
    const bars = series(rows);
    const l = detectFvgs(bars, CFG);
    const owner = atrSeries(bars);
    l.atrs.forEach((a, i) => (owner[i] == null ? expect(a).toBeNull() : expect(a).toBeCloseTo(owner[i] as number, 12)));
  });

  it("refuses foreign, malformed, out-of-order and corrected bars; a redelivered bar is a no-op", () => {
    const bars = series([...FLAT, ...BULL]);
    const e = createFvgEngine(CFG);
    for (const b of bars) expect(e.push(b).ok).toBe(true);
    expect(e.push(bars[bars.length - 1])).toEqual({ ok: true, duplicate: true, born: [] });
    expect(e.push({ ...bars[0], symbolId: "ETH-USD" })).toEqual({ ok: false, reason: "FOREIGN_INSTRUMENT" });
    expect(e.push({ ...bars[0], timeframe: "5m" })).toEqual({ ok: false, reason: "FOREIGN_TIMEFRAME" });
    expect(e.push({ ...bars[0], asOf: bars[bars.length - 1].asOf + MIN, high: 1, low: 2 })).toEqual({ ok: false, reason: "MALFORMED" });
    expect(e.push(bars[3])).toEqual({ ok: false, reason: "OUT_OF_ORDER" });
    expect(e.push({ ...bars[bars.length - 1], barId: "corrected|e1" })).toEqual({ ok: false, reason: "REWIND_REQUIRED" });
    expect(e.snapshot().refusals.map(r => r.reason)).toEqual(["FOREIGN_INSTRUMENT", "FOREIGN_TIMEFRAME", "MALFORMED", "OUT_OF_ORDER", "REWIND_REQUIRED"]);
    expect(e.snapshot().objects).toHaveLength(1);
  });

  it("a timeframe with no registry clock refuses every bar NO_CLOCK unless the caller supplies close times", () => {
    const bars = series([...FLAT, ...BULL]).map(b => ({ ...b, timeframe: "100T" }));
    const l = detectFvgs(bars, { ...CFG, timeframe: "100T" });
    expect(l.barCount).toBe(0);
    expect(l.refusals.every(r => r.reason === "NO_CLOCK")).toBe(true);
    const ok = detectFvgs(bars, { ...CFG, timeframe: "100T", closeTimeOf: b => b.asOf + 30_000 });
    expect(ok.objects).toHaveLength(1);
    expect(ok.sessionWindow).toBe("NO_CLOCK");
  });

  it("the history scan is cached per bars array", () => {
    const bars = series([...FLAT, ...BULL]);
    expect(detectFvgs(bars, CFG)).toBe(detectFvgs(bars, CFG));
  });
});

describe("C · lifecycle on the SAME object", () => {
  const touchRow = (low: number, close: number): Row => [104, 104.2, low, close];

  it("BORN → OPEN → APPROACHING → OPEN (recede) before any touch", () => {
    const base = [...FLAT, ...BULL];
    expect(only(run([...base, AWAY])).state).toBe("OPEN");
    const near: Row = [103, 103.5, 102.4, 103];
    const o = only(run([...base, AWAY, near]));
    expect(o.state).toBe("APPROACHING");
    expect(o.firstApproach).toEqual({ at: T0 + (B3 + 2) * MIN + MIN, barsAfterBirth: 2 });
    expect(only(run([...base, AWAY, near, AWAY])).state).toBe("OPEN");
  });

  it("TOUCHED at exactly the near edge (penetration 0)", () => {
    const o = only(run([...FLAT, ...BULL, AWAY, touchRow(102, 102.05)]));
    expect(o.firstTouch?.barsAfterBirth).toBe(2);
    expect(o.maxPenetration).toBe(0);
    expect(o.mitigation).toBe("TOUCHED");
  });

  it("PARTIALLY_MITIGATED (< 50 %), with the unvisited band as remaining territory", () => {
    const o = only(run([...FLAT, ...BULL, AWAY, touchRow(101.8, 101.9)]));
    expect(o.state).toBe("PARTIALLY_MITIGATED");
    expect(o.maxPenetration).toBeCloseTo(0.2, 12);
    expect(o.remaining).toEqual({ bottom: 101, top: 101.8 });
  });

  it("DEEPLY_MITIGATED (≥ 50 %)", () => {
    const o = only(run([...FLAT, ...BULL, AWAY, touchRow(101.5, 101.7)]));
    expect(o.state).toBe("DEEPLY_MITIGATED");
    expect(o.mitigation).toBe("DEEP");
  });

  it("FULLY_MITIGATED: a wick to the far edge without a close beyond it; no territory remains", () => {
    const o = only(run([...FLAT, ...BULL, AWAY, touchRow(100.9, 101.5)]));
    expect(o.state).toBe("FULLY_MITIGATED");
    expect(o.remaining).toBeNull();
    expect(o.tradedThrough).toBeNull();
    expect(fvgMarketObject(o).state).toBe("CONSUMED");
  });

  it("REJECTED: after the touch, a close back outside on the origin side within the window", () => {
    const rows = [...FLAT, ...BULL, AWAY, touchRow(101.6, 102.6), [102.6, 104.3, 102.5, 104] as Row, AWAY, AWAY, AWAY, AWAY];
    const o = only(run(rows));
    expect(o.state).toBe("REJECTED");
    expect(o.mitigation).toBe("PARTIAL");
    expect(o.interactions).toHaveLength(1);
    const it0 = o.interactions[0];
    expect(it0.response).toBe("REJECTED");
    expect(it0.bars).toBe(1);
    expect(it0.displacementComplete).toBe(true);
    expect(it0.displacementAtr).toBeCloseTo(3 / o.displacement.atr, 12); // highs reached 105 = 3 above the near edge
    expect(fvgMarketObject(o).state).toBe("DEFENDED");
    expect(fvgMarketObject(o).lastResponseBarId).toBe(it0.responseBarId);
  });

  it("after FULL mitigation an origin-side close is not a rejection: the interaction ends with response NONE", () => {
    const rows = [...FLAT, ...BULL, AWAY, touchRow(100.9, 101.5), [101.5, 102.8, 101.4, 102.6] as Row, AWAY];
    const o = only(run(rows));
    expect(o.mitigation).toBe("FULL");
    expect(o.interactions[0].response).toBe("NONE");
    expect(o.state).toBe("FULLY_MITIGATED");
  });

  it("REJECTED needs the window: an inside close then an origin-side close inside 5 bars rejects", () => {
    const o = only(run([...FLAT, ...BULL, AWAY, touchRow(101.6, 101.8), [101.8, 103, 101.7, 102.4]]));
    expect(o.interactions[0].response).toBe("REJECTED");
  });

  it("ACCEPTED: two consecutive closes inside the territory", () => {
    const o = only(run([...FLAT, ...BULL, AWAY, touchRow(101.4, 101.5), [101.5, 101.9, 101.3, 101.6]]));
    expect(o.state).toBe("ACCEPTED");
    expect(o.interactions[0].response).toBe("ACCEPTED");
    expect(fvgMarketObject(o).state).toBe("CONSUMED");
  });

  it("TRADED_THROUGH: a close beyond the far edge is the invalidation; the lifecycle stops", () => {
    const rows = [...FLAT, ...BULL, AWAY, touchRow(100.2, 100.5)];
    const o = only(run(rows));
    expect(o.state).toBe("TRADED_THROUGH");
    expect(o.tradedThrough?.close).toBe(100.5);
    expect(o.mitigation).toBe("FULL");
    expect(fvgMarketObject(o).state).toBe("INVALID");
    expect(fvgMarketObject(o).invalidationPrice).toBe(101);
    // Later bars that re-enter add no lifecycle events (only the displacement window closes).
    const after = only(run([...rows, [100.5, 101.6, 100.4, 101.5], [101.5, 103, 101.4, 102.8], AWAY, AWAY, AWAY]));
    expect(after.events.filter(e => e.kind !== "DISPLACEMENT")).toEqual(o.events.filter(e => e.kind !== "DISPLACEMENT"));
    expect(after.state).toBe("TRADED_THROUGH");
  });

  it("BEARISH mirror: touch from below, rejection back below, then trade-through above", () => {
    const rej = only(run([...FLAT, ...BEAR, BELOW, [96, 98.4, 95.8, 97.5]]));
    expect(rej.state).toBe("REJECTED");
    expect(rej.maxPenetration).toBeCloseTo(0.4, 12);
    expect(rej.remaining).toEqual({ bottom: 98.4, top: 99 });
    const tt = only(run([...FLAT, ...BEAR, BELOW, [96, 99.6, 95.8, 99.3]]));
    expect(tt.state).toBe("TRADED_THROUGH");
  });

  it("identity persists through the whole lifecycle — never respawned", () => {
    const rows = [...FLAT, ...BULL, AWAY, [103, 103.5, 102.4, 103] as Row, touchRow(101.6, 102.6), AWAY, touchRow(101.2, 101.5), [101.5, 101.8, 101.1, 101.4] as Row, touchRow(100.2, 100.5)];
    const bars = series(rows);
    const full = detectFvgs(bars, CFG);
    const id = only(full).objectId;
    for (let k = B3; k < bars.length; k++) {
      const l = detectFvgs(bars.slice(0, k + 1), CFG);
      expect(l.objects.filter(o => o.createdBarIndex === B3).map(o => o.objectId)).toEqual([id]);
    }
    expect(only(full).events.map(e => e.kind)).toEqual([
      "BORN", "OPENED", "APPROACH",
      "TOUCH_START", "RESPONSE", "DISPLACEMENT", "EPISODE_END", // episode 1: rejected, then left
      "TOUCH_START", "PENETRATION", "RESPONSE", // episode 2: two inside closes → accepted
      "DISPLACEMENT", "PENETRATION", "TRADED_THROUGH", // then closed through the far edge
    ]);
    expect(only(full).interactions.map(i => [i.response, i.tradedThrough])).toEqual([["REJECTED", false], ["ACCEPTED", true]]);
    expect(only(full).state).toBe("TRADED_THROUGH");
  });

  it("horizon: same session vs next session (crypto: the 00:00 UTC day)", () => {
    // Born a few minutes before midnight UTC, touched after it.
    const t0 = Date.UTC(2026, 9, 6, 23, 30, 0);
    const rows = [...FLAT, ...BULL, AWAY, AWAY, AWAY, AWAY, AWAY, AWAY, AWAY, AWAY, AWAY, AWAY, AWAY, AWAY, AWAY, touchRow(101.6, 102.6)];
    const o = only(detectFvgs(series(rows, t0), CFG));
    expect(o.firstTouch?.sessionsAfterBirth).toBe(1);
    expect(o.horizon).toBe("NEXT_SESSION");
    const same = only(run([...FLAT, ...BULL, AWAY, touchRow(101.6, 102.6)]));
    expect(same.horizon).toBe("IMMEDIATE");
    expect(only(run([...FLAT, ...BULL, AWAY, AWAY, AWAY, AWAY, touchRow(101.6, 102.6)])).horizon).toBe("SAME_SESSION");
    expect(only(run([...FLAT, ...BULL, AWAY])).horizon).toBe("STILL_OPEN_WITHIN_HORIZON");
    expect(fvgHorizonFor({ barsAfterBirth: 50, sessionsAfterBirth: 3 })).toBe("LATER_SESSION");
    expect(fvgHorizonFor({ barsAfterBirth: 500, sessionsAfterBirth: 5 })).toBe("MULTI_DAY");
    expect(fvgHorizonFor({ barsAfterBirth: 50, sessionsAfterBirth: null })).toBe("SESSION_UNKNOWN");
  });

  it("a gap whose three bars span a session boundary is detected AND flagged", () => {
    const t0 = Date.UTC(2026, 9, 6, 23, 44, 0); // b2 opens 23:59 UTC, b3 opens 00:00 UTC
    const o = only(detectFvgs(series([...FLAT, ...BULL], t0), CFG));
    expect(o.session.crossesSession).toBe(true);
    expect(only(run([...FLAT, ...BULL])).session.crossesSession).toBe(false);
  });
});

describe("F · memory / aging and the visibility budget", () => {
  it(`a live gap with no interaction for ${FVG_IDLE_MEMORY_BARS} bars becomes MEMORY — and comes straight back on a touch`, () => {
    const idle = Array.from({ length: FVG_IDLE_MEMORY_BARS }, () => AWAY);
    const before = only(run([...FLAT, ...BULL, ...idle.slice(1)]));
    expect(before.state).toBe("OPEN");
    const mem = only(run([...FLAT, ...BULL, ...idle]));
    expect(mem.state).toBe("MEMORY");
    expect(mem.coreState).toBe("OPEN");
    expect(mem.remaining).toEqual({ bottom: 101, top: 102 });
    const back = only(run([...FLAT, ...BULL, ...idle, [104, 104.2, 101.6, 102.6]]));
    expect(back.objectId).toBe(mem.objectId);
    expect(back.state).toBe("REJECTED");
  });

  it(`a scar becomes MEMORY ${FVG_SCAR_MEMORY_BARS} bars after the terminal event`, () => {
    const scar = [...FLAT, ...BULL, AWAY, [104, 104.2, 100.2, 100.5] as Row];
    const tail = Array.from({ length: FVG_SCAR_MEMORY_BARS }, () => [100.5, 100.8, 100.2, 100.5] as Row);
    expect(only(run([...scar, ...tail.slice(1)])).state).toBe("TRADED_THROUGH");
    expect(only(run([...scar, ...tail])).state).toBe("MEMORY");
  });

  it("never hundreds of rectangles: live gaps nearest the price, recent scars, the rest counted", () => {
    // A staircase of bullish gaps: each step makes one gap, price keeps rising.
    const rows: Row[] = [...FLAT];
    let p = 100;
    for (let k = 0; k < 12; k++) {
      rows.push([p, p + 1, p - 1, p + 0.5], [p + 0.5, p + 4, p + 0.3, p + 3.8], [p + 3.8, p + 5, p + 2, p + 4.5]);
      p += 4.5;
      rows.push([p, p + 0.5, p - 0.5, p]);
    }
    const l = run(rows);
    expect(l.objects.length).toBeGreaterThan(8);
    const v = selectFvgVisibility(l);
    expect(v.open.length).toBe(6);
    expect(v.hidden.open).toBe(l.objects.filter(o => o.state !== "MEMORY" && o.mitigation !== "FULL").length - 6);
    // nearest first
    const d = v.open.map(o => l.closes[l.closes.length - 1] - (o.remaining?.top ?? 0));
    expect([...d].sort((a, b) => a - b)).toEqual(d);
    expect(v.rule).toMatch(/nearest/);
  });
});

describe("G-core · as-of-time truth", () => {
  const rows = [...FLAT, ...BULL, AWAY, [103, 103.5, 102.4, 103] as Row, [104, 104.2, 101.6, 102.6] as Row, AWAY, [104, 104.2, 101.2, 101.5] as Row, [101.5, 101.8, 101.1, 101.4] as Row, [104, 104.2, 100.2, 100.5] as Row, AWAY, AWAY];
  const bars = series(rows);
  const full = detectFvgs(bars, CFG);

  it("FUTURE-LEAK TEST: frozen right after formation, nothing later is visible", () => {
    const o = only(full);
    const frozen = fvgStateAsOf(full, o.createdAt);
    const f = only(frozen);
    expect(f.state).toBe("BORN");
    expect(f.events).toHaveLength(1);
    expect(f.interactions).toEqual([]);
    expect(f.firstTouch).toBeNull();
    expect(f.mitigation).toBe("NONE");
    expect(f.remaining).toEqual({ bottom: 101, top: 102 });
    expect(frozen.barCount).toBe(B3 + 1);
    expect(frozen.closes).toHaveLength(B3 + 1);
    // One millisecond before b3 closed, the object does not exist.
    expect(fvgStateAsOf(full, o.createdAt - 1).objects).toEqual([]);
  });

  it("as-of at every bar equals a scan of exactly the bars closed by then (no hindsight anywhere)", () => {
    for (let k = 0; k < bars.length; k++) {
      const t = full.closeTimes[k];
      const asOf = fvgStateAsOf(full, t);
      const truncated = detectFvgs(bars.slice(0, k + 1), CFG);
      expect(asOf.objects).toEqual(truncated.objects);
      expect(asOf.barCount).toBe(truncated.barCount);
      expect(asOf.asOf).toBe(truncated.asOf);
      // Mid-bar instants see the previous close only.
      expect(fvgStateAsOf(full, t + MIN / 2).objects).toEqual(truncated.objects);
    }
  });

  it("incremental push == full scan, at every step", () => {
    const e = createFvgEngine(CFG);
    bars.forEach((b, k) => {
      e.push(b);
      expect(e.snapshot().objects).toEqual(detectFvgs(bars.slice(0, k + 1), CFG).objects);
    });
    expect(e.snapshot()).toEqual(full);
  });
});

describe("G-core · descriptive statistics", () => {
  it("tallies a fixture with denominators — DESCRIPTIVE, no probabilities", () => {
    const touched = run([...FLAT, ...BULL, AWAY, [104, 104.2, 101.6, 102.6], AWAY, AWAY, AWAY, AWAY, AWAY]).objects[0];
    const accepted = run([...FLAT, ...BULL, AWAY, [104, 104.2, 101.4, 101.5], [101.5, 101.9, 101.3, 101.6]]).objects[0];
    const through = run([...FLAT, ...BULL, AWAY, [104, 104.2, 100.2, 100.5]]).objects[0];
    const open = run([...FLAT, ...BEAR, BELOW]).objects[0];
    const s = describeFvgOutcomes([touched, accepted, through, open]);
    expect(s.label).toBe(FVG_STATS_LABEL);
    expect(s.label).toMatch(/DESCRIPTIVE/);
    expect(s.detected).toBe(4);
    expect([s.bullish, s.bearish]).toEqual([3, 1]);
    expect(s.touched).toEqual({ count: 3, of: 4, share: 0.75 });
    expect(s.stillOpen).toEqual({ count: 1, of: 4, share: 0.25 });
    expect(s.stillOpenYoungerThan.count).toBe(1);
    expect(s.tradeThrough).toEqual({ count: 1, of: 4, share: 0.25 });
    expect(s.rejectionAfterTouch).toEqual({ count: 1, of: 3, share: 1 / 3 });
    expect(s.acceptance).toEqual({ count: 1, of: 3, share: 1 / 3 });
    expect(s.partialMitigation.count).toBe(1);
    expect(s.deepMitigation.count).toBe(1);
    expect(s.fullMitigation.count).toBe(1);
    expect(s.revisitByHorizon.IMMEDIATE.count).toBe(3);
    expect(s.revisitSameSession).toEqual({ count: 3, of: 4, share: 0.75 });
    expect(s.medianBarsToFirstTouch).toBe(2);
    expect(s.medianMsToFirstTouch).toBe(2 * MIN);
    expect(s.avgMaxPenetration).toBeCloseTo((0.4 + 0.7 + 1) / 3, 12);
    expect(s.postTouchDisplacementSample).toBe(1);
    expect(Object.keys(s).join(" ")).not.toMatch(/probab|chance|score|strength|edge|win/i);
    const by = describeFvgOutcomesBy([touched, accepted, through, open], "direction");
    expect(Object.keys(by)).toEqual(["BEARISH", "BULLISH"]);
    expect(by.BULLISH.detected).toBe(3);
    expect(describeFvgOutcomes([]).touched).toEqual({ count: 0, of: 0, share: null });
  });

  it("stats as of a time read only the as-of objects", () => {
    const bars = series([...FLAT, ...BULL, AWAY, [104, 104.2, 101.6, 102.6]]);
    const l = detectFvgs(bars, CFG);
    const atBirth = fvgStateAsOf(l, l.objects[0].createdAt);
    expect(describeFvgOutcomes(atBirth.objects).touched.count).toBe(0);
    expect(describeFvgOutcomes(l.objects).touched.count).toBe(1);
  });
});

describe("evidence per sense — by reference, never upgraded", () => {
  it("price geometry is FULL from OHLC; order flow / derivatives are NOT_ATTACHED until another owner is referenced", () => {
    const o = only(run([...FLAT, ...BULL]));
    expect(o.senses.PRICE_GEOMETRY).toEqual({ sense: "PRICE_GEOMETRY", state: "FULL", source: "OHLC" });
    expect(o.senses.ORDER_FLOW.state).toBe("NOT_ATTACHED");
    const withFlow = attachFvgSenseReference(o, "ORDER_FLOW", { owner: "selectAbsorption", ownerState: "PARTIAL", ref: "abs:1" });
    expect(withFlow.senses.ORDER_FLOW).toEqual({ sense: "ORDER_FLOW", state: "BY_REFERENCE", owner: "selectAbsorption", ownerState: "PARTIAL", ref: "abs:1" });
    expect(withFlow.senses.PRICE_GEOMETRY).toBe(o.senses.PRICE_GEOMETRY);
    expect(withFlow.state).toBe(o.state);
    expect(o.senses.ORDER_FLOW.state).toBe("NOT_ATTACHED"); // the original is untouched
  });

  it("the shared drawer: kind GAP_FVG, no OHLC copied, bars referenced by id", () => {
    const o = only(run([...FLAT, ...BULL]));
    const m = fvgMarketObject(o);
    expect(m.kind).toBe("GAP_FVG");
    expect([m.priceLow, m.priceHigh]).toEqual([101, 102]);
    expect(m.birthBarId).toBe(o.bars.b3.barId);
    expect(m.state).toBe("ALIVE");
    expect(Object.keys(m)).not.toEqual(expect.arrayContaining(["open", "close"]));
  });
});

describe("a deterministic random walk — many objects, same invariants", () => {
  // Park–Miller LCG: deterministic, no clock.
  let seed = 7;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const rows: Row[] = [];
  let p = 100;
  for (let k = 0; k < 1500; k++) {
    const o = p;
    const c = o + (rnd() - 0.5) * 3 * (rnd() < 0.1 ? 3 : 1);
    const h = Math.max(o, c) + rnd();
    const l = Math.min(o, c) - rnd();
    rows.push([o, h, l, c]);
    p = c;
  }
  const bars = series(rows);
  const full = detectFvgs(bars, CFG);

  it("finds objects in both directions, every one inside the rules", () => {
    expect(full.objects.filter(o => o.direction === "BULLISH").length).toBeGreaterThan(5);
    expect(full.objects.filter(o => o.direction === "BEARISH").length).toBeGreaterThan(5);
    for (const o of full.objects) {
      expect(o.top).toBeGreaterThan(o.bottom);
      expect(o.top - o.bottom).toBeGreaterThanOrEqual(o.minimum.price * (1 - 1e-9));
      expect(o.maxPenetration).toBeGreaterThanOrEqual(0);
      expect(o.maxPenetration).toBeLessThanOrEqual(1);
      if (o.tradedThrough) expect(o.mitigation).toBe("FULL");
      if (o.firstTouch) expect(o.firstTouch.at).toBeGreaterThan(o.createdAt);
      for (const e of o.events) expect(e.knownAt).toBeGreaterThanOrEqual(o.createdAt);
    }
    expect(new Set(full.objects.map(o => o.objectId)).size).toBe(full.objects.length);
  });

  it("incremental == full scan, and as-of == truncated scan, at sampled bars", () => {
    const e = createFvgEngine(CFG);
    bars.forEach(b => e.push(b));
    expect(e.snapshot()).toEqual(full);
    for (const k of [20, 137, 500, 911, 1499]) {
      expect(fvgStateAsOf(full, full.closeTimes[k]).objects).toEqual(detectFvgs(bars.slice(0, k + 1), CFG).objects);
    }
  });

  it("the visibility budget holds on a long series", () => {
    const v = selectFvgVisibility(full);
    expect(v.open.length).toBeLessThanOrEqual(6);
    expect(v.scars.length).toBeLessThanOrEqual(3);
    expect(v.open.length + v.scars.length + v.hidden.open + v.hidden.scars + v.hidden.memory).toBe(full.objects.length);
  });
});
