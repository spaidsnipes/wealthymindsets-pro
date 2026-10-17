"use client";

import Link from "next/link";
import { TERMS_PRIVACY_VERSION } from "@/lib/legal/legalVersion";
import { LEGAL_CONTACT, LEGAL_GOVERNING_STATE, LEGAL_OPERATOR } from "@/lib/legal/legalParty";
import { LegalPage, legalH2 } from "@/components/legal/LegalPage";
import { FEEDLESS_SURFACE } from "@/lib/os/osChrome";
import { usePublishOsStanding } from "@/components/os/osStandingContext";

const A = { display: "inline-flex", alignItems: "center", minHeight: 44, color: "#c9a55c" } as const;

/** WM Pro Terms of Service — plain language, written from what the product does (2026-10-17). */
export default function TermsOfService() {
  usePublishOsStanding({ surface: "Terms of Service", feed: FEEDLESS_SURFACE });
  return (
    <LegalPage title="Terms of Service" version={TERMS_PRIVACY_VERSION ?? "draft"}>
      <p>WealthyMindsets Pro (&ldquo;WM Pro&rdquo;) is operated by {LEGAL_OPERATOR}. By creating an account or buying a plan you agree to these terms, the <Link href="/legal/privacy" style={A}>Privacy Policy</Link>, the <Link href="/legal/risk" style={A}>Risk disclosure</Link> and the <Link href="/legal/market-data" style={A}>Market-data disclosure</Link>.</p>

      <h2 style={legalH2}>Your account</h2>
      <p>You must be at least 18 and able to agree to these terms where you live. One Passport signs you in to WM Pro and the other ATH rooms. Keep your password to yourself; you are responsible for what happens under your account.</p>

      <h2 style={legalH2}>Not investment advice</h2>
      <p>WM Pro is chart, analysis, journaling and education software. Nothing in it — readings, scores, WAIT / READY states, SpaidBot answers, lessons or community posts — is investment, tax or legal advice, or a recommendation to buy or sell anything. You decide every trade and you carry its result. Trading can lose more than you put in.</p>

      <h2 style={legalH2}>Orders and brokers</h2>
      <p>WM Pro never places an order on its own. An order reaches your broker only after you connect your own broker, arm live trading, set your limits and confirm the order yourself. Your broker executes, holds and reports your positions under its own agreement with you.</p>

      <h2 style={legalH2}>Plans and billing</h2>
      <ul>
        <li>Plans are billed monthly in advance through Stripe and renew each month until you cancel. The price is shown before you pay.</li>
        <li><strong>Cancel any time</strong> from Manage billing on the Pricing page. Cancelling stops the next renewal; your plan runs to the end of the month you already paid for.</li>
        <li><strong>No refunds</strong>, except where the law requires one.</li>
        <li>Market data that an exchange charges for, and anything your broker charges, are separate from your plan.</li>
        <li>We may change a plan&apos;s price for future months; you will see the new price before it applies, and you can cancel before it does.</li>
      </ul>

      <h2 style={legalH2}>Using WM Pro fairly</h2>
      <p>No scraping, reselling or redistributing market data shown in WM Pro, no attempts to break, overload or get around its limits, and no harassment, spam or impersonation in community rooms. We may suspend an account that breaks these rules.</p>

      <h2 style={legalH2}>No guarantees</h2>
      <p>WM Pro is provided as is. Data can be late, incomplete or wrong, and the service can be unavailable. To the extent the law allows, {LEGAL_OPERATOR} is not liable for trading losses or indirect losses, and total liability is limited to what you paid WM Pro in the last 12 months.</p>

      <h2 style={legalH2}>Law and contact</h2>
      <p>These terms are governed by the laws of the State of {LEGAL_GOVERNING_STATE}, and disputes are brought in the courts located there. This does not remove any consumer right your own state or country says cannot be waived. Questions and notices: <a href={`mailto:${LEGAL_CONTACT}`} style={A}>{LEGAL_CONTACT}</a>.</p>
    </LegalPage>
  );
}
