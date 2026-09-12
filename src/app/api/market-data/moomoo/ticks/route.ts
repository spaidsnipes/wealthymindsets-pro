import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { readMoomooTicks } from "@/lib/marketData/adapters/moomooTicksClient";
import { WIRE_PROOF_SYMBOL } from "@/lib/marketData/wireProofScope";

export const dynamic = "force-dynamic";

const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.-]{0,14}$/;

/**
 * Bounded authenticated read path for moomoo executed prints (ticks), served
 * through the OpenD bridge. This route cannot access accounts or submit,
 * modify, or cancel orders.
 *
 * The visible `label` names the ACTUAL proven blocker (NOT CONFIGURED /
 * AUTH BLOCKED / BRIDGE UNREACHABLE / SUBSCRIPTION FAILED / NO EVENTS RECEIVED
 * / RECEIVING / UNKNOWN) — it NEVER asserts "DELAYED BY ENTITLEMENT" for a
 * missing var, host, bridge, or subscription, and it never claims uncertified
 * realtime (canonical events default to DELAYED).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  // NO DEFAULT. This route used to read `... || "TSLA"`, so a caller that
  // asked about nothing received a confident receipt about a US equity it
  // never named. A tick route answering an unasked question is the same
  // substitution the strip's chip was disclosing — one layer further in.
  const requested = request.nextUrl.searchParams.get("symbol");
  const symbol = (requested ?? "").trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) {
    return NextResponse.json(
      {
        source: "moomoo",
        label: "UNKNOWN",
        detail: symbol === ""
          ? `No symbol was requested. This route reads prints for ONE named instrument and will not substitute a default — pass ?symbol=, e.g. ${WIRE_PROOF_SYMBOL} (US market assumed) or an explicit provider code like US.${WIRE_PROOF_SYMBOL}.`
          : `Pass one symbol, e.g. ${WIRE_PROOF_SYMBOL} (US market assumed) or an explicit provider code like US.${WIRE_PROOF_SYMBOL}.`,
        symbol,
        eventCount: 0,
        events: [],
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Accept either an explicit moomoo market code (contains a ".") or a bare US
  // symbol, which we address to the US market by convention (US.<symbol>).
  const providerCode = symbol.includes(".") ? symbol : `US.${symbol}`;
  const appSymbol = symbol.includes(".") ? symbol.slice(symbol.indexOf(".") + 1) : symbol;

  const { status, events } = await readMoomooTicks(
    fetch,
    {
      bridgeUrl: process.env.MOOMOO_BRIDGE_URL || undefined,
      bridgeToken: process.env.MOOMOO_BRIDGE_TOKEN || undefined,
    },
    { providerCode, appSymbol },
  );

  return NextResponse.json(
    {
      source: "moomoo",
      label: status.label,
      detail: status.detail,
      symbol: appSymbol,
      providerCode,
      receiving: status.receiving,
      eventCount: status.eventCount,
      events,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
