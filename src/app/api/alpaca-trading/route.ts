/**
 * /api/alpaca-trading — Alpaca paper account access only.
 * Live brokerage access is fail-closed until the WM Execution Firewall is
 * certified. No environment flag or request field can promote this route.
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
import { checkRateLimit } from "@/lib/rateLimit";
import {
  ALPACA_PAPER_BASE,
  liveAlpacaDisabledResponse,
  rejectsLiveAlpacaRequest,
} from "@/lib/alpacaSafety";

const ALPACA_PAPER_KEY    = process.env.ALPACA_PAPER_KEY    ?? "";
const ALPACA_PAPER_SECRET = process.env.ALPACA_PAPER_SECRET ?? "";
const DATA_BASE     = "https://data.alpaca.markets";

function authHeaders() {
  return {
    "APCA-API-KEY-ID":     ALPACA_PAPER_KEY,
    "APCA-API-SECRET-KEY": ALPACA_PAPER_SECRET,
    "Content-Type":        "application/json",
  };
}

export async function GET(request: Request) {
  // WM-SEC-P0-06: was unauthenticated. Reads Alpaca account state.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "account";

  if (!ALPACA_PAPER_KEY || !ALPACA_PAPER_SECRET) {
    return NextResponse.json({ error: "Alpaca paper credentials are not configured", environment: "PAPER_ONLY" }, { status: 503 });
  }

  try {
    const base = ALPACA_PAPER_BASE;
    const env = "Paper Trading";

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
  // WM-SEC-P0-06: authenticated paper-order path. Live stays fail-closed.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  // WM-SEC-P0-07: cap order submissions per user. 30/min is generous for a
  // human trader (2s cadence) and stops a runaway loop from placing hundreds
  // of orders before anyone notices.
  const rl = checkRateLimit(`alpaca-trading-post:${auth.user.sub}`, { max: 30, windowMs: 60_000 });
  if (!rl.ok) return rl.response;
  if (!ALPACA_PAPER_KEY || !ALPACA_PAPER_SECRET) {
    return NextResponse.json({ error: "Alpaca paper credentials are not configured", environment: "PAPER_ONLY" }, { status: 503 });
  }

  try {
    const body = await request.json();
    if (rejectsLiveAlpacaRequest(body)) {
      return NextResponse.json(liveAlpacaDisabledResponse(), { status: 403 });
    }
    const base = ALPACA_PAPER_BASE;
    const env = "Paper Trading";
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
  // WM-SEC-P0-06: authenticated paper-order cancellation only.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("id");

  if (!ALPACA_PAPER_KEY || !ALPACA_PAPER_SECRET) {
    return NextResponse.json({ error: "Alpaca paper credentials are not configured", environment: "PAPER_ONLY" }, { status: 503 });
  }
  if (!orderId) return NextResponse.json({ error: "Order id required" }, { status: 400 });

  try {
    const base = ALPACA_PAPER_BASE;
    const res = await fetch(`${base}/v2/orders/${orderId}`, { method: "DELETE", headers: authHeaders() });
    if (res.status === 204) return NextResponse.json({ cancelled: true });
    const data = await res.json();
    return NextResponse.json({ error: data.message ?? "Cancel failed" }, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
