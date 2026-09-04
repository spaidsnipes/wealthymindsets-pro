/**
 * /api/fmp — Server-side Financial Modeling Prep proxy
 * Keeps FMP key off the client bundle.
 *
 * GET /api/fmp?path=/v3/profile/AAPL
 * GET /api/fmp?path=/v3/options/AAPL
 * GET /api/fmp?path=/v3/income-statement/AAPL&limit=5
 * GET /api/fmp?path=/v3/ratios-ttm/AAPL
 * GET /api/fmp?path=/v3/key-metrics-ttm/AAPL
 */

import { NextResponse } from "next/server";

// Accept EITHER env name so a key set in Vercel as FMP_KEY *or*
// NEXT_PUBLIC_FMP_KEY both work (a name mismatch was silently 503-ing Options +
// Financials with "provider not configured"). Prefer the non-public FMP_KEY —
// this is a server-only route, so a NEXT_PUBLIC_ key needlessly ships in the
// client bundle, contradicting this file's own "keeps the key off the client".
const FMP_KEY = process.env.FMP_KEY || process.env.NEXT_PUBLIC_FMP_KEY || "";
const FMP_BASE = "https://financialmodelingprep.com";

const CACHE = new Map<string, { data: unknown; ts: number }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") ?? "";
  const extra = searchParams.get("limit") ? `&limit=${searchParams.get("limit")}` : "";

  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });
  if (!FMP_KEY) {
    // Monday Test 2 canonical config-honesty contract — every WM API surface
    // that hits a missing host secret responds with {edge, missing:[…exact
    // names…]} so consumers can render the honest edge instead of guessing.
    // Sentinel enforces this shape across the whole /api tree.
    return NextResponse.json(
      { error: "FMP fundamentals provider is not configured", edge: "NOT CONFIGURED", missing: ["FMP_KEY (or NEXT_PUBLIC_FMP_KEY)"], source: "fmp" },
      { status: 503 },
    );
  }

  const cacheKey = path + extra;
  const ttl = path.includes("/options/") ? 60_000 : path.includes("/profile/") ? 300_000 : 300_000;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < ttl) {
    return NextResponse.json(cached.data);
  }

  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${FMP_BASE}${path}${sep}apikey=${FMP_KEY}${extra}`;
    // Keep the deadline alive through JSON consumption, not just headers.
    // Race as well as abort so an uncooperative transport cannot hold the route.
    const result = await Promise.race([
      (async () => {
        const res = await fetch(url, { cache: "no-store", signal: controller.signal });
        return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : null };
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new Error("FMP request deadline exceeded"));
        }, 8_000);
      }),
    ]);
    if (!result.ok) {
      return NextResponse.json({ error: `FMP HTTP ${result.status}` }, { status: result.status });
    }
    const data = result.data;
    CACHE.set(cacheKey, { data, ts: Date.now() });
    return NextResponse.json(data);
  } catch {
    // Raw fetch exceptions can contain the upstream URL, including its key.
    return NextResponse.json(
      { error: timedOut ? "FMP request timed out" : "FMP provider request failed", source: "fmp", edge: timedOut ? "TIMEOUT" : "PROVIDER ERROR" },
      { status: timedOut ? 504 : 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
