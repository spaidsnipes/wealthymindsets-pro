/**
 * CANDLE-DERIVED EVIDENCE MUST NAME THE CANDLE VENUE, NOT THE TAPE VENUE.
 *
 * FOUND FROM USE, production BTC 15m, 2026-09-18. `/charts` read
 * `STRUCTURE / RESOLVED / HIGHER HIGHS` while `/command-deck` — same symbol,
 * same timeframe, same instant — read `structure ?`.
 *
 * Neither surface was internally wrong. `/charts` compiles the swing sequence
 * from `/api/exchange` candles; the deck compiles it from `/api/yahoo`
 * candles. Two venues genuinely print different bars, so the DISAGREEMENT is
 * legitimate and this file does not try to abolish it.
 *
 * What was NOT legitimate: both surfaces stamped the same venue on their
 * evidence, because the publisher had exactly one `source` field and used the
 * TAPE source for everything. The deck therefore attributed a Yahoo-derived
 * swing sequence to `coinbase`. A trader comparing the two receipts could not
 * see WHY they differed — the receipts agreed about the one fact that would
 * have explained it.
 *
 * That is canon Weakness #1 arriving through DATA PROVENANCE rather than
 * through a wrong computation, and the symptom is the usual one: nothing. No
 * throw, no red test. A wrong source string renders exactly as convincingly as
 * a right one.
 *
 * So the attribution is asserted. Structure and aggression are derived from
 * CANDLES ALONE and never touch a tick, so they must follow `barSource`.
 * Order flow, volatility and direction are derived from TICKS alone and must
 * NOT — moving them would be the same defect pointing the other way.
 */

import { describe, expect, it } from "vitest";
import { createChartMarketStatePublication } from "./chartMarketStatePublisher";
import { SESSION_NECTAR_SCHEMA_VERSION } from "./sessionNectar";

const CAPTURED_AT = 1_700_000_000_000;

/** Enough whole candles for the swing detector and the effort window. */
function bars(count = 160) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    // A gentle zigzag so pivots actually confirm rather than degrading to
    // "unreadable", which would make every assertion below vacuous.
    const wave = Math.sin(i / 3) * 12 + i * 0.4;
    const close = 100 + wave;
    out.push({
      time: CAPTURED_AT - (count - i) * 60_000,
      open: close - 0.5,
      high: close + 2,
      low: close - 2,
      close,
      volume: 1_000 + (i % 7) * 50,
    });
  }
  return out;
}

function publish(over: Record<string, unknown> = {}) {
  return createChartMarketStatePublication({
    symbol: "BTC",
    timeframe: "15m",
    session: "24X7",
    ticker: { price: 100, change: 0, changePct: 0, volume: 0 },
    recentTicks: [],
    source: "coinbase",
    connected: true,
    capturedAt: CAPTURED_AT,
    nectar: {
      schemaVersion: SESSION_NECTAR_SCHEMA_VERSION,
      startedAt: CAPTURED_AT - 60_000,
      channels: [],
      // A stats ROLL-UP, not a list. Typed as an array this file still passed
      // at runtime, because nothing on the candle path reads it — which is the
      // same class of silence this whole file is about.
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
    bars: bars(),
    ...over,
  } as Parameters<typeof createChartMarketStatePublication>[0]);
}

/**
 * Every source string a dimension's evidence cites.
 *
 * Throws rather than returning `[]` when the dimension is missing. A missing
 * dimension would make `not.toContain(...)` pass for the same reason an empty
 * array does — vacuously — and that is precisely the failure mode this file
 * exists to refuse.
 */
function sourcesOf(
  dim: { evidence?: readonly { source?: string | null }[] } | undefined,
  label = "dimension",
): string[] {
  if (!dim) throw new Error(`${label} is absent — assertion would be vacuous`);
  return (dim.evidence ?? []).map((e) => e.source ?? "");
}

describe("candle-derived dimensions cite the CANDLE venue", () => {
  it("guards against a vacuous pass: the fixture actually produces evidence", () => {
    // If the fixture stopped resolving, every assertion below would pass over
    // an empty array and prove nothing at all.
    const { state } = publish();
    expect(sourcesOf(state.dimensions?.structure).length).toBeGreaterThan(0);
    expect(sourcesOf(state.dimensions?.aggression).length).toBeGreaterThan(0);
  });

  it("STRUCTURE follows barSource, not the tape source", () => {
    const { state } = publish({ source: "coinbase", barSource: "yahoo" });
    expect(sourcesOf(state.dimensions?.structure)).not.toContain("coinbase");
    expect(sourcesOf(state.dimensions?.structure)).toContain("yahoo");
  });

  it("AGGRESSION follows barSource, not the tape source", () => {
    const { state } = publish({ source: "coinbase", barSource: "yahoo" });
    expect(sourcesOf(state.dimensions?.aggression)).not.toContain("coinbase");
    expect(sourcesOf(state.dimensions?.aggression)).toContain("yahoo");
  });
});

describe("tick-derived dimensions must NOT follow barSource", () => {
  // The mirror-image defect. If a future edit routed these through the candle
  // venue, a tape observation would be attributed to a candle provider that
  // never saw the trade.
  const ticks = Array.from({ length: 40 }, (_, i) => ({
    time: CAPTURED_AT - (40 - i) * 1_000,
    price: 100 + i * 0.1,
    size: 1,
    side: i % 2 === 0 ? ("buy" as const) : ("sell" as const),
  }));

  it("ORDER FLOW, VOLATILITY and DIRECTION keep the tape source", () => {
    const { state } = publish({
      source: "coinbase",
      barSource: "yahoo",
      recentTicks: ticks,
    });
    for (const key of ["orderFlow", "volatility", "direction"] as const) {
      const cited = sourcesOf(state.dimensions?.[key], key);
      expect(cited, `${key} must not cite the candle venue`).not.toContain("yahoo");
    }
  });
});

describe("the fallback leaves an unteached caller exactly where it was", () => {
  it("omitting barSource keeps the tape source — no silent relabelling", () => {
    const { state } = publish({ source: "coinbase" });
    expect(sourcesOf(state.dimensions?.structure)).toContain("coinbase");
  });

  it("a blank barSource is treated as absent, not as a venue named ''", () => {
    // An empty string is what a half-wired caller passes. Citing it verbatim
    // would put a nameless venue on a receipt, which is worse than the
    // pre-existing wrong-but-legible one.
    const { state } = publish({ source: "coinbase", barSource: "   " });
    expect(sourcesOf(state.dimensions?.structure)).toContain("coinbase");
  });
});
