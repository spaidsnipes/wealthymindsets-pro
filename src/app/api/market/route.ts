import { NextResponse } from "next/server";
import { classifySymbol, unsupportedAssetClassReason } from "@/lib/marketData/symbolAssetClass";
import { toFinnhubSym } from "@/lib/finnhubSymbol";
import { resolveProviderEnv, acceptedEnvNames } from "@/lib/broker/resolveProviderEnv";
import { classifyFinnhubStatus, finnhubUpstreamMessage } from "@/lib/marketData/finnhubUpstreamStatus";

// Server-only Finnhub key. Same fail-fast pattern as /api/finnhub — refuse to
// call Finnhub with the committed-fallback value in production (WM-SEC-P0-03).
// Lazy resolver so the build's page-data collection doesn't crash when the
// prod value isn't wired into the build environment.
const COMMITTED_FALLBACK = "d8efu9hr01qth3ch5f20d8efu9hr01qth3ch5f2g";
function getFinnhubKey(): string {
  // Same canonical resolution as /api/finnhub — the host carries this key
  // under `FINNHUB_KEY_`. See resolveProviderEnv.
  const fromEnv = resolveProviderEnv("FINNHUB_KEY")?.value;
  const isProd  = process.env.NODE_ENV === "production";
  if (isProd) {
    if (!fromEnv)                     throw new Error(`No Finnhub key is set on the host runtime under any accepted name (${acceptedEnvNames("FINNHUB_KEY").join(", ")}). Set one of those names in the host runtime secrets (e.g. Cloudflare) and redeploy.`);
    if (fromEnv === COMMITTED_FALLBACK) throw new Error("FINNHUB_KEY equals the committed dev fallback in production. Rotate at finnhub.io, update the value in the host runtime secrets, and redeploy.");
    return fromEnv;
  }
  return fromEnv ?? "";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "AAPL").toUpperCase();

  // Skip futures and forex — this vendor does not carry them at all.
  //
  // This test used to be `symbol.includes("1!") || symbol.includes("/")`, typed
  // here and nowhere else. It recognised "NQ1!" and missed "NQ=F" — the SAME
  // CONTRACT in the notation /api/heatmap and /api/alpaca both speak — so a
  // request for NQ=F fell through to the equity vendor and came back "No data".
  // "No data" reads as "not right now"; the truth is "never carried here".
  // Forex (EURUSD=X) and indices (^VIX) fell through for the same reason.
  // The predicate now has ONE owner and every route reads it.
  const unsupported = unsupportedAssetClassReason(symbol);
  if (unsupported !== null) {
    // `edge` and `source` are the envelope, not decoration. Consumers across the
    // product branch on `edge` and render it as the chip beside the sentence
    // (OptionsChain: `<strong>{error.edge}</strong> · {error.message}`), and
    // `optionsChainRead` dispatches on exact edge strings.
    //
    // MEASURED on prod 2026-09-12, from the Founder's own session: ^GSPC and
    // BTC.COINBASE came back carrying `edge: "NOT CARRIED HERE"`, while NQ=F and
    // EURUSD=X — futures and forex, the two classes this predicate was BUILT for
    // — came back with no `edge` at all. So the one branch that coined the phrase
    // was the only branch that did not say it in machine-readable form, and a
    // consumer showing the chip rendered `undefined` next to a correct sentence.
    // The prose was right the whole time, which is what kept it invisible.
    return NextResponse.json({ symbol, price: null, edge: "NOT CARRIED HERE", error: unsupported, source: "finnhub" });
  }

  // Which string Finnhub is asked for is owned by `toFinnhubSym`, not by this
  // route.
  //
  // This line used to read `CRYPTO_SYMS.has(symbol)` against a private set of
  // twelve bare bases typed here — a sixth copy of a fact that module already
  // owns, and the copy was wrong in both directions. MEASURED on the live host
  // 2026-09-12:
  //
  //   /api/market?symbol=W        → 98.57       (Wayfair, the EQUITY)
  //   /api/finnhub?sym=W          → 0.00983     (BINANCE:WUSDT, the COIN)
  //   /api/market?symbol=BTC-USD  → 404 "No data"
  //   /api/finnhub?sym=BTC-USD    → 77,282      (BINANCE:BTCUSDT)
  //
  // Two routes, one symbol, a ten-thousand-fold difference in the number. That
  // is the exact LIVING-PIXEL violation `finnhubSymbol.ts`'s header documents
  // as closed — the label and the number sourced from different owners, neither
  // wrong on its own. It was closed in the module and left open in this caller,
  // which is what a private copy of an owned fact always costs.
  const finnhubSym = toFinnhubSym(symbol);
  if (finnhubSym === null) {
    // Futures and forex were already refused above by class, so a null here is
    // the owner declining for its own reason — a venue-pinned crypto row
    // ("BTC.COINBASE") whose named exchange this lane cannot honour. Answering
    // it from Binance would be a venue substitution.
    return NextResponse.json({
      symbol,
      price: null,
      edge: "NOT CARRIED HERE",
      error: `${symbol} names a venue this quote lane cannot honour. Finnhub's free crypto tier quotes Binance only, and answering a venue-pinned request from a different exchange would report another market's price under this symbol's name.`,
      source: "finnhub",
    });
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSym)}&token=${getFinnhubKey()}`;
    const res = await fetch(url, { next: { revalidate: 5 } }); // cache 5s
    // Finnhub answers a throttle with an HTML error page. Parsing it first
    // turns a recoverable RATE LIMITED into a SyntaxError at HTTP 500, which
    // points the reader at the wrong subsystem entirely.
    if (!res.ok) {
      return NextResponse.json(
        { symbol, price: null, edge: classifyFinnhubStatus(res.status), error: finnhubUpstreamMessage(res.status), source: "finnhub" },
        { status: res.status },
      );
    }
    const data = await res.json();

    if (!data || !data.c || data.c === 0) {
      // "No data" reads as "not right now". For a cash index on this vendor it
      // is "never here": MEASURED 2026-09-12, ^GSPC, ^DJI, ^IXIC and ^VIX all
      // returned an empty quote inside the same window in which AAPL, SPY, IWM,
      // GLD and NVDA returned real prices. An empty quote for an equity is a
      // genuine gap; for an index it is the free tier's coverage boundary, and
      // a trader told "no data" goes looking for an outage that is not there.
      const isIndex = classifySymbol(symbol) === "INDEX";
      return NextResponse.json(
        {
          symbol,
          providerSymbol: finnhubSym,
          price: null,
          edge: isIndex ? "NOT CARRIED HERE" : "NO OBSERVATION",
          error: isIndex
            ? `${symbol} is a cash index. This quote lane is Finnhub's free tier, which returned an empty quote for every index measured while equities in the same window answered — index levels are not absent right now, they are not carried on this lane. An index-tracking ETF (e.g. SPY for ^GSPC) is carried.`
            : `Finnhub returned an empty quote for ${finnhubSym}. No price was observed — this is an absence of data, not a price of zero.`,
          source: "finnhub",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      symbol,
      // The instrument actually fetched. Crypto resolves to a Binance USDT
      // pair, so a request naming USD is answered from the USDT market. Same
      // disclosure /api/finnhub makes — the two routes now agree on both the
      // resolution AND on saying which market the number came from.
      providerSymbol: finnhubSym,
      price:     data.c,  // current price
      open:      data.o,  // day open
      high:      data.h,  // day high
      low:       data.l,  // day low
      prevClose: data.pc, // previous close
      change:    +(data.c - data.pc).toFixed(4),
      changePct: +(((data.c - data.pc) / data.pc) * 100).toFixed(4),
      timestamp: Date.now(),
    });
  } catch (err) {
    // A genuine transport/parse fault on an OK response. The upstream's own
    // failure classes are handled above; this is the residue, and it is named
    // as OUR failure rather than dressed up as a provider verdict.
    return NextResponse.json(
      { symbol, price: null, edge: "PROXY ERROR", error: `Quote proxy failed after an OK Finnhub response: ${String(err)}`, source: "finnhub" },
      { status: 500 },
    );
  }
}
