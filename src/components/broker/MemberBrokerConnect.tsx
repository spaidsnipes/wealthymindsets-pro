"use client";

/**
 * A MEMBER'S OWN BROKER — Garden 19 §25 / docs/operations/MEMBER-BROKER-CONNECT.md.
 *
 * Members use their own supported broker accounts and their own entitlements.
 * The Founder's credentials are never involved. Everything this card says about
 * capability comes from /api/broker/member/tastytrade, which measured it at the
 * broker — never assumed. A referral door helps open an account; it creates no
 * data entitlement, and the copy says so.
 */
import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

import { forgetTastyFrontMonths } from "@/lib/broker/tastyFrontMonth";
import { reopenTastyStream } from "@/lib/broker/tastyQuoteStream";

export const MEMBER_TASTY_ENDPOINT = "/api/broker/member/tastytrade";

/** The sign-up door: the Founder's referral link when set, else the plain public page — labelled as nothing. */
export function brokerSignupDoor(provider: "tastytrade" | "webull"): { href: string; isReferral: boolean } {
  const referral = provider === "tastytrade"
    ? process.env.NEXT_PUBLIC_TASTYTRADE_REFERRAL_URL
    : process.env.NEXT_PUBLIC_WEBULL_REFERRAL_URL;
  const r = referral?.trim();
  if (r && /^https:\/\//.test(r)) return { href: r, isReferral: true };
  return { href: provider === "tastytrade" ? "https://open.tastytrade.com/" : "https://www.webull.com/signup", isReferral: false };
}

export const REFERRAL_IS_NOT_ENTITLEMENT =
  "Opening an account does not by itself give WM market data. What you see comes from your own account's data entitlements, read from the broker.";

type Status = {
  state: "MEMBER_CONNECTIONS_NOT_ENABLED" | "OWNER_USES_DEPLOYMENT" | "NOT_CONNECTED" | "GRANT_UNREADABLE" | "CONNECTED";
  connected: boolean;
  reason?: string;
  accounts?: number;
  quotes?: boolean;
  level?: string | null;
  validatedAt?: string;
};

function SignupDoor({ provider, name, color }: { provider: "tastytrade" | "webull"; name: string; color: string }) {
  const door = brokerSignupDoor(provider);
  return (
    <div className="space-y-1">
      <a
        href={door.href}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`${provider}-signup-door`}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-wm-border bg-wm-surface text-[11px] font-semibold text-wm-text-muted transition-all hover:text-wm-text"
        style={{ borderColor: `${color}40` }}
      >
        <ExternalLink size={10} /> Don&apos;t have an account? Open {name}
        {door.isReferral ? <span className="ml-1 text-[9px] uppercase tracking-wider text-wm-text-dim">(referral link)</span> : null}
      </a>
      <p className="px-0.5 text-[9px] leading-snug text-wm-text-dim">{REFERRAL_IS_NOT_ENTITLEMENT}</p>
    </div>
  );
}

export function MemberTastytradeConnect({ color }: { color: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(MEMBER_TASTY_ENDPOINT, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (live) setStatus(j ?? { state: "MEMBER_CONNECTIONS_NOT_ENABLED", connected: false }); })
      .catch(() => { if (live) setStatus({ state: "MEMBER_CONNECTIONS_NOT_ENABLED", connected: false }); });
    return () => { live = false; };
  }, []);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await fetch(MEMBER_TASTY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientSecret, refreshToken }),
        cache: "no-store",
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) { setError(j?.error ?? j?.reason ?? `Could not connect (HTTP ${r.status}).`); return; }
      setStatus(j); setOpen(false);
      // The open stream asks again and gets THIS member's token; futures
      // contracts the guest could not resolve are asked for again too.
      forgetTastyFrontMonths(); reopenTastyStream();
    } finally {
      // Secrets never linger in the page after a submit, success or not.
      setClientSecret(""); setRefreshToken(""); setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true); setError(null);
    try {
      const r = await fetch(MEMBER_TASTY_ENDPOINT, { method: "DELETE", cache: "no-store" });
      const j = await r.json().catch(() => null);
      if (!r.ok) { setError(j?.error ?? j?.reason ?? `Could not disconnect (HTTP ${r.status}).`); return; }
      setStatus(j); forgetTastyFrontMonths(); reopenTastyStream();
    } finally { setBusy(false); }
  }

  if (!status) return <div className="flex min-h-11 items-center gap-2 text-[10px] text-wm-text-dim"><Loader2 size={12} className="animate-spin" /> Checking your tastytrade connection…</div>;

  return (
    <div className="space-y-2" data-testid="member-tastytrade-connect" onClick={e => e.stopPropagation()}>
      {status.state === "MEMBER_CONNECTIONS_NOT_ENABLED" ? (
        <p className="text-[10px] leading-snug text-wm-text-dim">Connecting your own tastytrade isn&apos;t enabled on WM yet.</p>
      ) : status.state === "CONNECTED" ? (
        <div className="rounded-xl border border-wm-border bg-wm-surface/60 px-3 py-2.5 text-[10px] leading-relaxed text-wm-text-muted" data-testid="member-tastytrade-capability">
          <div className="text-[11px] font-black" style={{ color }}>Your tastytrade is connected (read-only)</div>
          <div>Accounts tastytrade returned: {status.accounts ?? 0}</div>
          <div>
            Streaming market data: {status.quotes
              ? <>tastytrade issued a quote token{status.level ? <> — level <b>{status.level}</b> (as tastytrade reported it)</> : null}</>
              : <>tastytrade did not issue a quote token for your account — charts keep the public feeds</>}
          </div>
          {status.validatedAt ? <div className="text-wm-text-dim">Checked with tastytrade {new Date(status.validatedAt).toLocaleString()}</div> : null}
          <p className="mt-1 text-wm-text-dim">WM uses this for market data under your own entitlement — the feed chip reads LIVE only while your own stream is delivering. WM never places, changes or cancels orders with it.</p>
          <button type="button" disabled={busy} onClick={() => void disconnect()}
            className="mt-2 flex min-h-11 w-full items-center justify-center rounded-lg border border-wm-border bg-wm-surface text-[11px] font-bold text-wm-text-muted hover:text-wm-text disabled:opacity-60">
            {busy ? <Loader2 size={12} className="animate-spin" /> : "Disconnect"}
          </button>
          <p className="mt-1 text-[9px] text-wm-text-dim">To revoke it at the source too, delete the grant in tastytrade (Manage → My Profile → API → OAuth Applications).</p>
        </div>
      ) : (
        <>
          {status.state === "GRANT_UNREADABLE" ? <p className="text-[10px] text-wm-text-dim">{status.reason}</p> : null}
          {!open ? (
            <button type="button" onClick={() => setOpen(true)}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-bold"
              style={{ background: `linear-gradient(135deg,${color}33,${color}22)`, color, border: `1px solid ${color}50` }}>
              Connect your own tastytrade
            </button>
          ) : (
            <form onSubmit={e => void connect(e)} className="space-y-2 rounded-xl border border-wm-border bg-wm-surface/60 px-3 py-2.5" autoComplete="off">
              <ol className="list-decimal space-y-0.5 pl-4 text-[10px] leading-snug text-wm-text-muted">
                <li>Sign in at my.tastytrade.com → Manage → My Profile → API → OAuth Applications.</li>
                <li>Create a personal application. Tick the <b>read</b> scope only (WM never trades with it).</li>
                <li>Copy the client secret it shows you.</li>
                <li>Open the application → Create Grant, and copy the refresh token.</li>
                <li>Paste both here. WM checks them with tastytrade before saving them encrypted.</li>
              </ol>
              <label className="block text-[10px] font-bold text-wm-text-muted">Client secret
                <input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} autoComplete="off" spellCheck={false}
                  className="mt-1 min-h-11 w-full rounded-lg border border-wm-border bg-wm-card px-2 text-[16px] text-wm-text" />
              </label>
              <label className="block text-[10px] font-bold text-wm-text-muted">Refresh token
                <input type="password" value={refreshToken} onChange={e => setRefreshToken(e.target.value)} autoComplete="off" spellCheck={false}
                  className="mt-1 min-h-11 w-full rounded-lg border border-wm-border bg-wm-card px-2 text-[16px] text-wm-text" />
              </label>
              {error ? <p role="alert" className="text-[10px] text-wm-text">{error}</p> : null}
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => { setOpen(false); setClientSecret(""); setRefreshToken(""); setError(null); }}
                  className="min-h-11 rounded-lg border border-wm-border bg-wm-surface text-[11px] font-semibold text-wm-text-muted">Cancel</button>
                <button type="submit" disabled={busy || !clientSecret || !refreshToken}
                  className="flex min-h-11 items-center justify-center rounded-lg text-[11px] font-bold disabled:opacity-60"
                  style={{ background: `${color}33`, color, border: `1px solid ${color}55` }}>
                  {busy ? <Loader2 size={12} className="animate-spin" /> : "Check & connect"}
                </button>
              </div>
              <p className="text-[9px] leading-snug text-wm-text-dim">Beta. Your credentials are stored encrypted, used only for your own market data, never shown back, and deleted when you disconnect.</p>
            </form>
          )}
          {error && !open ? <p role="alert" className="text-[10px] text-wm-text">{error}</p> : null}
        </>
      )}
      <SignupDoor provider="tastytrade" name="tastytrade" color={color} />
    </div>
  );
}

/** Webull: per-member connections are not built (single-tenant adapter). An honest door only. */
export function MemberWebullDoor({ color }: { color: string }) {
  return (
    <div className="space-y-2" data-testid="member-webull-door" onClick={e => e.stopPropagation()}>
      <p className="text-[10px] leading-snug text-wm-text-dim">Connecting your own Webull to WM isn&apos;t available yet.</p>
      <SignupDoor provider="webull" name="Webull" color={color} />
    </div>
  );
}
