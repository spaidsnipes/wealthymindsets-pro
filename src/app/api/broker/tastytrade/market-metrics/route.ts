import { NextRequest, NextResponse } from "next/server";
import { ttGet, tastytradeConfigStatus } from "@/lib/tastytrade";
import { requireAuth } from "@/lib/requireAuth";

// Server-only. Real tastytrade market metrics (IV rank, beta, liquidity, etc.)
// for a symbol list — proves the full authenticated data pipeline end-to-end,
// and feeds options/market-intel context (Company Bible §34). Endpoint verified
// against tastytrade's SDK (market-metrics-service.ts): GET /market-metrics?symbols=.
// Gated behind a WM session; returns no tokens/secrets.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const cfg = tastytradeConfigStatus();
  if (!cfg.configured) {
    return NextResponse.json({ error: "tastytrade not configured", items: [] }, { status: 200 });
  }
  const symbols = (req.nextUrl.searchParams.get("symbols") || "").trim();
  if (!symbols) {
    return NextResponse.json({ error: "symbols query param required (comma-separated)" }, { status: 400 });
  }
  // Cap to protect the upstream — never forward an unbounded list.
  const list = symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 25);
  try {
    const data = await ttGet<{ data?: { items?: unknown[] } }>(`/market-metrics?symbols=${encodeURIComponent(list.join(","))}`);
    const items = data?.data?.items ?? [];
    return NextResponse.json(
      {
        source: "tastytrade",
        state: "SNAPSHOT",
        observedAt: new Date().toISOString(),
        note: "On-demand authenticated market metrics; not a streaming quote or real-time entitlement receipt.",
        items,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "tastytrade market-metrics failed", items: [] }, { status: 502 });
  }
}
