import { NextRequest, NextResponse } from "next/server";

import { tastytradeOwnerGate } from "@/lib/broker/brokerOwner";
import { memberGrantStore } from "@/lib/broker/tastyMemberLane";
import {
  connectMemberTasty,
  disconnectMemberTasty,
  memberTastyStatus,
  notEnabled,
  parseConnectBody,
} from "@/lib/broker/tastyMemberConnect";
import { checkRateLimit } from "@/lib/rateLimit";
import { requireAuth } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

/**
 * A MEMBER'S OWN tastytrade (docs/operations/MEMBER-BROKER-CONNECT.md).
 *
 *   GET    → status (booleans + counts; never a secret)
 *   POST   → { clientSecret, refreshToken } in the JSON BODY; validated with
 *            tastytrade (read scope) BEFORE anything is stored, then stored
 *            AES-GCM encrypted under the server-verified session user id
 *   DELETE → deletes the grant
 *
 * The user id is `auth.user.sub` — never anything the client sends. The
 * Founder's deployment credentials are never touched here; the owner is told
 * his wire is the deployment's and cannot overwrite it with a member grant.
 */
const NO_STORE = { "Cache-Control": "no-store" } as const;
/** Connect + disconnect share one bucket: 5 per 10 minutes per member. */
export const MEMBER_CONNECT_LIMIT = { max: 5, windowMs: 10 * 60_000 } as const;

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // SameSite=Lax cookie already blocks cross-site POST/DELETE
  try { return new URL(origin).host === req.nextUrl.host || new URL(origin).host === req.headers.get("host"); } catch { return false; }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const isOwner = tastytradeOwnerGate(auth.user.sub, process.env).allowed;
  const store = await memberGrantStore();
  return NextResponse.json(await memberTastyStatus(store, auth.user.sub, isOwner), { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403, headers: NO_STORE });
  { const rl = checkRateLimit(`member-broker-connect:${auth.user.sub}`, MEMBER_CONNECT_LIMIT); if (!rl.ok) return rl.response; }
  const store = await memberGrantStore();
  if (!store.enabled) return NextResponse.json(notEnabled(), { status: 503, headers: NO_STORE });
  if (tastytradeOwnerGate(auth.user.sub, process.env).allowed) {
    return NextResponse.json({ state: "OWNER_USES_DEPLOYMENT", error: "Your tastytrade is the deployment's own wire; a member connection would not be used." }, { status: 409, headers: NO_STORE });
  }
  const pair = parseConnectBody(await req.json().catch(() => null));
  if (!pair) return NextResponse.json({ code: "BAD_INPUT", error: "Paste the client secret and the refresh token from your personal OAuth application." }, { status: 400, headers: NO_STORE });
  const out = await connectMemberTasty(store, auth.user.sub, pair);
  if (!out.ok) return NextResponse.json({ code: out.code, error: out.error }, { status: out.httpStatus, headers: NO_STORE });
  return NextResponse.json(out.status, { headers: NO_STORE });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403, headers: NO_STORE });
  { const rl = checkRateLimit(`member-broker-connect:${auth.user.sub}`, MEMBER_CONNECT_LIMIT); if (!rl.ok) return rl.response; }
  const store = await memberGrantStore();
  if (!store.enabled) return NextResponse.json(notEnabled(), { status: 503, headers: NO_STORE });
  return NextResponse.json(await disconnectMemberTasty(store, auth.user.sub), { headers: NO_STORE });
}
