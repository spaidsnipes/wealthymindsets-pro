import { NextResponse } from "next/server";
import { DERIBIT_OPTIONS_SOURCE, deribitCurrencyFor, dvolFrom, normalizeDeribitOptions, normalizeDeribitTrades } from "@/lib/marketData/deribitOptions";
import { normalizeDeribitChain } from "@/lib/marketData/deribitChain";
import { requireAuth } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

/*
  Read-only Deribit PUBLIC option book summary for Derivatives Pressure on
  BTC / ETH (Garden 16, 2026-09-27). No credential, nothing stored, display
  only. The receipt carries its own clock (chainAsOf = newest summary
  timestamp); OI is Deribit's current figure; IV is Deribit's mark model.
  DVOL (30-day implied volatility index) supplies iv30 for the expected move;
  if it does not answer, the envelope is simply absent — never estimated.
*/
const BASE = "https://www.deribit.com/api/v2/public";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const currency = deribitCurrencyFor(new URL(request.url).searchParams.get("symbol") ?? "");
  if (!currency) {
    return NextResponse.json({ source: DERIBIT_OPTIONS_SOURCE, edge: "UNSUPPORTED", error: "Deribit lists options on BTC and ETH only" }, { status: 400 });
  }
  const opts = { cache: "no-store" as const, signal: AbortSignal.timeout(15_000), headers: { Accept: "application/json" } };
  const now = Date.now();
  // `view=trades` — the public option trades of the last hours (ATHOS §6 ·
  // Options Flow on BTC / ETH, 2026-10-06): taker side, size, price, index
  // price, combo / block legs. Display only, nothing stored.
  if (new URL(request.url).searchParams.get("view") === "trades") {
    let r: Response;
    try { r = await fetch(`${BASE}/get_last_trades_by_currency_and_time?currency=${currency}&kind=option&start_timestamp=${now - 20 * 3_600_000}&end_timestamp=${now}&count=1000&sorting=desc`, opts); } catch {
      return NextResponse.json({ source: DERIBIT_OPTIONS_SOURCE, edge: "TRANSPORT", error: "Deribit public API unreachable" }, { status: 504 });
    }
    if (r.status === 429) return NextResponse.json({ source: DERIBIT_OPTIONS_SOURCE, edge: "RATE_LIMITED", error: "Deribit rate-limited the trades" }, { status: 429 });
    if (!r.ok) return NextResponse.json({ source: DERIBIT_OPTIONS_SOURCE, edge: "PROVIDER ERROR", error: `Deribit HTTP ${r.status}` }, { status: 502 });
    const b = await r.json().catch(() => null);
    return NextResponse.json({ source: DERIBIT_OPTIONS_SOURCE, ...normalizeDeribitTrades(b, currency) }, { headers: { "Cache-Control": "no-store" } });
  }
  // `view=chain` — the same public book summary as a VIEW-ONLY option chain
  // for the crypto Derivatives panel (Garden 18 §LX, 2026-10-01). No order
  // path is built on it.
  if (new URL(request.url).searchParams.get("view") === "chain") {
    let r: Response;
    try { r = await fetch(`${BASE}/get_book_summary_by_currency?currency=${currency}&kind=option`, opts); } catch {
      return NextResponse.json({ source: DERIBIT_OPTIONS_SOURCE, edge: "TRANSPORT", error: "Deribit public API unreachable" }, { status: 504 });
    }
    if (r.status === 429) return NextResponse.json({ source: DERIBIT_OPTIONS_SOURCE, edge: "RATE_LIMITED", error: "Deribit rate-limited the book summary" }, { status: 429 });
    if (!r.ok) return NextResponse.json({ source: DERIBIT_OPTIONS_SOURCE, edge: "PROVIDER ERROR", error: `Deribit HTTP ${r.status}` }, { status: 502 });
    let b: unknown;
    try { b = await r.json(); } catch {
      return NextResponse.json({ source: DERIBIT_OPTIONS_SOURCE, edge: "INVALID RESPONSE", error: "Deribit response did not decode" }, { status: 502 });
    }
    return NextResponse.json(normalizeDeribitChain(b, currency, now), { headers: { "Cache-Control": "no-store" } });
  }
  let res: Response;
  let dvol: number | null = null;
  try {
    const [book, vol] = await Promise.all([
      fetch(`${BASE}/get_book_summary_by_currency?currency=${currency}&kind=option`, opts),
      fetch(`${BASE}/get_volatility_index_data?currency=${currency}&start_timestamp=${now - 3 * 3_600_000}&end_timestamp=${now}&resolution=3600`, opts).catch(() => null),
    ]);
    res = book;
    if (vol && vol.ok) dvol = dvolFrom(await vol.json().catch(() => null));
  } catch {
    return NextResponse.json({ source: DERIBIT_OPTIONS_SOURCE, edge: "TRANSPORT", error: "Deribit public API unreachable" }, { status: 504 });
  }
  if (res.status === 429) {
    return NextResponse.json({ source: DERIBIT_OPTIONS_SOURCE, edge: "RATE_LIMITED", error: "Deribit rate-limited the book summary" }, { status: 429 });
  }
  if (!res.ok) {
    return NextResponse.json({ source: DERIBIT_OPTIONS_SOURCE, edge: "PROVIDER ERROR", error: `Deribit HTTP ${res.status}` }, { status: 502 });
  }
  let body: unknown;
  try { body = await res.json(); } catch {
    return NextResponse.json({ source: DERIBIT_OPTIONS_SOURCE, edge: "INVALID RESPONSE", error: "Deribit response did not decode" }, { status: 502 });
  }
  return NextResponse.json(normalizeDeribitOptions(body, currency, 60, now, dvol), { headers: { "Cache-Control": "no-store" } });
}
