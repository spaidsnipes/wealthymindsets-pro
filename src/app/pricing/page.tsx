"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { buyButtonState } from "@/lib/billing/buyButtonState";
import type { BillingTier, PaidTier } from "@/lib/billing/tiers";
import { FEEDLESS_SURFACE } from "@/lib/os/osChrome";
import { usePublishOsStanding } from "@/components/os/osStandingContext";
import { passportPromo, passportPromoLine } from "@/lib/pricing/passportPromo";
import { SellingStory } from "@/components/marketing/SellingStory";
import { PRODUCT_LINE } from "@/lib/marketing/sellingStory";

// Founder 2026-10-06: Passport first month half off until the promotion ends.
const PASSPORT_PROMO = passportPromoLine(passportPromo(process.env.NEXT_PUBLIC_PASSPORT_PROMO_ENDS));

/**
 * PRICING — the Founder's prices (Garden 18 ATHOS order §9, 2026-10-05).
 *
 * Free / $10 / $20 / $50 per month. Each paid tier INCLUDES the one below it —
 * one charge, never stacked. A button that cannot take payment must not look
 * like it can: a paid tier's button is live ONLY when the server says that
 * tier is on sale (GET /api/billing/tiers — a price id is configured and
 * billing is in TEST or LIVE). Until then it reads "Not on sale yet", exactly
 * as before (Supermax §11, 2026-10-09; buyButtonState decides, the server sells).
 * A paid tier never removes risk state, open-order management, protection or
 * export. Public: readable signed out (authRoutes PUBLIC_INFO_PATHS).
 */
const GOLD = "#c9a55c", INK = "#ede6d3", MUTED = "#a89c80", LINE = "rgba(201,165,92,0.28)", FIELD = "#0e0d0b";
// Thumb targets (phone audit 2026-10-06: the footer's inline links were 15 px tall at 375 px).
const TAP = { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, minWidth: 44, padding: "0 4px", color: GOLD } as const;

type Tier = { id?: PaidTier; name: string; price: string; tagline: string; includes: string[]; limits: string[]; cta: { label: string; href?: string }; offer?: string | null };

const TIERS: Tier[] = [
  {
    name: "Free · Guest", price: "$0", tagline: "Look around before you commit to anything.",
    includes: ["Guest tour and education preview", "Sample data, labelled as simulated", "Public features and a limited safe workspace"],
    limits: ["No personal account data", "No live execution"],
    cta: { label: "Create a free account", href: "/login?mode=signup" },
  },
  {
    id: "APP", name: "WM Pro App", price: "$10", tagline: "The chart and workspace, on your own account.",
    includes: ["WM Pro app access", "Core chart and workspace", "Your saved views and journal on this account"],
    limits: ["Market-data source and any exchange charges are shown per market", "Capability limits are stated, not hidden"],
    cta: { label: "Not on sale yet" },
  },
  {
    id: "PASSPORT", name: "Passport", price: "$20", tagline: "One identity across the participating ATH apps.",
    includes: ["Everything in WM Pro App — one $20 charge, not $20 + $10", "Passport identity and member rooms", "Access to the participating ATH operating systems named at checkout"],
    limits: ["Only the apps named at checkout — not every future app"],
    cta: { label: "Not on sale yet" },
    offer: PASSPORT_PROMO,
  },
  {
    id: "OS", name: "WM Pro OS", price: "$50", tagline: "The full operating system.",
    includes: ["Everything in Passport — one $50 charge, not $50 + $20 + $10", "The supported invention, tool and profile suite", "Decision → Journal → Review learning loop", "Supported broker connections", "SpaidBot analysis with a stated monthly allowance"],
    limits: ["Not unlimited AI", "Exchange data and broker capabilities depend on your broker and markets", "No autonomous trading — every order is yours to confirm"],
    cta: { label: "Not on sale yet" },
  },
];

export default function PricingPage() {
  // Inside the OS shell for members: this page reads no market feed.
  usePublishOsStanding({ surface: "Pricing", feed: FEEDLESS_SURFACE });
  // WHAT IS ON SALE is the server's to say. The public read carries booleans and one word; the member's own
  // standing (their tier) is read only when signed in. Until both are known every paid button stays "Not on sale yet".
  const { user } = useAuth();
  const [sale, setSale] = useState<{ mode: "NOT_CONFIGURED" | "TEST" | "LIVE"; tiers: Record<string, boolean> } | null>(null);
  const [memberTier, setMemberTier] = useState<BillingTier | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/billing/tiers", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (live && j && typeof j.mode === "string" && j.tiers && typeof j.tiers === "object") setSale({ mode: j.mode, tiers: j.tiers }); })
      .catch(() => { /* stays "Not on sale yet" */ });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!user) { setMemberTier(null); return; }
    let live = true;
    fetch("/api/billing/standing", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (live) setMemberTier(j && typeof j.tier === "string" ? (j.tier as BillingTier) : null); })
      .catch(() => { if (live) setMemberTier(null); });
    return () => { live = false; };
  }, [user]);
  const anyOnSale = !!sale && sale.mode !== "NOT_CONFIGURED" && Object.values(sale.tiers).some(Boolean);
  /** Start Stripe Checkout (the body names the tier and nothing else) or open Manage billing; the server answers with the URL. */
  const go = async (path: "checkout" | "portal", tier?: PaidTier) => {
    if (busy) return;
    setBusy(tier ?? path); setSaid(null);
    try {
      // Two named doors, written out (never a built path: the webhook is not this page's to call).
      const r = await fetch(path === "checkout" ? "/api/billing/checkout" : "/api/billing/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tier ? { tier } : {}) });
      const j = (await r.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (r.ok && j && typeof j.url === "string" && j.url.startsWith("https://")) { window.location.assign(j.url); return; }
      setSaid(j?.error ?? "That could not be started just now. Nothing was charged.");
    } catch {
      setSaid("That could not be started just now. Nothing was charged.");
    }
    setBusy(null);
  };
  return (
    <div style={{ minHeight: "100vh", background: "#050506", color: INK, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", padding: "40px 16px 64px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div data-testid="product-line" style={{ fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: "0.28em", fontSize: 12, color: GOLD, lineHeight: 1.6 }}>{PRODUCT_LINE}</div>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: 34, margin: "14px 0 8px" }}>Pricing</h1>
        <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.6, maxWidth: 720, margin: 0 }}>
          Monthly, in US dollars. Each tier includes everything in the one before it — you are charged once, for one tier.
          Whatever your tier, your open positions, protection, working orders and export stay reachable.
        </p>
        {anyOnSale ? (
          <p role="status" data-testid="billing-status" data-mode={sale!.mode} style={{ marginTop: 14, border: `1px solid ${LINE}`, borderRadius: 8, padding: "10px 14px", color: GOLD, fontSize: 13, maxWidth: 720 }}>
            {sale!.mode === "TEST" ? "Billing is in TEST mode: checkout works with a test card and no real charge is made." : "Checkout is by Stripe. Plans renew monthly until you cancel from Manage billing."}
          </p>
        ) : (
          <p role="status" data-testid="billing-status" data-mode="NOT_ON_SALE" style={{ marginTop: 14, border: `1px solid ${LINE}`, borderRadius: 8, padding: "10px 14px", color: GOLD, fontSize: 13, maxWidth: 720 }}>
            Paid plans are not on sale yet. Billing is being connected; until it is, no card can be charged here and no paid badge grants access.
          </p>
        )}
        {said ? <p role="alert" data-testid="billing-said" style={{ marginTop: 10, color: INK, fontSize: 13, maxWidth: 720 }}>{said}</p> : null}

        {/* §57 SELLING PASS — what the tiers buy into, said once, above them. */}
        <div style={{ marginTop: 28, border: `1px solid ${LINE}`, borderRadius: 12, padding: "18px 18px 16px", background: FIELD }}>
          <SellingStory variant="compact" withProductLine={false} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: 28 }}>
          {TIERS.map((t) => (
            <section key={t.name} aria-label={`${t.name} ${t.price} per month`} style={{ background: FIELD, border: `1px solid ${LINE}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{t.name}</h2>
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 32, color: GOLD }}>{t.price}</span>
                  <span style={{ color: MUTED, fontSize: 13 }}> / month</span>
                </div>
                <p style={{ color: MUTED, fontSize: 13, margin: "6px 0 0" }}>{t.tagline}</p>
                {t.offer ? (
                  <p data-testid="passport-intro-offer" style={{ margin: "10px 0 0", padding: "8px 10px", borderRadius: 8, border: `1px solid ${GOLD}`, background: "rgba(201,165,92,0.10)", color: INK, fontSize: 13, lineHeight: 1.5 }}>{t.offer}</p>
                ) : null}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
                {t.includes.map((x) => <li key={x}>{x}</li>)}
              </ul>
              <ul aria-label="Limits" style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: MUTED }}>
                {t.limits.map((x) => <li key={x}>{x}</li>)}
              </ul>
              <div style={{ marginTop: "auto" }}>
                {t.id && buyButtonState({ tier: t.id, onSale: sale?.tiers ?? null, mode: sale?.mode ?? null, signedIn: user ? true : false, memberTier }).kind !== "NOT_ON_SALE" ? (() => {
                  const b = buyButtonState({ tier: t.id!, onSale: sale?.tiers ?? null, mode: sale?.mode ?? null, signedIn: user ? true : false, memberTier });
                  const live = { display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 18px", borderRadius: 8, border: `1px solid ${GOLD}`, background: "rgba(201,165,92,0.12)", color: "#e8b923", fontWeight: 700, textDecoration: "none", cursor: "pointer", fontSize: 14 } as const;
                  return (
                    <div data-testid="tier-buy" data-tier={t.id} data-kind={b.kind}>
                      {b.kind === "SIGN_IN" ? (
                        <Link href="/login?next=/pricing" style={live}>{b.label}</Link>
                      ) : (
                        <button type="button" disabled={busy !== null} onClick={() => { void go(b.kind === "BUY" ? "checkout" : "portal", b.kind === "BUY" ? t.id : undefined); }} style={{ ...live, opacity: busy !== null ? 0.6 : 1 }}>
                          {busy === t.id ? "Opening Stripe…" : b.label}
                        </button>
                      )}
                      {b.note ? <p style={{ margin: "6px 0 0", color: MUTED, fontSize: 12 }}>{b.note}</p> : null}
                      {/* Beside the button: what the buyer should read first. */}
                      <p style={{ margin: "6px 0 0", fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                        Before you buy, read the <Link href="/legal" style={{ color: GOLD }}>Terms &amp; Privacy</Link> and the <Link href="/legal/risk" style={{ color: GOLD }}>trading risk disclosure</Link>. Not investment advice.
                      </p>
                    </div>
                  );
                })() : t.cta.href ? (
                  <Link href={t.cta.href} style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 18px", borderRadius: 8, border: `1px solid ${GOLD}`, background: "rgba(201,165,92,0.12)", color: "#e8b923", fontWeight: 700, textDecoration: "none" }}>{t.cta.label}</Link>
                ) : (
                  <span aria-disabled="true" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", color: MUTED, fontWeight: 600 }}>{t.cta.label}</span>
                )}
              </div>
            </section>
          ))}
        </div>

        <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.6, marginTop: 28, marginBottom: 4, maxWidth: 820 }}>
          WM Pro is analysis and trading software, not investment advice. Read the risk and market-data disclosures before you trade.
        </p>
        <nav aria-label="Policies" style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12 }}>
          <Link href="/legal/risk" style={TAP}>Risk disclosure</Link>
          <Link href="/legal/market-data" style={TAP}>Market-data disclosure</Link>
          <Link href="/legal" style={TAP}>All policies</Link>
          <Link href="/login" style={TAP}>Sign in</Link>
        </nav>
      </div>
    </div>
  );
}
