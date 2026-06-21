import { NextResponse } from "next/server";

const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_KEY ?? "d8efu9hr01qth3ch5f20d8efu9hr01qth3ch5f2g";

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
    const url = `https://finnhub.io/api/v1/quote?symbol=${finnhubSym}&token=${FINNHUB_KEY}`;
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
