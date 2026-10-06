import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";

import { requireAuth } from "@/lib/requireAuth";
import { resolveProviderEnv } from "@/lib/broker/resolveProviderEnv";
import { REGISTERED_LIVE_ROOMS } from "@/lib/livekit/liveRooms";

/**
 * Which registered rooms actually have someone ON AIR (Garden 18 ATHOS order
 * P0.8, 2026-10-05): "READY or a room card is not an active room". A studio can
 * be configured with nobody broadcasting; the cards must say which.
 *
 * Signed-in only; returns room names and a publisher COUNT — never who.
 * One LiveKit listRooms call for the registered set, cached 20 s per isolate.
 */
const NO_STORE = { "Cache-Control": "no-store" };
let cache: { at: number; body: unknown } | null = null;

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (cache && Date.now() - cache.at < 20_000) return NextResponse.json(cache.body, { headers: NO_STORE });

  const apiKey = resolveProviderEnv("LIVEKIT_API_KEY");
  const apiSecret = resolveProviderEnv("LIVEKIT_API_SECRET");
  const wsHost = resolveProviderEnv("LIVEKIT_URL");
  if (!apiKey || !apiSecret || !wsHost) {
    return NextResponse.json({ state: "NOT_CONFIGURED", rooms: {} }, { status: 503, headers: NO_STORE });
  }
  try {
    const svc = new RoomServiceClient(wsHost.value.replace("wss://", "https://"), apiKey.value, apiSecret.value);
    const rooms = await svc.listRooms([...REGISTERED_LIVE_ROOMS]);
    const onAir: Record<string, number> = {};
    for (const name of REGISTERED_LIVE_ROOMS) onAir[name] = 0;
    for (const r of rooms) if (REGISTERED_LIVE_ROOMS.has(r.name)) onAir[r.name] = Number(r.numPublishers) || 0;
    const body = { state: "OK", asOf: new Date().toISOString(), rooms: onAir };
    cache = { at: Date.now(), body };
    return NextResponse.json(body, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ state: "NO_ANSWER", rooms: {} }, { status: 502, headers: NO_STORE });
  }
}
