import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { parseOperationalGapCommand } from "@/lib/marketData/operationalGapContract";

function databaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceKey ? { url, serviceKey } : null;
}

function headers(serviceKey: string) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const config = databaseConfig();
  if (!config) return NextResponse.json({ error: "Operational gap memory is not configured." }, { status: 503 });
  const response = await fetch(`${config.url}/rest/v1/rpc/wm_list_market_operational_gaps`, {
    method: "POST",
    headers: headers(config.serviceKey),
    body: JSON.stringify({ p_owner_id: auth.user.sub, p_limit: 100 }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Operational gaps could not be read." }, { status: 502 });
  return NextResponse.json({ gaps: await response.json() });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const limited = checkRateLimit(`market-memory:gaps:${auth.user.sub}`, { max: 60, windowMs: 60_000 });
  if (!limited.ok) return limited.response;
  const config = databaseConfig();
  if (!config) return NextResponse.json({ error: "Operational gap memory is not configured." }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 4_096) return NextResponse.json({ error: "Operational gap receipt is too large." }, { status: 413 });
  const parsed = parseOperationalGapCommand((() => { try { return JSON.parse(raw); } catch { return null; } })());
  if (!parsed) return NextResponse.json({ error: "Invalid operational gap receipt." }, { status: 400 });
  const response = await fetch(`${config.url}/rest/v1/rpc/wm_record_market_operational_gap`, {
    method: "POST",
    headers: headers(config.serviceKey),
    body: JSON.stringify({ p_owner_id: auth.user.sub, p_gap: parsed }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Operational gap could not be recorded." }, { status: 502 });
  return NextResponse.json({ saved: true, gapId: await response.json(), action: parsed.action });
}
