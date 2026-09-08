import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { InFlightRounds } from "./inFlightRounds";
import { fetchAlpacaQuoteBody, fetchFinnhubQuoteBody } from "./providerQuoteRounds";

/**
 * The last two legs of the display-quote provider chain.
 *
 * HONEST LIMIT: identified STRUCTURALLY, not measured live, and these are
 * FALLBACKS — they run only when the leg above them declines, so cross-surface
 * concurrency is likely but rarer here than for the measured Yahoo case. No
 * saving is claimed. What is verified is the shape: three raw Alpaca sites and
 * three raw Finnhub sites, on the same three surfaces, no owner.
 */

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const CONSUMERS = [
  "src/components/layout/TickerTape.tsx",
  "src/components/chart/WatchlistPanel.tsx",
  "src/hooks/useWebSocket.ts",
] as const;

/** Stub `fetch`, run the body, return every URL the round layer asked for. */
async function recordFetches(run: () => Promise<unknown>): Promise<string[]> {
  const seen: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: unknown) => {
    seen.push(String(url));
    await new Promise((r) => setTimeout(r, 0));
    return { ok: true, status: 200, json: async () => ({ price: 1 }) } as unknown as Response;
  }) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = realFetch;
  }
  return seen;
}

describe("the Alpaca and Finnhub quote rounds have exactly one owner", () => {
  it("no client surface issues a raw provider type=quote fetch", () => {
    /**
     * THE load-bearing assertion. `type=search` and `type=news` are DIFFERENT
     * questions on the same routes (MainLayout, ChartToolbar, ChartsDashboard
     * and news/page.tsx ask them), so the pattern is pinned to `type=quote`.
     * A rule that banned the whole route would have to be silenced for those
     * callers, and a silenced rule is how the bypass returns.
     */
    const offenders: string[] = [];
    for (const file of CONSUMERS) {
      const code = strip(read(file));
      for (const provider of ["alpaca", "finnhub"]) {
        const raw = new RegExp(`fetch\\(\\s*[\`"'][^\`"']*/api/${provider}\\?[^\`"']*type=quote`);
        if (raw.test(code)) offenders.push(`${file} -> ${provider}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every consumer routes through the owner, for BOTH providers", () => {
    for (const file of CONSUMERS) {
      const code = strip(read(file));
      expect(code).toContain("fetchAlpacaQuoteBody(");
      expect(code).toContain("fetchFinnhubQuoteBody(");
    }
  });

  it("the two providers do NOT share a round key", async () => {
    // One InFlightRounds instance serves both. Un-namespaced, an Alpaca round
    // would answer a Finnhub question for the same symbol — a different
    // provider's price wearing this provider's `src` label, which every
    // consumer then reports as provenance. Silent, and a truth defect rather
    // than a performance one.
    const seen = await recordFetches(() =>
      Promise.all([fetchAlpacaQuoteBody("AAPL"), fetchFinnhubQuoteBody("AAPL")]),
    );
    expect(seen.length).toBe(2);
    expect(seen).toContain("/api/alpaca?sym=AAPL&type=quote");
    expect(seen).toContain("/api/finnhub?sym=AAPL&type=quote");
  });

  it("two surfaces asking one provider for one symbol issue ONE request", async () => {
    const seen = await recordFetches(() =>
      Promise.all([fetchAlpacaQuoteBody("aapl"), fetchAlpacaQuoteBody("AAPL")]),
    );
    // Also proves case normalisation: the tape upper-cases before calling,
    // useWebSocket already holds `upper`. Unnormalised these never join and the
    // owner would be decorative.
    expect(seen).toEqual(["/api/alpaca?sym=AAPL&type=quote"]);
  });

  it("different symbols are never joined", async () => {
    const seen = await recordFetches(() =>
      Promise.all([fetchFinnhubQuoteBody("AAPL"), fetchFinnhubQuoteBody("MSFT")]),
    );
    expect(seen.length).toBe(2);
  });

  it("the owner is the only place either URL is built", () => {
    const owner = strip(read("src/lib/marketData/providerQuoteRounds.ts"));
    expect(owner).toContain("`alpaca:quote:${up}`");
    expect(owner).toContain("`finnhub:quote:${up}`");
  });

  it("NO consumer's AbortSignal enters the shared round", () => {
    /**
     * The round now carries a DEADLINE (abce4a6), so the owner legitimately
     * creates a signal of its own — "the file contains no `signal`" would be
     * the wrong rule, and was: it failed the moment the deadline landed. The
     * invariant is narrower and is what actually matters: no signal arrives
     * from OUTSIDE. A consumer's signal handed to a shared round would let one
     * surface unmounting cancel a request the other two are waiting on, and
     * they would read the abort as the provider's answer.
     */
    const owner = strip(read("src/lib/marketData/providerQuoteRounds.ts"));
    expect(owner).toContain("fetchAlpacaQuoteBody(symbol: string)");
    expect(owner).toContain("fetchFinnhubQuoteBody(symbol: string)");
    // Every signal in the file is a freshly constructed one.
    const signals = owner.match(/[\w.()]*signal/gi) ?? [];
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((s) => s === "AbortController().signal")).toBe(true);
  });

  it("the watchlist keeps its swallow-on-failure policy on the RESULT", () => {
    /**
     * WatchlistPanel used `.catch(() => null)` on its own fetch. Moved INTO the
     * round, that policy would hand the tape and useWebSocket a null they never
     * asked for and cannot distinguish from a provider that answered nothing.
     * Error policy is a property of a CONSUMER — the same rule as cancellation.
     */
    const watchlist = strip(read("src/components/chart/WatchlistPanel.tsx"));
    expect(watchlist).toContain("fetchAlpacaQuoteBody(up).catch(() => null)");
    expect(watchlist).toContain("fetchFinnhubQuoteBody(up).catch(() => null)");
    expect(strip(read("src/lib/marketData/providerQuoteRounds.ts"))).not.toContain(".catch(");
  });

  it("the owner does not cache — a later poll still reaches the provider", async () => {
    const rounds = new InFlightRounds();
    let starts = 0;
    const start = () => { starts += 1; return Promise.resolve(starts); };
    await rounds.run("alpaca:quote:AAPL", start);
    expect(rounds.isInFlight("alpaca:quote:AAPL")).toBe(false);
    await rounds.run("alpaca:quote:AAPL", start);
    expect(starts).toBe(2);
  });
});
