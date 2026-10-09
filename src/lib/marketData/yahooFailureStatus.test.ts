import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { readFvgBarBody, upstreamSaysMissing } from "@/lib/marketData/fvg/fvgBarSource";
import { yahooFailureStatus } from "./yahooFailureStatus";

describe("the bar route's failure status — a missing symbol is not a server fault", () => {
  it("upstream 404 / 400 → 404", () => {
    expect(yahooFailureStatus(new Error("Yahoo HTTP 404"))).toBe(404);
    expect(yahooFailureStatus(new Error("Yahoo HTTP 400"))).toBe(404);
    expect(yahooFailureStatus("Error: Yahoo HTTP 404")).toBe(404);
  });

  it("everything else stays 500: upstream 5xx / 429, a timeout, a parse error, nothing at all", () => {
    for (const e of [new Error("Yahoo HTTP 500"), new Error("Yahoo HTTP 502"), new Error("Yahoo HTTP 429"), new Error("Yahoo HTTP 4040"), new Error("The operation was aborted"), new SyntaxError("Unexpected token <"), null, undefined, "", 404]) {
      expect(yahooFailureStatus(e), String(e)).toBe(500);
    }
  });

  it("the trader words are unchanged: the same body under 404 still reads as 'no bars for this symbol', never a vendor name or a code", () => {
    const body = { error: String(new Error("Yahoo HTTP 404")) };
    expect(upstreamSaysMissing(404, body)).toBe(true);
    expect(upstreamSaysMissing(500, body)).toBe(true);     // the old status read the same way — no reader depended on the 500
    const said = readFvgBarBody({ ...body, ok: false }, { symbol: "SIVB", timeframe: "1D", nowMs: Date.UTC(2026, 9, 9) });
    expect(said.ok).toBe(false);
    if (said.ok) return;
    expect(said.reason).not.toMatch(/Yahoo|HTTP|404|500/);
    expect(said.reason).toContain("SIVB");
  });

  it("the route's one catch asks this owner, and keeps the body it always sent", () => {
    const route = readFileSync(path.join(process.cwd(), "src/app/api/yahoo/route.ts"), "utf8");
    expect(route).toContain('return NextResponse.json(publicFailure(err, "yahoo"), { status: yahooFailureStatus(err), headers: { "Cache-Control": "no-store" } });');
    // Only the candles lane can reach that catch with an upstream status: the quote lane swallows its own upstream failures.
    expect(route.match(/yfFetch\([^)]*\)\.catch\(\(\) => null\)/g)).toHaveLength(2);
    expect(route).not.toContain("{ error: String(err) }, { status: 500 }");
  });

  /**
   * CALLER AUDIT (2026-10-09, before the ship). Every reader of /api/yahoo was
   * read for a branch on the HTTP status. Result: the 500 → 404 change alters
   * no caller. These tests hold that: same sentence, same number of requests,
   * no retry started, nothing remembered, and the chart's provider chain is
   * decided by the BODY (unchanged), never the status.
   */
  describe("no caller behaves differently under 404 than it did under 500", () => {
    const body = { error: "Error: Yahoo HTTP 404" };
    const answer = (status: number) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

    it("FVG bar reader (Scanner / Backtest study / Replay): the same 'no bars' sentence, never 'try again', and the refusal is not remembered", async () => {
      const { fetchFvgBars, clearFvgBarCache } = await import("@/lib/marketData/fvg/fvgBarSource");
      for (const status of [500, 404]) {
        clearFvgBarCache();
        let calls = 0;
        const fetcher = async () => { calls += 1; return answer(status); };
        const a = await fetchFvgBars({ symbol: "SIVB", timeframe: "1D", bars: 160, nowMs: 1_000_000, fetcher });
        const b = await fetchFvgBars({ symbol: "SIVB", timeframe: "1D", bars: 160, nowMs: 1_000_500, fetcher });
        for (const r of [a, b]) {
          expect(r.ok).toBe(false);
          if (r.ok) continue;
          expect(r.reason, String(status)).toBe("No 1D bars could be read for SIVB — it may not be a symbol we can chart, or it has no history at this timeframe.");
          expect(r.reason).not.toMatch(/try again/i);
        }
        expect(calls, `one request per ask under ${status} — no retry, and no cached refusal`).toBe(2);
      }
      clearFvgBarCache();
    });

    it("Backtest run: a missing symbol is BacktestBarsMissing under both statuses; a real upstream failure still is not", async () => {
      const { fetchBars, BacktestBarsMissing } = await import("@/lib/backtest/engine");
      const { vi } = await import("vitest");
      try {
        for (const status of [500, 404]) {
          const spy = vi.fn(async () => answer(status));
          vi.stubGlobal("fetch", spy);
          await expect(fetchBars("SIVB", "1D")).rejects.toBeInstanceOf(BacktestBarsMissing);
          expect(spy).toHaveBeenCalledTimes(1);
        }
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Error: Yahoo HTTP 502" }), { status: 500 })));
        await expect(fetchBars("SIVB", "1D")).rejects.not.toBeInstanceOf(BacktestBarsMissing);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it("candle consumer (scanner page): the outcome and the number of requests are identical under 500 and 404 — it reads the body, never the status", async () => {
      const { YahooCandleConsumer } = await import("@/lib/yahooCandleConsumer");
      const seen: { outcome: unknown; calls: number }[] = [];
      for (const status of [500, 404]) {
        let calls = 0;
        const consumer = new YahooCandleConsumer({ fetcher: (async (url: string) => {
          if (String(url).startsWith("/api/yahoo")) { calls += 1; return answer(status); }
          return new Response("{}", { status: 404 });
        }) as never });
        const outcome = await consumer.request({ symbol: "SIVB", timeframe: "1D", bars: 160 });
        seen.push({ outcome, calls });
      }
      expect(seen[1]).toEqual(seen[0]);
      expect(seen[0]!.calls).toBeGreaterThan(0);
    });

    it("the status-blind readers stay status-blind (chart, watchlist grid, scanner map, unsettled estimate): they parse the body whatever the status", () => {
      const src = (p: string) => readFileSync(path.join(process.cwd(), "src", p), "utf8");
      const chart = src("components/chart/MainChart.tsx");
      const fn = chart.slice(chart.indexOf("async function fetchYahooCandles("), chart.indexOf("/* ── Tick-size helper"));
      expect(fn.length).toBeGreaterThan(500);
      expect(fn.replace(/\/\/[^\n]*/g, "")).not.toMatch(/res\.ok|res\.status/);                       // REFUSED is decided by `json.error`, which is unchanged
      expect(fn).toContain('note(log, { vendor: "Yahoo", outcome: "REFUSED", edge: json.error });');
      // The chart asks the other providers BEFORE this one, so no fallback hangs on this lane's status.
      expect(chart).toMatch(/const yahooData\s+= \(exchangeData \|\| tastyData \|\| alpacaData \|\| fhDirectData\) \? null : await fetchYahooCandles\(/);
      for (const [f, needle] of [
        ["components/chart/WatchlistGrid.tsx", "&bars=120`, { cache: \"no-store\" })\n      .then(r => r.json())"],
        ["app/scanner/map/page.tsx", "const json = await res.json() as { candles?:VPCandle[] };"],
        ["components/journal/UnsettledEstimate.tsx", "daily.set(u, Array.isArray(j.candles) ? j.candles : []);"],
      ] as const) expect(src(f), f).toContain(needle.replace(/\\"/g, '"').replace(/\\n/g, "\n"));
    });
  });
});
