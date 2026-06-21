import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { key } = await req.json().catch(() => ({})) as { key?: string };
  if (!key) return NextResponse.json({ error: "API Access Token is required" }, { status: 400 });

  // Try practice first, then live
  for (const [env, base] of [["Practice","https://api-fxpractice.oanda.com"], ["Live","https://api-fxtrade.oanda.com"]]) {
    const res = await fetch(`${base}/v3/accounts`, {
      headers: { Authorization: `Bearer ${key}` },
    }).catch(() => null);
    if (!res || !res.ok) continue;
    const data = await res.json() as { accounts?: { id: string }[] };
    const accounts = data.accounts ?? [];
    if (accounts.length === 0) continue;
    const accountId = accounts[0].id;
    const acctRes = await fetch(`${base}/v3/accounts/${accountId}/summary`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!acctRes.ok) continue;
    const acctData = await acctRes.json() as { account?: { balance: string; NAV: string; marginAvailable: string; currency: string } };
    const acct = acctData.account;
    if (!acct) continue;
    return NextResponse.json({
      balance:      `${parseFloat(acct.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${acct.currency}`,
      equity:       `${parseFloat(acct.NAV).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${acct.currency}`,
      buying_power: `${parseFloat(acct.marginAvailable).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${acct.currency}`,
      currency:     acct.currency,
      env,
    });
  }
  return NextResponse.json({ error: "Invalid token or no accounts found" }, { status: 401 });
}
