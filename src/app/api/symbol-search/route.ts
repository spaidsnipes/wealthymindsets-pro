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
import { matchCanonicalInstruments, mergeInstrumentSearch } from "@/lib/marketData/instrumentSearch";
import { fromYahooSearchSymbol } from "@/lib/yahooSymbol";
import { brokerInstrumentSearch } from "@/lib/marketData/brokerInstrumentSearchServer";
import { tastytradeOwnerGate } from "@/lib/broker/brokerOwner";
import { webullOwnerGate } from "@/lib/broker/webullOwner";
import { requireAuth } from "@/lib/requireAuth";

/**
 * Asked of the vendor vs. returned to the caller. These are different numbers
 * on purpose — see the ordering note at the Polygon call.
 */
const POLYGON_FETCH_LIMIT = 200;
const RESULT_LIMIT = 20;

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
  // Every hit is named the way WM opens it, and a form the chart cannot open
  // (a dated contract, an index code without ^) is not offered at all
  // (fromYahooSearchSymbol, 2026-09-28).
  const seen = new Set<string>();
  return (json.quotes ?? [])
    .filter((r): r is YahooQuote & { symbol: string } => Boolean(r.symbol))
    .flatMap((r) => {
      const sym = fromYahooSearchSymbol(r.symbol, r.quoteType);
      if (!sym || seen.has(sym)) return [];
      seen.add(sym);
      return [{
        sym,
        label: r.shortname ?? r.longname ?? sym,
        cat: reconcileSearchCategory(sym, yahooQuoteTypeCategory(r.quoteType)),
        exchange: r.exchange ?? "",
      }];
    });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 40);
  if (!q) return NextResponse.json({ results: [] });
  // Garden 18: the brokers' own instruments — every listed futures month,
  // tastytrade's symbol search, Webull's exact symbols — for the owner of
  // those connections. Anyone else gets the public search unchanged.
  const auth = await requireAuth(request);
  const brokerHits = auth.ok
    ? await brokerInstrumentSearch(q, {
        tastytrade: tastytradeOwnerGate(auth.user.sub, process.env).allowed,
        webull: webullOwnerGate(auth.user.sub, process.env).allowed,
      }).catch(() => [])
    : [];
  // Broker identities lead; the one ranking owner (mergeInstrumentSearch below) orders everything.
  const canonicalMatches = [...brokerHits, ...matchCanonicalInstruments(q, RESULT_LIMIT)];

  // The keyed vendor is spent for a signed-in session only (security pass
  // 2026-10-05: any anonymous loop over random q burned POLYGON quota).
  if (POLYGON_KEY && auth.ok) {
    try {
      // Search across all markets.
      //
      // `limit` is deliberately far wider than what is returned. Polygon
      // orders `?search=` ALPHABETICALLY, so the limit decides WHICH matches
      // exist, not just how many. MEASURED at limit=20: `q=spy` put `SPY`
      // fifteenth behind `APYI`/`DNUT`/`JDSPY`, and `q=vix` returned twenty
      // `I:` rows with no exact match at all. Ranking cannot recover a row the
      // vendor never sent, so the ask is widened first and cut after.
      const url = `https://api.polygon.io/v3/reference/tickers?search=${encodeURIComponent(q)}&active=true&limit=${POLYGON_FETCH_LIMIT}&apiKey=${POLYGON_KEY}`;
      const json = (await polyFetch(url)) as { results?: PolyTicker[]; error?: string };

      if (!json.error) {
        const hits: SearchHit[] = (json.results ?? []).map((r: PolyTicker) => ({
          sym: r.ticker,
          label: r.name,
          cat: reconcileSearchCategory(r.ticker, polygonCategory(r.market, r.type)),
          exchange: r.primary_exchange ?? r.market ?? "",
        }));
        const results = mergeInstrumentSearch(q, canonicalMatches, hits, brokerHits.length ? RESULT_LIMIT + 20 : RESULT_LIMIT);
        // One vendor's empty answer does not exhaust the market universe.
        // In particular, futures discovery must still reach Yahoo.
        if (hits.length > 0) return NextResponse.json({ results, vendor: "polygon", brokers: brokerHits.length });
      }
      // Polygon answered with an error (bad/expired/over-quota key). Fall
      // through: the trader's question is still answerable.
    } catch {
      // Network or HTTP failure. Same reasoning — fall through.
    }
  }

  try {
    // Ranked through the same owner as the Polygon branch. Yahoo's ordering is
    // already relevance-ish, but two vendors feeding one dropdown must not
    // order it by two different rules — that is how the same query starts
    // looking like two different products depending on which key is set.
    const results = mergeInstrumentSearch(q, canonicalMatches, await yahooSearch(q), brokerHits.length ? RESULT_LIMIT + 20 : RESULT_LIMIT);
    return NextResponse.json({
      results,
      vendor: "yahoo",
      // Named so a caller can tell "this is the backup vendor" from "this is
      // the one we prefer" without inferring it from the shape of the data.
      degraded: POLYGON_KEY
        ? "Polygon returned no matches or was unavailable; these results are from Yahoo, which needs no key."
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
        results: canonicalMatches,
        discoveryScope: "Canonical identities only; live discovery is unavailable. No feed availability is implied.",
        edge: "UNAVAILABLE",
        vendorsTried: ["polygon", "yahoo"],
      },
      { status: 503 },
    );
  }
}
