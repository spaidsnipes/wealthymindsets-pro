import { NextResponse } from "next/server";
import { resolveSupabaseServiceKey, SERVICE_KEY_VARS } from "@/lib/supabaseConfigStatus";
import { requireAuth } from "@/lib/requireAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import type { CanonicalMarketEvent } from "@/lib/marketData/marketEvent";
import { persistMarketObservation, type MarketObservationPersistenceMode } from "@/lib/marketData/observationPersistence";
import { SupabaseMarketObservationStore } from "@/lib/marketData/observationSupabaseStore";

const MAX_BODY_BYTES = 32_768;

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function eventCandidate(value: unknown): value is CanonicalMarketEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return ["schemaVersion", "normalizationVersion", "eventId", "symbol", "normalizedSymbol",
    "assetClass", "providerClass", "providerPath", "eventType", "sequenceState",
    "aggressorMethod", "sourceClass", "dataMode", "fidelityClass", "rightsPolicyId"]
    .every(key => typeof event[key] === "string") &&
    ["timestampReceived", "timestampProcessed", "availableAt"]
      .every(key => typeof event[key] === "number");
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (!isSameOrigin(request)) return NextResponse.json({ status: "INVALID" }, { status: 403 });
  const limited = checkRateLimit(`market-memory:observations:${auth.user.sub}`, { max: 120, windowMs: 60_000 });
  if (!limited.ok) return limited.response;

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ status: "INVALID", reasons: ["PAYLOAD_TOO_LARGE"] }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ status: "INVALID", reasons: ["INVALID_JSON"] }, { status: 400 });
  }
  const candidate = body as { mode?: unknown; event?: unknown };
  const mode = candidate?.mode;
  if ((mode !== "RAW" && mode !== "DERIVED") || !eventCandidate(candidate?.event)) {
    return NextResponse.json({ status: "INVALID", reasons: ["INVALID_REQUEST"] }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = resolveSupabaseServiceKey(process.env);
  if (!url || !serviceKey) return NextResponse.json({ status: "WRITE_FAILED" }, { status: 503 });
  const store = new SupabaseMarketObservationStore(auth.user.sub, url, serviceKey);
  const result = await persistMarketObservation(
    candidate.event,
    mode as MarketObservationPersistenceMode,
    store,
  );
  const status = result.status === "INVALID" ? 400 : result.status === "WRITE_FAILED" ? 502 : 200;
  return NextResponse.json(result, { status });
}
