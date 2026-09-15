/**
 * Scope, stated honestly.
 *
 * This proves the COUNTS, the SIGN of the measured distance, and the
 * SENTENCES — that nothing is said before a stop has actually filled, that a
 * stop which filled exactly at its level is called out as the thing no real
 * venue promises, that price improvement is never reported as a worst case,
 * and that an unreadable `stopPx`, `fillPx` or `side` yields no measurement
 * rather than a zero.
 *
 * It does not prove how far a real stop would have gapped. It cannot: that
 * depends on the book at that instant, and this module deliberately refuses to
 * estimate it. The strongest thing asserted below is a statement about
 * /paper's OWN control flow — `selectOrderFill` returns the observed price for
 * `type:"stop"`, so the trigger price and the fill price are the same number —
 * plus a distance DERIVED from two fields the order already carried.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  selectStopRealism,
  selectStopOrderNote,
  selectStopSlipPx,
  type StopRealismInput,
} from "./paperStopRealism";

const stop = (o: Partial<StopRealismInput> = {}): StopRealismInput => ({
  status: "filled", type: "stop", side: "sell", stopPx: 100, fillPx: 100, ...o,
});

describe("selectStopSlipPx", () => {
  it("signs a BUY stop so that filling ABOVE the level is against you", () => {
    expect(selectStopSlipPx(stop({ side: "buy", stopPx: 100, fillPx: 100.5 }))).toBe(0.5);
  });

  it("signs a SELL stop so that filling BELOW the level is against you", () => {
    expect(selectStopSlipPx(stop({ side: "sell", stopPx: 100, fillPx: 99.25 }))).toBe(0.75);
  });

  it("clamps price improvement to 0 — a negative worst case is nonsense", () => {
    expect(selectStopSlipPx(stop({ side: "buy", stopPx: 100, fillPx: 99 }))).toBe(0);
    expect(selectStopSlipPx(stop({ side: "sell", stopPx: 100, fillPx: 101 }))).toBe(0);
  });

  it("H1: an unreadable price or side measures NOTHING, it does not measure 0", () => {
    expect(selectStopSlipPx(stop({ stopPx: undefined }))).toBeNull();
    expect(selectStopSlipPx(stop({ fillPx: undefined }))).toBeNull();
    expect(selectStopSlipPx(stop({ side: undefined }))).toBeNull();
    expect(selectStopSlipPx(stop({ stopPx: NaN }))).toBeNull();
  });

  it("is null for anything that is not a FILLED stop-triggered order", () => {
    expect(selectStopSlipPx(null)).toBeNull();
    expect(selectStopSlipPx(stop({ status: "pending" }))).toBeNull();
    expect(selectStopSlipPx(stop({ status: "cancelled" }))).toBeNull();
    expect(selectStopSlipPx(stop({ type: "limit" }))).toBeNull();
    expect(selectStopSlipPx(stop({ type: "market" }))).toBeNull();
  });

  it("covers stop-limit too — it is also gated by a stop level", () => {
    expect(selectStopSlipPx(stop({ type: "stop-limit", side: "buy", stopPx: 10, fillPx: 10.1 })))
      .toBeCloseTo(0.1, 10);
  });
});

describe("selectStopRealism", () => {
  it("says nothing before a stop has filled — a banner nobody earned is wallpaper", () => {
    for (const orders of [[], null, undefined]) {
      const r = selectStopRealism(orders as StopRealismInput[]);
      expect(r.stopFilledCount).toBe(0);
      expect(r.heading).toBeNull();
      expect(r.sentences).toEqual([]);
    }
  });

  it("ignores stops that did not fill, and fills that were not stops", () => {
    const r = selectStopRealism([
      stop({ status: "pending" }),
      stop({ status: "cancelled" }),
      stop({ type: "limit" }),
      stop({ type: "market" }),
    ]);
    expect(r.stopFilledCount).toBe(0);
    expect(r.heading).toBeNull();
  });

  it("names gap risk AND the sampling gap — two different mechanisms", () => {
    const r = selectStopRealism([stop()]);
    expect(r.heading).toBe("1 stop protected you more than a real one would have");
    expect(r.sentences[0]).toMatch(/becomes a\s+MARKET order/);
    expect(r.sentences[0]).toMatch(/a trigger, not a floor/);
    expect(r.sentences[1]).toMatch(/never reads the prints in between/);
  });

  it("agrees with itself in the plural", () => {
    const r = selectStopRealism([stop(), stop()]);
    expect(r.stopFilledCount).toBe(2);
    expect(r.heading).toBe("2 stops protected you more than real ones would have");
  });

  it("calls out the perfect fill as the thing no real venue promises", () => {
    const r = selectStopRealism([stop({ stopPx: 100, fillPx: 100 })]);
    expect(r.worstSlipPx).toBe(0);
    expect(r.measuredCount).toBe(1);
    expect(r.sentences[2]).toMatch(/EXACTLY at its level/);
    expect(r.sentences[2]).toMatch(/No real venue promises that/);
  });

  it("reports the WORST measured distance as a FLOOR, never as the real number", () => {
    const r = selectStopRealism([
      stop({ side: "sell", stopPx: 100, fillPx: 99.9 }),
      stop({ side: "sell", stopPx: 100, fillPx: 99.25 }),
      stop({ side: "sell", stopPx: 100, fillPx: 101 }), // improvement -> 0
    ]);
    expect(r.measuredCount).toBe(3);
    expect(r.worstSlipPx).toBeCloseTo(0.75, 10);
    expect(r.sentences[2]).toMatch(/0\.75 past its level/);
    expect(r.sentences[2]).toMatch(/FLOOR on the real number, never the real number/);
  });

  it("never rounds a real distance away into a claim of a PERFECT fill", () => {
    // 2dp would render this as "0.00 past its level", which reads as the fill
    // being exact — the opposite of what was measured.
    const r = selectStopRealism([stop({ side: "sell", stopPx: 0.5, fillPx: 0.4996 })]);
    expect(r.worstSlipPx).toBeGreaterThan(0);
    expect(r.sentences[2]).not.toMatch(/0\.00 past/);
    expect(r.sentences[2]).toMatch(/0\.0004 past its level/);
  });

  it("H1: an unmeasurable stop still COUNTS but contributes no distance", () => {
    const r = selectStopRealism([
      stop({ stopPx: undefined }),
      stop({ side: undefined }),
    ]);
    expect(r.stopFilledCount).toBe(2);
    expect(r.measuredCount).toBe(0);
    expect(r.worstSlipPx).toBeNull();
    // With nothing measured, the measurement sentence must not appear at all.
    expect(r.sentences).toHaveLength(2);
    expect(JSON.stringify(r)).not.toMatch(/EXACTLY|FLOOR/);
  });

  it("survives a null row without throwing", () => {
    const r = selectStopRealism([null as unknown as StopRealismInput, stop()]);
    expect(r.stopFilledCount).toBe(1);
  });

  it("is a LABEL: no probability, no refusal, no status", () => {
    const r = selectStopRealism([stop()]);
    expect(Object.keys(r).sort()).toEqual(
      ["heading", "measuredCount", "sentences", "stopFilledCount", "worstSlipPx"].sort(),
    );
    expect(JSON.stringify(r)).not.toMatch(/probability|chance|odds|refused|blocked|estimate/i);
  });

  it("grades a book persisted before this existed — no new field is required", () => {
    const ancient = [
      { status: "filled", type: "stop", side: "sell", stopPx: 50, fillPx: 49.5 },
    ];
    expect(selectStopRealism(ancient).worstSlipPx).toBeCloseTo(0.5, 10);
  });
});

describe("selectStopOrderNote", () => {
  it("is null for anything that is not a filled stop-triggered order", () => {
    expect(selectStopOrderNote(null)).toBeNull();
    expect(selectStopOrderNote(undefined)).toBeNull();
    expect(selectStopOrderNote(stop({ status: "pending" }))).toBeNull();
    expect(selectStopOrderNote(stop({ type: "limit" }))).toBeNull();
    expect(selectStopOrderNote(stop({ type: "market" }))).toBeNull();
  });

  it("says the distance was exactly your loss when it filled at the level", () => {
    const s = selectStopOrderNote(stop({ stopPx: 100, fillPx: 100 }));
    expect(s).toMatch(/EXACTLY at its level/);
    expect(s).toMatch(/only promises to TRIGGER there/);
  });

  it("quotes the measured distance and calls it a minimum", () => {
    const s = selectStopOrderNote(stop({ side: "sell", stopPx: 100, fillPx: 99.4 }));
    expect(s).toMatch(/0\.60 past its level/);
    expect(s).toMatch(/at least this wide/);
  });

  it("falls back to the mechanism when the distance is unmeasurable", () => {
    const s = selectStopOrderNote(stop({ stopPx: undefined }));
    expect(s).toMatch(/becomes a market order/);
    expect(s).not.toMatch(/\d\.\d+ past/);
  });
});

describe("the owner refuses to model", () => {
  const OWNER = readFileSync(resolve(__dirname, "./paperStopRealism.ts"), "utf8");
  const code = OWNER.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("LABEL NOT MODEL: never writes a status, never reads a clock, never rolls a die", () => {
    expect(code).not.toMatch(/status\s*[:=]\s*["']/);
    expect(code).not.toMatch(/\bDate\.now\s*\(/);
    expect(code).not.toMatch(/Math\.random/);
  });

  it("is pure: no imports, no storage, no side effects", () => {
    expect(code).not.toMatch(/^\s*import\s/m);
    expect(code).not.toMatch(/localStorage|sessionStorage/);
  });
});

describe("the DEFECT this disclosure describes is still real", () => {
  const TRADE = readFileSync(resolve(__dirname, "./paperTrade.ts"), "utf8");

  it("POSITIVE CONTROL: the guards below actually read paperTrade", () => {
    expect(TRADE.length).toBeGreaterThan(20_000);
  });

  /**
   * A claim and its justification must fail together. If /paper ever stops
   * booking a stop at the price that triggered it, this disclosure becomes a
   * lie — and this is where that gets caught.
   */
  it("THE DEFECT: a stop still fills at the price that triggered it", () => {
    expect(TRADE).toMatch(/case\s+"stop":\s*fills\s*=\s*triggered/);
    expect(TRADE).toMatch(/return\s*\{\s*fillPx:\s*px\s*,/);
  });

  it("THE HOLE: a plain stop still gets no queue-basis caveat", () => {
    const QB = readFileSync(resolve(__dirname, "./paperFillQueueBasis.ts"), "utf8");
    expect(QB).toMatch(/type\s*!==\s*"limit"\s*&&\s*\w+\.type\s*!==\s*"stop-limit"/);
  });
});

describe("/paper renders the stop disclosure", () => {
  const PAPER_PAGE = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8");
  const code = PAPER_PAGE
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("POSITIVE CONTROL: the guards below actually read /paper", () => {
    expect(PAPER_PAGE.length).toBeGreaterThan(50_000);
  });

  it("the page consults the stop-realism owner rather than staying silent", () => {
    expect(code).toContain("selectStopRealism");
    expect(code).toContain("selectStopOrderNote");
  });

  /**
   * The lesson paid for three times on this page: consulting a selector is not
   * rendering its answer. A revive that deletes the ELEMENT while leaving the
   * import and the component declaration intact restores the exact silence this
   * atom closes, so the ELEMENT is what gets asserted.
   */
  it("the per-order note is actually RENDERED, not merely declared", () => {
    expect(code).toContain("<StopOrderNote ord={ord} />");
  });

  it("the book-level note is actually RENDERED", () => {
    expect(code).toContain("<StopRealismNote orders={orders} />");
  });

  it("both are rendered in the ORDERS tab, beside the book they describe", () => {
    const ordersTab = code.slice(code.indexOf('tab==="orders"'));
    expect(ordersTab.indexOf("<StopOrderNote")).toBeGreaterThan(-1);
    expect(ordersTab.indexOf("<StopRealismNote")).toBeGreaterThan(-1);
  });
});
