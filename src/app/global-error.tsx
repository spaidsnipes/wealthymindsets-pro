"use client";

import { useEffect } from "react";

import { recoverFromVersionSkew } from "@/lib/deployVersionRecovery";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

/**
 * The last door (2026-10-04). Until now a crash in the root layout showed a
 * guest Next's bare default page. This replaces the root layout while active,
 * so it carries its own <html>/<body> and inline styles — globals.css is not
 * loaded here. Plain words, the way back, and no raw error text: the digest is
 * what an operator needs, and it is all a trader is shown.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    let storage: Storage | null = null;
    try { storage = window.sessionStorage; } catch { storage = null; }
    void recoverFromVersionSkew(error, { fetchImpl: fetch, storage, reload: () => window.location.reload() });
  }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", background: "#050506", color: "#ede6d3", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", display: "grid", placeItems: "center" }}>
        <main style={{ maxWidth: 420, padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: "0.32em", fontSize: 12, color: "#c9a55c" }}>WEALTHYMINDSETS</div>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: 28, margin: "18px 0 10px" }}>The room didn’t open.</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#a89c80", margin: 0 }}>
            Something on our side failed while loading. Nothing you saved was touched.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
            <button type="button" onClick={() => retry()} style={{ minHeight: 44, padding: "0 20px", borderRadius: 8, border: "1px solid rgba(201,165,92,0.55)", background: "rgba(201,165,92,0.12)", color: "#e8b923", fontWeight: 700, cursor: "pointer" }}>
              Try again
            </button>
            {/* A HARD navigation on purpose: the app's router may be what failed. */}
            <button type="button" onClick={() => window.location.assign(INSTRUMENT_VIEW_ROUTE)} style={{ minHeight: 44, padding: "0 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#ede6d3", cursor: "pointer" }}>
              Back to the chart
            </button>
          </div>
          {error.digest ? <p style={{ marginTop: 22, fontSize: 11, color: "#8b8fa8", fontFamily: "ui-monospace, monospace" }}>ref {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
