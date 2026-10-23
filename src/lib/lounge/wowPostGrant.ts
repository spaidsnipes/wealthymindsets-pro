/**
 * WOW OS → the one Lounge (Oct 22 Founder ruling: "it's one lounge, not 2
 * different or multiple different lounges").
 *
 * WOW OS shows the Lounge to Passport members; this host holds the only key
 * that may read and write the Lounge tables. WOW identifies the member by their
 * signed Passport, then HMAC-signs the request with the shared
 * CLASSROOM_GRANT_SECRET. `kind: "lounge_op"` keeps it from ever being read as
 * a classroom grant (which has no `kind`), and a classroom grant can never be
 * replayed here. This host checks the signature, a 2-minute expiry and the
 * shape; the rules for each op live in loungeStore.ts, shared with /api/lounge.
 *
 * The member's public face is resolved HERE from their shared Supabase account
 * (handle / displayName set in WM Pro's Profile), so one person carries one
 * name in the Lounge whichever app they post from. Only when the account has
 * no handle yet is WOW's Passport number used.
 */
import { signGrantBody } from "@/lib/livekit/classroomGrant";
import type { LoungeOp } from "./loungeStore";

export type WowLoungeOp = LoungeOp | { op: "feed" } | { op: "comments"; postId: number };

export interface WowLoungeGrant {
  kind: "lounge_op";
  owner_id: string;
  fallback_handle: string;
  fallback_name: string;
  op: WowLoungeOp;
  exp: number;
}

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HANDLE = /^[A-Za-z0-9_.-]{2,40}$/;
const OPS = new Set(["feed", "comments", "post", "comment", "like", "unlike", "delete", "follow", "unfollow", "report", "block", "unblock", "mute", "unmute", "hide", "unhide"]);

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export type WowGrantCheck = { ok: true; grant: WowLoungeGrant } | { ok: false; status: number; error: string };

export async function verifyWowLoungeGrant(secret: string | undefined, body: string, signature: string | null, nowSec = Math.floor(Date.now() / 1000)): Promise<WowGrantCheck> {
  if (!secret || secret.length < 32) return { ok: false, status: 503, error: "LOUNGE_RELAY_NOT_CONFIGURED" };
  if (!signature || body.length > 16_000) return { ok: false, status: 401, error: "GRANT_UNSIGNED" };
  if (!sameString(await signGrantBody(secret, body), signature)) return { ok: false, status: 401, error: "GRANT_SIGNATURE_INVALID" };
  let g: Record<string, unknown>;
  try { g = JSON.parse(body); } catch { return { ok: false, status: 400, error: "GRANT_MALFORMED" }; }
  if (typeof g.exp !== "number" || g.exp < nowSec || g.exp > nowSec + 120) return { ok: false, status: 401, error: "GRANT_EXPIRED" };
  // The first WOW release (Oct 22, 89871ed) signed `kind: "lounge_post"` with the post inline.
  if (g.kind === "lounge_post") {
    g = { kind: "lounge_op", owner_id: g.user_id, fallback_handle: g.handle, fallback_name: g.name, op: { op: "post", content: g.content, type: g.type, tags: g.tags }, exp: g.exp };
  }
  if (g.kind !== "lounge_op") return { ok: false, status: 403, error: "NOT_A_LOUNGE_GRANT" };
  if (typeof g.owner_id !== "string" || !USER_ID.test(g.owner_id)) return { ok: false, status: 403, error: "NOT_A_PASSPORT" };
  if (typeof g.fallback_handle !== "string" || !HANDLE.test(g.fallback_handle)) return { ok: false, status: 403, error: "HANDLE_INVALID" };
  const op = g.op as { op?: unknown } | null;
  if (!op || typeof op !== "object" || typeof op.op !== "string" || !OPS.has(op.op)) return { ok: false, status: 400, error: "Unknown op" };
  return {
    ok: true,
    grant: {
      kind: "lounge_op", owner_id: g.owner_id, fallback_handle: g.fallback_handle,
      fallback_name: typeof g.fallback_name === "string" && g.fallback_name.trim() ? g.fallback_name.trim().slice(0, 60) : g.fallback_handle,
      op: op as WowLoungeOp, exp: g.exp as number,
    },
  };
}
