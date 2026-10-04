/**
 * /api/lounge — the Community Lounge through WM's own sign-in.
 *
 * Measured 2026-10-03: /lounge read "not configured on this runtime" for every
 * trader — the browser bundle carries no public Supabase connection, so no
 * post, like, comment or follow was ever loaded or written. Shipping the
 * public key to the browser would hand the lounge tables to whatever their RLS
 * policies allow, and those policies are a staged security debt.
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
import { resolveSupabaseServiceKey } from "@/lib/supabaseConfigStatus";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_POST = 2000;
const MAX_COMMENT = 1000;

type Me = { handle: string; name: string; avatar: string };

function meFrom(user: { email: string; handle?: string; displayName?: string; avatar?: string }): Me | null {
  const handle = (user.handle ?? user.email?.split("@")[0] ?? "").trim();
  if (!handle) return null;
  return { handle, name: (user.displayName ?? handle).trim() || handle, avatar: user.avatar ?? "" };
}

class LoungeStoreError extends Error {
  constructor(readonly state: "NOT_CONFIGURED" | "TABLE_MISSING" | "UPSTREAM", message: string) { super(message); }
}

function store() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = resolveSupabaseServiceKey(process.env);
  if (!url || !key) throw new LoungeStoreError("NOT_CONFIGURED", "The lounge store is not configured on this host.");
  return async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
      cache: "no-store",
      redirect: "manual",
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const code = (body as { code?: string } | null)?.code;
      if (res.status === 404 || code === "42P01" || code === "PGRST205") throw new LoungeStoreError("TABLE_MISSING", "The lounge tables do not exist in the store.");
      throw new LoungeStoreError("UPSTREAM", `Lounge store answered HTTP ${res.status}.`);
    }
    return body as T;
  };
}

const inList = (ids: readonly (number | string)[]) => `(${ids.map(i => encodeURIComponent(String(i))).join(",")})`;

function failure(e: unknown) {
  if (e instanceof LoungeStoreError) {
    return NextResponse.json({ state: e.state, error: e.message }, { status: e.state === "UPSTREAM" ? 502 : 503, headers: NO_STORE });
  }
  return NextResponse.json({ state: "UPSTREAM", error: "Lounge request failed." }, { status: 502, headers: NO_STORE });
}

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const me = meFrom(auth.user);
  try {
    const rest = store();
    const commentsFor = new URL(request.url).searchParams.get("comments");
    if (commentsFor) {
      if (!/^\d{1,12}$/.test(commentsFor)) return NextResponse.json({ error: "Bad post id" }, { status: 400 });
      const comments = await rest<unknown[]>(`lounge_comments?select=*&post_id=eq.${commentsFor}&order=created_at.asc&limit=200`);
      return NextResponse.json({ state: "OK", comments }, { headers: NO_STORE });
    }
    const posts = await rest<Array<{ id: number }>>(`lounge_posts?select=*&order=created_at.desc&limit=60`);
    const ids = posts.map(p => p.id);
    const [likes, comments, follows] = await Promise.all([
      ids.length ? rest<Array<{ post_id: number; user_handle: string }>>(`lounge_likes?select=post_id,user_handle&post_id=in.${inList(ids)}`) : Promise.resolve([]),
      ids.length ? rest<Array<{ post_id: number }>>(`lounge_comments?select=post_id&post_id=in.${inList(ids)}`) : Promise.resolve([]),
      me ? rest<Array<{ following_handle: string }>>(`lounge_follows?select=following_handle&follower_handle=eq.${encodeURIComponent(me.handle)}`) : Promise.resolve([]),
    ]);
    const likeCount = new Map<number, number>(), liked = new Set<number>(), commentCount = new Map<number, number>();
    for (const l of likes) { likeCount.set(l.post_id, (likeCount.get(l.post_id) ?? 0) + 1); if (me && l.user_handle === me.handle) liked.add(l.post_id); }
    for (const c of comments) commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1);
    return NextResponse.json({
      state: "OK",
      me: me?.handle ?? null,
      following: follows.map(f => f.following_handle),
      posts: posts.map(p => ({ ...p, like_count: likeCount.get(p.id) ?? 0, comment_count: commentCount.get(p.id) ?? 0, liked_by_me: liked.has(p.id) })),
    }, { headers: NO_STORE });
  } catch (e) {
    return failure(e);
  }
}

type Op =
  | { op: "post"; content: string; type?: string; trade_card?: unknown; tags?: unknown }
  | { op: "comment"; postId: number; body: string }
  | { op: "like" | "unlike" | "delete"; postId: number }
  | { op: "follow" | "unfollow"; handle: string };

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const me = meFrom(auth.user);
  if (!me) return NextResponse.json({ error: "Your account has no handle." }, { status: 400 });
  const body = (await request.json().catch(() => null)) as Op | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const id = "postId" in body ? Number(body.postId) : NaN;
  const needsId = body.op === "comment" || body.op === "like" || body.op === "unlike" || body.op === "delete";
  if (needsId && !(Number.isInteger(id) && id > 0)) return NextResponse.json({ error: "Bad post id" }, { status: 400 });
  try {
    const rest = store();
    const h = encodeURIComponent(me.handle);
    switch (body.op) {
      case "post": {
        const content = typeof body.content === "string" ? body.content.trim() : "";
        if (!content || content.length > MAX_POST) return NextResponse.json({ error: "Post is empty or too long." }, { status: 400 });
        const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string").slice(0, 12).map(t => t.slice(0, 40)) : [];
        const tc = body.type === "trade" && body.trade_card && typeof body.trade_card === "object" ? body.trade_card : null;
        const [row] = await rest<unknown[]>("lounge_posts", { method: "POST", body: JSON.stringify({
          user_handle: me.handle, user_name: me.name, user_avatar: me.avatar, user_color: "#00D4AA",
          user_tier: "BASIC", user_verified: false, user_ceo: false,
          content, type: body.type === "trade" ? "trade" : "text", trade_card: tc, tags,
        }) });
        return NextResponse.json({ state: "OK", post: row }, { headers: NO_STORE });
      }
      case "comment": {
        const text = typeof body.body === "string" ? body.body.trim() : "";
        if (!text || text.length > MAX_COMMENT) return NextResponse.json({ error: "Comment is empty or too long." }, { status: 400 });
        const [row] = await rest<unknown[]>("lounge_comments", { method: "POST", body: JSON.stringify({
          post_id: id, user_handle: me.handle, user_name: me.name, user_avatar: me.avatar, user_color: "#00D4AA", body: text,
        }) });
        return NextResponse.json({ state: "OK", comment: row }, { headers: NO_STORE });
      }
      case "like":
        await rest("lounge_likes", { method: "POST", body: JSON.stringify({ post_id: id, user_handle: me.handle }) });
        return NextResponse.json({ state: "OK" }, { headers: NO_STORE });
      case "unlike":
        await rest(`lounge_likes?post_id=eq.${id}&user_handle=eq.${h}`, { method: "DELETE" });
        return NextResponse.json({ state: "OK" }, { headers: NO_STORE });
      case "delete": {
        // Only the author's own row matches the filter; anything else deletes nothing.
        const gone = await rest<unknown[]>(`lounge_posts?id=eq.${id}&user_handle=eq.${h}`, { method: "DELETE" });
        if (!Array.isArray(gone) || gone.length === 0) return NextResponse.json({ error: "Not your post." }, { status: 403, headers: NO_STORE });
        return NextResponse.json({ state: "OK" }, { headers: NO_STORE });
      }
      case "follow":
      case "unfollow": {
        const target = typeof body.handle === "string" ? body.handle.trim() : "";
        if (!target || target.length > 60 || target === me.handle) return NextResponse.json({ error: "Bad handle" }, { status: 400 });
        if (body.op === "follow") await rest("lounge_follows", { method: "POST", body: JSON.stringify({ follower_handle: me.handle, following_handle: target }) });
        else await rest(`lounge_follows?follower_handle=eq.${h}&following_handle=eq.${encodeURIComponent(target)}`, { method: "DELETE" });
        return NextResponse.json({ state: "OK" }, { headers: NO_STORE });
      }
      default:
        return NextResponse.json({ error: "Unknown op" }, { status: 400 });
    }
  } catch (e) {
    return failure(e);
  }
}
