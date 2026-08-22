/**
 * Canonical symbol search — ONE client entry point for every symbol-search box
 * (Founder Breakthrough Build Contract, anti-spaghetti: "no direct provider
 * fetch from UI when a canonical gateway exists"; "wrap sound code in canonical
 * contracts, retire duplicate paths").
 *
 * Before this helper, the shared SymbolSearch component used the canonical
 * `/api/symbol-search` (Polygon, multi-market) while MainLayout, WatchlistPanel,
 * ChartToolbar and ChartsDashboard each independently hit
 * `/api/finnhub?type=search` — a half-finished migration with four divergent
 * copies of the same fetch+parse.
 *
 * This resolver is canonical-first with a safe fallback: it queries the
 * canonical route, and only if that route errors or returns nothing does it
 * fall back to the Finnhub search path. So it upgrades to the richer canonical
 * coverage when available WITHOUT risking a blank search box if the canonical
 * provider key is unset — the failure-choreography standard.
 *
 * Returns a normalized SymbolHit[]; callers apply their own dedup/slice/labels.
 * PURE control flow with an injectable fetcher for unit testing.
 */

export interface SymbolHit {
  readonly sym: string;
  readonly name: string;
  /** Friendly category: Stock | ETF | Crypto | Forex | Index | Fund | "" */
  readonly cat: string;
  readonly exchange: string;
}

export type FetchJson = (url: string) => Promise<unknown>;

const defaultFetchJson: FetchJson = async (url) => {
  try {
    return await fetch(url, { cache: "no-store" }).then((r) => r.json());
  } catch {
    return null;
  }
};

type CanonRow = { sym?: unknown; label?: unknown; cat?: unknown; exchange?: unknown };
type FinnhubRow = { sym?: unknown; symbol?: unknown; name?: unknown; description?: unknown; type?: unknown; exchange?: unknown };

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Normalize Finnhub's raw `type` into the same friendly category vocabulary
 *  the canonical route emits, so callers see one category set. */
function finnhubCat(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("crypto")) return "Crypto";
  if (t.includes("forex") || t.includes("fx")) return "Forex";
  if (t.includes("etf") || t.includes("etp")) return "ETF";
  if (t.includes("index")) return "Index";
  if (t.includes("fund")) return "Fund";
  return "Stock";
}

function fromCanon(json: unknown): SymbolHit[] {
  const rows = (json as { results?: CanonRow[] })?.results;
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => ({ sym: str(r.sym), name: str(r.label), cat: str(r.cat), exchange: str(r.exchange) }))
    .filter((r) => r.sym && r.name);
}

function fromFinnhub(json: unknown): SymbolHit[] {
  const rows = (json as { results?: FinnhubRow[]; result?: FinnhubRow[] })?.results
    ?? (json as { result?: FinnhubRow[] })?.result;
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => ({
      sym: str(r.sym) || str(r.symbol),
      name: str(r.name) || str(r.description),
      cat: finnhubCat(str(r.type)),
      exchange: str(r.exchange),
    }))
    .filter((r) => r.sym && r.name);
}

/**
 * Resolve symbol-search hits for a query. Canonical route first, Finnhub
 * fallback on error/empty. Returns [] for a blank query or total failure
 * (never throws — a search box shows nothing rather than crashing).
 */
export async function searchSymbols(
  query: string,
  opts: { fetchJson?: FetchJson; limit?: number } = {},
): Promise<SymbolHit[]> {
  const q = query.trim();
  if (!q) return [];
  const fetchJson = opts.fetchJson ?? defaultFetchJson;
  const limit = opts.limit && opts.limit > 0 ? Math.floor(opts.limit) : 50;

  const safe = async (url: string): Promise<unknown> => {
    try { return await fetchJson(url); } catch { return null; }
  };

  const canon = fromCanon(await safe(`/api/symbol-search?q=${encodeURIComponent(q)}`));
  if (canon.length > 0) return canon.slice(0, limit);

  const finnhub = fromFinnhub(await safe(`/api/finnhub?q=${encodeURIComponent(q)}&type=search`));
  return finnhub.slice(0, limit);
}
