import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(request: Request) {
  // WM-SEC-P0-06: was unauthenticated. Mints signed LiveKit AccessToken
  // with canPublish when role=host — anyone could self-elevate.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const room = searchParams.get("room");
  const name = searchParams.get("name") || "Guest";

  if (!room) return NextResponse.json({ error: "room is required" }, { status: 400 });

  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    // Monday Test 2 truth: 503 (config gap), not 500 (server error). Name vars.
    const missing: string[] = [];
    if (!apiKey) missing.push("LIVEKIT_API_KEY");
    if (!apiSecret) missing.push("LIVEKIT_API_SECRET");
    return NextResponse.json(
      {
        error: `LiveKit is NOT CONFIGURED on this host runtime — missing required ${missing.length === 1 ? "variable" : "variables"}: ${missing.join(", ")}. Set them in the host runtime secrets (e.g. Cloudflare) and redeploy.`,
        edge: "NOT CONFIGURED",
        missing,
      },
      { status: 503 },
    );
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
