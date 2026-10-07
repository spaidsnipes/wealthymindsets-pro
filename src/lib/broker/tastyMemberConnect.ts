/**
 * Connect / status / disconnect for a member's OWN tastytrade (MEMBER-BROKER-CONNECT.md).
 * Validate THEN store; every answer carries booleans and counts only — never a
 * secret, never a provider body.
 */
import {
  deleteMemberGrant,
  readMemberGrant,
  writeMemberGrant,
  type GrantStoreAvailability,
  type MemberGrantMeta,
} from "./memberGrants";
import { forgetTastytradeMember, getTastytradeAccounts, getTastytradeQuoteToken, memberTastyLane } from "@/lib/tastytrade";

export type MemberTastyStatus =
  | { readonly state: "MEMBER_CONNECTIONS_NOT_ENABLED"; readonly enabled: false; readonly connected: false; readonly reason: string }
  | { readonly state: "OWNER_USES_DEPLOYMENT"; readonly enabled: true; readonly connected: false }
  | { readonly state: "NOT_CONNECTED"; readonly enabled: true; readonly connected: false }
  | { readonly state: "GRANT_UNREADABLE"; readonly enabled: true; readonly connected: false; readonly reason: string }
  | ({ readonly state: "CONNECTED"; readonly enabled: true; readonly connected: true } & MemberGrantMeta);

const NOT_ENABLED_REASON = "Member broker connections are not enabled on this deployment yet.";

export function notEnabled(): MemberTastyStatus {
  return { state: "MEMBER_CONNECTIONS_NOT_ENABLED", enabled: false, connected: false, reason: NOT_ENABLED_REASON };
}

export async function memberTastyStatus(store: GrantStoreAvailability, userId: string, isOwner: boolean): Promise<MemberTastyStatus> {
  if (!store.enabled) return notEnabled();
  if (isOwner) return { state: "OWNER_USES_DEPLOYMENT", enabled: true, connected: false };
  const g = await readMemberGrant(store, "tastytrade", userId);
  if (g.state === "NONE") return { state: "NOT_CONNECTED", enabled: true, connected: false };
  if (g.state === "UNREADABLE") return { state: "GRANT_UNREADABLE", enabled: true, connected: false, reason: "Your saved connection can no longer be read on this server. Disconnect and connect again." };
  const { accounts, quotes, level, validatedAt } = g.meta;
  return { state: "CONNECTED", enabled: true, connected: true, accounts, quotes, level, validatedAt };
}

/** Shape check only — tastytrade decides validity. Values are never echoed. */
export function parseConnectBody(body: unknown): { clientSecret: string; refreshToken: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const ok = (v: unknown, min: number) => typeof v === "string" && v.trim().length >= min && v.trim().length <= 4096 && !/\s/.test(v.trim());
  if (!ok(b.clientSecret, 8) || !ok(b.refreshToken, 16)) return null;
  return { clientSecret: (b.clientSecret as string).trim(), refreshToken: (b.refreshToken as string).trim() };
}

export type ConnectOutcome =
  | { readonly ok: true; readonly status: MemberTastyStatus }
  | { readonly ok: false; readonly httpStatus: number; readonly code: string; readonly error: string };

/** Validate against tastytrade with READ scope, then (and only then) store encrypted. */
export async function connectMemberTasty(
  store: Extract<GrantStoreAvailability, { enabled: true }>,
  userId: string,
  pair: { clientSecret: string; refreshToken: string },
  now: () => Date = () => new Date(),
): Promise<ConnectOutcome> {
  forgetTastytradeMember(userId);
  const lane = memberTastyLane(userId, pair);
  let accounts = 0;
  try {
    accounts = (await getTastytradeAccounts(lane)).length;
  } catch (e) {
    forgetTastytradeMember(userId);
    const m = e instanceof Error ? e.message : "";
    const http = /HTTP (\d{3})/.exec(m)?.[1];
    return {
      ok: false,
      httpStatus: 400,
      code: "TASTYTRADE_REFUSED",
      error: `tastytrade did not accept these credentials${http ? ` (HTTP ${http})` : ""}. Nothing was saved. Check that you copied the client secret and the refresh token from the same personal OAuth application, with the read scope.`,
    };
  }
  let quotes = false;
  let level: string | null = null;
  try {
    const t = await getTastytradeQuoteToken(lane);
    quotes = true;
    level = t.level;
  } catch {
    quotes = false;
  }
  const meta: MemberGrantMeta = { accounts, quotes, level, validatedAt: now().toISOString() };
  await writeMemberGrant(store, "tastytrade", userId, pair, meta);
  return { ok: true, status: { state: "CONNECTED", enabled: true, connected: true, ...meta } };
}

export async function disconnectMemberTasty(store: Extract<GrantStoreAvailability, { enabled: true }>, userId: string): Promise<MemberTastyStatus> {
  forgetTastytradeMember(userId);
  await deleteMemberGrant(store, "tastytrade", userId);
  return { state: "NOT_CONNECTED", enabled: true, connected: false };
}
