/**
 * /api/alpaca/trade — Paper trading order placement via Alpaca
 * Supports market, limit, stop, and trailing stop orders.
 * Always uses PAPER trading endpoint first (safe, simulated).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  ALPACA_PAPER_BASE,
  alpacaAccountUnauthorizedResponse,
  isAuthorizedAlpacaOwner,
  liveAlpacaDisabledResponse,
  rejectsLiveAlpacaRequest,
} from "@/lib/alpacaSafety";

const PAPER_KEY = process.env.ALPACA_PAPER_KEY ?? "";
const PAPER_SECRET = process.env.ALPACA_PAPER_SECRET ?? "";
const ALPACA_OWNER_USER_ID = process.env.ALPACA_OWNER_USER_ID;

const headers = () => ({
  "APCA-API-KEY-ID": PAPER_KEY,
  "APCA-API-SECRET-KEY": PAPER_SECRET,
  "Content-Type": "application/json",
});

export async function POST(req: NextRequest) {
  // WM-SEC-P0-06: was unauthenticated. Executes real Alpaca orders.
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!isAuthorizedAlpacaOwner(auth.user.sub, ALPACA_OWNER_USER_ID)) {
    return NextResponse.json(alpacaAccountUnauthorizedResponse(), { status: 403 });
  }
  const rl = checkRateLimit(`alpaca-legacy-paper-post:${auth.user.sub}`, { max: 30, windowMs: 60_000 });
  if (!rl.ok) return rl.response;
  try {
    const body = await req.json() as {
      symbol:        string;
      side:          "buy" | "sell";
      qty:           number;
      type:          "market" | "limit" | "stop" | "stop_limit" | "trailing_stop";
      time_in_force?: "day" | "gtc" | "ioc" | "fok";
      limit_price?:  number;
      stop_price?:   number;
      trail_percent?: number;
      trail_price?:  number;
      paper?:        boolean; // default true
    };

    if (rejectsLiveAlpacaRequest(body)) {
      return NextResponse.json(liveAlpacaDisabledResponse(), { status: 403 });
    }
    if (!PAPER_KEY || !PAPER_SECRET) {
      return NextResponse.json({ error: "Alpaca paper credentials are not configured", environment: "PAPER_ONLY" }, { status: 503 });
    }

    const {
      symbol, side, qty, type,
      time_in_force = "day",
      limit_price, stop_price,
      trail_percent, trail_price,
    } = body;

    if (!symbol || !side || !qty || !type) {
      return NextResponse.json({ error: "symbol, side, qty, type required" }, { status: 400 });
    }

    const order: Record<string, unknown> = {
      symbol:        symbol.toUpperCase(),
      qty:           String(qty),
      side,
      type,
      time_in_force,
    };

    if (type === "limit" || type === "stop_limit") {
      if (!limit_price) return NextResponse.json({ error: "limit_price required for limit orders" }, { status: 400 });
      order.limit_price = String(limit_price);
    }
    if (type === "stop" || type === "stop_limit") {
      if (!stop_price) return NextResponse.json({ error: "stop_price required for stop orders" }, { status: 400 });
      order.stop_price = String(stop_price);
    }
    if (type === "trailing_stop") {
      if (trail_percent) order.trail_percent = String(trail_percent);
      else if (trail_price) order.trail_price = String(trail_price);
      else return NextResponse.json({ error: "trail_percent or trail_price required" }, { status: 400 });
    }

    const res = await fetch(`${ALPACA_PAPER_BASE}/v2/orders`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(order),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.message ?? "Order rejected", detail: data }, { status: res.status });
    }

    return NextResponse.json({
      ok:        true,
      order_id:  data.id,
      symbol:    data.symbol,
      side:      data.side,
      qty:       data.qty,
      type:      data.type,
      status:    data.status,
      filled_at: data.filled_at,
      env:       "paper",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // WM-SEC-P0-06: was unauthenticated. Reads live account state.
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!isAuthorizedAlpacaOwner(auth.user.sub, ALPACA_OWNER_USER_ID)) {
    return NextResponse.json(alpacaAccountUnauthorizedResponse(), { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "positions";

  if (searchParams.has("key") || searchParams.has("secret")) {
    return NextResponse.json({ error: "Credentials in URLs are forbidden", code: "URL_CREDENTIALS_FORBIDDEN" }, { status: 400 });
  }
  if (searchParams.get("paper") === "false") {
    return NextResponse.json(liveAlpacaDisabledResponse(), { status: 403 });
  }
  if (!PAPER_KEY || !PAPER_SECRET) {
    return NextResponse.json({ error: "Alpaca paper credentials are not configured", environment: "PAPER_ONLY" }, { status: 503 });
  }

  const endpointMap: Record<string, string> = {
    positions: "/v2/positions",
    orders:    "/v2/orders?status=open&limit=50",
    account:   "/v2/account",
  };

  const path = endpointMap[action] ?? "/v2/account";
  const res  = await fetch(`${ALPACA_PAPER_BASE}${path}`, { headers: headers() });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
