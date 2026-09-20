/**
 * selectChartCompanion — FL-04 News Chart Companion regression contract.
 *
 * What each test exists to prevent:
 *
 *  1. NO FABRICATION. With no compiled snapshot the panel names the
 *     absence AND its cause, and prints no number at all. A blank, a dash
 *     or a stale carry-over would each be a beautiful lie.
 *
 *  2. THE READING IS THE CHART'S. When a snapshot exists the price text
 *     comes from chartHeaderPriceFact verbatim — the Companion is a second
 *     CONSUMER of that owner, never a second opinion.
 *
 *  3. NO GUESSED CAMERA. timeframe === null suspends the panel. A
 *     hardcoded fallback would subscribe to a store key nothing writes and
 *     render a permanent, plausible, entirely false "no market state".
 *
 *  4. FRESHNESS IS EVIDENCE. `fresh` requires a timestamped trade inside
 *     the 30s window; observed-but-old and untimestamped both read false.
 *
 *  5. §7 MARKET CAMERA IMMORTALITY. The only way out is a href carrying
 *     symbol + timeframe. Nothing here mints a Decision_ID.
 */
import { describe, it, expect } from "vitest";
import {
  sealCanonicalMarketState,
  type CanonicalMarketState,
  type CanonicalMarketStateInput,
  type MarketStateDimension,
} from "../marketData/canonicalMarketState";
import {
  selectChartCompanion,
  companionMissingStateReason,
  COMPANION_FRESH_WINDOW_MS,
  type ChartCompanionInput,
} from "./selectChartCompanion";

/**
 * A REAL epoch, not a small integer. The price tail's points must be
 * spaced by the tail's own timeframe, and a 1h bar spacing under a
 * capturedAt of 10_000ms would put bar opens before 1970 — which the
 * canonical validator rightly rejects.
 */
const CAPTURED = 1_700_000_000_000;
const NOW = 1_000_000;

const unknown = (reason: string): MarketStateDimension => ({
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
  unknowns: [reason],
});

function state(overrides: Partial<CanonicalMarketStateInput> = {}): CanonicalMarketState {
  return sealCanonicalMarketState({
    snapshotId: "companion-snap-1",
    capturedAt: CAPTURED,
    availableAt: CAPTURED + 5,
    instrumentId: "BTC-USD",
    normalizedSymbol: "BTC",
    executableIdentity: "BTC-USD",
    assetClass: "crypto",
    exchange: "COINBASE",
    session: "24X7",
    timeframeContext: ["1h"],
    qualityState: "PARTIAL",
    price: {
      last: 81_927.5,
      bid: null,
      ask: null,
      eventAt: CAPTURED - 10,
      availableAt: CAPTURED - 5,
    },
    coverage: [],
    direction: unknown("Direction unresolved."),
    location: unknown("Location unresolved."),
    aggression: unknown("Aggression unresolved."),
    regime: unknown("Regime unresolved."),
    structure: unknown("Structure unresolved."),
    volatility: unknown("Volatility unresolved."),
    profile: unknown("Profile unresolved."),
    orderFlow: unknown("Order flow unresolved."),
    contradictions: [],
    unknowns: [],
    ...overrides,
  });
}

function input(overrides: Partial<ChartCompanionInput> = {}): ChartCompanionInput {
  return {
    symbol: "BTC",
    timeframe: "1h",
    state: null,
    tape: { trades: 0, lastTradeMs: null, cvdSpark: [] },
    nowMs: NOW,
    at: new Date("2026-09-19T18:00:00Z"),
    ...overrides,
  };
}

/**
 * A tail of provably-closed closes, as derivePriceTail would publish it.
 *
 * The points are spaced by the TAIL'S OWN timeframe, not by an arbitrary
 * step. deriveBarOverBarChange re-checks the closed-bar proofs on whatever
 * it is handed, so a tail labelled "1h" whose bars sit one second apart is
 * not a valid fixture — it is a fixture that could never exist, and a test
 * built on one proves nothing about the real path.
 */
const TF_MS: Record<string, number> = { "1m": 60_000, "5m": 300_000, "1h": 3_600_000 };

function tail(closes: readonly number[], timeframe = "1h") {
  const step = TF_MS[timeframe]!;
  return {
    timeframe,
    points: closes.map((c, i) => ({ t: CAPTURED - (closes.length - i) * step, c })),
  };
}

describe("selectChartCompanion — the mini price book (FL-04)", () => {
  it("refuses to draw a book when no tail was published", () => {
    const vm = selectChartCompanion(input({ state: state() }));
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.book.kind).toBe("MISSING");
    if (vm.book.kind !== "MISSING") return;
    // The absence is NAMED, and it does not blame the instrument.
    expect(vm.book.reason).toMatch(/not a book|no line to draw/i);
    expect(vm.book.reason).toMatch(/no path is invented/i);
  });

  it("takes the bounds from the real extremes and never pads them", () => {
    const vm = selectChartCompanion(
      input({ state: state({ priceTail: tail([528.4, 530.1, 529.2, 531.0]) }) }),
    );
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.book.kind).toBe("SERIES");
    if (vm.book.kind !== "SERIES") return;
    expect(vm.book.min).toBe(528.4);
    expect(vm.book.max).toBe(531.0);
    expect(vm.book.points).toHaveLength(4);
  });

  it("uses the FIRST close in view as the reference baseline", () => {
    const vm = selectChartCompanion(
      input({ state: state({ priceTail: tail([528.4, 530.1, 529.2, 531.0]) }) }),
    );
    if (!vm.visible) throw new Error("expected visible");
    if (vm.book.kind !== "SERIES") throw new Error("expected series");
    expect(vm.book.reference).toBe(528.4);
  });

  it("carries the tail's own timeframe, never the camera's, into the book", () => {
    const vm = selectChartCompanion(
      input({ timeframe: "1h", state: state({ priceTail: tail([1, 2], "5m") }) }),
    );
    if (!vm.visible) throw new Error("expected visible");
    if (vm.book.kind !== "SERIES") throw new Error("expected series");
    // The points were closed on 5m bars. Labelling them 1h because the
    // camera says 1h would put real numbers under a false axis.
    expect(vm.book.timeframe).toBe("5m");
  });

  it("speaks the book so it is not a decoration to a screen reader", () => {
    const vm = selectChartCompanion(
      input({ state: state({ priceTail: tail([528.4, 531.0]) }) }),
    );
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.spoken).toMatch(/Price book: 2 closed 1h bars, ranging 528\.40 to 531\.00/);
  });
});

describe("selectChartCompanion — change is bar-over-bar AND says so", () => {
  it("measures against the previous closed bar and keeps the timeframe", () => {
    const vm = selectChartCompanion(
      input({ state: state({ priceTail: tail([100, 101], "5m") }) }),
    );
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.change.kind).toBe("READING");
    if (vm.change.kind !== "READING") return;
    expect(vm.change.chg).toBeCloseTo(1, 10);
    expect(vm.change.pct).toBeCloseTo(1, 10);
    expect(vm.change.direction).toBe("UP");
    // deriveBarOverBarChange's header: this IS NOT a session change. The
    // timeframe is the label that stops it being read as one.
    expect(vm.change.timeframe).toBe("5m");
  });

  it("signs a fall as DOWN and an unchanged close as FLAT", () => {
    const down = selectChartCompanion(input({ state: state({ priceTail: tail([101, 100]) }) }));
    if (!down.visible || down.change.kind !== "READING") throw new Error("expected reading");
    expect(down.change.direction).toBe("DOWN");

    const flat = selectChartCompanion(input({ state: state({ priceTail: tail([100, 100]) }) }));
    if (!flat.visible || flat.change.kind !== "READING") throw new Error("expected reading");
    expect(flat.change.direction).toBe("FLAT");
    expect(flat.change.chg).toBe(0);
  });

  it("has no change to report when there is no book", () => {
    const vm = selectChartCompanion(input({ state: state() }));
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.change.kind).toBe("MISSING");
  });

  it("never prints a change number when the book is missing", () => {
    const vm = selectChartCompanion(input({ state: null }));
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.spoken).not.toMatch(/[+-]\d+\.\d{2}/);
  });
});

describe("selectChartCompanion — the REGIME chip quotes canon", () => {
  it("stays unresolved and carries canon's OWN reason", () => {
    const vm = selectChartCompanion(input({ state: state() }));
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.regime.resolved).toBe(false);
    if (vm.regime.resolved) return;
    expect(vm.regime.reason).toBe("Regime unresolved.");
  });

  it("quotes a RESOLVED regime verbatim, without re-wording it", () => {
    const vm = selectChartCompanion(
      input({
        state: state({
          regime: {
            resolution: "RESOLVED",
            value: "BALANCE",
            confidence: 0.8,
            evidence: [
              {
                eventId: "regime-evt-1",
                observedAt: CAPTURED - 1_000,
                availableAt: CAPTURED - 500,
                source: "chart-compiler",
                fidelity: "DERIVED",
                basis: "Value area held for 3 consecutive 1h bars.",
              },
            ],
            contradictions: [],
            unknowns: [],
          },
        }),
      }),
    );
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.regime.resolved).toBe(true);
    if (!vm.regime.resolved) return;
    expect(vm.regime.value).toBe("BALANCE");
  });

  it("reports no regime at all when there is no snapshot to read", () => {
    const vm = selectChartCompanion(input({ state: null }));
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.regime.resolved).toBe(false);
    if (vm.regime.resolved) return;
    // null, not a sentence we made up about a state we never read.
    expect(vm.regime.reason).toBeNull();
  });
});

describe("selectChartCompanion (FL-04)", () => {
  it("names the absence, and its cause, instead of inventing a price", () => {
    const vm = selectChartCompanion(input());
    if (!vm.visible) throw new Error("expected a visible companion");

    expect(vm.price.kind).toBe("MISSING");
    if (vm.price.kind !== "MISSING") return;
    expect(vm.price.reason).toBe(companionMissingStateReason("BTC"));
    // The cause named is OUR STORE's lifetime, not the instrument's state.
    expect(vm.price.reason).toMatch(/compiler runs on the chart/i);
    // No number anywhere — an absence is not a reading.
    expect(vm.price.reason).not.toMatch(/\d+\.\d{2}/);
    expect(vm.spoken).not.toMatch(/\d+\.\d{2}/);
  });

  it("quotes the canonical price owner verbatim when a snapshot exists", () => {
    const vm = selectChartCompanion(input({ state: state() }));
    if (!vm.visible) throw new Error("expected a visible companion");

    expect(vm.price.kind).toBe("READING");
    if (vm.price.kind !== "READING") return;
    // chartHeaderPriceFact's own formatting — proof of delegation.
    expect(vm.price.fact.text).toContain("81927.50");
    expect(vm.price.fact.measured).toBe(true);
    expect(vm.spoken).toContain(vm.price.fact.text);
  });

  it("suspends entirely rather than guess a camera it has not read", () => {
    expect(selectChartCompanion(input({ timeframe: null })).visible).toBe(false);
    expect(selectChartCompanion(input({ timeframe: "  " })).visible).toBe(false);
    expect(selectChartCompanion(input({ symbol: "   " })).visible).toBe(false);
  });

  it("requires a timestamped trade inside the window to claim fresh", () => {
    const observedOld = selectChartCompanion(
      input({
        tape: { trades: 12, lastTradeMs: NOW - COMPANION_FRESH_WINDOW_MS - 1, cvdSpark: [] },
      }),
    );
    if (!observedOld.visible) throw new Error("expected visible");
    expect(observedOld.tapeObserved).toBe(true);
    expect(observedOld.fresh).toBe(false);
    expect(observedOld.spoken).toMatch(/none in the last 30 seconds/i);

    const untimestamped = selectChartCompanion(
      input({ tape: { trades: 12, lastTradeMs: null, cvdSpark: [] } }),
    );
    if (!untimestamped.visible) throw new Error("expected visible");
    expect(untimestamped.fresh).toBe(false);

    const live = selectChartCompanion(
      input({ tape: { trades: 12, lastTradeMs: NOW - 1_000, cvdSpark: [] } }),
    );
    if (!live.visible) throw new Error("expected visible");
    expect(live.fresh).toBe(true);
  });

  it("never reports observed tape when no trade has been seen", () => {
    const vm = selectChartCompanion(input());
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.tapeObserved).toBe(false);
    expect(vm.tradeCount).toBe(0);
    expect(vm.fresh).toBe(false);
    expect(vm.spoken).toMatch(/no trades observed/i);
  });

  it("refuses to hand a single sample to a line renderer", () => {
    const one = selectChartCompanion(input({ tape: { trades: 1, lastTradeMs: NOW, cvdSpark: [4] } }));
    if (!one.visible) throw new Error("expected visible");
    expect(one.cvdSpark).toEqual([]);

    const two = selectChartCompanion(
      input({ tape: { trades: 2, lastTradeMs: NOW, cvdSpark: [4, 9] } }),
    );
    if (!two.visible) throw new Error("expected visible");
    expect(two.cvdSpark).toEqual([4, 9]);
  });

  it("carries the camera back to the chart and mints nothing (§7)", () => {
    const vm = selectChartCompanion(input({ symbol: "tsla", timeframe: "15m" }));
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.symbol).toBe("TSLA");
    expect(vm.chartHref).toBe("/charts?symbol=TSLA&tf=15m");
  });

  /**
   * These two replace an earlier assertion that no decision identifier
   * could appear ANYWHERE in the view model. That assertion read §7 as
   * "the Companion must not know about decisions", but the binding FL-04
   * law is "the mini book stays pinned with the same Decision_ID" — the
   * ban is on MINTING, not on CARRYING. The old test would have failed
   * the product the plate specifies, so it is deleted, not relaxed.
   */
  it("carries the SAME Decision_ID it was handed (FL-04)", () => {
    const vm = selectChartCompanion(input({ decisionId: "dec_abc123" }));
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.decisionId).toBe("dec_abc123");
  });

  it("never invents a Decision_ID when none is open (§7)", () => {
    for (const handed of [undefined, null, "", "   "]) {
      const vm = selectChartCompanion(input({ decisionId: handed }));
      if (!vm.visible) throw new Error("expected visible");
      expect(vm.decisionId).toBeNull();
    }
  });

  it("delegates the session token instead of deciding it", () => {
    const vm = selectChartCompanion(input());
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.sessionToken.length).toBeGreaterThan(0);
    expect(vm.sessionDetail.length).toBeGreaterThan(0);
    expect(vm.spoken).toContain(`session ${vm.sessionToken}`);
  });
});

/**
 * asOf — the status bar's timestamp.
 *
 * The plate's bottom bar reads "LIVE DATA • 10:24:35 ET • Apr 29, 2025".
 * The only honest source for that instant is WHEN THE EVIDENCE WAS
 * CAPTURED. A render clock would tick forward over a frozen price and
 * restamp stale evidence as fresh once a second — §20's STALE ≠ FRESH,
 * committed at 1Hz.
 */
describe("selectChartCompanion — asOf is the evidence's clock, not the render clock", () => {
  it("reports the state's capturedAt", () => {
    const vm = selectChartCompanion(input({ state: state() }));
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.asOf).toBe(CAPTURED);
  });

  it("does NOT drift with nowMs while the state stands still", () => {
    // ONE state, read at two wall-clock moments ten minutes apart.
    const frozen = state();
    const early = selectChartCompanion(input({ state: frozen, nowMs: CAPTURED }));
    const later = selectChartCompanion(
      input({ state: frozen, nowMs: CAPTURED + 10 * 60_000 }),
    );
    if (!early.visible || !later.visible) throw new Error("expected visible");
    // Ten minutes of clock, zero minutes of new evidence.
    expect(early.asOf).toBe(CAPTURED);
    expect(later.asOf).toBe(CAPTURED);
  });

  it("is null with no state — nothing to print beats something to guess", () => {
    const vm = selectChartCompanion(input({ state: null }));
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.asOf).toBeNull();
  });
});

/**
 * The spoken panel — one cause, said once.
 *
 * With no compiled state the price, change and book clauses all fall back
 * to the SAME sentence, and the serving /news aria-label read that
 * paragraph three times. Three identical sentences sound like three
 * separate failures. The label must state the absence once, and must
 * still speak every clause that genuinely differs.
 */
describe("selectChartCompanion — the label does not repeat itself", () => {
  const count = (haystack: string, needle: string) => {
    let n = 0;
    let i = 0;
    for (;;) {
      const at = haystack.indexOf(needle, i);
      if (at < 0) return n;
      n += 1;
      i = at + 1;
    }
  };

  it("says the missing-state cause exactly once", () => {
    const vm = selectChartCompanion(input({ state: null }));
    if (!vm.visible) throw new Error("expected visible");
    expect(count(vm.spoken, "No compiled market state")).toBe(1);
  });

  it("still speaks the clauses that are genuinely different", () => {
    const vm = selectChartCompanion(input({ state: null }));
    if (!vm.visible) throw new Error("expected visible");
    // The tape clause is its own evidence, unrelated to the compiler's
    // absence, so suppressing duplicates must not swallow it.
    expect(vm.spoken).toContain("Regime unresolved");
    expect(vm.spoken).toContain("trades observed");
    expect(vm.spoken).toContain("it decides nothing");
  });

  it("does not collapse two distinct sentences into one", () => {
    // A real state: price reads, regime speaks its own reason, tape speaks
    // its own count. Nothing is a duplicate, so nothing may be dropped.
    const vm = selectChartCompanion(input({ state: state() }));
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.spoken).toContain("Regime");
    expect(vm.spoken).toContain("trades observed");
  });
});
