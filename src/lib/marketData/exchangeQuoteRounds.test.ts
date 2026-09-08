import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { InFlightRounds } from "./inFlightRounds";
import { fetchExchangeQuoteBody } from "./exchangeQuoteRounds";

/**
 * The `/api/exchange?type=quote` round, guarded the same way as the Yahoo one.
 *
 * HONEST LIMIT ON THE EVIDENCE — this defect was found STRUCTURALLY, not
 * measured live. The Yahoo pairs were timed on /charts (918/954ms etc); the
 * crypto rows sit behind the client-side auth gate and no seeded test session
 * exists, so the duplicate pairs for THIS endpoint were never observed. What is
 * verified is the shape: same three surfaces, same endpoint, four raw call
 * sites, no owner. That is enough to justify the owner and not enough to claim
 * a measured saving.
 */

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Every client surface that asks an exchange for a quote. */
const CONSUMERS = [
  "src/components/layout/TickerTape.tsx",
  "src/components/chart/WatchlistPanel.tsx",
  "src/hooks/useWebSocket.ts",
] as const;

describe("the exchange quote round has exactly one owner", () => {
  it("no client surface issues a raw /api/exchange type=quote fetch", () => {
    /**
     * THE load-bearing assertion. `type=candles` is a DIFFERENT question with a
     * different body shape (MainChart:1691 asks it), so the pattern is pinned to
     * `type=quote` rather than to the route — a rule that banned the whole route
     * would either fail on the candle caller or be silenced for it, and silence
     * is how the quote bypass would return.
     */
    const offenders: string[] = [];
    for (const file of CONSUMERS) {
      const code = strip(read(file));
      if (/fetch\(\s*[`"'][^`"']*\/api\/exchange[^`"']*type=quote/.test(code)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every consumer routes through the owner", () => {
    for (const file of CONSUMERS) {
      expect(strip(read(file))).toContain("fetchExchangeQuoteBody(");
    }
  });

  it("the owner is the only place the URL is built", () => {
    const owner = strip(read("src/lib/marketData/exchangeQuoteRounds.ts"));
    expect(owner).toMatch(/`\/api\/exchange\?ex=\$\{encodeURIComponent\(ex\)\}&coin=\$\{encodeURIComponent\(up\)\}&type=quote`/);
    expect(owner).toContain("`exchange:quote:${ex}:${up}`");
  });

  it("the round identity carries the VENUE, not just the coin", async () => {
    /**
     * useWebSocket resolves the exchange from the symbol (`BTC.KRAKEN`). Keyed
     * on the coin alone, a Kraken round would answer a Coinbase question for the
     * same coin — one venue's price presented as another's. That is the exact
     * silent failure the `ticks:` namespace exists to prevent, so it gets a
     * behavioural test and not a spelling one.
     */
    const rounds = new InFlightRounds();
    let starts = 0;
    let resolveK!: (v: unknown) => void;
    let resolveC!: (v: unknown) => void;
    const kraken = new Promise(r => { resolveK = r; });
    const coinbase = new Promise(r => { resolveC = r; });

    const a = rounds.run("exchange:quote:kraken:BTC", () => { starts += 1; return kraken; });
    const b = rounds.run("exchange:quote:coinbase:BTC", () => { starts += 1; return coinbase; });
    expect(starts).toBe(2);

    resolveK({ price: 1 });
    resolveC({ price: 2 });
    expect(await a).toEqual({ price: 1 });
    expect(await b).toEqual({ price: 2 });
  });

  it("the two surfaces' spellings of one venue join the SAME round", async () => {
    /**
     * useWebSocket hands the venue through as `COINBASE` (its symbol regex is
     * anchored on upper case) while the tape hands "coinbase". Unnormalised,
     * the two surfaces never join — the defect fully intact, wearing an owner's
     * name, which is worse than no owner because the file claims otherwise.
     *
     * This started as a rule that asserted the SPELLING `exchange.toLowerCase()`
     * appeared in the owner. A mutant that deleted the normalisation SURVIVED
     * it: the same string still appeared in `exchangeQuoteRoundInFlight` a few
     * lines down, so the rule was satisfied by a line it wasn't about. Drive
     * the real function instead.
     */
    const seen: string[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: unknown) => {
      seen.push(String(url));
      await new Promise(r => setTimeout(r, 0));
      return { json: async () => ({ price: 63120 }) } as unknown as Response;
    }) as typeof fetch;
    try {
      const [a, b] = await Promise.all([
        fetchExchangeQuoteBody("COINBASE", "btc"),
        fetchExchangeQuoteBody("coinbase", "BTC"),
      ]);
      expect(seen.length).toBe(1);
      expect(seen[0]).toBe("/api/exchange?ex=coinbase&coin=BTC&type=quote");
      expect(a).toEqual({ price: 63120 });
      expect(b).toEqual({ price: 63120 });
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("a different venue is NOT joined, driven through the real function", async () => {
    const seen: string[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: unknown) => {
      seen.push(String(url));
      await new Promise(r => setTimeout(r, 0));
      return { json: async () => ({ price: 1 }) } as unknown as Response;
    }) as typeof fetch;
    try {
      await Promise.all([
        fetchExchangeQuoteBody("kraken", "ETH"),
        fetchExchangeQuoteBody("coinbase", "ETH"),
      ]);
      expect(seen.length).toBe(2);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("NO consumer's AbortSignal enters the shared round", () => {
    const owner = strip(read("src/lib/marketData/exchangeQuoteRounds.ts"));
    expect(owner).not.toContain("signal");
  });

  it("the owner does not cache — a later poll still reaches the exchange", async () => {
    const rounds = new InFlightRounds();
    let starts = 0;
    const start = () => { starts += 1; return Promise.resolve(starts); };
    await rounds.run("exchange:quote:coinbase:BTC", start);
    expect(rounds.isInFlight("exchange:quote:coinbase:BTC")).toBe(false);
    await rounds.run("exchange:quote:coinbase:BTC", start);
    expect(starts).toBe(2);
  });

  it("concurrent asks from two surfaces become one round", async () => {
    const rounds = new InFlightRounds();
    let starts = 0;
    let resolve!: (v: unknown) => void;
    const body = new Promise(r => { resolve = r; });
    const start = () => { starts += 1; return body; };

    const tape = rounds.run("exchange:quote:coinbase:BTC", start);
    const socket = rounds.run("exchange:quote:coinbase:BTC", start);
    expect(starts).toBe(1);

    resolve({ price: 63120 });
    // One body, three readings: the tape reads selectQuoteChange, the watchlist
    // reads ROLLING_24H, useWebSocket reads resolveQuoteDayChange. Sharing the
    // ROUND shares only the URL and the JSON — never a verdict.
    expect(await tape).toEqual({ price: 63120 });
    expect(await socket).toEqual({ price: 63120 });
  });
});
