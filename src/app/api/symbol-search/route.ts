/**
 * /api/symbol-search — ticker search across stocks, ETFs, forex, crypto,
 * indices and futures.
 *
 * GET /api/symbol-search?q=bitcoin
 *
 * ── Two vendors, on purpose (2026-09-11) ────────────────────────────────────
 *
 * Polygon is preferred and needs a key. Yahoo needs none, and is the fallback.
 *
 * This is not redundancy for its own sake. MEASURED on the live host:
 * `POLYGON_KEY` is unset on the Cloudflare runtime, so this route returned 503
 * for every query — symbol search was dead in production for every asset class
 * at once, and the only fix was an owner action nobody had taken. A keyless
 * vendor that covers the same six classes was one fetch away the entire time.
 *
 * A missing provider key is now a DEGRADATION (search still works, via a
 * vendor the response names) instead of an OUTAGE. The 503 survives for the
 * case where both vendors are gone, because "we cannot search" is still a
 * sentence worth being able to say honestly.
 */

import { NextResponse } from "next/server";
import {
  polygonCategory,
  reconcileSearchCategory,
  yahooQuoteTypeCategory,
} from "@/lib/marketData/searchResultCategory";

// WM-SEC-P0-05 (2026-08-08): prefer server-only POLYGON_KEY. NEXT_PUBLIC_
// fallback stays as a transitional secondary so an in-flight rotation
// doesn't strand this endpoint; remove that fallback once Founder deletes
// NEXT_PUBLIC_POLYGON_KEY from the server environment.
const POLYGON_KEY = process.env.POLYGON_KEY ?? process.env.NEXT_PUBLIC_POLYGON_KEY ?? "";

const CACHE = new Map<string, { data: unknown; ts: number }>();
const TTL_MS = 30_000; // 30s cache

async function polyFetch(url: string): Promise<unknown> {
  const cached = CACHE.get(url);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.data;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Polygon ${res.status}`);
  const data = await res.json();
  CACHE.set(url, { data, ts: Date.now() });
  return data;
}

type PolyTicker = {
  ticker: string;
  name: string;
  market: string;
  type: string;
  currency_name?: string;
  primary_exchange?: string;
};

type YahooQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
};

type SearchHit = { sym: string; label: string; cat: string; exchange: string };

/**
 * Yahoo's keyless search. No API key, so this is reachable on any runtime, in
 * any environment, without an owner first provisioning a secret.
 */
async function yahooSearch(q: string): Promise<SearchHit[]> {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=20&newsCount=0`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);
  const json = (await res.json()) as { quotes?: YahooQuote[] };
  return (json.quotes ?? [])
    .filter((r): r is YahooQuote & { symbol: string } => Boolean(r.symbol))
    .map((r) => ({
      sym: r.symbol,
      label: r.shortname ?? r.longname ?? r.symbol,
      cat: reconcileSearchCategory(r.symbol, yahooQuoteTypeCategory(r.quoteType)),
      exchange: r.exchange ?? "",
    }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ results: [] });

  if (POLYGON_KEY) {
    try {
      // Search across all markets
      const url = `https://api.polygon.io/v3/reference/tickers?search=${encodeURIComponent(q)}&active=true&limit=20&apiKey=${POLYGON_KEY}`;
      const json = (await polyFetch(url)) as { results?: PolyTicker[]; error?: string };

      if (!json.error) {
        const results: SearchHit[] = (json.results ?? []).map((r: PolyTicker) => ({
          sym: r.ticker,
          label: r.name,
          cat: reconcileSearchCategory(r.ticker, polygonCategory(r.market, r.type)),
          exchange: r.primary_exchange ?? r.market ?? "",
        }));
        // An empty Polygon result set is an ANSWER ("no such ticker"), not a
        // failure, so it is returned rather than retried against Yahoo.
        return NextResponse.json({ results, vendor: "polygon" });
      }
      // Polygon answered with an error (bad/expired/over-quota key). Fall
      // through: the trader's question is still answerable.
    } catch {
      // Network or HTTP failure. Same reasoning — fall through.
    }
  }

  try {
    const results = await yahooSearch(q);
    return NextResponse.json({
      results,
      vendor: "yahoo",
      // Named so a caller can tell "this is the backup vendor" from "this is
      // the one we prefer" without inferring it from the shape of the data.
      degraded: POLYGON_KEY
        ? "Polygon search did not answer; these results are from Yahoo, which needs no key."
        : "POLYGON_KEY is not set on this host runtime; these results are from Yahoo, which needs no key.",
    });
  } catch (err) {
    // BOTH vendors are gone. This is the only case that is still an outage,
    // and it says which two things failed rather than naming one variable.
    return NextResponse.json(
      {
        // "NOT CONFIGURED" is a RESERVED edge state in this repo, carrying the
        // `{edge, missing}` contract an inspector renders — see
        // supabaseConfigStatus.enforcement.test.ts, which caught this sentence
        // using the reserved token as prose. This route no longer HAS that
        // state: an unset key is a degradation now, not an outage, so the
        // phrase is deliberately lowercase here.
        error:
          `Symbol search is UNAVAILABLE: Polygon is ${POLYGON_KEY ? "configured but did not answer" : "not configured (POLYGON_KEY is unset)"}, and the keyless Yahoo fallback also failed (${String(err)}).`,
        edge: "UNAVAILABLE",
        vendorsTried: ["polygon", "yahoo"],
      },
      { status: 503 },
    );
  }
}
