import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { resolveProviderEnv } from "@/lib/broker/resolveProviderEnv";
import { verifyClassroomGrant } from "@/lib/livekit/classroomGrant";

/**
 * Server-to-server only: WOW Academy's Worker posts a grant it signed; this
 * host answers with a LiveKit token for that one classroom room and identity.
 * See src/lib/livekit/classroomGrant.ts for what is checked and why.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const check = await verifyClassroomGrant(process.env.CLASSROOM_GRANT_SECRET, body, request.headers.get("x-ath-grant-signature"));
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  const apiKey = resolveProviderEnv("LIVEKIT_API_KEY");
  const apiSecret = resolveProviderEnv("LIVEKIT_API_SECRET");
  const serverUrl = resolveProviderEnv("LIVEKIT_URL");
  if (!apiKey || !apiSecret || !serverUrl) return NextResponse.json({ error: "LIVEKIT_NOT_CONFIGURED" }, { status: 503 });
  const g = check.grant;
  const token = new AccessToken(apiKey.value, apiSecret.value, { identity: g.identity, name: g.name, ttl: "4h", metadata: g.metadata });
  token.addGrant({ roomJoin: true, room: g.room, canPublish: g.canPublish, canSubscribe: true, canPublishData: true });
  return NextResponse.json({ token: await token.toJwt(), serverUrl: serverUrl.value }, { headers: { "cache-control": "no-store" } });
}
