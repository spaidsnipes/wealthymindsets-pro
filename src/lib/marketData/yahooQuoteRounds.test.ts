import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { InFlightRounds } from "./inFlightRounds";

/**
 * MEASURED /charts 2026-09-08, client-side route re-mount, stack-attributed
 * fetch wrapper — the attribution, not the guess, is what this file guards:
 *
 *   NQ1!   TickerTape.fetchQuote          918 ms
 *          useWebSocket.fetchRealQuote... 954 ms    36 ms apart
 *   YM1!   917 / 952 ms                             35 ms apart
 *   ES1!  1011 / 1047 ms                            36 ms apart
 *   AMZN   MainChart.useEffect             52, 284 ms
 *   RTY1!  TickerTape.fetchQuote ONLY — the clean control, clean only because
 *          it lives on one surface.
 */

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Every client-side surface that asks Yahoo for a quote. Adding a consumer
 * without adding it here is exactly how the tape and useWebSocket drifted
 * apart in the first place.
 */
const CONSUMERS = [
  "src/components/layout/TickerTape.tsx",
  "src/components/chart/MainChart.tsx",
  "src/components/chart/WatchlistPanel.tsx",
  "src/components/chart/StockInfoPanel.tsx",
  "src/hooks/useWebSocket.ts",
  "src/app/scanner/page.tsx",
  "src/app/paper/page.tsx",
] as const;

describe("the Yahoo quote round has exactly one owner", () => {
  it("no client surface issues a raw /api/yahoo type=quote fetch", () => {
    /**
     * THE load-bearing assertion. A single bypass reintroduces the defect for
     * whichever symbol that surface shares with another, and nothing else in
     * the suite would notice — the duplicate requests are silent and correct.
     */
    const offenders: string[] = [];
    for (const file of CONSUMERS) {
      const code = strip(read(file));
      const raw = /fetch\(\s*[`"'][^`"']*\/api\/yahoo[^`"']*type=quote/;
      if (raw.test(code)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("every consumer routes through the owner", () => {
    for (const file of CONSUMERS) {
      expect(strip(read(file))).toContain("fetchYahooQuoteBody(");
    }
  });

  it("the owner is the only place the URL is built", () => {
    const owner = strip(read("src/lib/marketData/yahooQuoteRounds.ts"));
    expect(owner).toMatch(/fetch\(\s*\n?\s*`\/api\/yahoo\?sym=\$\{encodeURIComponent\(up\)\}&type=quote`/);
    expect(owner).toContain("yahooQuoteRounds.run(`yahoo:quote:${up}`");
  });

  it("quote rounds cannot collide with tick or domain-quote rounds", () => {
    // Three identity spaces exist now: `yahoo:quote:`, `ticks:`, and the bare
    // symbol used by quoteRequestCoalescer. A shared prefix would let one
    // round answer another's question — silent, and awful.
    const owner = read("src/lib/marketData/yahooQuoteRounds.ts");
    expect(owner).toContain("new InFlightRounds()");
    expect(owner).toContain("yahoo:quote:");
  });

  it("NO consumer's AbortSignal enters the shared round", () => {
    /**
     * MainChart passed `myAbortSignal` to its own fetch. Handed to a shared
     * round, this chart unmounting mid-flight would cancel a request the tape
     * and useWebSocket are waiting on, and they would read the abort as the
     * provider's answer — an absence manufactured by an unrelated component's
     * unmount. Same rule as the provider-tick rounds in 2efcb31: cancellation
     * belongs to a CONSUMER, applied to the RESULT.
     */
    const owner = strip(read("src/lib/marketData/yahooQuoteRounds.ts"));
    expect(owner).not.toContain("signal");

    const chart = strip(read("src/components/chart/MainChart.tsx"));
    expect(chart).toContain("myAbortSignal.aborted || yahooQuoteRefusal(j)");
  });

  it("the owner does not cache — a later poll still reaches the provider", async () => {
    // Joining is only ever offered while a request is genuinely open. A tape
    // that showed a settled answer forever would be a staleness bug wearing a
    // perf fix's clothes.
    const rounds = new InFlightRounds();
    let starts = 0;
    const start = () => { starts += 1; return Promise.resolve(starts); };
    await rounds.run("yahoo:quote:NQ1!", start);
    expect(rounds.isInFlight("yahoo:quote:NQ1!")).toBe(false);
    await rounds.run("yahoo:quote:NQ1!", start);
    expect(starts).toBe(2);
  });

  it("the measured 35ms pair becomes one round", async () => {
    const rounds = new InFlightRounds();
    let starts = 0;
    let resolve!: (v: unknown) => void;
    const body = new Promise(r => { resolve = r; });
    const start = () => { starts += 1; return body; };

    const tape = rounds.run("yahoo:quote:NQ1!", start);      // t = 918
    const socket = rounds.run("yahoo:quote:NQ1!", start);    // t = 954
    expect(starts).toBe(1);

    resolve({ price: 29682 });
    // Both consumers get the SAME body and read it their own way.
    expect(await tape).toEqual({ price: 29682 });
    expect(await socket).toEqual({ price: 29682 });
  });
});
