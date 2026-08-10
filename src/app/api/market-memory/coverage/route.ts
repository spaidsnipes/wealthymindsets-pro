import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  createCoverageContinuityRecord,
  parseCoverageContinuityRecord,
} from "@/lib/marketData/coverageContinuity";
import {
  continuityRecordToRpcChannels,
  databaseRowsToContinuityRecord,
} from "@/lib/marketData/coverageServerPersistence";

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
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const config = databaseConfig();
  if (!config) return NextResponse.json({ error: "Durable coverage is not configured." }, { status: 503 });

  const url = new URL(`${config.url}/rest/v1/wm_market_coverage_checkpoints`);
  url.searchParams.set("owner_id", `eq.${auth.user.sub}`);
  url.searchParams.set("select", "instrument_id,normalized_symbol,channel,provider_path,observed_from,observed_through,last_event_at,observed_event_count,gap_count,last_gap_at,fidelity,collection_scope,persistence_right,rights_policy_id");
  url.searchParams.set("order", "updated_at.asc");
  url.searchParams.set("limit", "100");
  const response = await fetch(url, { headers: headers(config.serviceKey), cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Durable coverage could not be read." }, { status: 502 });
  const rows = await response.json() as Parameters<typeof databaseRowsToContinuityRecord>[0];
  return NextResponse.json({ record: databaseRowsToContinuityRecord(rows) });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const limited = checkRateLimit(`market-memory:coverage:${auth.user.sub}`, { max: 12, windowMs: 60_000 });
  if (!limited.ok) return limited.response;
  const config = databaseConfig();
  if (!config) return NextResponse.json({ error: "Durable coverage is not configured." }, { status: 503 });

  const raw = await request.text();
  const parsed = parseCoverageContinuityRecord(raw);
  if (!parsed) return NextResponse.json({ error: "Invalid coverage checkpoint." }, { status: 400 });
  // Reconstruct once more to guarantee only the operational allow-list crosses
  // the server boundary. Raw events, price, size and event IDs are never sent.
  const safe = createCoverageContinuityRecord(parsed.channels);
  const response = await fetch(`${config.url}/rest/v1/rpc/wm_upsert_market_coverage_checkpoints`, {
    method: "POST",
    headers: headers(config.serviceKey),
    body: JSON.stringify({
      p_owner_id: auth.user.sub,
      p_channels: continuityRecordToRpcChannels(safe),
    }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Durable coverage could not be recorded." }, { status: 502 });
  return NextResponse.json({ saved: true, channels: safe.channels.length });
}
