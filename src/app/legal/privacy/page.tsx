"use client";

import { TERMS_PRIVACY_VERSION } from "@/lib/legal/legalVersion";
import { LEGAL_CONTACT, LEGAL_OPERATOR } from "@/lib/legal/legalParty";
import { LegalPage, legalH2 } from "@/components/legal/LegalPage";
import { FEEDLESS_SURFACE } from "@/lib/os/osChrome";
import { usePublishOsStanding } from "@/components/os/osStandingContext";

const A = { display: "inline-flex", alignItems: "center", minHeight: 44, color: "#c9a55c" } as const;

/** WM Pro Privacy Policy — what this build actually keeps (2026-10-17). */
export default function PrivacyPolicy() {
  usePublishOsStanding({ surface: "Privacy Policy", feed: FEEDLESS_SURFACE });
  return (
    <LegalPage title="Privacy Policy" version={TERMS_PRIVACY_VERSION ?? "draft"}>
      <p>WM Pro is operated by {LEGAL_OPERATOR}. This is what WM Pro keeps about you, why, and what you can do about it.</p>

      <h2 style={legalH2}>What WM Pro keeps</h2>
      <ul>
        <li><strong>Your Passport.</strong> Your email, name and password are held by the Passport issuer (Supabase), shared with WOW World and Dreamboard. WM Pro never stores your password.</li>
        <li><strong>What you create.</strong> Journal entries, saved views, drawings, alerts and rules you save to your account.</li>
        <li><strong>Your plan.</strong> Your plan, its status and the Stripe customer and subscription ids. Card details go to Stripe only.</li>
        <li><strong>Broker connections you make.</strong> The access your broker grants, used only to read your accounts and send orders you confirm. You can disconnect at any time.</li>
        <li><strong>This device&apos;s settings.</strong> Chart layout and display choices are kept in your browser.</li>
      </ul>

      <h2 style={legalH2}>What WM Pro does not do</h2>
      <p>No advertising trackers. No selling or renting your data. WM Pro does not trade for you or share your positions with anyone.</p>

      <h2 style={legalH2}>Who else processes it</h2>
      <p>Supabase (sign-in), Stripe (payments), Cloudflare (hosting), your broker (when you connect one) and Google (questions you ask SpaidBot are answered by a Google AI model). Each processes only what it needs to run WM Pro.</p>

      <h2 style={legalH2}>Your choices</h2>
      <p>Export your journal from the Journal room at any time. To delete your account and WM Pro records, write to <a href={`mailto:${LEGAL_CONTACT}`} style={A}>{LEGAL_CONTACT}</a>; deletion is completed within 30 days. Payment records Stripe must keep by law stay with Stripe.</p>
    </LegalPage>
  );
}
