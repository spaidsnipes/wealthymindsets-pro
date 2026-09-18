/**
 * A SWING SEQUENCE IS NOT A DISTRIBUTION, AND MUST NOT BE STARVED LIKE ONE.
 *
 * FOUND FROM USE, production /command-deck BTC, 2026-09-18. The deck's market
 * field disclosed `120 bars · Read just now`. The Market Object Passport below
 * it read `4/8 dimensions resolved`, and the unresolved four were location,
 * aggression, structure and profile — precisely the four CANDLE-derived ones.
 * The chart and the Passport, on one page, at one instant, for one instrument,
 * disagreed about whether candle evidence existed at all. Canon Weakness #1.
 *
 * Every one of those four read `profileBarsFrom`, which drops any bar without
 * a finite `volume`. `DeckMarketChart` forwards no volume ON PURPOSE — its own
 * `Candle` doc block says Yahoo's volume is not trusted there and `volume: 0`
 * would be an invention. Both sides were individually honest. The bug was the
 * JOIN: a profile adapter used as a universal candle adapter.
 *
 * ── WHAT THIS FIX DELIBERATELY DOES NOT DO ─────────────────────────────────
 *
 * It does not make the other three resolve. Profile and location are
 * volume-weighted distributions; aggression's effort axis IS traded volume.
 * With no volume there is genuinely nothing for them to measure, and their
 * UNRESOLVED verdicts on that venue are the honest answer. Relaxing them would
 * be inventing a measurement — the exact defect this codebase exists to
 * refuse. So the tests below assert the NARROWNESS of the repair as hard as
 * they assert the repair.
 */

import { describe, expect, it } from "vitest";
import { createChartMarketStatePublication } from "./chartMarketStatePublisher";
import { selectMarketStructure } from "./viewModels/selectMarketStructure";
import { SESSION_NECTAR_SCHEMA_VERSION } from "./sessionNectar";

const CAPTURED_AT = 1_700_000_000_000;

/**
 * Candles shaped exactly as `DeckMarketChart` forwards them: no `volume` key
 * at all. A zigzag with a rising drift so pivots actually confirm — a flat
 * series would make every assertion below vacuous for the wrong reason.
 */
function volumelessBars(count = 160) {
  const out: { time: number; open: number; high: number; low: number; close: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const close = 100 + Math.sin(i / 3) * 12 + i * 0.4;
    out.push({
      time: CAPTURED_AT - (count - i) * 60_000,
      open: close - 0.5,
      high: close + 2,
      low: close - 2,
      close,
    });
  }
  return out;
}

/** The same candles, with volume, for the side-by-side comparison. */
function withVolume(bars: ReturnType<typeof volumelessBars>) {
  return bars.map((b, i) => ({ ...b, volume: 1_000 + (i % 7) * 50 }));
}

function publish(bars: unknown) {
  return createChartMarketStatePublication({
    symbol: "BTC",
    timeframe: "15m",
    session: "24X7",
    ticker: { price: 100, change: 0, changePct: 0, volume: 0 },
    recentTicks: [],
    source: "coinbase",
    barSource: "yahoo",
    connected: true,
    capturedAt: CAPTURED_AT,
    nectar: {
      schemaVersion: SESSION_NECTAR_SCHEMA_VERSION,
      startedAt: CAPTURED_AT - 60_000,
      channels: [],
      receipts: {
        received: 0,
        accepted: 0,
        quarantined: 0,
        duplicates: 0,
        outOfOrder: 0,
        sequenceGaps: 0,
        sequenceUnavailable: 0,
      },
      unsupportedCapabilities: 0,
      retentionState: "SESSION_ONLY_NO_RAW_PAYLOADS",
    },
    bars,
  } as Parameters<typeof createChartMarketStatePublication>[0]);
}

describe("the compiled owner reads a swing sequence off volume-free candles", () => {
  it("VACUITY GUARD: these candles really do contain a readable sequence", () => {
    // If the fixture stopped producing pivots, `measured: false` below would
    // look like the bug and `measured: true` could never be asserted at all.
    const vm = selectMarketStructure(withVolume(volumelessBars()));
    expect(vm.measured).toBe(true);
    expect(vm.swingHighs.length).toBeGreaterThanOrEqual(2);
  });

  it("REPRODUCES THE LIVE DEFECT'S CAUSE: volume is not an input to structure", () => {
    // The load-bearing equality. Deleting `volume` must not change a single
    // pivot, because the detector never read it. Before this repair the
    // volume-free call did not merely differ — it could not be made at all
    // without a cast asserting a field the venue never printed.
    const withVol = selectMarketStructure(withVolume(volumelessBars()));
    const without = selectMarketStructure(volumelessBars());
    expect(without.measured).toBe(true);
    expect(without.bias).toBe(withVol.bias);
    expect(without.swingHighs).toEqual(withVol.swingHighs);
    expect(without.swingLows).toEqual(withVol.swingLows);
  });
});

describe("the Passport resolves STRUCTURE on the deck's volume-free candles", () => {
  it("STRUCTURE is resolved — the chart's 120 bars are no longer invisible to it", () => {
    const { state } = publish(volumelessBars());
    expect(
      state.dimensions?.structure?.resolution,
      "structure went unresolved on candles it can fully read — the deck's " +
        "market field says '120 bars · Read just now' eleven pixels above a " +
        "Passport claiming no structure evidence exists",
    ).toBe("RESOLVED");
  });

  it("and still cites the CANDLE venue, not the tape venue", () => {
    // Over-correction guard: a new adapter is a new place to lose the
    // provenance repair shipped in a0f7a053.
    const { state } = publish(volumelessBars());
    const cited = (state.dimensions?.structure?.evidence ?? []).map((e) => e.source ?? "");
    expect(cited.length).toBeGreaterThan(0);
    expect(cited).toContain("yahoo");
    expect(cited).not.toContain("coinbase");
  });
});

describe("the repair is NARROW — the volume-hungry dimensions stay honest", () => {
  it("PROFILE, LOCATION and AGGRESSION remain unresolved without volume", () => {
    // These are distributions and effort. With no volume there is nothing to
    // measure, and resolving them here would be inventing a number. If a
    // future edit routes one of them through `structureBarsFrom`, this goes
    // red — which is the point.
    const { state } = publish(volumelessBars());
    for (const key of ["profile", "location", "aggression"] as const) {
      expect(
        state.dimensions?.[key]?.resolution,
        `${key} resolved on candles carrying no volume — it has no basis to`,
      ).not.toBe("RESOLVED");
    }
  });

  it("and they DO resolve once the venue actually prints volume", () => {
    // Anti-vacuity for the test above: without this, a dimension that was
    // permanently broken would satisfy it for entirely the wrong reason.
    const { state } = publish(withVolume(volumelessBars()));
    expect(state.dimensions?.aggression?.resolution).not.toBe("UNRESOLVED");
    expect(state.dimensions?.structure?.resolution).toBe("RESOLVED");
  });

  it("a bar missing open or close is still dropped — thin is not malformed", () => {
    // `structureBarsFrom` relaxes ONLY the volume requirement. A candle with
    // no close is not a low-information candle, it is a broken one.
    const bars: unknown[] = [...volumelessBars(), { time: CAPTURED_AT, open: 1, high: 2, low: 0 }];
    const { state } = publish(bars);
    expect(state.dimensions?.structure?.resolution).toBe("RESOLVED");
    // The malformed bar must not have changed the verdict the window produced.
    //
    // This assertion originally compared `.narrative`, a field that does not
    // exist on MarketStateDimension. It PASSED — undefined equals undefined —
    // and only `tsc --noEmit` objected. Worth recording: a test policing the
    // silence of unread fields was itself silently vacuous.
    const clean = publish(volumelessBars());
    expect(state.dimensions?.structure?.value).toBe(
      clean.state.dimensions?.structure?.value,
    );
    expect(state.dimensions?.structure?.value).not.toBeNull();
  });
});
