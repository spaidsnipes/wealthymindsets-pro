/**
 * /api/alpaca/trade — Paper trading order placement via Alpaca
 * Supports market, limit, stop, and trailing stop orders.
 * Always uses PAPER trading endpoint first (safe, simulated).
 */

import { NextRequest, NextResponse } from "next/server";

const PAPER_BASE = "https://paper-api.alpaca.markets";
const LIVE_BASE  = "https://api.alpaca.markets";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      key:           string;
      secret:        string;
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

    const {
      key, secret, symbol, side, qty, type,
      time_in_force = "day",
      limit_price, stop_price,
      trail_percent, trail_price,
      paper = true,
    } = body;

    if (!key || !secret) {
      return NextResponse.json({ error: "API key and secret required" }, { status: 400 });
    }
    if (!symbol || !side || !qty || !type) {
      return NextResponse.json({ error: "symbol, side, qty, type required" }, { status: 400 });
    }

    const base = paper ? PAPER_BASE : LIVE_BASE;
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

    const res = await fetch(`${base}/v2/orders`, {
      method: "POST",
      headers: {
        "APCA-API-KEY-ID":     key,
        "APCA-API-SECRET-KEY": secret,
        "Content-Type":        "application/json",
      },
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
      env:       paper ? "paper" : "live",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key    = req.headers.get("APCA-API-KEY-ID")    ?? searchParams.get("key")    ?? "";
  const secret = req.headers.get("APCA-API-SECRET-KEY") ?? searchParams.get("secret") ?? "";
  const paper  = searchParams.get("paper") !== "false";
  const action = searchParams.get("action") ?? "positions";

  if (!key || !secret) {
    return NextResponse.json({ error: "key and secret required" }, { status: 400 });
  }

  const base = paper ? PAPER_BASE : LIVE_BASE;
  const headers = { "APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret };

  const endpointMap: Record<string, string> = {
    positions: "/v2/positions",
    orders:    "/v2/orders?status=open&limit=50",
    account:   "/v2/account",
  };

  const path = endpointMap[action] ?? "/v2/account";
  const res  = await fetch(`${base}${path}`, { headers });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
