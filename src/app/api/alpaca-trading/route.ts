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

const ALPACA_KEY    = process.env.ALPACA_KEY    ?? "";
const ALPACA_SECRET = process.env.ALPACA_SECRET ?? "";
const FORCE_LIVE    = process.env.ALPACA_LIVE === "1";

const PAPER_BASE    = "https://paper-api.alpaca.markets";
const LIVE_BASE     = "https://api.alpaca.markets";
const DATA_BASE     = "https://data.alpaca.markets";

function authHeaders() {
  return {
    "APCA-API-KEY-ID":     ALPACA_KEY,
    "APCA-API-SECRET-KEY": ALPACA_SECRET,
    "Content-Type":        "application/json",
  };
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

  if (tryPaper?.ok) {
    resolvedBase = PAPER_BASE;
    resolvedEnv  = "Paper Trading";
    return { url: PAPER_BASE, env: "Paper Trading" };
  }

  // Fall back to live
  resolvedBase = LIVE_BASE;
  resolvedEnv  = "Live Trading";
  return { url: LIVE_BASE, env: "Live Trading" };
}

export async function GET(request: Request) {
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
  if (!ALPACA_KEY || !ALPACA_SECRET) {
    return NextResponse.json({ error: "Alpaca API keys not configured" }, { status: 503 });
  }

  try {
    const { url: base, env } = await getBase();
    const body = await request.json();
    const { action, ...orderFields } = body;

    if (action === "order") {
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
