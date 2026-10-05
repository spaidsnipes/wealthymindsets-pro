"use client";

import { useEffect } from "react";

import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

/**
 * The room-level door (garden pass 2026-10-05). global-error.tsx only catches a
 * crash in the root layout; a crash inside one room fell through to it too and
 * took the whole shell down with it. This boundary sits under the root layout,
 * so the house (fonts, styles, providers) stays standing and only the room that
 * failed is replaced. Same words as the last door: plain, the way back, no raw
 * error text — the digest is what an operator needs.
 */
export default function RoomError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      role="alert"
      style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: "32px 16px", color: "#ede6d3" }}
    >
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: "0.32em", fontSize: 12, color: "#c9a55c" }}>WEALTHYMINDSETS</div>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: 26, margin: "18px 0 10px" }}>This room didn’t open.</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#a89c80", margin: 0 }}>
          Something on our side failed while loading it. Nothing you saved was touched.
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
      </div>
    </main>
  );
}
