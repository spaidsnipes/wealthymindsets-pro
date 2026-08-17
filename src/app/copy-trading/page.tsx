"use client";

import React from "react";
import { AlertTriangle, Link2, ShieldCheck, Users } from "lucide-react";
import { WM } from "@/lib/design/wmTokens";

export default function CopyTradingPage() {
  return (
    <div
      className="h-full overflow-y-auto"
      style={{
        background: `radial-gradient(1200px 700px at 50% -10%, rgba(212,175,55,0.06), transparent 60%), ${WM.surface.deepest}`,
        color: WM.text.body,
      }}
    >
      <div className="mx-auto max-w-5xl" style={{ padding: "24px clamp(16px, 4vw, 32px)" }}>
        {/* Header — WM atmosphere */}
        <header
          style={{
            borderRadius: 14,
            border: `1px solid ${WM.border.line}`,
            background: `linear-gradient(180deg, ${WM.surface.deep} 0%, ${WM.surface.mid} 100%)`,
            padding: "20px 22px",
          }}
        >
          <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
            <div
              className="grid place-items-center"
              style={{
                width: 44, height: 44, borderRadius: 999,
                background: "linear-gradient(160deg, rgba(212,175,55,0.22), rgba(201,165,92,0.08))",
                border: "1px solid rgba(212,175,55,0.35)",
                boxShadow: "inset 0 0 20px -8px rgba(212,175,55,0.4)",
                color: WM.gold.hero,
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <h1
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "clamp(20px, 3.5vw, 26px)",
                  fontWeight: 400, color: WM.text.hero,
                  letterSpacing: -0.3, margin: 0, lineHeight: 1.1,
                }}
              >
                Copy Trading
              </h1>
              <p
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 12, fontStyle: "italic",
                  color: WM.text.muted, marginTop: 4,
                }}
              >
                Verified broker performance and authorization required
              </p>
            </div>
            <span
              className="ml-auto"
              style={{
                padding: "3px 10px", borderRadius: 999,
                border: `1px solid ${WM.state.warn}44`,
                background: `${WM.state.warn}12`,
                color: WM.state.warn,
                fontSize: 9, letterSpacing: 0.32, fontWeight: 800,
                textTransform: "uppercase",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Not available
            </span>
          </div>
        </header>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <section className="rounded-3xl border border-wm-red/25 bg-wm-red/5 p-6">
            <div className="flex items-center gap-2 font-black text-wm-red">
              <AlertTriangle size={17} /> Fictional traders removed
            </div>
            <p className="mt-3 text-sm leading-7 text-wm-text-muted">
              WealthyMindsets no longer displays invented traders, win rates, returns, follower counts, risk ratings, or simulated copy allocations.
            </p>
          </section>

          <section className="rounded-3xl border border-wm-green/25 bg-wm-green/5 p-6">
            <div className="flex items-center gap-2 font-black text-wm-green">
              <ShieldCheck size={17} /> Activation requirements
            </div>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-wm-text-muted">
              <li>• Broker-confirmed trade and equity history.</li>
              <li>• User authorization and risk limits.</li>
              <li>• Auditable order acknowledgements and fills.</li>
              <li>• Clear slippage, latency, and failure reporting.</li>
            </ul>
          </section>
        </div>

        <section className="mt-5 rounded-3xl border border-wm-border bg-wm-card/80 p-7 text-center">
          <Link2 size={28} className="mx-auto text-wm-gold" />
          <h2 className="mt-3 text-lg font-black">Connect a real supported broker first</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-wm-text-dim">
            This feature will remain unavailable until its statistics and executions can come directly from verified broker records.
          </p>
        </section>
      </div>
    </div>
  );
}
