import { NextResponse } from "next/server";

// Server-only Finnhub key. Same fail-fast pattern as /api/finnhub — refuse to
// call Finnhub with the committed-fallback value in production (WM-SEC-P0-03).
// Lazy resolver so the build's page-data collection doesn't crash when the
// prod value isn't wired into the build environment.
const COMMITTED_FALLBACK = "d8efu9hr01qth3ch5f20d8efu9hr01qth3ch5f2g";
function getFinnhubKey(): string {
  const fromEnv = process.env.FINNHUB_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_KEY;
  const isProd  = process.env.NODE_ENV === "production";
  if (isProd) {
    if (!fromEnv)                     throw new Error("FINNHUB_KEY is not set on the host runtime. Set it in the host runtime secrets (e.g. Cloudflare) and redeploy.");
    if (fromEnv === COMMITTED_FALLBACK) throw new Error("FINNHUB_KEY equals the committed dev fallback in production. Rotate at finnhub.io, update the value in the host runtime secrets, and redeploy.");
    return fromEnv;
  }
  return fromEnv ?? "";
}

// Map common crypto symbols to Finnhub format
const CRYPTO_SYMS = new Set(["BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","LINK","DOT","MATIC","LTC"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "AAPL").toUpperCase();

  // Skip futures and forex — no free real-time data
  if (symbol.includes("1!") || symbol.includes("/")) {
    return NextResponse.json({ symbol, price: null, error: "Futures/forex not supported on free tier" });
  }

  try {
    const finnhubSym = CRYPTO_SYMS.has(symbol) ? `BINANCE:${symbol}USDT` : symbol;
    const url = `https://finnhub.io/api/v1/quote?symbol=${finnhubSym}&token=${getFinnhubKey()}`;
    const res = await fetch(url, { next: { revalidate: 5 } }); // cache 5s
    const data = await res.json();

    if (!data || !data.c || data.c === 0) {
      return NextResponse.json({ symbol, price: null, error: "No data" }, { status: 404 });
    }

    return NextResponse.json({
      symbol,
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
    return NextResponse.json({ symbol, price: null, error: String(err) }, { status: 500 });
  }
}
