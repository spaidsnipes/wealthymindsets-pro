"use client";

import Link from "next/link";

import { LegalPage, legalH2 } from "@/components/legal/LegalPage";
import { FEEDLESS_SURFACE } from "@/lib/os/osChrome";
import { usePublishOsStanding } from "@/components/os/osStandingContext";

/** The policy index — what is published, and what is not yet (ATHOS order P0.4). */
export default function LegalIndex() {
  // Inside the OS shell for members: this page reads no market feed.
  usePublishOsStanding({ surface: "Policies", feed: FEEDLESS_SURFACE });
  return (
    <LegalPage title="Policies" version="2026-10-05">
      <h2 style={legalH2}>Published</h2>
      <ul>
        <li><Link href="/legal/risk" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, color: "#c9a55c" }}>Risk disclosure</Link> — trading risk, what WM Pro is and is not, and how orders work.</li>
        <li><Link href="/legal/market-data" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, color: "#c9a55c" }}>Market-data disclosure</Link> — where prices come from, how fresh they are, and what you may not do with them.</li>
      </ul>
      <h2 style={legalH2}>Not yet published</h2>
      <p>
        The <strong>Terms of Service</strong> and <strong>Privacy Policy</strong> are being finalised and are <strong>not in effect yet</strong>.
        Paid plans are not on sale until they are. When they are published, this page will link them with their version date, and your
        account will record which version you accepted.
      </p>
    </LegalPage>
  );
}
