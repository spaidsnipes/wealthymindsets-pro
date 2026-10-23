import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/rateLimit";
import { verifyWowPostGrant } from "@/lib/lounge/wowPostGrant";

/**
 * Server-to-server only: WOW OS posts a Lounge post it signed for a Passport
 * member; this host writes it to the one `lounge_posts` table that both WOW and
 * WM Pro read. See src/lib/lounge/wowPostGrant.ts for what is checked.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const check = await verifyWowPostGrant(process.env.CLASSROOM_GRANT_SECRET, body, request.headers.get("x-ath-grant-signature"));
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  const g = check.grant;
  const rl = checkRateLimit(`lounge:${g.user_id}`, { max: 30, windowMs: 60_000 });
  if (!rl.ok) return rl.response;
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "LOUNGE_WRITES_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await db.from("lounge_posts").insert({
    user_id: g.user_id,
    user_handle: g.handle,
    user_name: g.name,
    user_avatar: "",
    user_color: "#00D4AA",
    // Badges are derived, never self-declared — same as /api/lounge.
    user_tier: "BASIC",
    user_verified: false,
    user_ceo: false,
    content: g.content,
    type: g.type,
    trade_card: null,
    tags: g.tags,
  }).select("id,user_handle,user_name,content,type,tags,created_at").single();
  if (error || !data) return NextResponse.json({ error: "Post failed" }, { status: 500 });
  return NextResponse.json({ post: data }, { status: 201, headers: { "cache-control": "no-store" } });
}
