"use client";

/**
 * A MEMBER'S OWN BROKER — Garden 19 §25 / docs/operations/MEMBER-BROKER-CONNECT.md.
 *
 * Members use their own supported broker accounts and their own entitlements.
 * The Founder's credentials are never involved. Everything this card says about
 * capability comes from /api/broker/member/tastytrade, which measured it at the
 * broker — never assumed. A referral door helps open an account; it creates no
 * data entitlement, and the copy says so.
 *
 * Founder brief 2026-10-20 (a friend could not connect on his phone): tastytrade
 * is the first supported connection, shown first, with a guided setup, labelled
 * fields, inline validation, a "Test connection" button, plain errors and one of
 * seven named states. Webull stays visible with an honest status and no button
 * that looks live.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, PlayCircle } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { forgetTastyFrontMonths } from "@/lib/broker/tastyFrontMonth";
import { credentialProblems } from "@/lib/broker/tastyCredentialShape";
import { reopenTastyStream } from "@/lib/broker/tastyQuoteStream";

export const MEMBER_TASTY_ENDPOINT = "/api/broker/member/tastytrade";

/** tastytrade's own pages — every claim below links to one of these. */
export const TASTY_LINKS = {
  openAccount: "https://open.tastytrade.com/",
  unfundedLiveQuotes: "https://support.tastytrade.com/support/s/solutions/articles/43000475299",
  apiMarketData: "https://developer.tastytrade.com/docs/concepts/market-data/",
  oauth: "https://developer.tastytrade.com/docs/authentication/oauth2/",
} as const;

export const WEBULL_CONNECT_API_URL = "https://developer.webull.com/apis/docs/connect-api/about-connect-api/";

/**
 * What tastytrade itself publishes about data on a new account (read 2026-10-20).
 * Help Center: 14 calendar days of live data while unfunded, then delayed until
 * funded with ANY amount (non-professional). API docs: market-data endpoints are
 * "available to funded account holders". No dollar figure is claimed.
 */
export const TASTY_DATA_TERMS =
  "tastytrade says a new account that isn't funded yet gets 14 calendar days of live market data, then switches to delayed data until you fund it with any amount (non-professional traders). Its API docs say API market data is for funded accounts, so WM's live feed from your account may need a funded account.";

export const ONBOARDING_LINE = "For now, connect Tastytrade for live data. Webull is coming.";

/** The sign-up door: the Founder's referral link when set, else the plain public page — labelled as nothing. */
export function brokerSignupDoor(provider: "tastytrade" | "webull"): { href: string; isReferral: boolean } {
  const referral = provider === "tastytrade"
    ? process.env.NEXT_PUBLIC_TASTYTRADE_REFERRAL_URL
    : process.env.NEXT_PUBLIC_WEBULL_REFERRAL_URL;
  const r = referral?.trim();
  if (r && /^https:\/\//.test(r)) return { href: r, isReferral: true };
  return { href: provider === "tastytrade" ? TASTY_LINKS.openAccount : "https://www.webull.com/signup", isReferral: false };
}

export const REFERRAL_IS_NOT_ENTITLEMENT =
  "Opening an account does not by itself give WM market data. What you see comes from your own account's data entitlements, read from the broker.";

type CapabilityKey = "quotes" | "history" | "balances" | "positions" | "orders";
type Check = { key: CapabilityKey; result: "PASS" | "NO_PERMISSION" | "FAILED" | "NOT_CHECKED"; httpStatus: number | null };

export type MemberStatus = {
  state: "MEMBER_CONNECTIONS_NOT_ENABLED" | "OWNER_USES_DEPLOYMENT" | "NOT_CONNECTED" | "GRANT_UNREADABLE" | "CONNECTED" | "SIGNED_OUT";
  connected: boolean;
  connection?: "CONNECTED" | "PARTIAL" | "AUTH_EXPIRED" | "ERROR";
  reason?: string;
  accounts?: number;
  quotes?: boolean;
  level?: string | null;
  validatedAt?: string;
  environment?: "LIVE" | "SANDBOX";
  accountKinds?: string[];
  checks?: Check[];
  lastCheckAt?: string;
};

/** The seven states the brief names, and nothing else. */
export type CardState = "Not connected" | "Connecting" | "Connected" | "Partially available" | "Authentication expired" | "Error" | "Unsupported";

export function tastyCardState(status: MemberStatus | null, busy: boolean): CardState | null {
  if (busy) return "Connecting";
  if (!status) return null;
  switch (status.state) {
    case "SIGNED_OUT":
    case "NOT_CONNECTED":
      return "Not connected";
    case "MEMBER_CONNECTIONS_NOT_ENABLED":
    case "OWNER_USES_DEPLOYMENT":
      return "Unsupported";
    case "GRANT_UNREADABLE":
      return "Error";
    case "CONNECTED":
      return status.connection === "PARTIAL" ? "Partially available"
        : status.connection === "AUTH_EXPIRED" ? "Authentication expired"
        : status.connection === "ERROR" ? "Error"
        : status.connection === "CONNECTED" ? "Connected"
        // a grant saved before per-capability checks: what it measured then
        : status.quotes ? "Connected" : "Partially available";
  }
}

const STATE_TONE: Record<CardState, string> = {
  "Not connected": "#9CA3AF",
  Connecting: "#60A5FA",
  Connected: "#34D399",
  "Partially available": "#FBBF24",
  "Authentication expired": "#F87171",
  Error: "#F87171",
  Unsupported: "#9CA3AF",
};

export function StateBadge({ state }: { state: CardState }) {
  const c = STATE_TONE[state];
  return (
    <span data-testid="broker-state" className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{ color: c, background: `${c}1a`, border: `1px solid ${c}55` }}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      {state}
    </span>
  );
}

export const CAPABILITY_LABEL: Record<CapabilityKey, string> = {
  quotes: "Quotes",
  history: "Chart history & live stream",
  balances: "Balances",
  positions: "Positions",
  orders: "Orders (view only)",
};

export function checkWords(c: Check): string {
  const http = c.httpStatus ? ` (HTTP ${c.httpStatus})` : "";
  switch (c.result) {
    case "PASS": return "Passed";
    case "NO_PERMISSION": return c.key === "quotes" || c.key === "history"
      ? `Not permitted${http} — tastytrade gives API market data to funded accounts`
      : `Not permitted${http}`;
    case "FAILED": return `Failed${http}`;
    case "NOT_CHECKED": return "Not checked — tastytrade listed no account";
  }
}

function ago(iso: string | undefined, now: number): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const m = Math.max(0, Math.round((now - t) / 60_000));
  const when = new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return `${when} · ${m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 48 * 60 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`}`;
}

function SignupDoor({ provider, name, color }: { provider: "tastytrade" | "webull"; name: string; color: string }) {
  const door = brokerSignupDoor(provider);
  return (
    <div className="space-y-1">
      <a
        href={door.href}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`${provider}-signup-door`}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-wm-border bg-wm-surface text-[12px] font-semibold text-wm-text-muted transition-all hover:text-wm-text"
        style={{ borderColor: `${color}40` }}
      >
        <ExternalLink size={12} /> {provider === "tastytrade" ? `New to ${name}? Open an account` : `Open a ${name} account`}
        {door.isReferral ? <span className="ml-1 text-[10px] uppercase tracking-wider text-wm-text-dim">(referral link)</span> : null}
      </a>
      <p className="px-0.5 text-[11px] leading-snug text-wm-text-dim">{REFERRAL_IS_NOT_ENTITLEMENT}</p>
    </div>
  );
}

/**
 * The top of the Connect drawer for members: what to do first, the Founder's
 * tutorial slot, and tastytrade's own data terms — linked, never paraphrased
 * into a promise.
 */
export function MemberBrokerOnboarding() {
  const door = brokerSignupDoor("tastytrade");
  return (
    <section data-testid="member-broker-onboarding" className="space-y-2 rounded-xl border border-[#FF6B00]/40 bg-[#FF6B00]/5 px-3 py-3">
      <p className="text-[14px] font-bold leading-snug text-wm-text">{ONBOARDING_LINE}</p>
      <div data-testid="tutorial-slot" aria-label="Video tutorial coming soon"
        className="flex min-h-32 w-full flex-col py-3 items-center justify-center gap-1 rounded-lg border border-dashed border-wm-border bg-wm-surface/60 text-center">
        <PlayCircle size={28} className="text-wm-text-dim" aria-hidden="true" />
        <span className="text-[13px] font-semibold text-wm-text-muted">Video tutorial coming soon</span>
        <span className="px-4 text-[11px] text-wm-text-dim">A step-by-step walkthrough of connecting your tastytrade API.</span>
      </div>
      <a href={door.href} target="_blank" rel="noopener noreferrer" data-testid="tastytrade-new-account"
        className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-wm-border bg-wm-surface text-[13px] font-semibold text-wm-text">
        <ExternalLink size={13} aria-hidden="true" /> New to Tastytrade? Open an account
        {door.isReferral ? <span className="ml-1 text-[10px] uppercase tracking-wider text-wm-text-dim">(referral link)</span> : null}
      </a>
      <p className="text-[11px] leading-snug text-wm-text-muted" data-testid="tastytrade-data-terms">
        {TASTY_DATA_TERMS}{" "}
        <a href={TASTY_LINKS.unfundedLiveQuotes} target="_blank" rel="noopener noreferrer" className="underline">tastytrade: live quotes in an unfunded account</a>
        {" · "}
        <a href={TASTY_LINKS.apiMarketData} target="_blank" rel="noopener noreferrer" className="underline">tastytrade API market data</a>
      </p>
    </section>
  );
}

const FIELD = "mt-1 min-h-11 w-full rounded-lg border bg-wm-card px-2 text-[16px] text-wm-text";

export function MemberTastytradeConnect({ color }: { color: string }) {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<MemberStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState<false | "connect" | "test" | "disconnect">(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (loading) return;
    if (!user) { setStatus({ state: "SIGNED_OUT", connected: false }); return; }
    let live = true;
    fetch(MEMBER_TASTY_ENDPOINT, { cache: "no-store" })
      .then(async r => {
        if (r.status === 401) return { state: "SIGNED_OUT", connected: false } as MemberStatus;
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as MemberStatus;
      })
      .then(j => { if (live) setStatus(j); })
      .catch(e => { if (live) { setStatus({ state: "NOT_CONNECTED", connected: false }); setError(`WM could not read your connection (${e instanceof Error ? e.message : "network"}). Try again.`); } });
    return () => { live = false; };
  }, [user, loading]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);

  const problems = credentialProblems({ clientSecret, refreshToken });
  const shapeOk = Object.keys(problems).length === 0;

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!shapeOk) return;
    setBusy("connect"); setError(null);
    try {
      const r = await fetch(MEMBER_TASTY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientSecret, refreshToken }),
        cache: "no-store",
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) { setError(j?.error ?? j?.reason ?? `Could not connect (HTTP ${r.status}).`); return; }
      setStatus(j); setOpen(false); setTouched(false);
      // The open stream asks again and gets THIS member's token; futures
      // contracts the guest could not resolve are asked for again too.
      forgetTastyFrontMonths(); reopenTastyStream();
    } catch {
      setError("Your phone could not reach WM. Check your connection and try again — nothing was saved.");
    } finally {
      // Secrets never linger in the page after a submit, success or not.
      setClientSecret(""); setRefreshToken(""); setBusy(false);
    }
  }

  async function retest() {
    setBusy("test"); setError(null);
    try {
      const r = await fetch(MEMBER_TASTY_ENDPOINT, { method: "PUT", cache: "no-store" });
      const j = await r.json().catch(() => null);
      if (!r.ok) { setError(j?.error ?? j?.reason ?? `Could not test the connection (HTTP ${r.status}).`); return; }
      setStatus(j); forgetTastyFrontMonths(); reopenTastyStream();
    } catch {
      setError("Your phone could not reach WM. Check your connection and try again.");
    } finally { setBusy(false); }
  }

  async function disconnect() {
    setBusy("disconnect"); setError(null);
    try {
      const r = await fetch(MEMBER_TASTY_ENDPOINT, { method: "DELETE", cache: "no-store" });
      const j = await r.json().catch(() => null);
      if (!r.ok) { setError(j?.error ?? j?.reason ?? `Could not disconnect (HTTP ${r.status}).`); return; }
      setStatus(j); forgetTastyFrontMonths(); reopenTastyStream();
    } catch {
      setError("Your phone could not reach WM. Try again.");
    } finally { setBusy(false); }
  }

  const cardState = tastyCardState(status, busy === "connect");
  if (!status || !cardState) return <div className="flex min-h-11 items-center gap-2 text-[12px] text-wm-text-dim"><Loader2 size={12} className="animate-spin" /> Checking your tastytrade connection…</div>;

  const saved = status.state === "CONNECTED";
  const showForm = open || busy === "connect";

  return (
    <div className="space-y-2" data-testid="member-tastytrade-connect" onClick={e => e.stopPropagation()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-wm-text-dim">Your tastytrade</span>
        <StateBadge state={cardState} />
      </div>

      {status.state === "SIGNED_OUT" ? (
        <div className="space-y-2">
          <p className="text-[12px] leading-snug text-wm-text-muted">Sign in to WM first — your tastytrade connection is saved to your own WM account.</p>
          <Link href={`/login?next=${encodeURIComponent("/charts?connect=brokers")}`} prefetch={false}
            className="flex min-h-11 w-full items-center justify-center rounded-xl text-[13px] font-bold"
            style={{ background: `${color}2a`, color, border: `1px solid ${color}55` }}>Sign in to connect</Link>
        </div>
      ) : status.state === "MEMBER_CONNECTIONS_NOT_ENABLED" ? (
        <p className="text-[12px] leading-snug text-wm-text-muted">Connecting your own tastytrade is switched off on this server right now, so there is nothing to fill in yet.</p>
      ) : status.state === "OWNER_USES_DEPLOYMENT" ? (
        <p className="text-[12px] leading-snug text-wm-text-muted">This account already uses the site&apos;s own tastytrade connection.</p>
      ) : null}

      {saved ? (
        <div className="space-y-2 rounded-xl border border-wm-border bg-wm-surface/60 px-3 py-2.5 text-[12px] leading-relaxed text-wm-text-muted" data-testid="member-tastytrade-capability">
          <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5">
            <dt className="text-wm-text-dim">Provider</dt><dd className="font-semibold text-wm-text">tastytrade</dd>
            <dt className="text-wm-text-dim">Account</dt>
            <dd>{status.accounts ?? 0} {status.accounts === 1 ? "account" : "accounts"}{status.accountKinds?.length ? ` · ${status.accountKinds.join(", ")}` : ""}</dd>
            <dt className="text-wm-text-dim">Environment</dt>
            <dd>{status.environment === "SANDBOX" ? "Sandbox (tastytrade test system)" : "Live account — tastytrade has no paper mode; WM only reads from it"}</dd>
            <dt className="text-wm-text-dim">Last good check</dt><dd>{ago(status.validatedAt, now) || "—"}</dd>
            {status.lastCheckAt && status.lastCheckAt !== status.validatedAt ? (<><dt className="text-wm-text-dim">Last test</dt><dd>{ago(status.lastCheckAt, now)}</dd></>) : null}
          </dl>

          {status.connection === "AUTH_EXPIRED" ? (
            <p role="alert" className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 px-2 py-1.5 text-wm-text">
              tastytrade no longer accepts the saved grant — it was deleted, or the application changed. Create a new grant in tastytrade, then Disconnect here and connect again with the new refresh token.
            </p>
          ) : status.connection === "ERROR" ? (
            <p role="alert" className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 px-2 py-1.5 text-wm-text">
              tastytrade did not answer the last test. Your saved connection is unchanged — test again in a minute.
            </p>
          ) : null}

          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-wm-text-dim">What passed{status.lastCheckAt ? "" : " (at connect)"}</div>
            <ul className="space-y-1" data-testid="capability-checks">
              {(status.checks ?? []).map(c => (
                <li key={c.key} className="flex items-start justify-between gap-2">
                  <span>{CAPABILITY_LABEL[c.key]}</span>
                  <span className="text-right font-semibold" style={{ color: c.result === "PASS" ? "#34D399" : c.result === "NOT_CHECKED" ? "#9CA3AF" : "#FBBF24" }}>{checkWords(c)}</span>
                </li>
              ))}
              {!status.checks?.length ? (
                <li className="flex items-start justify-between gap-2">
                  <span>{CAPABILITY_LABEL.history}</span>
                  <span className="text-right font-semibold">{status.quotes ? "Passed" : "Not permitted"}</span>
                </li>
              ) : null}
              <li className="flex items-start justify-between gap-2">
                <span>Placing orders</span>
                <span className="text-right font-semibold text-wm-text-dim">Off — WM never places orders with this connection</span>
              </li>
            </ul>
            {status.level ? <p className="mt-1 text-[11px] text-wm-text-dim">Data level tastytrade reported: <b>{status.level}</b></p> : null}
          </div>
          <p className="text-[11px] text-wm-text-dim">Data freshness: these results are from the time shown above. Your chart&apos;s feed chip reads LIVE only while your own tastytrade stream is delivering.</p>

          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" disabled={Boolean(busy)} onClick={() => void retest()}
              className="flex min-h-11 items-center justify-center rounded-lg text-[12px] font-bold disabled:opacity-60"
              style={{ background: `${color}2a`, color, border: `1px solid ${color}55` }}>
              {busy === "test" ? <Loader2 size={13} className="animate-spin" /> : "Test connection"}
            </button>
            <button type="button" disabled={Boolean(busy)} onClick={() => void disconnect()}
              className="flex min-h-11 items-center justify-center rounded-lg border border-wm-border bg-wm-surface text-[12px] font-bold text-wm-text-muted hover:text-wm-text disabled:opacity-60">
              {busy === "disconnect" ? <Loader2 size={13} className="animate-spin" /> : "Disconnect"}
            </button>
          </div>
          <p className="text-[11px] text-wm-text-dim">To revoke it at the source too, delete the grant in tastytrade (Manage → My Profile → API → OAuth Applications).</p>
        </div>
      ) : status.state === "NOT_CONNECTED" || status.state === "GRANT_UNREADABLE" ? (
        <>
          {status.state === "GRANT_UNREADABLE" ? <p className="text-[12px] text-wm-text">{status.reason}</p> : null}
          {!showForm ? (
            <button type="button" onClick={() => setOpen(true)}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-bold"
              style={{ background: `linear-gradient(135deg,${color}33,${color}22)`, color, border: `1px solid ${color}50` }}>
              Connect your tastytrade
            </button>
          ) : (
            <form onSubmit={e => void connect(e)} noValidate className="space-y-2.5 rounded-xl border border-wm-border bg-wm-surface/60 px-3 py-3" autoComplete="off" data-testid="tastytrade-connect-form">
              <p className="text-[12px] font-semibold text-wm-text">Get your credential from tastytrade (about 3 minutes, easiest on a computer):</p>
              <ol className="list-decimal space-y-1 pl-4 text-[12px] leading-snug text-wm-text-muted">
                <li>Sign in at <a href="https://my.tastytrade.com/" target="_blank" rel="noopener noreferrer" className="underline">my.tastytrade.com</a> and open <b>Manage → My Profile → API → OAuth Applications</b>.</li>
                <li>Create a new personal application. Tick the <b>read</b> scope only — WM never trades with it. If tastytrade asks for a redirect URI, enter <span className="font-mono">https://wealthymindsetspro.com</span>.</li>
                <li>Copy the <b>client secret</b> it shows you (it is shown once).</li>
                <li>Open the application, press <b>Create Grant</b>, and copy the <b>refresh token</b>.</li>
                <li>Paste both below and press <b>Test connection</b>.</li>
              </ol>
              <label className="block text-[12px] font-bold text-wm-text-muted" htmlFor="tt-client-secret">Client secret</label>
              <input id="tt-client-secret" type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} onBlur={() => setTouched(true)}
                autoComplete="off" spellCheck={false} autoCapitalize="off" autoCorrect="off"
                aria-invalid={touched && Boolean(problems.clientSecret)} aria-describedby="tt-client-secret-err"
                className={`${FIELD} ${touched && problems.clientSecret ? "border-[#F87171]" : "border-wm-border"}`} />
              {touched && problems.clientSecret ? <p id="tt-client-secret-err" className="text-[11px] text-[#F87171]">{problems.clientSecret}</p> : null}
              <label className="block text-[12px] font-bold text-wm-text-muted" htmlFor="tt-refresh-token">Refresh token</label>
              <input id="tt-refresh-token" type="password" value={refreshToken} onChange={e => setRefreshToken(e.target.value)} onBlur={() => setTouched(true)}
                autoComplete="off" spellCheck={false} autoCapitalize="off" autoCorrect="off"
                aria-invalid={touched && Boolean(problems.refreshToken)} aria-describedby="tt-refresh-token-err"
                className={`${FIELD} ${touched && problems.refreshToken ? "border-[#F87171]" : "border-wm-border"}`} />
              {touched && problems.refreshToken ? <p id="tt-refresh-token-err" className="text-[11px] text-[#F87171]">{problems.refreshToken}</p> : null}
              {error ? <p role="alert" className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 px-2 py-1.5 text-[12px] text-wm-text">{error}</p> : null}
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" disabled={busy === "connect"} onClick={() => { setOpen(false); setClientSecret(""); setRefreshToken(""); setError(null); setTouched(false); }}
                  className="min-h-11 rounded-lg border border-wm-border bg-wm-surface text-[12px] font-semibold text-wm-text-muted">Cancel</button>
                <button type="submit" disabled={busy === "connect"}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-[12px] font-bold disabled:opacity-60"
                  style={{ background: `${color}33`, color, border: `1px solid ${color}55` }}>
                  {busy === "connect" ? <><Loader2 size={13} className="animate-spin" /> Testing…</> : "Test connection"}
                </button>
              </div>
              <p className="text-[11px] leading-snug text-wm-text-dim">WM checks these with tastytrade first and saves them only if tastytrade accepts them — encrypted on WM&apos;s server, never shown back, never put in a link, and deleted when you disconnect. Read-only: WM never places, changes or cancels orders with it.</p>
            </form>
          )}
        </>
      ) : null}
      {error && !showForm ? <p role="alert" className="text-[12px] text-wm-text">{error}</p> : null}
      <SignupDoor provider="tastytrade" name="tastytrade" color={color} />
    </div>
  );
}

/**
 * Webull: an honest status, no button that looks live. Webull lets another app
 * link its customers' accounts only through its Connect API, after Webull's
 * business team approves that app (developer.webull.com, read 2026-10-20) —
 * and the Connect API carries accounts, positions and orders, not market data.
 * WM holds no Connect API approval, so the state is "Waiting on Webull access".
 */
export const WEBULL_MEMBER_STATUS = "Waiting on Webull access" as const;

export function MemberWebullDoor({ color }: { color: string }) {
  return (
    <div className="space-y-2" data-testid="member-webull-door" onClick={e => e.stopPropagation()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-wm-text-dim">Your Webull</span>
        <span data-testid="webull-member-status" className="inline-flex items-center gap-1.5 rounded-full border border-wm-border px-2 py-0.5 text-[11px] font-bold text-wm-text-muted">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#9CA3AF]" />{WEBULL_MEMBER_STATUS}
        </span>
      </div>
      <p className="text-[12px] leading-snug text-wm-text-muted">
        Webull is coming. Webull only lets an app like WM link your Webull account through its Connect API, after Webull approves the app — WM is not approved yet, so there is nothing to connect here today. Webull&apos;s Connect API covers accounts, positions and orders, not market data.{" "}
        <a href={WEBULL_CONNECT_API_URL} target="_blank" rel="noopener noreferrer" className="underline">About Webull&apos;s Connect API</a>
      </p>
      <SignupDoor provider="webull" name="Webull" color={color} />
    </div>
  );
}
