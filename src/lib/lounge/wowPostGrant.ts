/**
 * WOW Lounge posts (Oct 22 Mission Control P0 — one Lounge, one writer).
 *
 * WOW OS shows the same Lounge as WM Pro: both read `lounge_posts`. Only this
 * host holds the service key that may write it, so a member posting from inside
 * WOW reaches the table through here. WOW identifies the member by their signed
 * Passport, then HMAC-signs the post with the shared CLASSROOM_GRANT_SECRET
 * (`kind: "lounge_post"` keeps it from ever being read as a classroom grant, and
 * a classroom grant has no `kind`, so it can never be posted here). This host
 * checks the signature, a 2-minute expiry, and the shape — never a handle from a
 * browser.
 */
import { signGrantBody } from "@/lib/livekit/classroomGrant";

export interface WowPostGrant {
  kind: "lounge_post";
  user_id: string;
  handle: string;
  name: string;
  content: string;
  type: string;
  tags: string[];
  exp: number;
}

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HANDLE = /^[A-Za-z0-9_.-]{2,40}$/;
const TYPES = new Set(["text", "music", "video", "photo", "voice"]);

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export type WowPostCheck = { ok: true; grant: WowPostGrant } | { ok: false; status: number; error: string };

export async function verifyWowPostGrant(secret: string | undefined, body: string, signature: string | null, nowSec = Math.floor(Date.now() / 1000)): Promise<WowPostCheck> {
  if (!secret || secret.length < 32) return { ok: false, status: 503, error: "LOUNGE_RELAY_NOT_CONFIGURED" };
  if (!signature || body.length > 8000) return { ok: false, status: 401, error: "POST_UNSIGNED" };
  if (!sameString(await signGrantBody(secret, body), signature)) return { ok: false, status: 401, error: "POST_SIGNATURE_INVALID" };
  let g: WowPostGrant;
  try { g = JSON.parse(body); } catch { return { ok: false, status: 400, error: "POST_MALFORMED" }; }
  if (g.kind !== "lounge_post") return { ok: false, status: 403, error: "NOT_A_LOUNGE_POST" };
  if (typeof g.exp !== "number" || g.exp < nowSec || g.exp > nowSec + 120) return { ok: false, status: 401, error: "POST_EXPIRED" };
  if (typeof g.user_id !== "string" || !USER_ID.test(g.user_id)) return { ok: false, status: 403, error: "NOT_A_PASSPORT" };
  if (typeof g.handle !== "string" || !HANDLE.test(g.handle)) return { ok: false, status: 403, error: "HANDLE_INVALID" };
  const content = typeof g.content === "string" ? g.content.trim() : "";
  if (!content || content.length > 5000) return { ok: false, status: 400, error: "Post must be 1–5000 characters." };
  const tags = Array.isArray(g.tags) ? g.tags.filter((t): t is string => typeof t === "string").slice(0, 20).map(t => t.slice(0, 50)) : [];
  return {
    ok: true,
    grant: {
      kind: "lounge_post", user_id: g.user_id, handle: g.handle,
      name: typeof g.name === "string" && g.name.trim() ? g.name.trim().slice(0, 60) : g.handle,
      content, type: TYPES.has(String(g.type)) ? String(g.type) : "text", tags, exp: g.exp,
    },
  };
}
