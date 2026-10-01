"use client";

/**
 * THE CAPITAL MOMENT, ON TASTYTRADE — Garden 18 §LXVII / §LXXIII–§LXXX.
 *
 * One component every tastytrade surface sends through (future, futures
 * option, equity option): there is one execution path, not three.
 *
 *   · Broker, account, LIVE, contract, side, quantity and price are on screen
 *     before anything can be sent (§LXXX). The account is the trader's choice;
 *     a futures intent defaults to the futures-approved account, visibly.
 *   · Sending needs an explicit ARM, then a press. One idempotency key per armed
 *     order: a double press, a retry or a reload answers ALREADY_SENT from
 *     tastytrade instead of a second order (§CX).
 *   · After the send, the order's state is READ BACK from tastytrade
 *     (ACKNOWLEDGED → WORKING → FILLED / CANCELED / REJECTED); UNKNOWN is a
 *     real state and is reconciled by the idempotency key before any resend.
 *   · Cancel is always one press while the order works (§LXXIX).
 *
 * The server firewall (order-submit route) re-checks everything; this
 * component never constructs a broker payload.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";

import { isTerminal, type TtOrderView, type WmOrderState } from "@/lib/broker/tastytradeOrderState";
import { checkOrder } from "@/lib/execution/guardrails";
import { useGuardrails } from "@/lib/execution/useGuardrails";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const RED = "#e0786b";

export interface TastytradeIntent {
  readonly instrumentType: "Equity" | "Equity Option" | "Future" | "Future Option";
  /** tastytrade's own order symbol (`/MNQZ6`, `./ESZ6 EW3V6  261016C7900`), or an OSI for equity options. */
  readonly symbol: string;
  readonly action: "Buy to Open" | "Sell to Close" | "Sell to Open" | "Buy to Close";
  readonly qty: number;
  readonly limitPx: number | null;
  /** Words for the summary line ("1 /MNQZ6 · micro Nasdaq Dec 26"). */
  readonly describe: string;
}

interface Account { index: number; tail: string; accountType: string | null; futuresApproved: boolean | null }

const FUTURES_TYPES = new Set(["Future", "Future Option"]);

export function TastytradeLiveOrder({ intent, ensureDecision }: {
  readonly intent: TastytradeIntent | null;
  /** The decision this order expresses (minted on this explicit press when none exists); null refuses. */
  readonly ensureDecision: () => string | null;
}) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [accountIndex, setAccountIndex] = useState<number | null>(null);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ state: string; reason?: string } | null>(null);
  const [order, setOrder] = useState<TtOrderView | null>(null);
  const keyRef = useRef<string | null>(null);

  const futures = intent ? FUTURES_TYPES.has(intent.instrumentType) : false;

  useEffect(() => {
    let live = true;
    fetch("/api/broker/tastytrade/accounts", { cache: "no-store" })
      .then(r => r.json().catch(() => null))
      .then(j => {
        if (!live || !Array.isArray(j?.accounts)) return;
        setAccounts((j.accounts as { accountNumber: string; accountType?: string; isFuturesApproved?: boolean }[]).map((a, index) => ({
          index, tail: a.accountNumber.slice(-4), accountType: a.accountType ?? null, futuresApproved: a.isFuturesApproved ?? null,
        })));
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  // The visible default: a futures intent goes to the first futures-approved account.
  useEffect(() => {
    if (!accounts || accountIndex != null) return;
    const pick = futures ? accounts.find(a => a.futuresApproved === true) : accounts[0];
    if (pick) setAccountIndex(pick.index);
  }, [accounts, accountIndex, futures]);

  // Any change to WHAT would be sent disarms and forgets the key: a new order, a new key.
  const fingerprint = intent ? `${intent.instrumentType}|${intent.symbol}|${intent.action}|${intent.qty}|${intent.limitPx}|${accountIndex}` : "";
  useEffect(() => { setArmed(false); keyRef.current = null; setAnswer(null); }, [fingerprint]);

  // Read the order back from tastytrade until it reaches a terminal state.
  useEffect(() => {
    if (!order || isTerminal(order.state)) return;
    let live = true;
    const t = setInterval(() => {
      fetch("/api/broker/tastytrade/orders", { cache: "no-store" })
        .then(r => r.json().catch(() => null))
        .then(j => {
          if (!live || j?.state !== "OK") return;
          const found = (j.accounts as { orders: TtOrderView[] }[]).flatMap(a => a.orders).find(o => o.id === order.id);
          if (found) setOrder(found);
        })
        .catch(() => {});
    }, 2000);
    return () => { live = false; clearInterval(t); };
  }, [order]);

  const account = accounts?.find(a => a.index === accountIndex) ?? null;
  const accountBlocks = futures && account && account.futuresApproved !== true
    ? `Account …${account.tail} is not futures-enabled at tastytrade. Choose a futures-eligible account.`
    : null;
  const priceOk = intent?.limitPx != null && intent.limitPx > 0;
  // §CXVII: the trader's own commitments, asked before the button can arm.
  const guardrails = useGuardrails();
  const guard = intent ? checkOrder(guardrails, intent.instrumentType === "Equity" ? { kind: "EQUITY", qty: intent.qty }
    : intent.instrumentType === "Equity Option" ? { kind: "EQUITY_OPTION", qty: intent.qty, limitPx: intent.limitPx }
    : { kind: intent.instrumentType === "Future" ? "FUTURE" : "FUTURE_OPTION", qty: intent.qty }) : { ok: true as const };
  const canArm = !!intent && !!account && !accountBlocks && priceOk && guard.ok && intent.qty > 0 && !busy && !(order && !isTerminal(order.state));

  const summary = useMemo(() => {
    if (!intent) return null;
    return `LIVE · TASTYTRADE · …${account?.tail ?? "?"} · ${intent.action.toUpperCase()} ${intent.qty} ${intent.describe} · LIMIT ${intent.limitPx ?? "—"} · DAY`;
  }, [intent, account]);

  async function send() {
    if (!intent || !armed || !canArm || accountIndex == null) return;
    const decisionId = ensureDecision();
    if (!decisionId) { setAnswer({ state: "REFUSED_LOCAL", reason: "No decision to express — this order needs one." }); return; }
    keyRef.current ??= `wmo_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    setBusy(true);
    try {
      const r = await fetch("/api/broker/tastytrade/order-submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          instrumentType: intent.instrumentType,
          ...(intent.instrumentType === "Equity Option" ? { optionOsi: intent.symbol } : { symbol: intent.symbol }),
          action: intent.action, qty: intent.qty, type: "Limit", limitPx: intent.limitPx,
          decisionId, clientOrderId: keyRef.current, accountIndex, confirmLive: true,
        }),
      });
      const j = await r.json().catch(() => null);
      setAnswer({ state: j?.state ?? `HTTP ${r.status}`, reason: j?.reason ?? (Array.isArray(j?.result?.errors) ? j.result.errors.map((e: { message?: string }) => e.message).join("; ") : undefined) });
      if (j?.order) setOrder(j.order);
      if (j?.state === "UNKNOWN") reconcile();
    } catch {
      setAnswer({ state: "UNKNOWN", reason: "The send did not answer. Reconciling with tastytrade before anything else." });
      reconcile();
    } finally {
      setBusy(false);
      setArmed(false);
    }
  }

  /** UNKNOWN is resolved by asking the broker for the idempotency key — never by resending. */
  function reconcile() {
    const key = keyRef.current;
    if (!key) return;
    fetch("/api/broker/tastytrade/orders", { cache: "no-store" })
      .then(r => r.json().catch(() => null))
      .then(j => {
        const found = j?.state === "OK" ? (j.accounts as { orders: TtOrderView[] }[]).flatMap(a => a.orders).find(o => o.externalId === key) : null;
        if (found) { setOrder(found); setAnswer({ state: "RECONCILED", reason: "tastytrade has this order." }); }
        else setAnswer({ state: "UNKNOWN", reason: "tastytrade does not show this order yet. Check again before sending another." });
      })
      .catch(() => {});
  }

  async function cancel() {
    if (!order || accountIndex == null) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/broker/tastytrade/orders?accountIndex=${accountIndex}&id=${encodeURIComponent(order.id)}`, { method: "DELETE" });
      const j = await r.json().catch(() => null);
      if (j?.order) setOrder(j.order);
      else setAnswer({ state: j?.state ?? `HTTP ${r.status}`, reason: j?.reason });
    } finally {
      setBusy(false);
    }
  }

  if (!intent) return null;
  const working = order && !isTerminal(order.state);
  const stateColor = (s: WmOrderState) => (s === "FILLED" ? "#7fd1a8" : s === "REJECTED" || s === "UNKNOWN" ? RED : GOLD);

  return (
    <section data-testid="tt-live-order" aria-label="Live order on tastytrade" style={{ marginTop: 10, border: `1px solid ${armed ? RED : "#3a3326"}`, borderRadius: 4, padding: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: RED, fontWeight: 700, letterSpacing: ".08em" }}>LIVE</span>
        <label style={{ color: MUTED, display: "flex", gap: 4, alignItems: "center" }}>
          Account
          <select value={accountIndex ?? ""} onChange={e => setAccountIndex(Number(e.target.value))} style={{ background: "#0b0a08", border: "1px solid #3a3326", padding: 2 }}>
            {(accounts ?? []).map(a => (
              <option key={a.index} value={a.index}>…{a.tail}{a.accountType ? ` · ${a.accountType}` : ""}{futures ? (a.futuresApproved ? " · futures" : " · no futures") : ""}</option>
            ))}
          </select>
        </label>
      </div>
      <p data-testid="tt-capital-moment" style={{ marginTop: 6, fontVariantNumeric: "tabular-nums", color: "#ede6d3" }}>{summary}</p>
      {accountBlocks ? <p role="status" style={{ color: GOLD }}>{accountBlocks}</p> : null}
      {!priceOk ? <p role="status" style={{ color: GOLD }}>Set a limit price to send.</p> : null}
      {!guard.ok ? <p role="status" data-testid="tt-guardrail" style={{ color: GOLD }}>{guard.reason}</p> : null}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
        <label style={{ display: "flex", gap: 4, alignItems: "center", color: armed ? RED : MUTED }}>
          <input type="checkbox" data-testid="tt-arm" checked={armed} disabled={!canArm} onChange={e => setArmed(e.target.checked)} />
          Arm live order
        </label>
        <button type="button" data-testid="tt-send-live" disabled={!armed || !canArm} onClick={() => void send()}
          style={{ padding: "6px 12px", borderRadius: 3, border: `1px solid ${RED}`, color: armed ? "#fff" : RED, background: armed ? "#7a2a22" : "transparent", opacity: !armed || !canArm ? 0.5 : 1 }}>
          {busy ? "Sending to tastytrade…" : "Send LIVE order"}
        </button>
      </div>
      {answer ? <p role="status" style={{ marginTop: 6, color: answer.state === "ACKNOWLEDGED" || answer.state === "RECONCILED" ? "#7fd1a8" : GOLD }}>{answer.state.replace(/_/g, " ")}{answer.reason ? ` · ${answer.reason}` : ""}</p> : null}
      {order ? (
        <div data-testid="tt-order-state" data-state={order.state} style={{ marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
          <span style={{ color: stateColor(order.state) }}>{order.state.replace(/_/g, " ")}</span>
          <span style={{ color: MUTED }}> · tastytrade #{order.id} · {order.status}{order.filled != null && order.quantity != null ? ` · filled ${order.filled}/${order.quantity}` : ""}{order.rejectReason ? ` · ${order.rejectReason}` : ""}</span>
          {working ? (
            <button type="button" data-testid="tt-cancel" disabled={busy} onClick={() => void cancel()}
              style={{ marginLeft: 8, padding: "2px 10px", border: `1px solid ${GOLD}`, color: GOLD, borderRadius: 3 }}>
              Cancel order
            </button>
          ) : null}
        </div>
      ) : null}
      <p style={{ marginTop: 4, color: MUTED }}>Real money. A limit is a ceiling, not a guaranteed fill.</p>
    </section>
  );
}
