/**
 * The one Lounge — its rules, in one place (Oct 22 Founder ruling: "it's one
 * lounge, not 2 different or multiple different lounges").
 *
 * WM Pro's /api/lounge (WM sign-in) and /api/lounge/wow (a WOW OS Passport
 * member, signed by WOW's Worker) both call these functions, so a post, like,
 * comment, delete or follow means the same thing whichever app it came from:
 *   · the author is the signed-in account (owner_id = the shared Supabase user
 *     id), never a field the browser sends;
 *   · tier / verified / CEO marks are not the browser's to claim;
 *   · a post is deleted only by its own author.
 * Extracted unchanged from /api/lounge (2026-10-03 … 10-05 security passes).
 */
import { resolveSupabaseServiceKey } from "@/lib/supabaseConfigStatus";
import { isCoreTeam } from "@/lib/coreTeam";

export const MAX_POST = 2000;
export const MAX_COMMENT = 1000;
// Private immutable identity stays in the store; API responses expose public fields only.
export const POST_FIELDS = "id,user_handle,user_name,user_avatar,user_color,user_tier,user_verified,user_ceo,content,type,trade_card,music,video,tags,created_at";
export const COMMENT_FIELDS = "id,post_id,user_handle,user_name,user_avatar,user_color,body,created_at";

/** Who is acting: the shared account id plus the public face the Lounge shows. */
export type LoungeActor = { ownerId: string; handle: string; name: string; avatar: string; /** verified sign-in email, server-side only — proves the core-team Crown W */ email?: string | null };

export type LoungeOp =
  | { op: "post"; content: string; type?: string; trade_card?: unknown; tags?: unknown }
  | { op: "comment"; postId: number; body: string }
  | { op: "like" | "unlike" | "delete"; postId: number }
  | { op: "follow" | "unfollow"; handle: string }
  // Safety (GK 2365a30f, 2d5d2fab): report a post, block or mute a person for
  // yourself, and a core-team moderator hide. Lounge-only: nothing here touches
  // Academy, Marketplace or WM Pro access.
  | { op: "report"; postId: number; reason: string }
  | { op: "block" | "unblock" | "mute" | "unmute"; handle: string }
  | { op: "hide" | "unhide"; postId: number };

export const MAX_REPORT = 500;

export class LoungeStoreError extends Error {
  constructor(readonly state: "NOT_CONFIGURED" | "TABLE_MISSING" | "UPSTREAM", message: string, readonly pgCode?: string) { super(message); }
}

type Rest = <T>(path: string, init?: RequestInit) => Promise<T>;

export function loungeStore(env: Record<string, string | undefined> = process.env): Rest {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = resolveSupabaseServiceKey(env);
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
      if (res.status === 404 || code === "42P01" || code === "PGRST205") throw new LoungeStoreError("TABLE_MISSING", "The lounge tables do not exist in the store.", code);
      // A column the safety SQL adds (hidden_at) is not there yet.
      if (code === "42703" || code === "PGRST204") throw new LoungeStoreError("TABLE_MISSING", "Lounge safety is not installed in the store yet.", code);
      throw new LoungeStoreError("UPSTREAM", `Lounge store answered HTTP ${res.status}.`, code);
    }
    return body as T;
  };
}

const inList = (ids: readonly (number | string)[]) => `(${ids.map(i => encodeURIComponent(String(i))).join(",")})`;

/** The feed every entry point shows: newest 60 posts with counts, plus what this viewer liked and follows. */
const missing = (e: unknown) => e instanceof LoungeStoreError && e.state === "TABLE_MISSING";

/** Posts a moderator hid stay out of every feed. Until the safety SQL is run the column is absent and nothing is hidden. */
async function visiblePosts(rest: Rest): Promise<{ posts: Array<{ id: number; user_handle?: string }>; safety: "ON" | "NOT_INSTALLED" }> {
  try {
    return { posts: await rest(`lounge_posts?select=${POST_FIELDS}&hidden_at=is.null&order=created_at.desc&limit=60`), safety: "ON" };
  } catch (e) {
    if (!missing(e)) throw e;
    return { posts: await rest(`lounge_posts?select=${POST_FIELDS}&order=created_at.desc&limit=60`), safety: "NOT_INSTALLED" };
  }
}

/** The people this viewer blocked or muted. Either way their posts leave this viewer's feed. */
export async function readBlocks(rest: Rest, viewerOwnerId: string | null): Promise<Array<{ blocked_handle: string; kind: "block" | "mute" }>> {
  if (!viewerOwnerId) return [];
  try {
    return await rest(`lounge_blocks?select=blocked_handle,kind&owner_id=eq.${encodeURIComponent(viewerOwnerId)}`);
  } catch (e) {
    if (missing(e)) return [];
    throw e;
  }
}

export async function readFeed(rest: Rest, viewerOwnerId: string | null, viewerHandle: string | null) {
  const [{ posts: all, safety }, blocks] = await Promise.all([visiblePosts(rest), readBlocks(rest, viewerOwnerId)]);
  const hiddenFromMe = new Set(blocks.map(b => b.blocked_handle));
  const posts = all.filter(p => !hiddenFromMe.has(String(p.user_handle ?? "")));
  const ids = posts.map(p => p.id);
  const owner = viewerOwnerId ? encodeURIComponent(viewerOwnerId) : null;
  const [likes, comments, follows, myLikes] = await Promise.all([
    ids.length ? rest<Array<{ post_id: number }>>(`lounge_likes?select=post_id&post_id=in.${inList(ids)}`) : Promise.resolve([]),
    ids.length ? rest<Array<{ post_id: number }>>(`lounge_comments?select=post_id&post_id=in.${inList(ids)}`) : Promise.resolve([]),
    owner && viewerHandle ? rest<Array<{ following_handle: string }>>(`lounge_follows?select=following_handle&owner_id=eq.${owner}`) : Promise.resolve([]),
    owner && ids.length ? rest<Array<{ post_id: number }>>(`lounge_likes?select=post_id&owner_id=eq.${owner}&post_id=in.${inList(ids)}`) : Promise.resolve([]),
  ]);
  const likeCount = new Map<number, number>(), liked = new Set<number>(), commentCount = new Map<number, number>();
  for (const l of likes) likeCount.set(l.post_id, (likeCount.get(l.post_id) ?? 0) + 1);
  for (const l of myLikes) liked.add(l.post_id);
  for (const c of comments) commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1);
  return {
    state: "OK" as const,
    me: viewerHandle,
    following: follows.map(f => f.following_handle),
    blocked: blocks.filter(b => b.kind !== "mute").map(b => b.blocked_handle),
    muted: blocks.filter(b => b.kind === "mute").map(b => b.blocked_handle),
    safety,
    posts: posts.map(p => ({ ...p, like_count: likeCount.get(p.id) ?? 0, comment_count: commentCount.get(p.id) ?? 0, liked_by_me: liked.has(p.id) })),
  };
}

export async function readComments(rest: Rest, postId: number) {
  const comments = await rest<unknown[]>(`lounge_comments?select=${COMMENT_FIELDS}&post_id=eq.${postId}&order=created_at.asc&limit=200`);
  return { state: "OK" as const, comments };
}

/** Validate an op's shape. Returns an error string or null. */
export function checkOp(body: LoungeOp | null): string | null {
  if (!body || typeof body !== "object") return "Bad request";
  const id = "postId" in body ? Number(body.postId) : NaN;
  const needsId = body.op === "comment" || body.op === "like" || body.op === "unlike" || body.op === "delete" || body.op === "report" || body.op === "hide" || body.op === "unhide";
  if (needsId && !(Number.isInteger(id) && id > 0)) return "Bad post id";
  return null;
}

export type OpResult = { status: number; body: Record<string, unknown> };

export async function runOp(rest: Rest, me: LoungeActor, body: LoungeOp): Promise<OpResult> {
  const id = "postId" in body ? Number(body.postId) : NaN;
  const owner = encodeURIComponent(me.ownerId);
  switch (body.op) {
    case "post": {
      const content = typeof body.content === "string" ? body.content.trim() : "";
      if (!content || content.length > MAX_POST) return { status: 400, body: { error: "Post is empty or too long." } };
      const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string").slice(0, 12).map(t => t.slice(0, 40)) : [];
      const tc = body.type === "trade" && body.trade_card && typeof body.trade_card === "object" ? body.trade_card : null;
      const [row] = await rest<unknown[]>(`lounge_posts?select=${POST_FIELDS}`, { method: "POST", body: JSON.stringify({
        owner_id: me.ownerId, user_handle: me.handle, user_name: me.name, user_avatar: me.avatar, user_color: "#00D4AA",
        // Crown W + check: derived from the account's verified email on the
        // server (coreTeam.ts), never from anything the request says.
        user_tier: "BASIC", user_verified: isCoreTeam(null, me.email), user_ceo: isCoreTeam(null, me.email),
        content, type: body.type === "trade" ? "trade" : "text", trade_card: tc, tags,
      }) });
      return { status: 200, body: { state: "OK", post: row } };
    }
    case "comment": {
      const text = typeof body.body === "string" ? body.body.trim() : "";
      if (!text || text.length > MAX_COMMENT) return { status: 400, body: { error: "Comment is empty or too long." } };
      const [row] = await rest<unknown[]>(`lounge_comments?select=${COMMENT_FIELDS}`, { method: "POST", body: JSON.stringify({
        owner_id: me.ownerId, post_id: id, user_handle: me.handle, user_name: me.name, user_avatar: me.avatar, user_color: "#00D4AA", body: text,
      }) });
      return { status: 200, body: { state: "OK", comment: row } };
    }
    case "like":
      await rest("lounge_likes", { method: "POST", body: JSON.stringify({ owner_id: me.ownerId, post_id: id, user_handle: me.handle }) });
      return { status: 200, body: { state: "OK" } };
    case "unlike":
      await rest(`lounge_likes?post_id=eq.${id}&owner_id=eq.${owner}`, { method: "DELETE" });
      return { status: 200, body: { state: "OK" } };
    case "delete": {
      // Editable handles cannot authorize deletion. Legacy rows without proven owners stay protected.
      const gone = await rest<unknown[]>(`lounge_posts?id=eq.${id}&owner_id=eq.${owner}`, { method: "DELETE" });
      if (!Array.isArray(gone) || gone.length === 0) return { status: 403, body: { error: "Not your post." } };
      return { status: 200, body: { state: "OK" } };
    }
    case "follow":
    case "unfollow": {
      const target = typeof body.handle === "string" ? body.handle.trim() : "";
      if (!target || target.length > 60 || target === me.handle) return { status: 400, body: { error: "Bad handle" } };
      if (body.op === "follow") await rest("lounge_follows", { method: "POST", body: JSON.stringify({ owner_id: me.ownerId, follower_handle: me.handle, following_handle: target }) });
      else await rest(`lounge_follows?owner_id=eq.${owner}&following_handle=eq.${encodeURIComponent(target)}`, { method: "DELETE" });
      return { status: 200, body: { state: "OK" } };
    }
    case "report": {
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!reason || reason.length > MAX_REPORT) return { status: 400, body: { error: "Say briefly what is wrong (up to 500 characters)." } };
      // One report per person per post; a repeat is accepted without a second row.
      await rest("lounge_reports?on_conflict=post_id,reporter_owner_id", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({
        post_id: id, reporter_owner_id: me.ownerId, reporter_handle: me.handle, reason,
      }) });
      return { status: 200, body: { state: "OK", reported: id } };
    }
    case "block":
    case "mute":
    case "unblock":
    case "unmute": {
      const target = typeof body.handle === "string" ? body.handle.trim() : "";
      if (!target || target.length > 60 || target === me.handle) return { status: 400, body: { error: "Bad handle" } };
      const kind = body.op === "mute" || body.op === "unmute" ? "mute" : "block";
      if (body.op === "block" || body.op === "mute") {
        await rest("lounge_blocks?on_conflict=owner_id,blocked_handle", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ owner_id: me.ownerId, blocked_handle: target, kind }) });
        // Blocking also stops following; muting leaves the follow alone.
        if (kind === "block") await rest(`lounge_follows?owner_id=eq.${owner}&following_handle=eq.${encodeURIComponent(target)}`, { method: "DELETE" });
      } else {
        await rest(`lounge_blocks?owner_id=eq.${owner}&blocked_handle=eq.${encodeURIComponent(target)}&kind=eq.${kind}`, { method: "DELETE" });
      }
      return { status: 200, body: { state: "OK" } };
    }
    case "hide":
    case "unhide": {
      // Moderators are the core team, proven by the verified email on the server.
      if (!isCoreTeam(null, me.email)) return { status: 403, body: { error: "Only a Lounge moderator can hide posts." } };
      const changed = await rest<unknown[]>(`lounge_posts?id=eq.${id}&select=id`, { method: "PATCH", body: JSON.stringify(
        body.op === "hide" ? { hidden_at: new Date().toISOString(), hidden_by: me.handle } : { hidden_at: null, hidden_by: null },
      ) });
      if (!Array.isArray(changed) || changed.length === 0) return { status: 404, body: { error: "No such post." } };
      if (body.op === "hide") {
        try { await rest(`lounge_reports?post_id=eq.${id}&status=eq.OPEN`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "HIDDEN" }) }); } catch (e) { if (!missing(e)) throw e; }
      }
      return { status: 200, body: { state: "OK" } };
    }
    default:
      return { status: 400, body: { error: "Unknown op" } };
  }
}

export function storeFailure(e: unknown): OpResult {
  if (e instanceof LoungeStoreError) return { status: e.state === "UPSTREAM" ? 502 : 503, body: { state: e.state, error: e.message } };
  return { status: 502, body: { state: "UPSTREAM", error: "Lounge request failed." } };
}
