/**
 * Canon Weakness #1 — multi-fidelity disagreement on ONE page.
 *
 * MEASURED LIVE 2026-09-10, https://wealthymindsetspro.com/command-deck,
 * NQ1!, tab VISIBLE and FOCUSED (not the background-tab artifact):
 *
 *   ticker tape   NQ1!  ● ACTIVE DEGRADED  29,147  ↘ −301.50
 *   hero truth    UNKNOWN / NQ1! / ! STALE / 29147 / OBSERVATION AGE UNVERIFIED
 *
 * Same instrument, same page, same instant, same grader. The PRICES agreed;
 * the FIDELITY GRADES contradicted — and the hero additionally asserted STALE
 * (a claim ABOUT observation age) directly beside "OBSERVATION AGE UNVERIFIED"
 * (a statement that the age is not provable).
 *
 * ROOT CAUSE — the grade was decided by WHO ASKED, not by the evidence:
 *   TickerTape  -> priceSourceBadge(src, conn, sess, {present:true})
 *                  `fresh` omitted  -> yahoo arm  -> ACTIVE DEGRADED
 *   deck publisher -> priceSourceBadge(src, conn, undefined,
 *                  {present:true, fresh: capturedAt - tick.time < 20_000})
 *                  A yahoo REST quote is minutes old BY DESIGN, so fresh=false
 *                  short-circuits to STALE PIPELINE -> qualityState "STALE".
 *
 * A per-trade-tape recency window is not a freshness receipt for a provider
 * that has no per-trade tape. Canon: FIDELITY IS PER CAPABILITY, NOT A
 * SYMBOL-WIDE INSULT.
 */
import { describe, expect, it } from "vitest";
import { priceSourceBadge, REST_QUOTE_SOURCES } from "../priceSource";
import {
  createChartMarketStatePublication,
  type ChartMarketStatePublicationInput,
} from "./chartMarketStatePublisher";
import type { SessionNectarSnapshot } from "./sessionNectar";

const nectar: SessionNectarSnapshot = {
  schemaVersion: "wm.session-nectar.v1",
  startedAt: 1_000,
  updatedAt: 1_900,
  channels: [],
  receipts: {
    received: 0, accepted: 0, duplicates: 0, quarantined: 0,
    outOfOrder: 0, sequenceGaps: 0, sequenceUnavailable: 0,
  },
  unsupportedCapabilities: 0,
  retentionState: "SESSION_ONLY_NO_RAW_PAYLOADS",
};

/** The live NQ1! shape: a yahoo REST quote whose tick is ~10 minutes old. */
const TICK_AT = 1_000_000;
const TEN_MINUTES_LATER = TICK_AT + 600_000;

const liveNq1 = (): ChartMarketStatePublicationInput => ({
  symbol: "NQ1!",
  timeframe: "15M",
  session: "RTH",
  ticker: { price: 29_147, change: -301.5, changePct: -1.02, volume: 515_690 },
  recentTicks: [{ price: 29_147, size: 1, side: "sell" as const, time: TICK_AT }],
  source: "yahoo" as const,
  connected: true,
  capturedAt: TEN_MINUTES_LATER,
  nectar,
});

describe("deck hero fidelity must agree with the ticker tape (Canon Weakness #1)", () => {
  // PRECONDITION. If the tape's own call ever stops returning ACTIVE DEGRADED,
  // the agreement assertions below become vacuously true. Assert the other
  // side of the comparison explicitly so this suite cannot rot into a no-op.
  it("PRECONDITION: the tape's call shape grades a yahoo quote ACTIVE DEGRADED", () => {
    const tapeBadge = priceSourceBadge("yahoo", true, undefined, { present: true });
    expect(tapeBadge.label).toBe("ACTIVE DEGRADED");
    expect(tapeBadge.availability).toBeUndefined();
  });

  it("PRECONDITION: a seconds-scale freshness budget still forces STALE PIPELINE", () => {
    // The mechanism itself is intact and correct — it simply must not be
    // aimed at a provider that has no per-trade tape.
    const starved = priceSourceBadge("yahoo", true, undefined, { present: true, fresh: false });
    expect(starved.label).toBe("STALE PIPELINE");
  });

  it("the live NQ1! packet no longer publishes STALE", () => {
    expect(createChartMarketStatePublication(liveNq1()).qualityState).not.toBe("STALE");
  });

  it("publishes PARTIAL — the canonical-vocabulary synonym of ACTIVE DEGRADED", () => {
    const publication = createChartMarketStatePublication(liveNq1());
    expect(publication.qualityState).toBe("PARTIAL");
    // and the observation is retained, not thrown away
    expect(publication.state.price.last).toBe(29_147);
    expect(publication.state.price.eventAt).toBe(TICK_AT);
  });

  it.each(["yahoo", "finnhub"] as const)(
    "%s: deck quality and tape label describe the same fidelity, not two",
    (source) => {
      const tapeLabel = priceSourceBadge(source, true, undefined, { present: true }).label;
      const deckQuality = createChartMarketStatePublication({ ...liveNq1(), source }).qualityState;
      expect(tapeLabel).toBe("ACTIVE DEGRADED");
      expect(deckQuality).toBe("PARTIAL");
    },
  );

  it("STALE is not asserted beside an unprovable observation age", () => {
    // The hero renders `qualityState` as its badge and, independently,
    // selectHeroPriceChronology as its age line. STALE is a claim ABOUT age;
    // it may never sit beside "observation age unverified".
    const { qualityState } = createChartMarketStatePublication(liveNq1());
    expect(qualityState).not.toBe("STALE");
  });
});

describe("NOT an over-correction — staleness survives where it is real", () => {
  it("a tape-bearing source with a stalled tape still publishes STALE", () => {
    const alpaca = createChartMarketStatePublication({
      ...liveNq1(), symbol: "TSLA", source: "alpaca" as const,
    });
    expect(alpaca.qualityState).toBe("STALE");
  });

  it("a REST-quote source with NO observation at all still publishes UNAVAILABLE", () => {
    const blind = createChartMarketStatePublication({ ...liveNq1(), recentTicks: [] });
    expect(blind.qualityState).toBe("UNAVAILABLE");
    expect(blind.state.price.last).toBeNull();
  });

  it("a fresh tape-bearing source is unaffected and still reaches LIVE", () => {
    const fresh = createChartMarketStatePublication({
      ...liveNq1(),
      symbol: "BTC",
      source: "coinbase" as const,
      capturedAt: TICK_AT + 1_000,
    });
    expect(fresh.qualityState).toBe("LIVE");
  });

  it("the REST-quote set is narrow and named — no silent expansion", () => {
    expect([...REST_QUOTE_SOURCES].sort()).toEqual(["finnhub", "yahoo"]);
    // Broker feeds are NOT exempt: they may carry a tape, so they keep their
    // staleness budget (locked by chartMarketStatePublisher.test.ts).
    for (const broker of ["moomoo", "longbridge", "webull", "alpaca"]) {
      expect(REST_QUOTE_SOURCES.has(broker)).toBe(false);
    }
  });
});
