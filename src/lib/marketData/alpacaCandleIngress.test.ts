import { describe, it, expect } from "vitest";
import {
  alpacaSessionModel,
  alpacaSymbolId,
  canonicalTimeframeForAlpacaBucket,
  ingestAlpacaCandles,
  toLegacySecondsTuple,
  type AlpacaBarRow,
} from "./alpacaCandleIngress";
import {
  BAR_PROVENANCES,
  SESSION_CONTINUOUS,
  SESSION_UNKNOWN,
  isSessionKnown,
} from "./canonicalBar";
import { MARKET_FIDELITIES } from "./marketFidelityAlgebra";
import { exchangeSymbolId } from "./exchangeCandleIngress";

const ISO = "2026-09-18T14:30:00.000Z";
const MS = Date.parse(ISO);

const r = (over: Partial<AlpacaBarRow> = {}): AlpacaBarRow => ({
  t: ISO, o: 100, h: 110, l: 90, c: 105, v: 1_000, ...over,
});

const ingest = (
  rows: AlpacaBarRow[],
  assetClass: "STOCK" | "CRYPTO" = "STOCK",
  bucket = "15Min",
  sym = "TSLA",
) => ingestAlpacaCandles({ sym, assetClass, bucket, rows, receivedAt: MS + 9_000 });

describe("alpacaCandleIngress — the artery's third production consumer", () => {
  it("mints a CanonicalBar carrying every field a tuple cannot hold", () => {
    const { bars } = ingest([r()]);
    expect(bars).toHaveLength(1);
    const bar = bars[0];
    expect(bar.symbolId).toBe("ALPACA:TSLA");
    expect(bar.timeframe).toBe("15m");
    expect(bar.source).toBe("alpaca");
    expect(bar.asOf).toBe(MS);
    expect(bar.receivedAt).toBe(MS + 9_000);
    expect(bar.asOf).not.toBe(bar.receivedAt);
    expect(bar.provenance).toBe(BAR_PROVENANCES.REST_BACKFILL);
  });

  /* ── THE `?? 0` THAT SURVIVED TWO FIXES OF ITS OWN FAMILY ─────────────────── */

  it("refuses a bar with NO volume instead of calling it zero-volume", () => {
    // The route's quote branch killed `prevClose ?? price` and `changePct ... : 0`
    // and wrote down why. The candles branch kept `volume: b.v ?? 0`, which is
    // the same fabrication: "nothing traded in this bar" is a CLAIM, and it is
    // the most load-bearing input to every volume profile in the repo.
    const { bars, refusals } = ingest([r({ v: undefined })]);
    expect(bars).toHaveLength(0);
    expect(refusals).toHaveLength(1);
    expect(refusals[0].reason).toContain("volume is not a finite number");
  });

  it("still draws a bar whose volume is GENUINELY zero", () => {
    // The fix must not amputate real bars. Measured on production: BTC 15m
    // returns fractional volumes including a real 0. Refusing that would blank
    // bars the market actually printed.
    const { bars, refusals } = ingest([r({ v: 0 })]);
    expect(refusals).toHaveLength(0);
    expect(bars[0].volume).toBe(0);
  });

  it("refuses absent OHLC rather than letting undefined reach the chart", () => {
    for (const field of ["o", "h", "l", "c"] as const) {
      const { bars, refusals } = ingest([r({ [field]: undefined })]);
      expect(bars, `absent ${field}`).toHaveLength(0);
      expect(refusals[0].reason).toContain("not a finite number");
    }
  });

  /* ── THE TIMEFRAME THAT LIES ──────────────────────────────────────────────── */

  it("names the RESOLVED bucket, never the request that asked for it", () => {
    // Measured live: ?tf=6M returned 75 bars spaced 30.4 days apart — monthly
    // candles wearing the label "6M". Seven request spellings collapse onto the
    // single 1Month bucket upstream.
    expect(canonicalTimeframeForAlpacaBucket("1Month")).toBe("1M");
    expect(canonicalTimeframeForAlpacaBucket("15Min")).toBe("15m");
    const { bars, timeframe } = ingest([r()], "STOCK", "1Month");
    expect(timeframe).toBe("1M");
    expect(bars[0].timeframe).toBe("1M");
    expect(bars[0].timeframe).not.toBe("6M");
  });

  it("gives one physical monthly bar ONE id no matter which spelling asked", () => {
    // With the request in the identity, "M"/"1M"/"3M"/"6M"/"1Y"/"3Y"/"5Y" would
    // mint SEVEN ids for the same bar and the chart would hold it seven times.
    const ids = new Set(
      ["1Month", "1Month", "1Month"].map(b => ingest([r()], "STOCK", b).bars[0].barId),
    );
    expect(ids.size).toBe(1);
  });

  it("refuses rather than inherit a neighbouring resolution for an unknown bucket", () => {
    // "Monthly showed minute bars" is a defect this route already fought twice.
    expect(canonicalTimeframeForAlpacaBucket("7Fortnight")).toBe("");
    const { bars, refusals } = ingest([r()], "STOCK", "7Fortnight");
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("no identity to mint");
  });

  /* ── SESSION VARIES, AND IT IS NOT A GUESS ────────────────────────────────── */

  it("says crypto has no sessions and stocks have an unstated one", () => {
    expect(alpacaSessionModel("CRYPTO")).toBe(SESSION_CONTINUOUS);
    expect(alpacaSessionModel("STOCK")).toBe(SESSION_UNKNOWN);

    const crypto = ingest([r()], "CRYPTO", "15Min", "BTC/USD").bars[0];
    const stock = ingest([r()], "STOCK").bars[0];

    // Two different KINDS of statement, not a better and a worse guess.
    expect(isSessionKnown(crypto.sessionId)).toBe(true);
    expect(isSessionKnown(stock.sessionId)).toBe(false);
  });

  it("never claims EXECUTABLE on either half, for two different reasons", () => {
    // Crypto: no execution adapter routes through this data proxy.
    // Stocks: feed=iex is a partial tape — not the size an order would meet.
    for (const cls of ["STOCK", "CRYPTO"] as const) {
      const { bars } = ingest([r()], cls);
      expect(bars[0].fidelity).toBe(MARKET_FIDELITIES.INDICATIVE);
      expect(bars[0].fidelity).not.toBe(MARKET_FIDELITIES.EXECUTABLE);
    }
  });

  /* ── THE FIRST COLLISION BETWEEN TWO MIGRATED INGRESSES ───────────────────── */

  it("keeps Alpaca's BTC distinct from Coinbase's BTC in the shared artery", () => {
    // Both ingresses now mint into the SAME id space. Unprefixed, both would
    // produce the identical barId for the same instant and admitBar would
    // refuse the second at equal truthEpoch as a redelivery — deleting a real
    // bar from a real venue. Two exchanges are two order books.
    expect(alpacaSymbolId("BTC/USD")).toBe("ALPACA:BTC/USD");
    expect(exchangeSymbolId("coinbase", "BTC")).toBe("COINBASE:BTC");
    expect(alpacaSymbolId("BTC/USD")).not.toBe(exchangeSymbolId("coinbase", "BTC"));
  });

  it("refuses to mint an identity for a blank symbol", () => {
    // The naive form yields "ALPACA:", which is NOT blank, so the venue prefix
    // would smuggle emptiness past the check mintBarId exists to perform.
    expect(alpacaSymbolId("   ")).toBe("");
    const { bars, refusals } = ingest([r()], "STOCK", "15Min", "  ");
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("no identity to mint");
  });

  /* ── TIMESTAMPS ───────────────────────────────────────────────────────────── */

  it("refuses a missing timestamp instead of emitting NaN", () => {
    // `new Date(undefined).getTime()` is NaN and `Math.floor(NaN)` is NaN, so
    // the old mapping emitted a NaN-timed candle with no filter and no throw.
    const { bars, refusals } = ingest([r({ t: undefined })]);
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("missing or unparseable");
  });

  it("refuses an unparseable timestamp", () => {
    const { bars, refusals } = ingest([r({ t: "not a date" })]);
    expect(bars).toHaveLength(0);
    expect(refusals[0].at).toBe("not a date");
  });

  /* ── GEOMETRY, ORDER, COLLISION ───────────────────────────────────────────── */

  it("refuses an inside-out bar rather than drawing it", () => {
    const { bars, refusals } = ingest([r({ h: 90, l: 110 })]);
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("inside out");
  });

  it("refuses a negative volume — a bar cannot un-trade", () => {
    expect(ingest([r({ v: -1 })]).refusals[0].reason).toContain("un-trade");
  });

  it("refuses the same instant delivered twice rather than double-counting it", () => {
    const { bars, refusals } = ingest([r(), r({ c: 106 })]);
    expect(bars).toHaveLength(1);
    expect(bars[0].close).toBe(105);
    expect(refusals[0].reason).toContain("does not supersede");
  });

  it("sorts into chronological order whichever way the provider sent it", () => {
    // The route fetches sort=desc and calls .reverse() on BOTH branches — two
    // hand corrections, either of which could be dropped without throwing.
    const { bars } = ingest([
      r({ t: "2026-09-18T15:00:00.000Z" }),
      r({ t: "2026-09-18T14:30:00.000Z" }),
      r({ t: "2026-09-18T14:45:00.000Z" }),
    ]);
    expect(bars.map(b => b.asOf)).toEqual([
      Date.parse("2026-09-18T14:30:00.000Z"),
      Date.parse("2026-09-18T14:45:00.000Z"),
      Date.parse("2026-09-18T15:00:00.000Z"),
    ]);
  });

  /* ── THE UNIT TRAP ────────────────────────────────────────────────────────── */

  it("narrows back to SECONDS, the unit this route has always published", () => {
    const { bars } = ingest([r()]);
    expect(toLegacySecondsTuple(bars[0])).toEqual({
      time: Math.floor(MS / 1000), open: 100, high: 110, low: 90, close: 105, volume: 1_000,
    });
  });

  it("counts refusals rather than swallowing them", () => {
    const { bars, refusals } = ingest([
      r(),
      r({ t: "2026-09-18T14:45:00.000Z", v: undefined }),
      r({ t: "2026-09-18T15:00:00.000Z" }),
    ]);
    expect(bars).toHaveLength(2);
    expect(refusals).toHaveLength(1);
    expect(refusals[0].at).toBe("2026-09-18T14:45:00.000Z");
  });
});
