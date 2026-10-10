"use client";
/**
 * SETTINGS › CONNECTIONS › WHAT EACH RAIL IS FOR — Garden 18 v2 §26 / §86.
 * Every capability per provider, in its own state word, with why. Live wire
 * health stays in "Manage connections"; this is the map, not the pulse.
 */
import React, { useEffect, useState } from "react";

import { CAPABILITY_LABEL, CAPABILITY_LEDGER, STATE_WORD, capabilityClaimWord, type CapabilityCertificate, type CapabilityState, type ExecutionArms } from "@/lib/broker/capabilityLedger";
import { GUARDRAILS_STORAGE_KEY, readGuardrails } from "@/lib/execution/guardrails";
import { readServerOrderLimits } from "@/lib/execution/liveOrderPreflight";
import { serverGateNowLine, type OrderGateStanding } from "@/lib/execution/orderGateStanding";

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
  // The arms, read (never written): "ARMED BY YOU" only while both are on (Sheriff P1-3).
  const [arms, setArms] = useState<ExecutionArms>({ device: null, server: null, killSwitch: null });
  useEffect(() => {
    if (guest) return;
    let live = true;
    let device: boolean | null = null;
    try { device = readGuardrails(window.localStorage.getItem(GUARDRAILS_STORAGE_KEY)).liveArmed; } catch { device = null; }
    fetch("/api/execution/limits", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!live) return;
        const L = j && j.limits ? readServerOrderLimits(j.limits) : null;
        setArms({ device, server: j ? (L ? L.armed : false) : null, killSwitch: L ? L.killSwitch : null });
      })
      .catch(() => { if (live) setArms({ device, server: null, killSwitch: null }); });
    return () => { live = false; };
  }, [guest]);
  // The certificate outranks this map (Sheriff P1-3): read once, owner only.
  const [certs, setCerts] = useState<Readonly<Record<string, CapabilityCertificate>> | null>(null);
  useEffect(() => {
    if (guest) return;
    let live = true;
    fetch("/api/broker/certification", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!live || !j || !Array.isArray(j.brokers)) return;
        const out: Record<string, CapabilityCertificate> = {};
        for (const b of j.brokers) if (b && typeof b.brokerId === "string") out[b.brokerId] = { passedStages: b.passedStages ?? [], failedStages: b.failedStages ?? [], blockedStages: b.blockedStages ?? [] };
        setCerts(out);
      })
      .catch(() => { /* stays unread: rows say CERTIFICATE UNREAD */ });
    return () => { live = false; };
  }, [guest]);
  const cert = certs ? certs[provider.toLowerCase()] ?? null : null;
  // §66: what the SERVER gate would say right now to a risk-increasing order on this broker — read from the
  // owner-only, read-only route (no order, no broker call). Owner only; a failed read says "not read".
  const [gate, setGate] = useState<{ provider: string; standing: OrderGateStanding | null } | null>(null);
  useEffect(() => {
    if (guest) return;
    let live = true;
    fetch(`/api/broker/order-gate?broker=${provider.toLowerCase()}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (live) setGate({ provider, standing: j && j.state === "OK" && typeof j.sentence === "string" && typeof j.asOfMs === "number" ? (j as OrderGateStanding) : null }); })
      .catch(() => { if (live) setGate({ provider, standing: null }); });
    return () => { live = false; };
  }, [guest, provider]);
  const gateNow = gate && gate.provider === provider ? serverGateNowLine(gate.standing) : null;
  // Supermax §11: the operator's billing readiness — names present / absent, the standing word, the last verified
  // webhook event, records by status. Owner only (the route refuses anyone else); never a value.
  const [billing, setBilling] = useState<{ line: string; asOf: string; names: { name: string; present: boolean }[] } | null>(null);
  useEffect(() => {
    if (guest) return;
    let live = true;
    fetch("/api/billing/readiness", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (live && j && typeof j.line === "string" && Array.isArray(j.names)) setBilling({ line: j.line, asOf: String(j.asOf ?? ""), names: j.names }); })
      .catch(() => { /* stays unread */ });
    return () => { live = false; };
  }, [guest]);
  return (
    <section data-testid="capability-ledger" className="px-4 py-3">
      <div className="text-xs font-semibold text-wm-text">What each rail is for</div>
      <div className="text-[11px] text-wm-text-dim mt-0.5">Market data, order flow, execution and history are separate claims. Orders always need your armed press.</div>
      {guest && (
        <div data-testid="capability-ledger-guest" className="mt-1.5 text-[11px] text-wm-text-muted">
          What each broker supports in WM once <span className="text-wm-text">your own account</span> is connected — none of these rails is open on your account yet. Linking your own broker account isn&apos;t available yet; the Paper room is open to you now.
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
            <span data-state={r.state} className="font-semibold tabular-nums" style={{ color: guest ? "#8a8271" : TONE[r.state] }}>{guest ? STATE_WORD[r.state] : capabilityClaimWord(r, cert, arms)}{guest && (r.state === "LIVE" || r.state === "HUMAN_ARMED" || r.state === "PARTIAL") ? " · once connected" : ""}</span>
            <span className="col-span-2 text-[10.5px] text-wm-text-dim">{r.note}</span>
            {!guest && r.state === "HUMAN_ARMED" && gateNow ? (
              <span data-testid="server-gate-now" data-capability={r.capability} className="col-span-2 text-[10.5px] text-wm-text-muted">{gateNow}</span>
            ) : null}
          </li>
        ))}
      </ul>
      {!guest && billing ? (
        <div data-testid="billing-readiness" className="mt-3 border-t border-wm-border pt-2">
          <div className="text-xs font-semibold text-wm-text">Billing (operator)</div>
          <p className="mt-0.5 text-[11px] leading-snug text-wm-text-muted">{billing.line}</p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-wm-text-dim">
            {billing.names.map(n => <li key={n.name} data-present={n.present ? "yes" : "no"}><span className="font-mono">{n.name}</span> · {n.present ? "present" : "absent"}</li>)}
          </ul>
          <p className="mt-0.5 text-[10.5px] text-wm-text-dim">as of {billing.asOf}</p>
        </div>
      ) : null}
    </section>
  );
}
