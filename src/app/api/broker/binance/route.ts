import { NextResponse } from "next/server";
import { createHmac } from "crypto";

export async function POST(req: Request) {
  const { key, secret } = await req.json().catch(() => ({})) as { key?: string; secret?: string };
  if (!key || !secret) return NextResponse.json({ error: "API Key and Secret Key are required" }, { status: 400 });

  const timestamp = Date.now().toString();
  const query = `timestamp=${timestamp}`;
  const sig = createHmac("sha256", secret).update(query).digest("hex");

  const res = await fetch(`https://api.binance.us/api/v3/account?${query}&signature=${sig}`, {
    headers: { "X-MBX-APIKEY": key },
  }).catch(() => null);

  if (!res || !res.ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const data = await res.json() as { balances?: { asset: string; free: string; locked: string }[] };
  const balances = (data.balances ?? []).filter(b => parseFloat(b.free) + parseFloat(b.locked) > 0);
  const usdt = balances.find(b => b.asset === "USDT");

  return NextResponse.json({
    balance:  usdt ? `${parseFloat(usdt.free).toFixed(2)} USDT` : "See portfolio",
    equity:   `${balances.length} assets`,
    currency: "USDT",
  });
}
