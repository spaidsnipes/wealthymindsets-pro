import Link from "next/link";
import type { ReactNode } from "react";

/**
 * One shell for WM Pro's public policy pages (Garden 18 ATHOS order P0.4).
 * Every page states its version date; acceptance records name that version.
 */
const GOLD = "#c9a55c", INK = "#ede6d3", MUTED = "#a89c80";

export function LegalPage({ title, version, children }: { title: string; version: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#050506", color: INK, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", padding: "40px 16px 64px" }}>
      <article style={{ maxWidth: 760, margin: "0 auto", fontSize: 15, lineHeight: 1.7 }}>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: "0.32em", fontSize: 12, color: GOLD }}>WEALTHYMINDSETS PRO</div>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: 30, margin: "14px 0 4px" }}>{title}</h1>
        <p style={{ color: MUTED, fontSize: 13, margin: "0 0 24px" }}>Version {version}</p>
        {children}
        <nav aria-label="Policies" style={{ marginTop: 36, paddingTop: 16, borderTop: "1px solid rgba(201,165,92,0.25)", fontSize: 13, color: MUTED, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link href="/legal" style={{ color: GOLD }}>All policies</Link>
          <Link href="/legal/risk" style={{ color: GOLD }}>Risk disclosure</Link>
          <Link href="/legal/market-data" style={{ color: GOLD }}>Market-data disclosure</Link>
          <Link href="/pricing" style={{ color: GOLD }}>Pricing</Link>
          <Link href="/login" style={{ color: GOLD }}>Sign in</Link>
        </nav>
      </article>
    </div>
  );
}

export const legalH2 = { fontSize: 18, fontWeight: 700, margin: "28px 0 8px" } as const;
