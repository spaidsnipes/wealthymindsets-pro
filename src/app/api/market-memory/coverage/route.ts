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

  const checkpointUrl = new URL(`${config.url}/rest/v1/wm_market_coverage_checkpoints`);
  checkpointUrl.searchParams.set("owner_id", `eq.${auth.user.sub}`);
  checkpointUrl.searchParams.set("select", "instrument_id,normalized_symbol,channel,provider_path,observed_from,observed_through,last_event_at,observed_event_count,gap_count,last_gap_at,fidelity,collection_scope,persistence_right,rights_policy_id");
  checkpointUrl.searchParams.set("order", "updated_at.asc");
  checkpointUrl.searchParams.set("limit", "100");

  // First-seen guard: even if the checkpoint row was ever deleted+reinserted
  // (2026-08-10 morning history was lost this way), first_seen preserves the
  // earliest observation and the client sees LEAST(checkpoint, first_seen).
  const firstSeenUrl = new URL(`${config.url}/rest/v1/wm_market_coverage_first_seen`);
  firstSeenUrl.searchParams.set("owner_id", `eq.${auth.user.sub}`);
  firstSeenUrl.searchParams.set("select", "instrument_id,channel,provider_path,observed_from");
  firstSeenUrl.searchParams.set("limit", "100");

  const [cpRes, fsRes] = await Promise.all([
    fetch(checkpointUrl, { headers: headers(config.serviceKey), cache: "no-store" }),
    fetch(firstSeenUrl, { headers: headers(config.serviceKey), cache: "no-store" }).catch(() => null),
  ]);
  if (!cpRes.ok) return NextResponse.json({ error: "Durable coverage could not be read." }, { status: 502 });

  const rows = await cpRes.json() as Parameters<typeof databaseRowsToContinuityRecord>[0];

  // If the first_seen table exists and returns data, apply the guard.
  // Missing table (pre-migration) or transient error falls through with a
  // truthful checkpoint-only value; the guard degrades gracefully.
  if (fsRes && fsRes.ok) {
    const firstSeen = await fsRes.json() as Array<{
      instrument_id: string; channel: string; provider_path: string; observed_from: number;
    }>;
    const key = (r: { instrument_id: string; channel: string; provider_path: string }) =>
      `${r.instrument_id}|${r.channel}|${r.provider_path}`;
    const firstSeenMap = new Map(firstSeen.map(r => [key(r), r.observed_from]));
    for (const row of rows) {
      const earliest = firstSeenMap.get(key(row));
      if (earliest != null && earliest < row.observed_from) {
        row.observed_from = earliest;
      }
    }
  }
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
  const rpcChannels = continuityRecordToRpcChannels(safe);
  const response = await fetch(`${config.url}/rest/v1/rpc/wm_upsert_market_coverage_checkpoints`, {
    method: "POST",
    headers: headers(config.serviceKey),
    body: JSON.stringify({
      p_owner_id: auth.user.sub,
      p_channels: rpcChannels,
    }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Durable coverage could not be recorded." }, { status: 502 });

  // Preserve a thinned, append-only audit trail of WM-owned operational
  // summaries. This RPC never receives price, size, aggressor, event IDs, or
  // provider payloads; raw/derived Market Memory remains separately gated.
  const receiptResponse = await fetch(`${config.url}/rest/v1/rpc/wm_append_market_coverage_receipts`, {
    method: "POST",
    headers: headers(config.serviceKey),
    body: JSON.stringify({ p_owner_id: auth.user.sub, p_channels: rpcChannels }),
    cache: "no-store",
  });
  if (!receiptResponse.ok) {
    return NextResponse.json({
      error: "Coverage checkpoint saved, but the append-only receipt was not recorded.",
      checkpointSaved: true,
    }, { status: 502 });
  }
  const appended = await receiptResponse.json() as number;
  return NextResponse.json({ saved: true, channels: safe.channels.length, receiptsAppended: appended });
}
