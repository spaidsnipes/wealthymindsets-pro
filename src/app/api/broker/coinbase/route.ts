import { NextResponse } from "next/server";
import { createHmac } from "crypto";

export async function POST(req: Request) {
  const { key, secret } = await req.json().catch(() => ({})) as { key?: string; secret?: string };
  if (!key || !secret) return NextResponse.json({ error: "API Key and Secret are required" }, { status: 400 });

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = "GET";
  const path = "/api/v3/brokerage/accounts";
  const message = `${timestamp}${method}${path}`;
  const sig = createHmac("sha256", secret).update(message).digest("hex");

  const res = await fetch(`https://api.coinbase.com${path}`, {
    headers: {
      "CB-ACCESS-KEY":       key,
      "CB-ACCESS-SIGN":      sig,
      "CB-ACCESS-TIMESTAMP": timestamp,
    },
  }).catch(() => null);

  if (!res || !res.ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const data = await res.json() as { accounts?: { available_balance?: { value: string; currency: string }; currency: string }[] };
  const accounts = data.accounts ?? [];
  const usd = accounts.find(a => a.currency === "USD" || a.available_balance?.currency === "USD");
  const totalUsd = accounts.reduce((sum, a) => {
    if (a.available_balance?.currency === "USD") return sum + parseFloat(a.available_balance.value || "0");
    return sum;
  }, 0);

  return NextResponse.json({
    balance:  `$${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    equity:   `${accounts.length} accounts`,
    currency: "USD",
  });
}
