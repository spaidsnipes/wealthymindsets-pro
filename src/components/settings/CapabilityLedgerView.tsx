"use client";
/**
 * SETTINGS › CONNECTIONS › WHAT EACH RAIL IS FOR — Garden 18 v2 §26 / §86.
 * Every capability per provider, in its own state word, with why. Live wire
 * health stays in "Manage connections"; this is the map, not the pulse.
 */
import React, { useEffect, useState } from "react";

import { CAPABILITY_LABEL, CAPABILITY_LEDGER, STATE_WORD, type CapabilityState } from "@/lib/broker/capabilityLedger";

const TONE: Readonly<Record<CapabilityState, string>> = {
  LIVE: "#7fd1a8", HUMAN_ARMED: "#d4af37", PARTIAL: "#d4af37", RECONSTRUCTED: "#c9a55c",
  NOT_CONNECTED: "#e0786b", NOT_BUILT: "#8a8271", UNSUPPORTED: "#8a8271",
};

export function CapabilityLedgerView() {
  const [provider, setProvider] = useState<"tastytrade" | "Webull">("tastytrade");
  const rows = CAPABILITY_LEDGER.filter(r => r.provider === provider);
  // GUEST (2026-10-04): this map was read as the guest's own status — "Quotes
  // LIVE", "Execute ARMED BY YOU" — while those rails run on the operator's
  // accounts. The readiness receipt names the audience; a guest sees the same
  // map as what each broker supports once THEIR account is connected.
  // FAIL CLOSED (garden pass 2026-10-04): a failed readiness read left
  // `guest` false and showed a guest the operator's "LIVE / ARMED BY YOU" map.
  // The operator reading appears only when the server says OWNER.
  const [guest, setGuest] = useState(true);
  useEffect(() => {
    let live = true;
    fetch("/api/broker/readiness", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (live) setGuest(j?.audience !== "OWNER"); })
      .catch(() => { /* stays the guest reading */ });
    return () => { live = false; };
  }, []);
  return (
    <section data-testid="capability-ledger" className="px-4 py-3">
      <div className="text-xs font-semibold text-wm-text">What each rail is for</div>
      <div className="text-[11px] text-wm-text-dim mt-0.5">Market data, order flow, execution and history are separate claims. Orders always need your armed press.</div>
      {guest && (
        <div data-testid="capability-ledger-guest" className="mt-1.5 text-[11px] text-wm-text-muted">
          What each broker supports in WM once <span className="text-wm-text">your own account</span> is connected — none of these rails is open on your account yet. Connect one above in Manage connections.
        </div>
      )}
      <div className="mt-2 flex gap-1" role="tablist" aria-label="Provider">
        {(["tastytrade", "Webull"] as const).map(p => (
          <button key={p} type="button" role="tab" aria-selected={provider === p} onClick={() => setProvider(p)}
            className="min-h-8 rounded border px-2 text-[11px] font-semibold"
            style={{ borderColor: provider === p ? "#d4af37" : "rgba(139,106,41,0.35)", color: provider === p ? "#d4af37" : "#c0b8a0" }}>{p}</button>
        ))}
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {rows.map(r => (
          <li key={r.capability} className="grid grid-cols-[1fr_auto] gap-x-2 text-[11.5px] leading-snug">
            <span className="text-wm-text">{CAPABILITY_LABEL[r.capability]}</span>
            <span data-state={r.state} className="font-semibold tabular-nums" style={{ color: guest ? "#8a8271" : TONE[r.state] }}>{STATE_WORD[r.state]}{guest && (r.state === "LIVE" || r.state === "HUMAN_ARMED" || r.state === "PARTIAL") ? " · once connected" : ""}</span>
            <span className="col-span-2 text-[10.5px] text-wm-text-dim">{r.note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
