import { NextResponse } from "next/server";
import { resolveAlpacaLiveCredentials } from "@/lib/broker/alpacaCredentials";
import { normalizeAlpacaOptionChain } from "@/lib/marketData/alpacaOptionChain";
import { requireAuth } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

const DATA_BASE = "https://data.alpaca.markets";

function cleanSymbol(value: string | null): string | null {
  const symbol = (value ?? "").trim().toUpperCase();
  return /^[A-Z][A-Z0-9.]{0,9}$/.test(symbol) ? symbol : null;
}

function positiveNumber(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function upstreamEdge(status: number): string {
  if (status === 401) return "AUTH BLOCKED";
  if (status === 403) return "REQUEST DENIED";
  if (status === 429) return "RATE LIMITED";
  if (status >= 500) return "PROVIDER ERROR";
  return "UNKNOWN";
}

type InvalidResponseStage = "TRANSPORT" | "DECODE" | "NORMALIZE";

function invalidResponse(stage: InvalidResponseStage) {
  return NextResponse.json({
    source: "alpaca",
    edge: "INVALID RESPONSE",
    stage,
    error: "The WM options gateway could not validate the provider response",
  }, { status: 502 });
}

/**
 * Read-only Alpaca indicative option snapshots. This route does not submit,
 * preview, or prepare an order, and never serializes its credential pair.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const symbol = cleanSymbol(searchParams.get("symbol"));
  const spot = positiveNumber(searchParams.get("spot"));
  if (!symbol) {
    return NextResponse.json({ source: "alpaca", edge: "INVALID REQUEST", error: "Valid symbol required" }, { status: 400 });
  }

  const credentials = resolveAlpacaLiveCredentials();
  if (credentials.source === "missing") {
    return NextResponse.json({
      source: "alpaca",
      edge: "NOT CONFIGURED",
      error: "Alpaca market-data credentials are not configured",
      missing: ["ALPACA_KEY + ALPACA_SECRET (or legacy Cloudflare pair)"],
    }, { status: 503 });
  }

  const upstream = new URL(`/v1beta1/options/snapshots/${encodeURIComponent(symbol)}`, DATA_BASE);
  upstream.searchParams.set("feed", "indicative");
  upstream.searchParams.set("limit", "1000");
  const today = new Date();
  const latestExpiry = new Date(today.getTime() + 35 * 86_400_000);
  upstream.searchParams.set("expiration_date_gte", dateOnly(today));
  upstream.searchParams.set("expiration_date_lte", dateOnly(latestExpiry));
  if (spot !== null) {
    upstream.searchParams.set("strike_price_gte", String(Math.max(0.5, Math.floor(spot * 0.85))));
    upstream.searchParams.set("strike_price_lte", String(Math.ceil(spot * 1.15)));
  }

  const controller = new AbortController();
  let timedOut = false;
  let invalidStage: InvalidResponseStage = "TRANSPORT";
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      (async () => {
        const response = await fetch(upstream, {
          cache: "no-store",
          redirect: "error",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "APCA-API-KEY-ID": credentials.key,
            "APCA-API-SECRET-KEY": credentials.secret,
          },
        });
        if (!response.ok) return { response, body: null };
        invalidStage = "DECODE";
        return { response, body: await response.json() };
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new Error("Alpaca options deadline exceeded"));
        }, 12_000);
      }),
    ]);

    if (!result.response.ok) {
      const edge = upstreamEdge(result.response.status);
      return NextResponse.json({ source: "alpaca", edge, error: `Alpaca option request failed (HTTP ${result.response.status})` }, { status: result.response.status });
    }
    invalidStage = "NORMALIZE";
    return NextResponse.json(normalizeAlpacaOptionChain(result.body, symbol), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    if (!timedOut) return invalidResponse(invalidStage);
    return NextResponse.json({
      source: "alpaca",
      edge: "TIMEOUT",
      error: "Alpaca option request timed out",
    }, { status: 504 });
  } finally {
    clearTimeout(timer);
  }
}
