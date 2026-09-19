import { describe, it, expect } from "vitest";
import {
  YAHOO_BAR_SOURCE,
  ingestYahooCandles,
  toLegacySecondsTuple,
  yahooProvenance,
} from "./yahooCandleIngress";
import {
  BAR_PROVENANCES,
  SESSION_UNKNOWN,
  isSessionKnown,
  type LegacyOhlcvTuple,
} from "./canonicalBar";
import { MARKET_FIDELITIES } from "./marketFidelityAlgebra";

const t = (over: Partial<LegacyOhlcvTuple> = {}): LegacyOhlcvTuple => ({
  time: 1_700_000_000,
  open: 100,
  high: 110,
  low: 90,
  close: 105,
  volume: 1_000,
  ...over,
});

const ingest = (tuples: LegacyOhlcvTuple[], sourceMode: "native" | "reconstructed" = "native") =>
  ingestYahooCandles({
    symbolId: "TSLA",
    timeframe: "1m",
    sourceMode,
    tuples,
    receivedAt: 1_700_000_999_000,
  });

describe("yahooCandleIngress — the artery's first production consumer", () => {
  it("mints a CanonicalBar carrying every field a tuple cannot hold", () => {
    const { bars } = ingest([t()]);
    expect(bars).toHaveLength(1);
    const bar = bars[0];
    expect(bar.symbolId).toBe("TSLA");
    expect(bar.timeframe).toBe("1m");
    expect(bar.source).toBe(YAHOO_BAR_SOURCE);
    expect(bar.truthEpoch).toBe(0);
    expect(bar.barId).toContain("TSLA|1m|");
    // The two clocks stay separate and are both in milliseconds.
    expect(bar.asOf).toBe(1_700_000_000_000);
    expect(bar.receivedAt).toBe(1_700_000_999_000);
    expect(bar.asOf).not.toBe(bar.receivedAt);
  });

  /* ── THE HONEST HALF ──────────────────────────────────────────────────────
     These are not gaps waiting to be filled in a later atom. Yahoo's chart
     endpoint does not report a session, so the bar SAYS it does not know. */

  it("asserts ignorance of the session rather than inventing one", () => {
    const { bars } = ingest([t()]);
    expect(bars[0].sessionId).toBe(SESSION_UNKNOWN);
    expect(isSessionKnown(bars[0].sessionId)).toBe(false);
  });

  it("never claims EXECUTABLE, because a sessionless price cannot back that claim", () => {
    const { bars } = ingest([t()]);
    expect(bars[0].fidelity).toBe(MARKET_FIDELITIES.INDICATIVE);
    expect(bars[0].fidelity).not.toBe(MARKET_FIDELITIES.EXECUTABLE);
  });

  /* ── PROVENANCE: THE FACT THE PLANNER ALREADY KNEW AND COULD NOT SAY ────── */

  it("marks a reconstructed timeframe DERIVED, not REST_BACKFILL", () => {
    expect(yahooProvenance("reconstructed")).toBe(BAR_PROVENANCES.DERIVED);
    expect(yahooProvenance("native")).toBe(BAR_PROVENANCES.REST_BACKFILL);
    expect(ingest([t()], "reconstructed").bars[0].provenance).toBe(BAR_PROVENANCES.DERIVED);
    expect(ingest([t()], "native").bars[0].provenance).toBe(BAR_PROVENANCES.REST_BACKFILL);
  });

  /* ── REFUSAL, NOT REPAIR ─────────────────────────────────────────────────── */

  it("refuses an inside-out bar instead of clamping it into a plausible shape", () => {
    const { bars, refusals } = ingest([t({ high: 50, low: 90 })]);
    expect(bars).toHaveLength(0);
    expect(refusals).toHaveLength(1);
    expect(refusals[0].reason).toContain("inside out");
    expect(refusals[0].atSeconds).toBe(1_700_000_000);
  });

  it("refuses a wick the market never printed rather than manufacturing one", () => {
    const { bars, refusals } = ingest([t({ high: 101, close: 105 })]);
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("manufacture a wick");
  });

  it("refuses a non-finite timestamp — it cannot be placed on any axis", () => {
    const { bars, refusals } = ingest([t({ time: Number.NaN })]);
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("not a finite number");
  });

  it("refuses the same timestamp delivered twice — that is the double-count family", () => {
    // NOTE the close stays inside [low, high]. Geometry is checked BEFORE
    // collision — correctly, since a malformed bar must not be admitted even as
    // a supersede — so a malformed duplicate reports the GEOMETRY reason and
    // this test would be proving the wrong refusal. Found by writing it wrong.
    const { bars, refusals } = ingest([t(), t({ close: 106 })]);
    expect(bars).toHaveLength(1);
    expect(bars[0].close).toBe(105);      // first admission stands
    expect(refusals).toHaveLength(1);
    expect(refusals[0].reason).toContain("does not supersede");
  });

  it("keeps refusals rather than swallowing them, so a gap can be disclosed", () => {
    const { bars, refusals } = ingest([t(), t({ time: 1_700_000_060, high: 1, low: 9 })]);
    expect(bars).toHaveLength(1);
    expect(refusals).toHaveLength(1);
    expect(refusals[0].atSeconds).toBe(1_700_000_060);
  });

  /* ── ORDER ───────────────────────────────────────────────────────────────── */

  it("orders by asOf, never by arrival", () => {
    const { bars } = ingest([
      t({ time: 1_700_000_120 }),
      t({ time: 1_700_000_000 }),
      t({ time: 1_700_000_060 }),
    ]);
    expect(bars.map(b => b.asOf)).toEqual([
      1_700_000_000_000, 1_700_000_060_000, 1_700_000_120_000,
    ]);
  });

  /* ── THE UNIT TRAP ───────────────────────────────────────────────────────── */

  it("narrows back to SECONDS — the unit this repo's renderer actually eats", () => {
    const { bars } = ingest([t()]);
    const tuple = toLegacySecondsTuple(bars[0]);
    expect(tuple.time).toBe(1_700_000_000);
    expect(tuple).toEqual(t());
  });

  it("round-trips the six numbers unchanged, so the wire shape is untouched", () => {
    const input = [t({ time: 1_700_000_000 }), t({ time: 1_700_000_060, close: 109 })];
    expect(ingest(input).bars.map(toLegacySecondsTuple)).toEqual(input);
  });

  it("refuses to mint an identity for a bar with no symbol", () => {
    const { bars, refusals } = ingestYahooCandles({
      symbolId: "  ",
      timeframe: "1m",
      sourceMode: "native",
      tuples: [t()],
      receivedAt: 1,
    });
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("no identity to mint");
  });
});
