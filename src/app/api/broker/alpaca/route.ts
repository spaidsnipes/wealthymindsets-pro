import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

export async function POST(req: Request) {
  // WM-SEC-P0-06: was unauthenticated credential-echo proxy.
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const { key, secret } = await req.json().catch(() => ({})) as { key?: string; secret?: string };
  if (!key || !secret) return NextResponse.json({ error: "API Key and Secret Key are required" }, { status: 400 });

  // Paper validation only. Never probe the live account endpoint with credentials
  // supplied by the browser; live access remains behind the uncertified firewall.
  const res = await fetch("https://paper-api.alpaca.markets/v2/account", {
    headers: { "APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret },
  }).catch(() => null);
  if (res?.ok) {
    const data = await res.json();
    return NextResponse.json({
      balance:      `$${parseFloat(data.cash).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      equity:       `$${parseFloat(data.equity).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      buying_power: `$${parseFloat(data.buying_power).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      currency:     data.currency,
      env:          "Paper Trading",
    });
  }
  return NextResponse.json({ error: "Invalid paper credentials or paper API access not enabled" }, { status: 401 });
}
