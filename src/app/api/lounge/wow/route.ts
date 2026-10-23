import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { supabaseGetUserById } from "@/lib/auth";
import { isCoreTeam } from "@/lib/coreTeam";
import { verifyWowLoungeGrant } from "@/lib/lounge/wowPostGrant";
import { checkOp, loungeStore, readComments, readFeed, runOp, storeFailure, type LoungeActor, type LoungeOp } from "@/lib/lounge/loungeStore";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Server-to-server only: WOW OS sends a Lounge op it signed for a Passport
 * member. Same rules, same tables, same feed as /api/lounge — one Lounge.
 * See src/lib/lounge/wowPostGrant.ts for what is checked.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const check = await verifyWowLoungeGrant(process.env.CLASSROOM_GRANT_SECRET, body, request.headers.get("x-ath-grant-signature"));
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status, headers: NO_STORE });
  const g = check.grant;
  const reply = (r: { status: number; body: Record<string, unknown> }) => NextResponse.json(r.body, { status: r.status, headers: NO_STORE });
  try {
    // One face per person: the shared account's own handle when it has one.
    const acct = await supabaseGetUserById(g.owner_id).catch(() => null);
    const meta = ((acct as { user_metadata?: Record<string, unknown> } | null)?.user_metadata ?? {}) as Record<string, unknown>;
    const handle = typeof meta.handle === "string" && meta.handle.trim() ? meta.handle.trim() : g.fallback_handle;
    const name = typeof meta.displayName === "string" && meta.displayName.trim() ? meta.displayName.trim() : g.fallback_name;
    const avatar = typeof meta.avatar === "string" && meta.avatar.length <= 2048 ? meta.avatar : "";
    const email = typeof (acct as { email?: unknown } | null)?.email === "string" ? (acct as { email: string }).email : null;
    const me: LoungeActor = { ownerId: g.owner_id, handle, name, avatar, email };
    const rest = loungeStore();
    // moderator: the core team, proven by the verified email — lets WOW show "Hide for everyone".
    if (g.op.op === "feed") return NextResponse.json({ ...(await readFeed(rest, me.ownerId, me.handle)), moderator: isCoreTeam(null, me.email) }, { headers: NO_STORE });
    if (g.op.op === "comments") {
      const id = Number((g.op as { postId?: unknown }).postId);
      if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Bad post id" }, { status: 400 });
      return NextResponse.json(await readComments(rest, id), { headers: NO_STORE });
    }
    const op = g.op as LoungeOp;
    const bad = checkOp(op);
    if (bad) return NextResponse.json({ error: bad }, { status: 400, headers: NO_STORE });
    if (op.op === "post" || op.op === "comment" || op.op === "report") {
      const rl = checkRateLimit(`lounge-write:${me.ownerId}`, { max: 10, windowMs: 60_000 });
      if (!rl.ok) return rl.response;
    } else {
      const rl = checkRateLimit(`lounge-toggle:${me.ownerId}`, { max: 120, windowMs: 60_000 });
      if (!rl.ok) return rl.response;
    }
    return reply(await runOp(rest, me, op));
  } catch (e) {
    return reply(storeFailure(e));
  }
}
