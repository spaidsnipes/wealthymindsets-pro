import { NextRequest, NextResponse } from "next/server";
import {
  tastytradeConfigStatus,
  tastytradeLiveOrdersEnabled,
  getTastytradeAccounts,
  getTastytradeOrders,
  dryRunTastytradeOrder,
  placeTastytradeOrder,
  cancelTastytradeOrder,
  inferInstrumentType,
  type TastytradeOrderInput,
} from "@/lib/tastytrade";
import { getAuthToken, verifyJWT } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// /api/broker/tastytrade/orders — server-only tastytrade order lifecycle.
//
// GET     ?account=…            → working orders for the account (first account
//                                 if omitted). Gated behind a WM session.
// POST    { account?, symbol, quantity, side, orderType?, price?, timeInForce? }
//                               → DRY-RUN by default (validates + buying-power,
//                                 no execution). Real submission requires BOTH
//                                 confirm_live:true in the body AND the server
//                                 flag TASTYTRADE_ALLOW_LIVE_ORDERS=1.
// DELETE  ?account=…&id=…       → cancel a working order.
//
// SAFETY: tastytrade production accounts are REAL money (no Alpaca-style paper
// account). Default path is dry-run so the full futures order pipeline is
// verifiable with zero execution risk. No secrets/tokens are ever returned.
// ─────────────────────────────────────────────────────────────────────────────

function requireSession(req: NextRequest): NextResponse | null {
  const token = getAuthToken(req);
  if (!token || !verifyJWT(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

async function resolveAccount(explicit?: string | null): Promise<string> {
  if (explicit) return explicit;
  const accts = await getTastytradeAccounts();
  if (!accts.length) throw new Error("No tastytrade accounts available");
  return accts[0].accountNumber;
}

export async function GET(req: NextRequest) {
  const unauth = requireSession(req);
  if (unauth) return unauth;

  const cfg = tastytradeConfigStatus();
  if (!cfg.configured) {
    return NextResponse.json({ error: "tastytrade not configured", items: [] }, { status: 200 });
  }
  try {
    const account = await resolveAccount(req.nextUrl.searchParams.get("account"));
    const items = await getTastytradeOrders(account);
    return NextResponse.json(
      { source: "tastytrade", state: "LIVE", account, liveOrdersEnabled: tastytradeLiveOrdersEnabled(), items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "tastytrade orders fetch failed", items: [] }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const unauth = requireSession(req);
  if (unauth) return unauth;

  const cfg = tastytradeConfigStatus();
  if (!cfg.configured) {
    return NextResponse.json({ error: "tastytrade not configured" }, { status: 200 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const symbol = String(body?.symbol ?? "").trim();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const quantity = Number(body?.quantity ?? body?.qty ?? 1);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "quantity must be a positive number" }, { status: 400 });
  }

  const rawSide = String(body?.side ?? "buy").toLowerCase();
  const instrumentType = inferInstrumentType(symbol);
  // Map a simple buy/sell into a tastytrade opening action. (Closing/rolling
  // actions are a later milestone once position lookup is wired.)
  const action = rawSide === "sell" ? "Sell to Open" : "Buy to Open";

  const orderType = (body?.orderType === "Limit" ? "Limit" : "Market") as "Market" | "Limit";
  const order: TastytradeOrderInput = {
    timeInForce: body?.timeInForce === "GTC" ? "GTC" : "Day",
    orderType,
    legs: [{ instrumentType, symbol, quantity, action }],
  };
  if (orderType === "Limit") {
    const price = Number(body?.price);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Limit order requires a positive price" }, { status: 400 });
    }
    order.price = price;
    order.priceEffect = rawSide === "sell" ? "Credit" : "Debit";
  }

  try {
    const account = await resolveAccount(body?.account);
    const wantLive = body?.confirm_live === true;

    // Real submission gate: needs explicit confirmation AND server certification.
    if (wantLive && !tastytradeLiveOrdersEnabled()) {
      return NextResponse.json(
        {
          error: "Live tastytrade orders are not enabled on this deployment.",
          hint: "Set TASTYTRADE_ALLOW_LIVE_ORDERS=1 in Vercel to certify live order routing.",
          requiresCertification: true,
        },
        { status: 428 },
      );
    }

    if (wantLive) {
      const result = await placeTastytradeOrder(account, order);
      return NextResponse.json({ mode: "live", account, order: result?.data?.order ?? result });
    }

    // Default: dry-run — validate + buying-power effect, NO execution.
    const dry = await dryRunTastytradeOrder(account, order);
    return NextResponse.json({
      mode: "dry-run",
      account,
      submitted: false,
      buyingPowerEffect: dry?.data?.["buying-power-effect"] ?? null,
      warnings: dry?.data?.warnings ?? [],
      order: dry?.data?.order ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "tastytrade order failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const unauth = requireSession(req);
  if (unauth) return unauth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "order id required" }, { status: 400 });

  try {
    const account = await resolveAccount(req.nextUrl.searchParams.get("account"));
    const result = await cancelTastytradeOrder(account, id);
    return NextResponse.json({ cancelled: true, account, id, result: result?.data ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "cancel failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
