import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { webullBrokerConfigFromEnv } from "@/lib/broker/adapters/webullBrokerConnection";
import { webullOwnerGate, webullOwnerRefusal } from "@/lib/broker/webullOwner";
import { requestWebullSessionCode } from "@/lib/marketData/webullAccessToken";
import { webullSessionStore, webullWorkerEnv } from "@/lib/marketData/webullSessionStore";

export const dynamic = "force-dynamic";

/**
 * POST /api/broker/webull/session — "Text me a code".
 *
 * The one human-initiated session start. Automatic starts are rationed
 * (AUTO_MINT_COOLDOWN_MS) so a page load can never text the Founder; this is
 * the step every held lane names, pressed by a person. It refuses when 2FA is
 * off (nothing to send), when a session is live (a new one would replace it),
 * and within a minute of the last press (one code at a time). See
 * `requestWebullSessionCode`.
 *
 * TRANSITIONAL owner posture: while WEBULL_OWNER_USER_ID is unset any signed-in
 * WM Pro user may press it — the code goes only to the phone on the Founder's
 * Webull account, so the worst a non-owner can do is one text a minute. Once
 * the owner is named, only the owner may.
 *
 * Returns an outcome word and a sentence. Never a token.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const owner = webullOwnerGate(auth.user.sub, process.env, "TRANSITIONAL");
  if (!owner.allowed) return NextResponse.json(webullOwnerRefusal(owner), { status: 403 });

  const cfg = webullBrokerConfigFromEnv(process.env);
  if (!cfg.appKey || !cfg.appSecret) {
    return NextResponse.json({ outcome: "REFUSED", note: "Webull App Key and App Secret are not configured." }, { status: 200 });
  }
  const result = await requestWebullSessionCode(
    fetch,
    { appKey: cfg.appKey, appSecret: cfg.appSecret, apiHost: cfg.apiHost },
    webullSessionStore(await webullWorkerEnv()),
  );
  return NextResponse.json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
}
