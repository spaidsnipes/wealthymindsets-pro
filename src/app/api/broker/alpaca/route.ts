import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { key, secret } = await req.json().catch(() => ({})) as { key?: string; secret?: string };
  if (!key || !secret) return NextResponse.json({ error: "API Key and Secret Key are required" }, { status: 400 });

  // Try paper first, then live
  for (const base of ["https://paper-api.alpaca.markets", "https://api.alpaca.markets"]) {
    const res = await fetch(`${base}/v2/account`, {
      headers: { "APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret },
    }).catch(() => null);
    if (!res) continue;
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        balance:      `$${parseFloat(data.cash).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        equity:       `$${parseFloat(data.equity).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        buying_power: `$${parseFloat(data.buying_power).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        currency:     data.currency,
        env:          base.includes("paper") ? "Paper Trading" : "Live",
      });
    }
  }
  return NextResponse.json({ error: "Invalid credentials or API access not enabled" }, { status: 401 });
}
