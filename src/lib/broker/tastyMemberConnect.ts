/**
 * Connect / test / status / disconnect for a member's OWN tastytrade
 * (MEMBER-BROKER-CONNECT.md). Validate THEN store; every answer carries
 * booleans, counts and HTTP statuses only — never a secret, never a provider
 * body, never an account number.
 *
 * Each capability is checked ON ITS OWN (Founder brief 2026-10-20: "which
 * capabilities actually passed — quotes, history, balances/positions, orders —
 * each checked separately"):
 *
 *   sign-in    POST /oauth/token (read scope) + GET /customers/me/accounts
 *   quotes     GET /market-data/by-type?equity[]=SPY   (a REST snapshot)
 *   history    GET /api-quote-tokens   (chart candles + streaming ride DXLink on this token)
 *   balances   GET /accounts/{n}/balances
 *   positions  GET /accounts/{n}/positions
 *   orders     GET /accounts/{n}/orders/live   (READ only — a member grant is
 *              read scope and `ttRequest` refuses any non-GET on a member lane)
 */
import {
  deleteMemberGrant,
  readMemberGrant,
  writeMemberGrant,
  type GrantStoreAvailability,
  type MemberCapabilityCheck,
  type MemberGrantMeta,
} from "./memberGrants";
import { credentialProblems } from "./tastyCredentialShape";
import { planMarketDataByTypeQuery } from "@/lib/marketData/tastytradeByType";
import {
  forgetTastytradeMember,
  getTastytradeAccounts,
  getTastytradeQuoteToken,
  memberTastyLane,
  tastytradeConfigStatus,
  ttGet,
  type TastyLane,
} from "@/lib/tastytrade";

export { credentialProblems };

/** The seven states the Connect card can be in (the four below + Not connected, Connecting, Unsupported on the card). */
export type MemberConnectionState = "CONNECTED" | "PARTIAL" | "AUTH_EXPIRED" | "ERROR";

export type MemberTastyStatus =
  | { readonly state: "MEMBER_CONNECTIONS_NOT_ENABLED"; readonly enabled: false; readonly connected: false; readonly reason: string }
  | { readonly state: "OWNER_USES_DEPLOYMENT"; readonly enabled: true; readonly connected: false }
  | { readonly state: "NOT_CONNECTED"; readonly enabled: true; readonly connected: false }
  | { readonly state: "GRANT_UNREADABLE"; readonly enabled: true; readonly connected: false; readonly reason: string }
  | ({ readonly state: "CONNECTED"; readonly enabled: true; readonly connected: true; readonly connection: MemberConnectionState } & MemberGrantMeta);

const NOT_ENABLED_REASON = "Member broker connections are not enabled on this deployment yet.";

export function notEnabled(): MemberTastyStatus {
  return { state: "MEMBER_CONNECTIONS_NOT_ENABLED", enabled: false, connected: false, reason: NOT_ENABLED_REASON };
}

/** A grant saved before per-capability checks existed reads as what it measured then. */
function connectionOf(meta: MemberGrantMeta): MemberConnectionState {
  if (meta.lastState) return meta.lastState;
  return meta.quotes ? "CONNECTED" : "PARTIAL";
}

function connectedStatus(meta: MemberGrantMeta): MemberTastyStatus {
  return { state: "CONNECTED", enabled: true, connected: true, connection: connectionOf(meta), ...meta };
}

export async function memberTastyStatus(store: GrantStoreAvailability, userId: string, isOwner: boolean): Promise<MemberTastyStatus> {
  if (!store.enabled) return notEnabled();
  if (isOwner) return { state: "OWNER_USES_DEPLOYMENT", enabled: true, connected: false };
  const g = await readMemberGrant(store, "tastytrade", userId);
  if (g.state === "NONE") return { state: "NOT_CONNECTED", enabled: true, connected: false };
  if (g.state === "UNREADABLE") return { state: "GRANT_UNREADABLE", enabled: true, connected: false, reason: "Your saved connection can no longer be read on this server. Disconnect and connect again." };
  return connectedStatus(g.meta);
}

/** Shape check only — tastytrade decides validity. Values are never echoed. */
export function parseConnectBody(body: unknown): { clientSecret: string; refreshToken: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (Object.keys(credentialProblems(b)).length) return null;
  return { clientSecret: (b.clientSecret as string).trim(), refreshToken: (b.refreshToken as string).trim() };
}

export type ConnectOutcome =
  | { readonly ok: true; readonly status: MemberTastyStatus }
  | { readonly ok: false; readonly httpStatus: number; readonly code: string; readonly error: string };

const httpOf = (e: unknown): number | null => {
  const m = /HTTP (\d{3})/.exec(e instanceof Error ? e.message : "");
  return m ? Number(m[1]) : null;
};
const isTokenMint = (e: unknown) => /token refresh/.test(e instanceof Error ? e.message : "");

type SignIn =
  | { readonly ok: true; readonly accounts: { accountNumber: string; accountType?: string; marginOrCash?: string }[] }
  | { readonly ok: false; readonly kind: "REFUSED" | "NO_PERMISSION" | "UNREACHABLE"; readonly httpStatus: number | null };

async function signIn(lane: TastyLane): Promise<SignIn> {
  try {
    return { ok: true, accounts: await getTastytradeAccounts(lane) };
  } catch (e) {
    const http = httpOf(e);
    // tastytrade refused the refresh grant itself: wrong pair, revoked grant, or a grant without the read scope.
    if (isTokenMint(e) && http !== null && http < 500) return { ok: false, kind: "REFUSED", httpStatus: http };
    // Token minted, but the account list was forbidden: the grant lacks the read permission.
    if (http === 401 || http === 403) return { ok: false, kind: "NO_PERMISSION", httpStatus: http };
    return { ok: false, kind: "UNREACHABLE", httpStatus: http };
  }
}

async function check(key: MemberCapabilityCheck["key"], run: () => Promise<boolean>): Promise<MemberCapabilityCheck> {
  try {
    return { key, result: (await run()) ? "PASS" : "FAILED", httpStatus: null };
  } catch (e) {
    const http = httpOf(e);
    return { key, result: http === 401 || http === 403 ? "NO_PERMISSION" : "FAILED", httpStatus: http };
  }
}

const QUOTE_PROBE_PATH = planMarketDataByTypeQuery({ equity: ["SPY"] }).path;

/** Each capability on its own. Never stops at the first failure. */
export async function probeMemberCapabilities(lane: TastyLane, accountNumber: string | null): Promise<{ checks: MemberCapabilityCheck[]; level: string | null }> {
  let level: string | null = null;
  const acct = accountNumber ? `/accounts/${encodeURIComponent(accountNumber)}` : null;
  const notChecked = (key: MemberCapabilityCheck["key"]): MemberCapabilityCheck => ({ key, result: "NOT_CHECKED", httpStatus: null });
  const items = (j: { data?: { items?: unknown[] } } | null | undefined) => j?.data?.items ?? [];
  const checks = await Promise.all([
    check("quotes", async () => (QUOTE_PROBE_PATH ? items(await ttGet(QUOTE_PROBE_PATH, lane)).length > 0 : false)),
    check("history", async () => { level = (await getTastytradeQuoteToken(lane)).level; return true; }),
    acct ? check("balances", async () => Boolean(await ttGet(`${acct}/balances`, lane))) : notChecked("balances"),
    acct ? check("positions", async () => Array.isArray(items(await ttGet(`${acct}/positions`, lane)))) : notChecked("positions"),
    acct ? check("orders", async () => Array.isArray(items(await ttGet(`${acct}/orders/live`, lane)))) : notChecked("orders"),
  ]);
  return { checks, level };
}

function accountKinds(accounts: { accountType?: string; marginOrCash?: string }[]): string[] {
  return [...new Set(accounts.map(a => [a.accountType, a.marginOrCash].filter(Boolean).join(" · ")).filter(Boolean))].slice(0, 4);
}

const environment = (): "LIVE" | "SANDBOX" => (tastytradeConfigStatus().env === "cert" ? "SANDBOX" : "LIVE");

const REFUSED_WORDS =
  "Check that the client secret and the refresh token come from the same personal OAuth application, that the application has the read scope ticked, and that its grant has not been deleted.";

/** Validate against tastytrade with READ scope, then (and only then) store encrypted. */
export async function connectMemberTasty(
  store: Extract<GrantStoreAvailability, { enabled: true }>,
  userId: string,
  pair: { clientSecret: string; refreshToken: string },
  now: () => Date = () => new Date(),
): Promise<ConnectOutcome> {
  forgetTastytradeMember(userId);
  const lane = memberTastyLane(userId, pair);
  const s = await signIn(lane);
  if (!s.ok) {
    forgetTastytradeMember(userId);
    const http = s.httpStatus ? ` (HTTP ${s.httpStatus})` : "";
    if (s.kind === "REFUSED") {
      return { ok: false, httpStatus: 400, code: "INVALID_CREDENTIALS", error: `tastytrade did not accept these credentials${http}. Nothing was saved. ${REFUSED_WORDS}` };
    }
    if (s.kind === "NO_PERMISSION") {
      return { ok: false, httpStatus: 403, code: "MISSING_PERMISSION", error: `tastytrade signed in but refused to list your accounts${http}. Nothing was saved. Edit the OAuth application at tastytrade, tick the read scope, create a new grant and paste the new refresh token.` };
    }
    return { ok: false, httpStatus: 502, code: "TASTYTRADE_UNREACHABLE", error: `tastytrade did not answer${http}. Nothing was saved. Try again in a minute.` };
  }
  const meta = await measured(lane, s.accounts, now);
  await writeMemberGrant(store, "tastytrade", userId, pair, meta);
  return { ok: true, status: connectedStatus(meta) };
}

async function measured(
  lane: TastyLane,
  accounts: { accountNumber: string; accountType?: string; marginOrCash?: string }[],
  now: () => Date,
): Promise<MemberGrantMeta> {
  const { checks, level } = await probeMemberCapabilities(lane, accounts[0]?.accountNumber || null);
  const at = now().toISOString();
  const allPass = accounts.length > 0 && checks.every(c => c.result === "PASS");
  return {
    accounts: accounts.length,
    quotes: checks.some(c => c.key === "history" && c.result === "PASS"),
    level,
    validatedAt: at,
    environment: environment(),
    accountKinds: accountKinds(accounts),
    checks,
    lastCheckAt: at,
    lastState: allPass ? "CONNECTED" : "PARTIAL",
  };
}

/**
 * "Test connection" on a SAVED grant: re-run every check with what is stored.
 * A refused refresh grant reads AUTH_EXPIRED (deleted/revoked at tastytrade);
 * the last successful check time is kept, never overwritten by a failure.
 */
export async function retestMemberTasty(
  store: Extract<GrantStoreAvailability, { enabled: true }>,
  userId: string,
  now: () => Date = () => new Date(),
): Promise<MemberTastyStatus> {
  const g = await readMemberGrant(store, "tastytrade", userId);
  if (g.state === "NONE") return { state: "NOT_CONNECTED", enabled: true, connected: false };
  if (g.state === "UNREADABLE") return { state: "GRANT_UNREADABLE", enabled: true, connected: false, reason: "Your saved connection can no longer be read on this server. Disconnect and connect again." };
  forgetTastytradeMember(userId);
  const lane = memberTastyLane(userId, g.secrets);
  const s = await signIn(lane);
  let meta: MemberGrantMeta;
  if (s.ok) {
    meta = await measured(lane, s.accounts, now);
  } else {
    forgetTastytradeMember(userId);
    const lastState: MemberConnectionState = s.kind === "REFUSED" || s.kind === "NO_PERMISSION" ? "AUTH_EXPIRED" : "ERROR";
    meta = { ...g.meta, lastCheckAt: now().toISOString(), lastState };
  }
  await writeMemberGrant(store, "tastytrade", userId, g.secrets, meta);
  return connectedStatus(meta);
}

export async function disconnectMemberTasty(store: Extract<GrantStoreAvailability, { enabled: true }>, userId: string): Promise<MemberTastyStatus> {
  forgetTastytradeMember(userId);
  await deleteMemberGrant(store, "tastytrade", userId);
  return { state: "NOT_CONNECTED", enabled: true, connected: false };
}
