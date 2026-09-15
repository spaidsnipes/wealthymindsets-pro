import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createChartMarketStatePublication,
  type ChartMarketStatePublicationInput,
} from "./chartMarketStatePublisher";
import type { SessionNectarSnapshot } from "./sessionNectar";
import { produceCanonicalMarketState } from "./produceCanonicalMarketState";
import { selectMarketStory } from "./viewModels/selectMarketStory";

const nectar: SessionNectarSnapshot = {
  schemaVersion: "wm.session-nectar.v1",
  startedAt: 1_000,
  updatedAt: 1_900,
  channels: [{
    schemaVersion: "wm.market-coverage.v1",
    instrumentId: "BTC-USD",
    normalizedSymbol: "BTC",
    channel: "trade",
    providerPath: "coinbase-client-ws",
    coverageState: "COLLECTING",
    memoryState: "SESSION_ONLY",
    persistenceRight: "UNKNOWN",
    rightsPolicyId: "wm.rights.unknown.v1",
    observedFrom: 1_000,
    observedThrough: 1_900,
    lastEventAt: 1_900,
    observedEventCount: 10,
    gapCount: 0,
    fidelity: "OBSERVED",
    collectionScope: "FOREGROUND_TAB",
    detail: "test",
  }],
  receipts: { received: 10, accepted: 10, duplicates: 0, quarantined: 0, outOfOrder: 0, sequenceGaps: 0, sequenceUnavailable: 0 },
  unsupportedCapabilities: 0,
  retentionState: "SESSION_ONLY_NO_RAW_PAYLOADS",
};

const base = (): ChartMarketStatePublicationInput => ({
  symbol: "BTC",
  timeframe: "2m",
  session: "24X7",
  ticker: { price: 65_000, change: 10, changePct: 0.02, volume: 100 },
  recentTicks: [{ price: 65_000, size: 0.1, side: "buy" as const, time: 1_950, trade: true }],
  source: "coinbase" as const,
  connected: true,
  capturedAt: 2_000,
  nectar,
});

describe("chart Market State publisher", () => {
  it.each(["moomoo", "longbridge", "webull"] as const)("preserves observed %s prices as partial, missing as unavailable, stale as stale", (source) => {
    const input = {...base(), source};
    const observed = createChartMarketStatePublication(input);
    expect(observed.qualityState).toBe("PARTIAL");
    expect(observed.state.price.last).toBe(65_000);
    expect(createChartMarketStatePublication({...input, recentTicks: []}).qualityState).toBe("UNAVAILABLE");
    expect(createChartMarketStatePublication({...input, capturedAt: 21_950}).qualityState).toBe("STALE");
  });
  it("retains an observed stale price without calling it live or absent", () => {
    const input = {...base(), capturedAt: 21_950};
    const publication = createChartMarketStatePublication(input);
    expect(publication.qualityState).toBe("STALE");
    expect(publication.state.price.last).toBe(65_000);
    expect(publication.state.price.eventAt).toBe(1_950);
  });
  it("maps a matching timestamped live tick and current Nectar coverage", () => {
    const publication = createChartMarketStatePublication(base());

    expect(publication.qualityState).toBe("LIVE");
    expect(publication.state.price).toEqual({ last: 65_000, bid: null, ask: null, eventAt: 1_950 });
    expect(publication.state.coverage).toHaveLength(1);
    expect(publication.state.timeframeContext).toEqual(["2m"]);
    expect(publication.state.executableIdentity).toBe("BTC-USD");
  });

  it("omits an unmatched displayed price instead of inventing its event time", () => {
    const value = base();
    value.ticker.price = 66_000;
    const publication = createChartMarketStatePublication(value);

    expect(publication.qualityState).toBe("UNAVAILABLE");
    expect(publication.state.price.last).toBeNull();
    expect(publication.state.contradictions).toContain(
      "Displayed ticker price has no matching timestamped runtime tick; canonical price evidence omitted.",
    );
  });

  it("omits a future-dated matching tick instead of violating snapshot chronology", () => {
    const value: ChartMarketStatePublicationInput = {
      ...base(),
      recentTicks: [{ price: 65_000, size: 0.1, side: "buy", time: 2_001, trade: true }],
    };
    const publication = createChartMarketStatePublication(value);

    expect(publication.qualityState).toBe("UNAVAILABLE");
    expect(publication.state.price.last).toBeNull();
  });

  it("keeps an unentitled-unproven quote PARTIAL rather than calling it delayed", () => {
    const value = { ...base(), source: "yahoo" as const };
    const publication = createChartMarketStatePublication(value);
    expect(publication.qualityState).toBe("PARTIAL");
  });

  it("does not make continuous futures executable", () => {
    const value: ChartMarketStatePublicationInput = {
      ...base(),
      symbol: "NQ1!",
      source: "yahoo",
      ticker: { ...base().ticker, price: 29_000 },
      recentTicks: [{ price: 29_000, size: 1, side: "buy", time: 1_950 }],
    };
    const publication = createChartMarketStatePublication(value);

    expect(publication.state.assetClass).toBe("futures");
    expect(publication.state.executableIdentity).toBeNull();
    expect(publication.qualityState).toBe("PARTIAL");
  });

  /* ── Real from-USE defect (2026-09-03) ──────────────────────────────
   * /command-deck displayed FOUR different missing-counts for one snapshot:
   * header pill "1 missing", panel "MISSING (1)", Passport "0/8 resolved",
   * decision chain "9 unknown". Root cause: `unknowns` held a single COMPOUND
   * sentence naming all eight dimensions, so `unknowns.length` was 1 while the
   * real evidence debt was 8.
   *
   * Canon: Visual Systems Execution Canon Asset 07 — evidence debt is a LEDGER
   * of individually payable questions, not one lump narrative. */
  describe("evidence-debt count agreement", () => {
    it("emits one unknown entry per unresolved dimension, never a compound sentence", () => {
      const publication = createChartMarketStatePublication(base());
      const unknowns = publication.state.unknowns ?? [];

      // Every entry names exactly one dimension.
      expect(unknowns.length).toBeGreaterThan(1);
      for (const u of unknowns) {
        expect(u).toMatch(/ is unresolved until a verified engine publishes evidence\.$/);
        // No compound "A, B, and C are unresolved" lump.
        expect(u).not.toContain(" are unresolved");
        expect(u.split(",").length).toBe(1);
      }
    });

    it("unknowns.length equals the number of dimensions NOT resolved by the publisher", () => {
      const publication = createChartMarketStatePublication(base());
      const unknowns = publication.state.unknowns ?? [];
      const dims = publication.state.dimensions ?? {};

      // The publisher derives orderFlow + volatility; the other six canonical
      // dimensions have no engine yet. Total canonical dimensions = 8.
      const TOTAL_DIMENSIONS = 8;
      const resolvedByPublisher = Object.values(dims).filter(
        (d) => d && (d as { resolution?: string }).resolution === "RESOLVED",
      ).length;

      expect(unknowns.length).toBe(TOTAL_DIMENSIONS - resolvedByPublisher);
    });

    it("a resolved dimension is removed from the debt ledger, not just reworded", () => {
      // Rich tape → orderFlow and volatility both resolve.
      const ticks = [];
      for (let i = 0; i < 30; i++) {
        ticks.push({
          price: 65_000 + (i % 7) * 3,
          size: 0.1,
          side: (i % 3 === 0 ? "sell" : "buy") as "buy" | "sell",
          time: 1_900 + i,
          trade: true,
        });
      }
      const rich = createChartMarketStatePublication({ ...base(), recentTicks: ticks });
      const lean = createChartMarketStatePublication({ ...base(), recentTicks: [] });

      expect(rich.state.unknowns!.length).toBeLessThan(lean.state.unknowns!.length);
      expect(rich.state.unknowns!.some((u) => u.startsWith("Order flow"))).toBe(false);
    });
  });

  /* ── Real from-USE defect (2026-09-10) ──────────────────────────────
   * /command-deck rendered "UNKNOWN" in the largest type on the lead browser
   * surface for every symbol, forever — not because direction evidence was
   * missing, but because this publisher hard-coded "Direction" into the
   * unresolved list with no producer behind it. The per-trade tape it was
   * ALREADY rendering two panels lower carries a net-drift read.
   *
   * These tests are the revive guard: restoring the hard-code fails
   * "publishes a real Direction dimension" BY NAME. */
  describe("Direction is produced from evidence, not hard-coded unresolved", () => {
    function trendTicks(from: number, to: number, n: number) {
      const step = (to - from) / (n - 1);
      return Array.from({ length: n }, (_, i) => ({
        price: from + step * i,
        size: 0.1,
        side: (step > 0 ? "buy" : "sell") as "buy" | "sell",
        time: 1_900 + i,
        trade: true,
      }));
    }

    it("publishes a real Direction dimension — the key exists on every snapshot", () => {
      const publication = createChartMarketStatePublication(base());
      expect(publication.state.dimensions).toHaveProperty("direction");
    });

    it("a sustained one-way rally clears Direction off the debt ledger", () => {
      const rally = createChartMarketStatePublication({
        ...base(),
        recentTicks: trendTicks(65_000, 65_400, 30),
      });
      const dir = (rally.state.dimensions as Record<string, { resolution?: string; value?: unknown }>).direction;
      expect(dir?.resolution).toBe("RESOLVED");
      expect(dir?.value).toBe("UP");
      expect(rally.state.unknowns!.some((u) => u.startsWith("Direction"))).toBe(false);
    });

    it("a sustained selloff resolves DOWN", () => {
      const selloff = createChartMarketStatePublication({
        ...base(),
        recentTicks: trendTicks(65_400, 65_000, 30),
      });
      const dir = (selloff.state.dimensions as Record<string, { value?: unknown }>).direction;
      expect(dir?.value).toBe("DOWN");
    });

    it("NOT an over-correction — an empty tape leaves Direction unpaid", () => {
      const lean = createChartMarketStatePublication({ ...base(), recentTicks: [] });
      const dir = (lean.state.dimensions as Record<string, { resolution?: string }>).direction;
      expect(dir?.resolution).toBe("UNKNOWN");
      expect(lean.state.unknowns!.some((u) => u.startsWith("Direction"))).toBe(true);
    });

    /* THE FOUNDER-VISIBLE CLAIM.
     *
     * /command-deck's hero word comes from selectMarketStory, and every cheap
     * chapter guard in that engine gates on state.regime. While regime was
     * hard-coded unresolved, the story engine could not support ANY chapter,
     * so the hero printed "UNKNOWN" for every symbol in every session. This
     * test walks the real path — publisher → sealer → story engine — and
     * asserts the word actually changes. */
    it("a sustained rally moves the deck hero off UNKNOWN — publisher to story engine", () => {
      const rally = createChartMarketStatePublication({
        ...base(),
        recentTicks: trendTicks(65_000, 65_400, 30),
      });
      const sealed = produceCanonicalMarketState(rally.state, { qualityState: rally.qualityState });
      expect(sealed.regime.resolution).toBe("RESOLVED");
      expect(sealed.regime.value).toBe("TREND");

      // Regime must also leave the evidence-debt ledger — a dimension that is
      // resolved in `dimensions` but still listed as an unpaid unknown is the
      // four-numbers-one-truth defect this file already fought once.
      expect(rally.state.unknowns!.some((u) => u.startsWith("Regime"))).toBe(false);

      const story = selectMarketStory(sealed, []);
      expect(story.resolution).toBe("RESOLVED");
      expect(story.current?.chapter).toBe("TREND_EXPANSION");
      // The chapter must carry the evidence it was decided on — a hero word
      // with no receipts behind it is exactly what this producer replaces.
      expect(story.current!.evidence.length).toBeGreaterThan(0);
    });

    it("an empty tape still yields an honest UNKNOWN hero — no invented chapter", () => {
      const lean = createChartMarketStatePublication({ ...base(), recentTicks: [] });
      const sealed = produceCanonicalMarketState(lean.state, { qualityState: lean.qualityState });
      expect(lean.state.unknowns!.some((u) => u.startsWith("Regime"))).toBe(true);
      const story = selectMarketStory(sealed, []);
      expect(story.resolution).toBe("UNKNOWN");
      expect(story.current).toBeNull();
    });

    it("NOT an over-correction — two-sided chop leaves Direction unpaid", () => {
      const chop = [
        ...trendTicks(65_000, 65_400, 20),
        ...trendTicks(65_400, 65_000, 20).map((t, i) => ({ ...t, time: 1_950 + i })),
      ];
      const publication = createChartMarketStatePublication({ ...base(), recentTicks: chop });
      const dir = (publication.state.dimensions as Record<string, { resolution?: string }>).direction;
      expect(dir?.resolution).toBe("PARTIAL");
      expect(publication.state.unknowns!.some((u) => u.startsWith("Direction"))).toBe(true);
    });
  });

  /**
   * THE WIRE, NOT THE SELECTOR.
   *
   * `deriveLastBarClose` was fully truth-locked by its own suite and still the
   * MARKET tile read PRICE UNKNOWN on live /charts beside a header rendering
   * the very close it refused to name. The defect was never in the selector —
   * it was in the forwarding: `usePublishChartMarketState` destructured its
   * argument and did not name `bars`, so the candles were discarded one call
   * BEFORE the selector ran. A pure-function suite cannot see that, which is
   * exactly why this section tests the wire.
   */
  describe("bar-close wire (the silent drop)", () => {
    // Mirrors the live measurement: TSLA 1h, 359.02, bar opened 2026-09-15.
    const BAR_OPEN_SECONDS = 1_789_412_400;
    const withBars = () => ({
      ...base(),
      symbol: "TSLA",
      timeframe: "1h",
      capturedAt: BAR_OPEN_SECONDS * 1000 + 600_000,
      bars: [
        { time: BAR_OPEN_SECONDS - 3_600, open: 357, high: 360, low: 356, close: 358.11, volume: 5 },
        { time: BAR_OPEN_SECONDS, open: 358.11, high: 360.5, low: 357.4, close: 359.02, volume: 7 },
      ],
    });

    it("carries a forwarded bar close all the way into published state", () => {
      const publication = createChartMarketStatePublication(withBars());
      expect(publication.state.lastBar).not.toBeNull();
      expect(publication.state.lastBar!.close).toBe(359.02);
      expect(publication.state.lastBar!.timeframe).toBe("1h");
      expect(publication.state.lastBar!.barOpenedAtMs).toBe(BAR_OPEN_SECONDS * 1000);
    });

    it("survives canonical sealing — the tile reads the SEALED state, not the draft", () => {
      const publication = createChartMarketStatePublication(withBars());
      const sealed = produceCanonicalMarketState(publication.state, {
        qualityState: publication.qualityState,
      });
      expect(sealed.lastBar?.close).toBe(359.02);
      expect(sealed.lastBar?.timeframe).toBe("1h");
    });

    it("still refuses to invent a close when no bars are forwarded", () => {
      // The repair must not become an overclaim. Absent bars stay absent.
      const publication = createChartMarketStatePublication({ ...withBars(), bars: undefined });
      expect(publication.state.lastBar).toBeNull();
    });

    it("does NOT promote a bar close into price.last — provenance stays separate", () => {
      // `price.last` means a live trade printed. A candle close is not a print.
      const publication = createChartMarketStatePublication({ ...withBars(), recentTicks: [] });
      expect(publication.state.price.last).toBeNull();
      expect(publication.state.lastBar!.close).toBe(359.02);
    });
  });

  /**
   * SOURCE-TEXT SENTINEL against the silent-drop CLASS.
   *
   * The behavioural tests above exercise the pure producer, which the old bug
   * never reached. Only the hook's destructuring list stood between
   * ChartsDashboard and the producer, and TypeScript cannot flag a forwarder
   * that omits an OPTIONAL key. So the omission is asserted against directly,
   * by name, in the source text — the one place the failure was ever visible.
   */
  describe("usePublishChartMarketState forwarding enforcement", () => {
    const source = readFileSync(resolve(__dirname, "chartMarketStatePublisher.ts"), "utf8");
    const hook = source.slice(source.indexOf("export function usePublishChartMarketState"));

    it("names `bars` in the hook's destructuring — a forwarder must not decide by omission", () => {
      const destructuring = hook.slice(0, hook.indexOf("): void"));
      expect(destructuring).toMatch(/\n\s*bars,/);
    });

    it("forwards `bars` into createChartMarketStatePublication", () => {
      const call = hook.slice(
        hook.indexOf("createChartMarketStatePublication({"),
        hook.indexOf("capturedAt: Date.now()"),
      );
      expect(call).toMatch(/\n\s*bars,/);
    });

    it("depends on `bars` so the published close follows the newest candle", () => {
      // Forwarding without depending would freeze the close at whatever the
      // first publish happened to see — its own quiet untruth.
      const deps = hook.slice(hook.lastIndexOf("}, ["), hook.lastIndexOf("]);"));
      expect(deps).toContain("bars");
    });
  });
});
