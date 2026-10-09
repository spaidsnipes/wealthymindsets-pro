import { audienceBody, isOperator } from "@/lib/publicFailure";
import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { requireAuth } from "@/lib/requireAuth";
import { isLiveHost, LIVE_HOST_REFUSAL } from "@/lib/livekit/liveHost";
import { resolveProviderEnv, acceptedEnvNames } from "@/lib/broker/resolveProviderEnv";
import { isRegisteredLiveRoom } from "@/lib/livekit/liveRooms";

/**
 * Mints a LiveKit room token AND names the wss host to dial.
 *
 * The host is returned from the SERVER on purpose. It used to be read in the
 * browser as `process.env.NEXT_PUBLIC_LIVEKIT_URL` (LiveRoom.tsx), and a
 * NEXT_PUBLIC_ name is inlined at BUILD time. This app is built on a laptop and
 * deployed to Cloudflare, so a wss host stored as a Cloudflare secret was
 * inlined as `undefined` and the room could never open — a config that looks
 * set everywhere a human would check, and is absent in the only place that
 * matters. Resolving it here makes setting the secret sufficient.
 *
 * All three credentials are resolved through `resolveProviderEnv` so the names
 * this host actually carries (see PROVIDER_REQUIREMENTS.livekit aliases) reach
 * the wire, not just the /readiness receipt.
 */
export async function GET(request: Request) {
  // WM-SEC-P0-06: was unauthenticated. Mints signed LiveKit AccessToken
  // with canPublish when role=host — anyone could self-elevate.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const room = searchParams.get("room");
  // The identity is the SESSION's, never a URL field (2026-10-04: any guest
  // could join under any name, the Founder's included). The display name is
  // the account's own handle.
  // Never the email prefix: "founder@attacker.tld" would join displayed as
  // "founder" (security pass 2026-10-05).
  const name = (auth.user.handle ?? "").trim() || "Trader";

  if (!room) return NextResponse.json({ error: "room is required" }, { status: 400 });
  // Only rooms WM publishes (P0-B, 2026-10-05): any typed name used to mint a
  // 4-hour token for a room no page offers.
  if (!isRegisteredLiveRoom(room)) return NextResponse.json({ error: "That room is not open." }, { status: 404 });

  const apiKey    = resolveProviderEnv("LIVEKIT_API_KEY");
  const apiSecret = resolveProviderEnv("LIVEKIT_API_SECRET");
  const serverUrl = resolveProviderEnv("LIVEKIT_URL");
  if (!apiKey || !apiSecret || !serverUrl) {
    // Monday Test 2 truth: 503 (config gap), not 500 (server error). Name vars.
    //
    // The host is checked HERE, with the key pair, rather than being left for
    // the browser to discover. Minting a valid token for a room the client
    // cannot dial is a success response in front of a dead wire: the join
    // button spins, no error names a variable, and the receipt says READY.
    const missing: string[] = [];
    if (!apiKey) missing.push("LIVEKIT_API_KEY");
    if (!apiSecret) missing.push("LIVEKIT_API_SECRET");
    if (!serverUrl) missing.push("LIVEKIT_URL");
    // Every name that WOULD have satisfied each gap, so the operator is told
    // what to set instead of guessing which spelling this host honours.
    const accepted = missing.flatMap((name) => acceptedEnvNames(name));
    return NextResponse.json(
      // Names for the operator only (ruling 2026-10-09): a member or guest reads plain words, the same edge and a stable code.
      audienceBody(isOperator(auth.user.sub), {
        error: `LiveKit is NOT CONFIGURED on this host runtime — missing required ${missing.length === 1 ? "variable" : "variables"}: ${missing.join(", ")}. Set them in the host runtime secrets (e.g. Cloudflare) and redeploy. Accepted names: ${accepted.join(", ")}.`,
        edge: "NOT CONFIGURED",
        missing,
        accepted,
      }),
      { status: 503 },
    );
  }

  const role = searchParams.get("role") ?? "viewer"; // "host" | "viewer"
  if (role === "host" && !isLiveHost(auth.user.sub, process.env)) {
    return NextResponse.json({ error: LIVE_HOST_REFUSAL }, { status: 403 });
  }
  const canPublish = role === "host";

  const token = new AccessToken(apiKey.value, apiSecret.value, {
    identity: `wm:${auth.user.sub}`,
    name,
    ttl: "4h",
    metadata: JSON.stringify({ role }),
  });
  token.addGrant({ roomJoin: true, room, canPublish, canSubscribe: true, canPublishData: true });

  // `serverUrl` is a HOST, not a credential — safe to return. The key/secret
  // never leave this function; only the signed token derived from them does.
  return NextResponse.json({ token: await token.toJwt(), serverUrl: serverUrl.value });
}
