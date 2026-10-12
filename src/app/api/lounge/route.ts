import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveSupabaseServiceKey, SERVICE_KEY_VARS } from "@/lib/supabaseConfigStatus";
import { requireAuth } from "@/lib/requireAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { isCoreTeam } from "@/lib/coreTeam";

// Lounge writes. The browser anon client used to insert/delete directly under
// `USING (true)` policies, so anyone holding the public key could post as any
// handle, delete anyone's post, or mark themselves verified. Every write now
// comes through here: identity is the signed WM session (sub + handle), never a
// field in the request body, and the database denies anon writes entirely.

type Body = {
  action?: string;
  postId?: number;
  content?: string;
  type?: string;
  tradeCard?: unknown;
  tags?: unknown;
  color?: string;
  body?: string;
  handle?: string;
};

const POST_TYPES = new Set(["text", "trade", "music", "video", "photo", "voice"]);
const HEX = /^#[0-9a-fA-F]{6}$/;

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const me = auth.user;
  // A handle is required to act in the Lounge. It comes from the signed
  // session — an email prefix is not an identity.
  const handle = me.handle?.trim();
  if (!handle) return bad("Finish your profile handle before posting in the Lounge.", 403);

  const rl = checkRateLimit(`lounge:${me.sub}`, { max: 60, windowMs: 60_000 });
  if (!rl.ok) return rl.response;

  const db = getSupabaseAdmin();
  if (!db) {
    const missing: string[] = [];
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!resolveSupabaseServiceKey(process.env)) missing.push(SERVICE_KEY_VARS.join(" (or ") + ")");
    return NextResponse.json(
      { error: `Lounge writes are NOT CONFIGURED on this host runtime — missing: ${missing.join(", ")}.`, edge: "NOT CONFIGURED", missing },
      { status: 503 },
    );
  }

  let b: Body;
  try { b = await request.json(); } catch { return bad("Invalid JSON"); }
  const postId = Number(b.postId);
  const needPost = () => Number.isSafeInteger(postId) && postId > 0;

  switch (b.action) {
    case "post": {
      const content = String(b.content ?? "").trim();
      if (!content || content.length > 5000) return bad("Post must be 1–5000 characters.");
      const type = POST_TYPES.has(String(b.type)) ? String(b.type) : "text";
      const tags = Array.isArray(b.tags) ? b.tags.filter((t): t is string => typeof t === "string").slice(0, 20).map(t => t.slice(0, 50)) : [];
      const { data, error } = await db.from("lounge_posts").insert({
        user_id: me.sub,
        user_handle: handle,
        user_name: me.displayName || handle,
        user_avatar: me.avatar || "",
        user_color: HEX.test(String(b.color)) ? b.color : "#00D4AA",
        // Badges are derived, never self-declared.
        user_tier: "BASIC",
        user_verified: false,
        user_ceo: isCoreTeam(handle, me.email),
        content,
        type,
        trade_card: type === "trade" && b.tradeCard && typeof b.tradeCard === "object" ? b.tradeCard : null,
        tags,
      }).select().single();
      if (error) return bad("Post failed", 500);
      return NextResponse.json({ post: data });
    }
    case "delete_post": {
      if (!needPost()) return bad("postId required");
      const { data, error } = await db.from("lounge_posts").delete()
        .eq("id", postId).eq("user_id", me.sub).select("id");
      if (error) return bad("Delete failed", 500);
      if (!data?.length) return bad("You can only delete your own posts.", 403);
      return NextResponse.json({ deleted: postId });
    }
    case "like":
    case "unlike": {
      if (!needPost()) return bad("postId required");
      const q = b.action === "like"
        ? db.from("lounge_likes").upsert({ post_id: postId, user_handle: handle, user_id: me.sub }, { onConflict: "post_id,user_handle", ignoreDuplicates: true })
        : db.from("lounge_likes").delete().eq("post_id", postId).eq("user_handle", handle);
      const { error } = await q;
      if (error) return bad("Like failed", 500);
      return NextResponse.json({ ok: true });
    }
    case "comment": {
      if (!needPost()) return bad("postId required");
      const body = String(b.body ?? "").trim();
      if (!body || body.length > 2000) return bad("Comment must be 1–2000 characters.");
      const { data, error } = await db.from("lounge_comments").insert({
        post_id: postId, user_id: me.sub, user_handle: handle,
        user_name: me.displayName || handle, user_avatar: me.avatar || "",
        user_color: HEX.test(String(b.color)) ? b.color : "#00D4AA", body,
      }).select().single();
      if (error) return bad("Comment failed", 500);
      return NextResponse.json({ comment: data });
    }
    case "follow":
    case "unfollow": {
      const target = String(b.handle ?? "").trim();
      if (!target || target === handle) return bad("handle required");
      const q = b.action === "follow"
        ? db.from("lounge_follows").upsert({ follower_handle: handle, following_handle: target, user_id: me.sub }, { onConflict: "follower_handle,following_handle", ignoreDuplicates: true })
        : db.from("lounge_follows").delete().eq("follower_handle", handle).eq("following_handle", target);
      const { error } = await q;
      if (error) return bad("Follow failed", 500);
      return NextResponse.json({ ok: true });
    }
    default:
      return bad("Unknown action");
  }
}
