"use client";

/**
 * THE CAPITAL MOMENT, ON WEBULL — Garden 18 §LXVII / §LXXIII–§LXXX.
 *
 * The Webull twin of TastytradeLiveOrder, for one single-leg option named by
 * its OSI contract. Broker, account, LIVE, contract, side, quantity and price
 * are on screen before anything can be sent; sending needs an ARM then a
 * press; one client order id per armed order (Webull's place-once ledger
 * answers ALREADY_PLACED to a repeat); the order is read back from Webull's
 * exact record by that id; cancel is one press. The server
 * (/api/broker/webull/order-submit) re-runs the whole firewall, including
 * Webull's own preview immediately before placing.
 */

import React, { useEffect, useRef, useState } from "react";

import { checkOrder } from "@/lib/execution/guardrails";
import { openSettings } from "@/components/layout/shellPanels";
import { useGuardrails } from "@/lib/execution/useGuardrails";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const RED = "#e0786b";
const GREEN = "#7fd1a8";

export interface WebullOptionIntent {
  readonly osi: string;
  readonly positionIntent: "BUY_TO_OPEN" | "SELL_TO_CLOSE" | "BUY_TO_CLOSE" | "SELL_TO_OPEN";
  readonly qty: number;
  readonly limitPx: number | null;
}

type Lookup =
  | { state: "FOUND"; status: string; rawStatus: string | null; brokerOrderId: string | null }
  | { state: "NOT_FOUND" }
  | { state: "UNKNOWN"; reason: string };

const TERMINAL = new Set(["FILLED", "CANCELLED", "FAILED"]);

export function WebullLiveOrder({ intent, accountIndex, accountLabel, decisionId, quote = null }: {
  /**
   * The live, dated touch this order is priced against. The server gate
   * (2026-10-09) refuses a risk-increasing order without a fresh one; a closing
   * limit needs none. Never invented here — null when the ticket holds no live quote.
   */
  readonly quote?: { readonly bid: number | null; readonly ask: number | null; readonly atMs: number } | null;
  readonly intent: WebullOptionIntent;
  readonly accountIndex: number;
  /** "MARGIN · …2345", from the preview's own account list. */
  readonly accountLabel: string;
  readonly decisionId: string;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ state: string; reason?: string } | null>(null);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const keyRef = useRef<string | null>(null);
  const [sentKey, setSentKey] = useState<string | null>(null);

  // A different order is a new key and a disarmed button.
  const fingerprint = `${intent.osi}|${intent.positionIntent}|${intent.qty}|${intent.limitPx}|${accountIndex}`;
  useEffect(() => { setArmed(false); keyRef.current = null; setAnswer(null); }, [fingerprint]);

  // Read the order back from Webull's exact record until it is done.
  useEffect(() => {
    if (!sentKey) return;
    if (lookup?.state === "FOUND" && TERMINAL.has(lookup.status)) return;
    let live = true;
    const pull = () => fetch(`/api/broker/webull/orders?accountIndex=${accountIndex}&clientOrderId=${encodeURIComponent(sentKey)}`, { cache: "no-store" })
      .then(r => r.json().catch(() => null))
      .then(j => { if (live && j?.state) setLookup(j as Lookup); })
      .catch(() => {});
    void pull();
    const t = setInterval(pull, 2500);
    return () => { live = false; clearInterval(t); };
  }, [sentKey, accountIndex, lookup]);

  const buying = intent.positionIntent.startsWith("BUY");
  const priceOk = intent.limitPx != null && intent.limitPx > 0;
  const working = lookup?.state === "FOUND" && !TERMINAL.has(lookup.status);
  // §CXVII: the trader's own commitments, asked before the button can arm.
  const guard = checkOrder(useGuardrails(), { kind: "EQUITY_OPTION", qty: intent.qty, limitPx: intent.limitPx });
  const canArm = priceOk && guard.ok && intent.qty > 0 && !busy && !working;

  async function send() {
    if (!armed || !canArm) return;
    keyRef.current ??= crypto.randomUUID().replace(/-/g, "");
    const key = keyRef.current;
    setBusy(true);
    try {
      const r = await fetch("/api/broker/webull/order-submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          optionOsi: intent.osi, positionIntent: intent.positionIntent, qty: intent.qty, type: "limit", limitPx: intent.limitPx, tif: "day",
          decisionId, clientOrderId: key, accountIndex, confirmLive: true,
          // What this ticket shows the trader: a LIVE (production) Webull order — the
          // server refuses if its own environment differs — and the touch it priced against.
          environment: "production",
          ...(quote ? { quote } : {}),
        }),
      });
      const j = await r.json().catch(() => null);
      setAnswer({ state: j?.state ?? `HTTP ${r.status}`, reason: j?.reason });
      // Anything that may have reached Webull is tracked by its key from here on.
      if (j?.sent || j?.state === "ACKNOWLEDGED" || j?.state === "ALREADY_PLACED" || j?.state === "SUBMISSION_UNKNOWN") setSentKey(key);
    } catch {
      setAnswer({ state: "SUBMISSION_UNKNOWN", reason: "The send did not answer. Reading Webull's record by this order's id before anything else." });
      setSentKey(key);
    } finally {
      setBusy(false);
      setArmed(false);
    }
  }

  async function cancel() {
    if (!sentKey) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/broker/webull/orders?accountIndex=${accountIndex}&clientOrderId=${encodeURIComponent(sentKey)}`, { method: "DELETE" });
      const j = await r.json().catch(() => null);
      setAnswer({ state: j?.state ?? `HTTP ${r.status}`, reason: j?.reason ?? (j?.state === "CANCEL_REQUESTED" ? "Webull has the cancel request; the order's own status says when it is done." : undefined) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-testid="wb-live-order" aria-label="Live order on Webull" className="mt-2 rounded border p-2" style={{ borderColor: armed ? RED : "rgba(139,106,41,0.35)" }}>
      <p data-testid="wb-capital-moment" style={{ fontVariantNumeric: "tabular-nums" }}>
        <span style={{ color: RED, fontWeight: 700 }}>LIVE</span> · WEBULL · {accountLabel} · {intent.positionIntent.replace(/_/g, " ")} {intent.qty} {intent.osi} · LIMIT {intent.limitPx ?? "—"} · DAY
      </p>
      {!priceOk ? <p role="status" style={{ color: GOLD }}>Set a limit premium to send.</p> : null}
      {!guard.ok ? <p role="status" data-testid="wb-guardrail" style={{ color: GOLD }}>{guard.reason}{" "}<button type="button" data-testid="wb-guardrail-open-settings" onClick={() => openSettings("execution")} style={{ color: GOLD, textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}>Open Settings › Execution</button></p> : null}
      <div className="mt-1 flex items-center gap-2">
        <label className="flex items-center gap-1" style={{ color: armed ? RED : MUTED }}>
          <input type="checkbox" data-testid="wb-arm" checked={armed} disabled={!canArm} onChange={e => setArmed(e.target.checked)} />
          Arm live order
        </label>
        <button type="button" data-testid="wb-send-live" disabled={!armed || !canArm} onClick={() => void send()}
          className="rounded border px-3 py-1" style={{ borderColor: RED, color: armed ? "#fff" : RED, background: armed ? "#7a2a22" : "transparent", opacity: !armed || !canArm ? 0.5 : 1 }}>
          {busy ? "Sending to Webull…" : `Send LIVE ${buying ? "buy" : "sell"}`}
        </button>
      </div>
      {answer ? (
        <p role="status" className="mt-1" style={{ color: answer.state === "ACKNOWLEDGED" || answer.state === "ALREADY_PLACED" ? GREEN : GOLD }}>
          {answer.state.replace(/_/g, " ")}{answer.reason ? ` · ${answer.reason}` : ""}
        </p>
      ) : null}
      {sentKey && lookup ? (
        <div data-testid="wb-order-state" data-state={lookup.state === "FOUND" ? lookup.status : lookup.state} className="mt-1" style={{ fontVariantNumeric: "tabular-nums" }}>
          {lookup.state === "FOUND"
            ? <span style={{ color: lookup.status === "FILLED" ? GREEN : lookup.status === "FAILED" ? RED : GOLD }}>{lookup.rawStatus ?? lookup.status}</span>
            : <span style={{ color: GOLD }}>{lookup.state === "NOT_FOUND" ? "Webull shows no order under this id" : `Unknown · ${lookup.reason}`}</span>}
          {lookup.state === "FOUND" && lookup.brokerOrderId ? <span style={{ color: MUTED }}> · Webull #{lookup.brokerOrderId}</span> : null}
          {working ? (
            <button type="button" data-testid="wb-cancel" disabled={busy} onClick={() => void cancel()}
              className="ml-2 rounded border px-2" style={{ borderColor: GOLD, color: GOLD }}>
              Cancel order
            </button>
          ) : null}
        </div>
      ) : null}
      <p className="mt-1" style={{ color: MUTED }}>Real money. A limit is a ceiling, not a guaranteed fill.</p>
    </section>
  );
}
