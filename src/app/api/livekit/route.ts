import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const room = searchParams.get("room");
  const name = searchParams.get("name") || "Guest";

  if (!room) return NextResponse.json({ error: "room is required" }, { status: 400 });

  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "LiveKit not configured" }, { status: 500 });
  }

  const role = searchParams.get("role") ?? "viewer"; // "host" | "viewer"
  const canPublish = role === "host";

  const token = new AccessToken(apiKey, apiSecret, {
    identity: name,
    ttl: "4h",
    metadata: JSON.stringify({ role }),
  });
  token.addGrant({ roomJoin: true, room, canPublish, canSubscribe: true, canPublishData: true });

  return NextResponse.json({ token: await token.toJwt() });
}
