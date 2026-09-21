import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { requireAuth } from "@/lib/requireAuth";
import { resolveProviderEnv } from "@/lib/broker/resolveProviderEnv";

/**
 * Grants publish rights to one participant.
 *
 * Reads the same three credentials as the token route, through the same
 * resolver, so a host that spells them ATH_LIVEKIT_KEY_ / ATH_LIVEKIT_KEY_SECRET_
 * reaches BOTH routes or neither. Two routes resolving the same credential by
 * two different rules is how one half of a feature works.
 */
export async function POST(request: Request) {
  // WM-SEC-P0-06: was unauthenticated. Grants publish rights server-side.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const { room, identity } = await request.json() as { room: string; identity: string };
  if (!room || !identity) return NextResponse.json({ error: "room and identity required" }, { status: 400 });

  const apiKey    = resolveProviderEnv("LIVEKIT_API_KEY");
  const apiSecret = resolveProviderEnv("LIVEKIT_API_SECRET");
  const wsHost    = resolveProviderEnv("NEXT_PUBLIC_LIVEKIT_URL");
  if (!apiKey || !apiSecret || !wsHost) {
    // These were `process.env.X!` — a non-null assertion on a value that is
    // genuinely absent on this host. An absent key reached the SDK as
    // `undefined` and an absent host as `""`, which surfaced as a 500 with an
    // SDK stack trace: a server error standing in for a config gap, blaming
    // the wrong layer. 503, and name the variables.
    const missing: string[] = [];
    if (!apiKey) missing.push("LIVEKIT_API_KEY");
    if (!apiSecret) missing.push("LIVEKIT_API_SECRET");
    if (!wsHost) missing.push("NEXT_PUBLIC_LIVEKIT_URL");
    return NextResponse.json(
      {
        error: `LiveKit is NOT CONFIGURED on this host runtime — missing required ${missing.length === 1 ? "variable" : "variables"}: ${missing.join(", ")}. Approval cannot be granted until they are set in the host runtime secrets.`,
        edge: "NOT CONFIGURED",
        missing,
      },
      { status: 503 },
    );
  }

  const host = wsHost.value.replace("wss://", "https://");
  const svc = new RoomServiceClient(host, apiKey.value, apiSecret.value);

  try {
    await svc.updateParticipant(room, identity, undefined, {
      canPublish:     true,
      canSubscribe:   true,
      canPublishData: true,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
