import { NextResponse } from "next/server";
import { createHmac, createHash } from "crypto";
import { requireAuth } from "@/lib/requireAuth";
import { CREDENTIAL_PROBE_INVALID, credentialProbeGate } from "@/lib/broker/credentialProbeGate";

export async function POST(req: Request) {
  // WM-SEC-P0-06: was unauthenticated credential-echo proxy.
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  // API audit P1-1 (2026-10-09): same-origin, operator only, five probes per ten minutes.
  { const refusal = credentialProbeGate(req, auth.user.sub); if (refusal) return refusal; }
  const { key, secret } = await req.json().catch(() => ({})) as { key?: string; secret?: string };
  if (!key || !secret) return NextResponse.json({ error: "API Key and Private Key are required" }, { status: 400 });

  const nonce = Date.now().toString();
  const postData = `nonce=${nonce}`;
  const path = "/0/private/Balance";
  const secretBuf = Buffer.from(secret, "base64");
  const sha256Hash = createHash("sha256").update(nonce + postData).digest();
  const sig = createHmac("sha512", secretBuf).update(Buffer.concat([Buffer.from(path), sha256Hash])).digest("base64");

  const res = await fetch(`https://api.kraken.com${path}`, {
    method: "POST",
    headers: { "API-Key": key, "API-Sign": sig, "Content-Type": "application/x-www-form-urlencoded" },
    body: postData,
  }).catch(() => null);

  if (!res || !res.ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const data = await res.json() as { result?: Record<string, string>; error?: string[] };
  // The provider's own error text stays on the server (P1-1): plain words only.
  if (data.error && data.error.length > 0) return NextResponse.json({ error: CREDENTIAL_PROBE_INVALID }, { status: 401 });

  const balances = data.result ?? {};
  const zusd = parseFloat(balances["ZUSD"] ?? "0");

  return NextResponse.json({
    balance:  `$${zusd.toFixed(2)} USD`,
    equity:   `${Object.keys(balances).length} assets`,
    currency: "USD",
  });
}
