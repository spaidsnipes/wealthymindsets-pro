/**
 * Canonical FMP client — ONE client entry point for Financial Modeling Prep
 * egress (Founder Breakthrough Build Contract, anti-spaghetti: no direct
 * provider fetch scattered across UI; terminate provider egress behind a
 * canonical contract).
 *
 * Before this, OptionsChain, the scanner and ChartsDashboard each built
 * `fetch('/api/fmp?path=' + …)` inline — with INCONSISTENT encoding (two sites
 * left the path's slashes raw in the query string; one encoded the whole path).
 * They all happened to work because the route decodes either form, but that
 * fragility is exactly the kind of drift that eventually bites.
 *
 * `fmpFetch(path)` is the single owner: callers pass a RAW path (segments
 * already interpolated, NOT pre-encoded); this encodes exactly once, calls the
 * server route, and returns parsed JSON — or null on a non-OK response, an FMP
 * error payload, or any network failure. Never throws (a fundamentals/options
 * panel shows its empty state, it does not crash).
 *
 * Pure control flow with an injectable transport for unit testing.
 */

export type FmpTransport = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

const defaultTransport: FmpTransport = (url) => fetch(url, { cache: "no-store" });

function isErrorPayload(data: unknown): boolean {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const o = data as Record<string, unknown>;
  return "error" in o || "Error Message" in o;
}

/**
 * Fetch an FMP path through the canonical `/api/fmp` route. `path` is the raw
 * FMP path (e.g. `/v3/profile/AAPL,MSFT` or `/v3/options/AAPL`) — do NOT
 * pre-encode segments; this encodes the whole path once. Returns parsed JSON,
 * or null on failure / error payload.
 */
export async function fmpFetch(
  path: string,
  opts: { transport?: FmpTransport } = {},
): Promise<unknown | null> {
  const p = (path ?? "").trim();
  if (!p) return null;
  const transport = opts.transport ?? defaultTransport;
  try {
    const res = await transport(`/api/fmp?path=${encodeURIComponent(p)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (isErrorPayload(data)) return null;
    return data;
  } catch {
    return null;
  }
}
