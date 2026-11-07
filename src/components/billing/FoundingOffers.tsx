"use client";

import Link from "next/link";
import { useState } from "react";

import { FOUNDING_COPY } from "@/lib/billing/founding";
import { loadPaperState } from "@/lib/paperTrade";

/**
 * FOUNDING 500 / FOUNDING 100 on /pricing (Founder offer 2026-11-06). Rendered by the pricing page ONLY when
 * the server's GET /api/billing/tiers carries `founding` — which it does only while WM_FOUNDING_LIVE=on.
 * The words are FOUNDING_COPY and nothing else: no counts, no "left", no countdown, no scarcity.
 * The buttons start the server's flows; the server decides everything (seat, price, first save).
 */
const GOLD = "#c9a55c", INK = "#ede6d3", MUTED = "#a89c80";
const BUTTON = { display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 18px", borderRadius: 8, border: `1px solid ${GOLD}`, background: "rgba(201,165,92,0.12)", color: "#e8b923", fontWeight: 700, textDecoration: "none", cursor: "pointer", fontSize: 14 } as const;

/** Decision ids this browser's paper book carries — only PROPOSED; the server checks each against the account. */
function proposedDecisionIds(): string[] {
  try {
    const s = loadPaperState();
    const ids = [...s.trades, ...s.orders].map(x => x.decisionId).filter((x): x is NonNullable<typeof x> => typeof x === "string");
    return [...new Set(ids)].slice(-10);
  } catch {
    return [];
  }
}

export interface FoundingOffer { readonly paid500: boolean; readonly promotional100: boolean }

/** The `founding` field of GET /api/billing/tiers, read fail-closed: anything else → null (nothing renders). */
export function readFoundingOffer(raw: unknown): FoundingOffer | null {
  const f = raw as Record<string, unknown> | null;
  return f && typeof f === "object" && typeof f.paid500 === "boolean" && typeof f.promotional100 === "boolean" ? { paid500: f.paid500, promotional100: f.promotional100 } : null;
}

export function FoundingOffers({ offer, signedIn }: { offer: FoundingOffer; signedIn: boolean }) {
  const [busy, setBusy] = useState<"500" | "100" | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  if (!offer.paid500 && !offer.promotional100) return null;

  const start = async (which: "500" | "100") => {
    if (busy) return;
    setBusy(which); setSaid(null);
    try {
      const r = which === "500"
        ? await fetch("/api/billing/founding/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
        : await fetch("/api/billing/founding/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decisionIds: proposedDecisionIds() }) });
      const j = (await r.json().catch(() => null)) as { url?: string; error?: string; reason?: string; expiresAt?: string } | null;
      if (which === "500" && r.ok && j && typeof j.url === "string" && j.url.startsWith("https://")) { window.location.assign(j.url); return; }
      if (which === "100" && r.ok && j?.reason === "ACTIVATED") {
        setSaid(`FOUNDING 100 is on: WM Pro Premium until ${j.expiresAt ? new Date(j.expiresAt).toLocaleDateString() : "30 days from today"}. No card, nothing will be charged.`);
      } else {
        setSaid(j?.error ?? "That could not be started just now. Nothing was charged.");
      }
    } catch {
      setSaid("That could not be started just now. Nothing was charged.");
    }
    setBusy(null);
  };

  return (
    <section data-testid="founding-offers" aria-label="FOUNDING" style={{ marginTop: 20, padding: "16px 18px", borderRadius: 12, border: `1px solid ${GOLD}`, background: "rgba(201,165,92,0.08)", maxWidth: 820, color: INK }}>
      {offer.paid500 ? (
        <div data-testid="founding-500" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}><strong>{FOUNDING_COPY.paid500}</strong></p>
          {signedIn ? (
            <button type="button" disabled={busy !== null} onClick={() => { void start("500"); }} style={{ ...BUTTON, opacity: busy !== null ? 0.6 : 1 }}>{busy === "500" ? "Opening Stripe…" : "Join FOUNDING 500"}</button>
          ) : (
            <Link href="/login?next=/pricing" style={BUTTON}>Sign in to join</Link>
          )}
        </div>
      ) : null}
      {offer.promotional100 ? (
        <div data-testid="founding-100" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, justifyContent: "space-between", marginTop: offer.paid500 ? 12 : 0 }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}><strong>{FOUNDING_COPY.promo100}</strong></p>
          {signedIn ? (
            <button type="button" disabled={busy !== null} onClick={() => { void start("100"); }} style={{ ...BUTTON, opacity: busy !== null ? 0.6 : 1 }}>{busy === "100" ? "Checking…" : "Claim FOUNDING 100"}</button>
          ) : (
            <Link href="/login?next=/pricing" style={BUTTON}>Sign in to claim</Link>
          )}
        </div>
      ) : null}
      {said ? <p role="status" data-testid="founding-said" style={{ margin: "10px 0 0", fontSize: 13, color: MUTED }}>{said}</p> : null}
      <p style={{ margin: "10px 0 0", fontSize: 12, lineHeight: 1.6, color: MUTED }}>
        Read the <Link href="/legal/terms" style={{ color: GOLD }}>Terms</Link> and the <Link href="/legal/risk" style={{ color: GOLD }}>trading risk disclosure</Link> first. Not investment advice.
      </p>
    </section>
  );
}
