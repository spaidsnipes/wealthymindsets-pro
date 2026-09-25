/**
 * ONE TABLE, EVERY PURE IDENTITY OWNER, THE INSTRUMENTS A TRADER ACTUALLY OPENS.
 *
 * GP12 §26 (canonical instrument identity) was being enforced one symbol at a
 * time: XAUUSD's futures-under-a-spot-name was found and fixed, and the same
 * defect sat one row away on VX1! (the cash VIX under a futures symbol) and in
 * the class owner (spot gold classed as a future, so the refusal receipt said
 * "it does not carry futures"). A per-symbol fix cannot see its neighbours.
 *
 * So every owner that answers "what is this instrument, who is asked for it,
 * and what is its day" is asked about the same twenty-one symbols at once:
 *
 *   canonicalAssetClass   the identity layer's class (what the screen SAYS)
 *   classifySymbol        the routing layer's class (who gets ASKED)
 *   resolveYahooSymbol    the bar/quote ticker, or the refusal and its way out
 *   toFinnhubSym          the equity lane's ticker, or null (not carried)
 *   sessionWindowFor      the session clock the profile and the gap reader use
 *   resolveChartSurfaceBadge  what a Yahoo-served chart may claim (never LIVE)
 *
 * A row that disagrees with its instrument fails here, with the symbol named.
 */
import { describe, expect, it } from "vitest";
import { canonicalAssetClass } from "./canonicalIdentity";
import { classifySymbol } from "./symbolAssetClass";
import { resolveYahooSymbol } from "@/lib/yahooSymbol";
import { toFinnhubSym } from "@/lib/finnhubSymbol";
import { sessionWindowFor, type SessionWindowKind } from "./sessionWindow";
import { resolveChartSurfaceBadge } from "@/lib/priceSource";

interface Row {
  readonly sym: string;
  readonly canonical: ReturnType<typeof canonicalAssetClass>;
  readonly klass: ReturnType<typeof classifySymbol>;
  /** Yahoo ticker, or `REFUSED:<the way out the refusal names>`. */
  readonly yahoo: string;
  readonly finnhub: string | null;
  readonly session: SessionWindowKind;
}

const TABLE: readonly Row[] = [
  // US equities / ETF — RTH clock, both lanes carry them under their own name.
  { sym: "AAPL",    canonical: "equity",  klass: "EQUITY",  yahoo: "AAPL",     finnhub: "AAPL", session: "US_EQUITY_RTH" },
  { sym: "SPY",     canonical: "equity",  klass: "EQUITY",  yahoo: "SPY",      finnhub: "SPY",  session: "US_EQUITY_RTH" },
  // Cash indices — the SAME index under Yahoo's name; no equity vendor lane.
  // (canonicalAssetClass has no index member; "equity" is its coarse answer.)
  { sym: "SPX",     canonical: "equity",  klass: "INDEX",   yahoo: "^GSPC",    finnhub: "SPX",  session: "US_EQUITY_RTH" },
  { sym: "NDX",     canonical: "equity",  klass: "INDEX",   yahoo: "^NDX",     finnhub: "NDX",  session: "US_EQUITY_RTH" },
  // Globex-day futures (equity index, energy, metals, rates).
  { sym: "ES1!",    canonical: "futures", klass: "FUTURES", yahoo: "ES=F",     finnhub: null,   session: "GLOBEX_DAY" },
  { sym: "NQ1!",    canonical: "futures", klass: "FUTURES", yahoo: "NQ=F",     finnhub: null,   session: "GLOBEX_DAY" },
  { sym: "YM1!",    canonical: "futures", klass: "FUTURES", yahoo: "YM=F",     finnhub: null,   session: "GLOBEX_DAY" },
  { sym: "RTY1!",   canonical: "futures", klass: "FUTURES", yahoo: "RTY=F",    finnhub: null,   session: "GLOBEX_DAY" },
  { sym: "CL1!",    canonical: "futures", klass: "FUTURES", yahoo: "CL=F",     finnhub: null,   session: "GLOBEX_DAY" },
  { sym: "NG1!",    canonical: "futures", klass: "FUTURES", yahoo: "NG=F",     finnhub: null,   session: "GLOBEX_DAY" },
  { sym: "GC1!",    canonical: "futures", klass: "FUTURES", yahoo: "GC=F",     finnhub: null,   session: "GLOBEX_DAY" },
  { sym: "SI1!",    canonical: "futures", klass: "FUTURES", yahoo: "SI=F",     finnhub: null,   session: "GLOBEX_DAY" },
  { sym: "ZN1!",    canonical: "futures", klass: "FUTURES", yahoo: "ZN=F",     finnhub: null,   session: "GLOBEX_DAY" },
  // CBOT grains keep the pit's hours, not the Globex day (fixed 2026-09-25).
  { sym: "ZW1!",    canonical: "futures", klass: "FUTURES", yahoo: "ZW=F",     finnhub: null,   session: "CBOT_GRAINS_DAY" },
  // VIX FUTURES — no feed serves them; the cash index is named, never served
  // under this name (GP12 §26, fixed 2026-09-25; was ^VIX / INDEX).
  { sym: "VX1!",    canonical: "futures", klass: "FUTURES", yahoo: "REFUSED:^VIX", finnhub: null, session: "GLOBEX_DAY" },
  // FX — the FX day, rolling at 17:00 ET.
  { sym: "EURUSD",  canonical: "forex",   klass: "FOREX",   yahoo: "EURUSD=X", finnhub: null,   session: "FX_DAY" },
  { sym: "USDJPY",  canonical: "forex",   klass: "FOREX",   yahoo: "USDJPY=X", finnhub: null,   session: "FX_DAY" },
  { sym: "GBPUSD",  canonical: "forex",   klass: "FOREX",   yahoo: "GBPUSD=X", finnhub: null,   session: "FX_DAY" },
  // SPOT gold — spot, not the GC future Yahoo lists instead (fixed 2026-09-25;
  // classifySymbol said FUTURES). Refused, naming the futures a trader can open.
  { sym: "XAUUSD",  canonical: "forex",   klass: "FOREX",   yahoo: "REFUSED:GC1!", finnhub: null, session: "FX_DAY" },
  // Crypto — continuous; Finnhub's free crypto tier is Binance's USDT book, a
  // quote-currency substitution the route discloses on every response.
  { sym: "BTC-USD", canonical: "crypto",  klass: "CRYPTO",  yahoo: "BTC-USD",  finnhub: "BINANCE:BTCUSDT", session: "CONTINUOUS_ET_DAY" },
  { sym: "ETH-USD", canonical: "crypto",  klass: "CRYPTO",  yahoo: "ETH-USD",  finnhub: "BINANCE:ETHUSDT", session: "CONTINUOUS_ET_DAY" },
];

function yahooAnswer(sym: string): string {
  const r = resolveYahooSymbol(sym);
  if (r.kind === "RESOLVED") return r.ticker;
  const wayOut = /Open (\S+) for/.exec(r.reason)?.[1] ?? "?";
  return `REFUSED:${wayOut}`;
}

describe("GP12 §26 — one identity table over every pure owner", () => {
  it("covers the instruments it claims to (the table is not vacuous)", () => {
    expect(TABLE.length).toBeGreaterThanOrEqual(21);
    expect(new Set(TABLE.map(r => r.sym)).size).toBe(TABLE.length);
  });

  it.each(TABLE)("$sym — class, provider tickers and session kind", (row) => {
    expect(canonicalAssetClass(row.sym), `${row.sym} canonicalAssetClass`).toBe(row.canonical);
    expect(classifySymbol(row.sym), `${row.sym} classifySymbol`).toBe(row.klass);
    expect(yahooAnswer(row.sym), `${row.sym} Yahoo`).toBe(row.yahoo);
    expect(toFinnhubSym(row.sym), `${row.sym} Finnhub`).toBe(row.finnhub);
    expect(sessionWindowFor(row.sym, "5m", false).kind, `${row.sym} session`).toBe(row.session);
  });

  it("the two class owners never contradict each other on a row", () => {
    // Coarse vs fine is allowed (canonical has no index member); a DIFFERENT
    // kind of instrument is not.
    const compatible: Record<string, readonly string[]> = {
      equity: ["EQUITY", "INDEX"], futures: ["FUTURES"], forex: ["FOREX"], crypto: ["CRYPTO"],
    };
    for (const row of TABLE) {
      expect(compatible[canonicalAssetClass(row.sym)], row.sym).toContain(classifySymbol(row.sym));
    }
  });

  it("a refused instrument names a way out that itself resolves", () => {
    for (const row of TABLE.filter(r => r.yahoo.startsWith("REFUSED:"))) {
      const wayOut = row.yahoo.slice("REFUSED:".length);
      expect(resolveYahooSymbol(wayOut).kind, `${row.sym} → ${wayOut}`).toBe("RESOLVED");
    }
  });

  it("a chart served only by Yahoo never claims LIVE, whichever row it is", () => {
    // resolveChartSurfaceBadge is source-keyed, not symbol-keyed: asked once
    // per row so a future symbol-aware branch cannot quietly promote one.
    for (const row of TABLE.filter(r => !r.yahoo.startsWith("REFUSED:"))) {
      const badge = resolveChartSurfaceBadge("yahoo", false, true);
      expect(badge.live, row.sym).toBe(false);
      expect(badge.label, row.sym).not.toMatch(/LIVE/);
    }
  });
});
