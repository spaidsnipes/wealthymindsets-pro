/**
 * WOW Academy classroom grants (Oct 16 SUPERMAX directive §6).
 *
 * The LiveKit key pair for ATH lives on this host. WOW Academy owns its
 * classrooms (who may enter, who is host, what they wrote) but holds no LiveKit
 * key, so it asks here for a token with a grant it has HMAC-signed with the
 * shared CLASSROOM_GRANT_SECRET. This host checks only what it can check:
 *
 *   • the signature is WOW's (constant-time compare),
 *   • the grant expires within 2 minutes and has not expired,
 *   • the room is a WOW classroom room (`wow-cls-cls_…`) — never a WM Lounge or
 *     WOW TV stage, whose hosts are governed by `liveHost.ts`,
 *   • the identity is a WOW classroom member (`wow:clm_…`).
 *
 * Membership itself was decided by WOW against its own database before it
 * signed. Nothing here touches WM accounts, brokerage or chart state.
 */
export interface ClassroomGrant {
  room: string;
  identity: string;
  name: string;
  canPublish: boolean;
  metadata?: string;
  exp: number;
}

const ROOM = /^wow-cls-cls_[A-Za-z0-9_-]{8,40}$/;
const IDENTITY = /^wow:clm_[A-Za-z0-9_-]{8,40}$/;

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signGrantBody(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))));
}

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export type GrantCheck = { ok: true; grant: ClassroomGrant } | { ok: false; status: number; error: string };

export async function verifyClassroomGrant(secret: string | undefined, body: string, signature: string | null, nowSec = Math.floor(Date.now() / 1000)): Promise<GrantCheck> {
  if (!secret || secret.length < 32) return { ok: false, status: 503, error: "CLASSROOM_BROKER_NOT_CONFIGURED" };
  if (!signature || body.length > 2000) return { ok: false, status: 401, error: "GRANT_UNSIGNED" };
  if (!sameString(await signGrantBody(secret, body), signature)) return { ok: false, status: 401, error: "GRANT_SIGNATURE_INVALID" };
  let g: ClassroomGrant;
  try { g = JSON.parse(body); } catch { return { ok: false, status: 400, error: "GRANT_MALFORMED" }; }
  if (typeof g.exp !== "number" || g.exp < nowSec || g.exp > nowSec + 120) return { ok: false, status: 401, error: "GRANT_EXPIRED" };
  if (typeof g.room !== "string" || !ROOM.test(g.room)) return { ok: false, status: 403, error: "NOT_A_CLASSROOM" };
  if (typeof g.identity !== "string" || !IDENTITY.test(g.identity)) return { ok: false, status: 403, error: "NOT_A_CLASSROOM_MEMBER" };
  const name = typeof g.name === "string" ? g.name.slice(0, 40) : "Guest";
  return { ok: true, grant: { room: g.room, identity: g.identity, name, canPublish: g.canPublish === true, metadata: typeof g.metadata === "string" ? g.metadata.slice(0, 200) : undefined, exp: g.exp } };
}
