/**
 * /api/alpaca-trading — Real Alpaca trading (paper + live)
 *
 * Auto-detects live vs paper based on ALPACA_LIVE env var.
 * If ALPACA_LIVE=1 → uses live endpoint (api.alpaca.markets)
 * Otherwise → tries paper first, falls back to live.
 *
 * GET  ?action=account                     → account details + env
 * GET  ?action=positions                   → open positions
 * GET  ?action=orders&status=all           → recent orders
 * GET  ?action=quote&symbol=AAPL           → Alpaca data quote
 * POST { action:"order", symbol, qty, side, type, time_in_force, limit_price? }
 * DELETE ?action=order&id={orderId}        → cancel order
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

// Alpaca uses SEPARATE credentials for paper vs live accounts. Prefer dedicated
// paper keys for paper trading; fall back to the generic keys only if no paper-
// specific keys are set. Live keys are used solely for the live endpoint.
const ALPACA_KEY        = process.env.ALPACA_KEY    ?? "";
const ALPACA_SECRET     = process.env.ALPACA_SECRET ?? "";
const ALPACA_PAPER_KEY    = process.env.ALPACA_PAPER_KEY    ?? "";
const ALPACA_PAPER_SECRET = process.env.ALPACA_PAPER_SECRET ?? "";
const FORCE_LIVE    = process.env.ALPACA_LIVE === "1";

const PAPER_BASE    = "https://paper-api.alpaca.markets";
const LIVE_BASE     = "https://api.alpaca.markets";
const DATA_BASE     = "https://data.alpaca.markets";

// Paper trading uses paper keys when available; live uses the generic keys.
const PAPER_KEY    = ALPACA_PAPER_KEY    || ALPACA_KEY;
const PAPER_SECRET = ALPACA_PAPER_SECRET || ALPACA_SECRET;

function authHeadersFor(base: string) {
  const isPaper = base === PAPER_BASE;
  return {
    "APCA-API-KEY-ID":     isPaper ? PAPER_KEY    : ALPACA_KEY,
    "APCA-API-SECRET-KEY": isPaper ? PAPER_SECRET : ALPACA_SECRET,
    "Content-Type":        "application/json",
  };
}
// Back-compat shim for existing call sites that used authHeaders() without a
// base — defaults to the resolved base (paper unless FORCE_LIVE).
function authHeaders() {
  return authHeadersFor(FORCE_LIVE ? LIVE_BASE : PAPER_BASE);
}

// Determine which base URL to use — cached after first success
let resolvedBase: string | null = null;
let resolvedEnv:  "Paper Trading" | "Live Trading" | null = null;

async function getBase(): Promise<{ url: string; env: "Paper Trading" | "Live Trading" }> {
  if (resolvedBase && resolvedEnv) return { url: resolvedBase, env: resolvedEnv };

  if (FORCE_LIVE) {
    resolvedBase = LIVE_BASE;
    resolvedEnv  = "Live Trading";
    return { url: LIVE_BASE, env: "Live Trading" };
  }

  // Try paper first
  const tryPaper = await fetch(`${PAPER_BASE}/v2/account`, {
    headers: authHeaders(),
    cache: "no-store",
  }).catch(() => null);

  // Default to PAPER. NEVER silently fall back to the live (real-money) endpoint
  // if the paper check fails — that could route a real order on a transient error
  // (Company Bible §46 Gate 3: paper-first, live disabled until certified, never
  // a silent fallback). Live is ONLY reachable via the explicit ALPACA_LIVE flag
  // handled above.
  resolvedBase = PAPER_BASE;
  resolvedEnv  = "Paper Trading";
  return { url: PAPER_BASE, env: "Paper Trading" };
}

export async function GET(request: Request) {
  // WM-SEC-P0-06: was unauthenticated. Reads Alpaca account state.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "account";

  if (!ALPACA_KEY || !ALPACA_SECRET) {
    return NextResponse.json({ error: "Alpaca API keys not configured in .env.local" }, { status: 503 });
  }

  try {
    const { url: base, env } = await getBase();

    if (action === "account") {
      const res  = await fetch(`${base}/v2/account`, { headers: authHeaders(), cache: "no-store" });
      if (!res.ok) {
        const t = await res.text();
        return NextResponse.json({ error: `Alpaca ${res.status}: ${t}` }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json({ ...data, _env: env, _connected: true });

    } else if (action === "positions") {
      const res  = await fetch(`${base}/v2/positions`, { headers: authHeaders(), cache: "no-store" });
      if (!res.ok) { const t = await res.text(); return NextResponse.json({ error: t }, { status: res.status }); }
      return NextResponse.json(await res.json());

    } else if (action === "orders") {
      const status = searchParams.get("status") ?? "all";
      const res  = await fetch(`${base}/v2/orders?status=${status}&limit=50&direction=desc`, { headers: authHeaders(), cache: "no-store" });
      if (!res.ok) { const t = await res.text(); return NextResponse.json({ error: t }, { status: res.status }); }
      return NextResponse.json(await res.json());

    } else if (action === "quote") {
      const sym = searchParams.get("symbol")?.toUpperCase();
      if (!sym) return NextResponse.json({ error: "symbol required" }, { status: 400 });
      // Alpaca free tier: latest trade
      const res = await fetch(`${DATA_BASE}/v2/stocks/${sym}/trades/latest`, {
        headers: authHeaders(), cache: "no-store",
      });
      if (!res.ok) { const t = await res.text(); return NextResponse.json({ error: t }, { status: res.status }); }
      const data = await res.json();
      return NextResponse.json({ price: data?.trade?.p ?? null, symbol: sym });

    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // WM-SEC-P0-06: was unauthenticated. Places real Alpaca orders (paper+live).
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (!ALPACA_KEY || !ALPACA_SECRET) {
    return NextResponse.json({ error: "Alpaca API keys not configured" }, { status: 503 });
  }

  try {
    const { url: base, env } = await getBase();
    const body = await request.json();
    const { action, ...orderFields } = body;

    if (action === "order") {
      const sym = (orderFields.symbol ?? "").toString().toUpperCase();
      // SAFETY: Alpaca trades US equities + crypto only. Reject futures/forex
      // symbols so a "BUY 1 ES1!" can't produce a misleading failure or, worse,
      // a mis-routed order. (Futures execution routes through a certified futures
      // broker — tastytrade — not Alpaca.)
      if (/^\/|[!]$|^(ES|NQ|RTY|YM|GC|CL|SI|ZB|ZN|6[A-Z])\d?$/.test(sym) || sym.includes("1!")) {
        return NextResponse.json(
          { error: `Alpaca cannot trade ${sym} (futures). Use a supported equity/crypto symbol.` },
          { status: 400 },
        );
      }
      // SAFETY: a LIVE (real-money) order must carry an explicit confirmation —
      // never fire real money from a single unconfirmed click (Company Bible §46
      // Gate 3 / §30 trading safety). Paper orders proceed normally.
      if (env === "Live Trading" && orderFields.confirm_live !== true) {
        return NextResponse.json(
          { error: "LIVE order requires explicit confirmation (confirm_live).", env, requiresConfirm: true },
          { status: 428 }, // Precondition Required
        );
      }
      // Map WM order fields → Alpaca API shape
      const order: Record<string, unknown> = {
        symbol:        orderFields.symbol?.toUpperCase(),
        qty:           String(orderFields.qty ?? orderFields.quantity ?? 1),
        side:          orderFields.side ?? "buy",          // "buy" | "sell"
        type:          orderFields.type ?? "market",       // "market" | "limit" | "stop" | "stop_limit"
        time_in_force: orderFields.time_in_force ?? "day", // "day" | "gtc" | "ioc" | "fok"
      };
      if (orderFields.limit_price)  order.limit_price  = String(orderFields.limit_price);
      if (orderFields.stop_price)   order.stop_price   = String(orderFields.stop_price);
      if (orderFields.notional)     { delete order.qty; order.notional = String(orderFields.notional); }
      if (orderFields.trail_price)  order.trail_price  = String(orderFields.trail_price);
      if (orderFields.trail_percent) order.trail_percent = String(orderFields.trail_percent);

      const res = await fetch(`${base}/v2/orders`, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify(order),
      });
      const data = await res.json();
      if (!res.ok) return NextResponse.json({ error: data.message ?? "Order failed", details: data }, { status: res.status });
      return NextResponse.json({ ...data, _env: env });

    } else if (action === "cancel_all") {
      const res = await fetch(`${base}/v2/orders`, { method: "DELETE", headers: authHeaders() });
      if (res.status === 207 || res.ok) return NextResponse.json({ cancelled: true });
      const t = await res.text();
      return NextResponse.json({ error: t }, { status: res.status });

    } else {
      return NextResponse.json({ error: "Unknown POST action" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  // WM-SEC-P0-06: was unauthenticated. Cancels real Alpaca orders.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("id");

  if (!ALPACA_KEY || !ALPACA_SECRET) {
    return NextResponse.json({ error: "Alpaca keys not configured" }, { status: 503 });
  }
  if (!orderId) return NextResponse.json({ error: "Order id required" }, { status: 400 });

  try {
    const { url: base } = await getBase();
    const res = await fetch(`${base}/v2/orders/${orderId}`, { method: "DELETE", headers: authHeaders() });
    if (res.status === 204) return NextResponse.json({ cancelled: true });
    const data = await res.json();
    return NextResponse.json({ error: data.message ?? "Cancel failed" }, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
