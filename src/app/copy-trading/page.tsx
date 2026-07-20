"use client";

import React from "react";
import { AlertTriangle, Link2, ShieldCheck, Users } from "lucide-react";

export default function CopyTradingPage() {
  return (
    <div className="h-full overflow-y-auto bg-[#0D0E14] p-5 text-wm-text">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl border border-wm-border bg-wm-card/80 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-wm-purple/15 text-wm-purple">
              <Users size={21} />
            </div>
            <div>
              <h1 className="text-xl font-black">Copy Trading</h1>
              <p className="text-xs text-wm-text-dim">Verified broker performance and authorization required</p>
            </div>
            <span className="ml-auto rounded-full border border-wm-red/30 bg-wm-red/10 px-3 py-1 text-[10px] font-black text-wm-red">
              NOT AVAILABLE
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
