"use client";

import Link from "next/link";
import { FEEDLESS_SURFACE } from "@/lib/os/osChrome";
import { usePublishOsStanding } from "@/components/os/osStandingContext";

/**
 * PRICING — the Founder's prices (Garden 18 ATHOS order §9, 2026-10-05).
 *
 * Free / $10 / $20 / $50 per month. Each paid tier INCLUDES the one below it —
 * one charge, never stacked. Billing is not connected to WM Pro yet (the only
 * Stripe owner is WOW World OS, selling WOW Connect), so no paid tier offers a
 * checkout here: a button that cannot take payment must not look like it can.
 * A paid tier never removes risk state, open-order management, protection or
 * export. Public: readable signed out (authRoutes PUBLIC_INFO_PATHS).
 */
const GOLD = "#c9a55c", INK = "#ede6d3", MUTED = "#a89c80", LINE = "rgba(201,165,92,0.28)", FIELD = "#0e0d0b";
// Thumb targets (phone audit 2026-10-06: the footer's inline links were 15 px tall at 375 px).
const TAP = { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, minWidth: 44, padding: "0 4px", color: GOLD } as const;

type Tier = { name: string; price: string; tagline: string; includes: string[]; limits: string[]; cta: { label: string; href?: string } };

const TIERS: Tier[] = [
  {
    name: "Free · Guest", price: "$0", tagline: "Look around before you commit to anything.",
    includes: ["Guest tour and education preview", "Sample data, labelled as simulated", "Public features and a limited safe workspace"],
    limits: ["No personal account data", "No live execution"],
    cta: { label: "Create a free account", href: "/login?mode=signup" },
  },
  {
    name: "WM Pro App", price: "$10", tagline: "The chart and workspace, on your own account.",
    includes: ["WM Pro app access", "Core chart and workspace", "Your saved views and journal on this account"],
    limits: ["Market-data source and any exchange charges are shown per market", "Capability limits are stated, not hidden"],
    cta: { label: "Not on sale yet" },
  },
  {
    name: "Passport", price: "$20", tagline: "One identity across the participating ATH apps.",
    includes: ["Everything in WM Pro App — one $20 charge, not $20 + $10", "Passport identity and member rooms", "Access to the participating ATH operating systems named at checkout"],
    limits: ["Only the apps named at checkout — not every future app"],
    cta: { label: "Not on sale yet" },
  },
  {
    name: "WM Pro OS", price: "$50", tagline: "The full operating system.",
    includes: ["Everything in Passport — one $50 charge, not $50 + $20 + $10", "The supported invention, tool and profile suite", "Decision → Journal → Review learning loop", "Supported broker connections", "SpaidBot analysis with a stated monthly allowance"],
    limits: ["Not unlimited AI", "Exchange data and broker capabilities depend on your broker and markets", "No autonomous trading — every order is yours to confirm"],
    cta: { label: "Not on sale yet" },
  },
];

export default function PricingPage() {
  // Inside the OS shell for members: this page reads no market feed.
  usePublishOsStanding({ surface: "Pricing", feed: FEEDLESS_SURFACE });
  return (
    <div style={{ minHeight: "100vh", background: "#050506", color: INK, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", padding: "40px 16px 64px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: "0.32em", fontSize: 12, color: GOLD }}>WEALTHYMINDSETS PRO</div>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: 34, margin: "14px 0 8px" }}>Pricing</h1>
        <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.6, maxWidth: 720, margin: 0 }}>
          Monthly, in US dollars. Each tier includes everything in the one before it — you are charged once, for one tier.
          Whatever your tier, your open positions, protection, working orders and export stay reachable.
        </p>
        <p role="status" style={{ marginTop: 14, border: `1px solid ${LINE}`, borderRadius: 8, padding: "10px 14px", color: GOLD, fontSize: 13, maxWidth: 720 }}>
          Paid plans are not on sale yet. Billing is being connected; until it is, no card can be charged here and no paid badge grants access.
        </p>

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
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
                {t.includes.map((x) => <li key={x}>{x}</li>)}
              </ul>
              <ul aria-label="Limits" style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: MUTED }}>
                {t.limits.map((x) => <li key={x}>{x}</li>)}
              </ul>
              <div style={{ marginTop: "auto" }}>
                {t.cta.href ? (
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
