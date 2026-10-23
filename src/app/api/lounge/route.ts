/**
 * /api/lounge — the Community Lounge through WM's own sign-in.
 *
 * Measured 2026-10-03: /lounge read "not configured on this runtime" for every
 * trader — the browser bundle carries no public Supabase connection, so no
 * post, like, comment or follow was ever loaded or written. Shipping the
 * public key to the browser would hand the lounge tables to whatever their RLS
 * policies allow, and those policies are a staged security debt.
 *
 * Since 2026-10-22 the rules live in src/lib/lounge/loungeStore.ts, shared
 * with /api/lounge/wow so WOW OS members post into the same one Lounge.
 *
 * So the lounge goes through the server: WM's session names the author, the
 * server writes with the service key, and the rules live HERE —
 *   · the author of a post, comment, like or follow is the signed-in trader,
 *     never a field the browser sends;
 *   · tier / verified / CEO marks are not the browser's to claim;
 *   · a post is deleted only by its own author.
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { edgeAllows, tooManyRequests, COMMUNITY_WRITE_LIMITER_BINDING } from "@/lib/edgeRateLimit";
import { checkOp, loungeStore, readComments, readFeed, runOp, storeFailure, type LoungeActor, type LoungeOp } from "@/lib/lounge/loungeStore";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

// Authorship is the account's OWN handle, never the email's local part
// (security pass 2026-10-05): signup issues no handle and the uniqueness check
// lives in update-profile, so "founder@attacker.tld" with no handle became
// author "founder" — posting as, and deleting the posts of, whoever owns that
// handle. No handle → no community writes until one is set in Profile.
function meFrom(user: { sub: string; email: string; handle?: string; displayName?: string; avatar?: string }): LoungeActor | null {
  const handle = (user.handle ?? "").trim();
  if (!handle) return null;
  return { ownerId: user.sub, handle, name: (user.displayName ?? handle).trim() || handle, avatar: user.avatar ?? "", email: user.email };
}

const reply = (r: { status: number; body: Record<string, unknown> }) => NextResponse.json(r.body, { status: r.status, headers: NO_STORE });

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const me = meFrom(auth.user);
  try {
    const rest = loungeStore();
    const commentsFor = new URL(request.url).searchParams.get("comments");
    if (commentsFor) {
      if (!/^\d{1,12}$/.test(commentsFor)) return NextResponse.json({ error: "Bad post id" }, { status: 400 });
      return NextResponse.json(await readComments(rest, Number(commentsFor)), { headers: NO_STORE });
    }
    return NextResponse.json(await readFeed(rest, auth.user.sub, me?.handle ?? null), { headers: NO_STORE });
  } catch (e) {
    return reply(storeFailure(e));
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const me = meFrom(auth.user);
  if (!me) return NextResponse.json({ error: "Set a handle in your Profile to post in the Lounge." }, { status: 400 });
  // Body size cap (security pass 2026-10-05): one allowed post could carry
  // megabytes of trade_card JSON into the shared store.
  const raw = await request.text().catch(() => "");
  if (raw.length > 16_000) return NextResponse.json({ error: "That is too large to post." }, { status: 413 });
  let body: LoungeOp | null = null;
  try { body = JSON.parse(raw) as LoungeOp; } catch { body = null; }
  const bad = checkOp(body);
  if (bad || !body) return NextResponse.json({ error: bad ?? "Bad request" }, { status: 400 });
  // Anti-flood (2026-10-04): posts and comments are limited; toggles get a
  // generous ceiling of their own (2026-10-05).
  if (body.op !== "post" && body.op !== "comment" && body.op !== "report") {
    const rl = checkRateLimit(`lounge-toggle:${auth.user.sub}`, { max: 120, windowMs: 60_000 });
    if (!rl.ok) return rl.response;
  } else {
    const rl = checkRateLimit(`lounge-write:${auth.user.sub}`, { max: 10, windowMs: 60_000 });
    if (!rl.ok) return rl.response;
    if (!(await edgeAllows([`lounge:${auth.user.sub}`], COMMUNITY_WRITE_LIMITER_BINDING))) return tooManyRequests();
  }
  try {
    return reply(await runOp(loungeStore(), me, body));
  } catch (e) {
    return reply(storeFailure(e));
  }
}
