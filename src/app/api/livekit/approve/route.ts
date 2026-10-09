import { audienceBody, isOperator } from "@/lib/publicFailure";
import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { requireAuth } from "@/lib/requireAuth";
import { isLiveHost, LIVE_HOST_REFUSAL } from "@/lib/livekit/liveHost";
import { resolveProviderEnv } from "@/lib/broker/resolveProviderEnv";
import { isRegisteredLiveRoom, isWmParticipantIdentity } from "@/lib/livekit/liveRooms";

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
  // Only a host may grant the floor (2026-10-04: any signed-in user could).
  if (!isLiveHost(auth.user.sub, process.env)) return NextResponse.json({ error: LIVE_HOST_REFUSAL }, { status: 403 });
  const body = await request.json().catch(() => null) as { room?: unknown; identity?: unknown } | null;
  const room = typeof body?.room === "string" ? body.room : "";
  const identity = body?.identity;
  if (!room || !identity) return NextResponse.json({ error: "room and identity required" }, { status: 400 });
  // A registered room and a WM-minted identity only (P0-B, 2026-10-05).
  if (!isRegisteredLiveRoom(room)) return NextResponse.json({ error: "That room is not open." }, { status: 404 });
  if (!isWmParticipantIdentity(identity)) return NextResponse.json({ error: "Unknown participant." }, { status: 400 });

  const apiKey    = resolveProviderEnv("LIVEKIT_API_KEY");
  const apiSecret = resolveProviderEnv("LIVEKIT_API_SECRET");
  const wsHost    = resolveProviderEnv("LIVEKIT_URL");
  if (!apiKey || !apiSecret || !wsHost) {
    // These were `process.env.X!` — a non-null assertion on a value that is
    // genuinely absent on this host. An absent key reached the SDK as
    // `undefined` and an absent host as `""`, which surfaced as a 500 with an
    // SDK stack trace: a server error standing in for a config gap, blaming
    // the wrong layer. 503, and name the variables.
    const missing: string[] = [];
    if (!apiKey) missing.push("LIVEKIT_API_KEY");
    if (!apiSecret) missing.push("LIVEKIT_API_SECRET");
    if (!wsHost) missing.push("LIVEKIT_URL");
    return NextResponse.json(
      // Names for the operator only (ruling 2026-10-09): a member or guest reads plain words, the same edge and a stable code.
      audienceBody(isOperator(auth.user.sub), {
        error: `LiveKit is NOT CONFIGURED on this host runtime — missing required ${missing.length === 1 ? "variable" : "variables"}: ${missing.join(", ")}. Approval cannot be granted until they are set in the host runtime secrets.`,
        edge: "NOT CONFIGURED",
        missing,
      }),
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
  } catch {
    // Sanitized (P0-B): the SDK's error text named internals. The usual cause
    // is a participant who has already left the room.
    return NextResponse.json({ error: "That participant could not be approved — they may have left the room." }, { status: 409 });
  }
}
