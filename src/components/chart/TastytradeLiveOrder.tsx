"use client";

/**
 * THE CAPITAL MOMENT, ON TASTYTRADE — Garden 18 §LXVII / §LXXIII–§LXXX,
 * Garden 19 §23 "TRADE FROM CHART" / P0.3.
 *
 * One component every tastytrade surface sends through (future, futures
 * option, equity option): there is one execution path, not three.
 *
 *   · Broker, environment, account, the DATED contract, side, quantity and
 *     price are on screen before anything can be sent (§LXXX). The account is
 *     the trader's choice; a futures intent defaults to the futures-approved
 *     account, visibly.
 *   · PREVIEW → CONFIRM → SEND (liveOrderLifecycle): tastytrade's dry run of
 *     exactly this ticket, with the server's own gate (liveOrderPreflight)
 *     answering beside it; then a confirm sheet listing every cap, the loss at
 *     the stop, the protection label and what cancel/replace cannot do; then
 *     an explicit confirmation and one press. Any change to the ticket goes
 *     back to STAGED.
 *   · One idempotency key per confirmed order: a double press, a retry or a
 *     reload answers ALREADY_SENT from tastytrade instead of a second order (§CX).
 *   · After the send, the order's state is READ BACK from tastytrade. A send
 *     that does not answer is UNKNOWN (never REJECTED) and is reconciled by
 *     the idempotency key — the send button stays shut until it is.
 *   · Cancel is always one press while the order works (§LXXIX); it is a
 *     request until tastytrade reads it back.
 *
 * The server firewall (order-submit route) re-checks everything; this
 * component never constructs a broker payload.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";

import { isTerminal, type TtOrderView, type WmOrderState } from "@/lib/broker/tastytradeOrderState";
import { checkOrder } from "@/lib/execution/guardrails";
import { openSettings } from "@/components/layout/shellPanels";
import { isOwnerRefusal, plainBrokerAnswer, TASTYTRADE_NOT_AVAILABLE } from "@/lib/broker/ownerRefusal";
import { useGuardrails } from "@/lib/execution/useGuardrails";
import { CANCEL_REPLACE_LIMITS, PHASE_WORDS, canSend, isInFlightPhase, mustReconcileFirst, stepLiveOrder, type LiveOrderEvent, type LiveOrderPhase } from "@/lib/execution/liveOrderLifecycle";
import { PROTECTION_WORDS, datedFuturesContract, type Refusal } from "@/lib/execution/liveOrderPreflight";
import { useServerOrderLimits } from "@/lib/execution/useServerOrderLimits";

import { tastytradeEntryFields, type TastytradeEntryType } from "@/lib/broker/tastytradeEntryFields";
import { FillJournalOffer } from "@/components/journal/FillJournalOffer";
import type { FillCaptureIntent } from "@/lib/journal/journalCaptureFromFill";
import { rememberTicketAtSend, ticketForOrder } from "@/lib/journal/ticketAtSendStore";
import { viewNameAtSend } from "@/lib/journal/viewAtSend";
import { announcedArrangementCapture } from "@/lib/workspace/equipmentChannel";
import { loadSavedLayouts } from "@/lib/workspace/savedLayouts";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const RED = "#e0786b";
const GREEN = "#7fd1a8";
/** How long a send may go unanswered before it is UNKNOWN (never REJECTED). */
const SEND_TIMEOUT_MS = 15_000;

export interface TastytradeIntent {
  readonly instrumentType: "Equity" | "Equity Option" | "Future" | "Future Option" | "Cryptocurrency";
  /** tastytrade's own order symbol (`/MNQZ6`, `./ESZ6 EW3V6  261016C7900`), or an OSI for equity options. */
  readonly symbol: string;
  readonly action: "Buy to Open" | "Sell to Close" | "Sell to Open" | "Buy to Close";
  readonly qty: number;
  readonly limitPx: number | null;
  /** Entry type; defaults to Limit for existing option/protection callers. */
  readonly orderType?: TastytradeEntryType;
  readonly stopPx?: number | null;
  readonly tif?: "Day" | "GTC";
  /** Words for the summary line ("1 /MNQZ6 · micro Nasdaq Dec 26"). */
  readonly describe: string;
  /** Garden 19 §23: the planned protective stop for an opening order (the risk plan the server gate checks). */
  readonly protectiveStopPx?: number | null;
  /** The touch the ticket priced against, with when WM received it. */
  readonly quote?: { readonly bid: number | null; readonly ask: number | null; readonly atMs: number | null } | null;
  /** Option multiplier from tastytrade's own contract terms, when known. */
  readonly multiplier?: number | null;
  /** The chart symbol the trader was looking at (`NQ1!`), shown beside the dated contract. */
  readonly chartSymbol?: string;
}

/**
 * §J 2026-10-07 — what the journal draft needs that the order body does not
 * carry. Never part of what is sent; read only after tastytrade reports FILLED.
 */
export interface TastytradeJournalContext {
  readonly view?: string | null;
  readonly orderIntentId?: string | null;
  readonly targetPx?: number | null;
  /** The plan's stop when this ticket does not send it as `protectiveStopPx` (closing / protective tickets). */
  readonly plannedStopPx?: number | null;
  /** $ per 1.0 of price per unit (futures point value, 100 per equity option, 1 per share). */
  readonly multiplier?: number | null;
}

interface Account { index: number; tail: string; accountType: string | null; futuresApproved: boolean | null }
interface PreviewPass { ok: true; notionalUsd: number | null; lossAtStopUsd: number | null; protection: keyof typeof PROTECTION_WORDS; riskBound: string; referencePx: number | null }

/** The ticket this tab recorded when it sent the order with this client order id, if any. */
function ticketAtSendFor(clientOrderId: string | null): FillCaptureIntent | null {
  try { return ticketForOrder(window.sessionStorage, clientOrderId, Date.now()); } catch { return null; }
}

const FUTURES_TYPES = new Set(["Future", "Future Option"]);
const usd = (n: number | null | undefined) => (n == null ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`);

export function TastytradeLiveOrder({ intent, ensureDecision, onPhase, journal }: {
  readonly intent: TastytradeIntent | null;
  /** The decision this order expresses (minted on this explicit press when none exists); null refuses. */
  readonly ensureDecision: () => string | null;
  /** Garden 19 §23: the ticket's lifecycle, for the chart's STAGED / WORKING lines. */
  readonly onPhase?: (phase: LiveOrderPhase) => void;
  /** §J — context for the "Add to Journal" draft offered after a broker-confirmed fill. */
  readonly journal?: TastytradeJournalContext;
}) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [accountIndex, setAccountIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<LiveOrderPhase>("DISARMED");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ state: string; reason?: string } | null>(null);
  const [refusals, setRefusals] = useState<readonly Refusal[]>([]);
  const [preview, setPreview] = useState<{ pass: PreviewPass; bp: string | null; fees: string | null } | null>(null);
  const [order, setOrder] = useState<TtOrderView | null>(null);
  // guest audit 2026-10-04: the owner gate refused the account list — say so once, show no empty dropdown or send button.
  const [notYours, setNotYours] = useState(false);
  const keyRef = useRef<string | null>(null);
  const phaseRef = useRef<LiveOrderPhase>("DISARMED");
  const server = useServerOrderLimits(!notYours);

  const step = (e: LiveOrderEvent): boolean => {
    const t = stepLiveOrder(phaseRef.current, e);
    if (t.accepted) { phaseRef.current = t.phase; setPhase(t.phase); }
    // A readback that lands after the ticket moved on is not news; every other refusal is said.
    else if (t.why && e.type !== "READBACK") setAnswer({ state: "REFUSED_LOCAL", reason: t.why });
    return t.accepted;
  };
  useEffect(() => { onPhase?.(phase); }, [phase, onPhase]);
  // §J: the ticket as it was when the one POST left — what a journal draft calls TICKET-INTENT.
  // Read-only snapshot; it plays no part in the send.
  const sentTicketRef = useRef<FillCaptureIntent | null>(null);

  const futures = intent ? FUTURES_TYPES.has(intent.instrumentType) : false;

  useEffect(() => {
    let live = true;
    fetch("/api/broker/tastytrade/accounts", { cache: "no-store" })
      .then(async r => ({ status: r.status, j: await r.json().catch(() => null) }))
      .then(({ status, j }) => {
        if (live && isOwnerRefusal(j, status)) { setNotYours(true); return; }
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

  // Any change to WHAT would be sent goes back to STAGED and forgets the key:
  // a new ticket, a new preview, a new confirmation, a new key. An order at the
  // broker is never restaged over (the machine refuses; the readback continues).
  const fingerprint = intent ? `${intent.instrumentType}|${intent.symbol}|${intent.action}|${intent.qty}|${intent.limitPx}|${intent.orderType ?? "Limit"}|${intent.stopPx ?? ""}|${intent.tif ?? ""}|${intent.protectiveStopPx ?? ""}|${accountIndex}` : "";
  useEffect(() => {
    if (isInFlightPhase(phaseRef.current)) return;
    const t = stepLiveOrder(phaseRef.current, intent ? { type: "STAGE" } : { type: "DISARM" });
    if (t.accepted) { phaseRef.current = t.phase; setPhase(t.phase); }
    setConfirmed(false); keyRef.current = null; setAnswer(null); setRefusals([]); setPreview(null);
  }, [fingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  // The kill switch takes down anything not yet sent.
  useEffect(() => {
    if (server.limits?.killSwitch && !isInFlightPhase(phaseRef.current)) { step({ type: "KILL" }); setConfirmed(false); }
  }, [server.limits?.killSwitch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Read the order back from tastytrade until it reaches a terminal state.
  useEffect(() => {
    if (!order || isTerminal(order.state)) return;
    let live = true;
    const t = setInterval(() => {
      fetch("/api/broker/tastytrade/orders", { cache: "no-store" })
        .then(r => r.json().catch(() => null))
        .then(j => {
          if (!live || j?.state !== "OK") return;
          const found = (j.accounts as { orders: TtOrderView[] }[]).flatMap(a => a.orders).find(o => o.id === order.id) ?? null;
          step({ type: "READBACK", order: found });
          if (found) setOrder(found);
        })
        .catch(() => {});
    }, 2000);
    return () => { live = false; clearInterval(t); };
  }, [order]); // eslint-disable-line react-hooks/exhaustive-deps

  const account = accounts?.find(a => a.index === accountIndex) ?? null;
  useEffect(() => {
    if (phase !== "SUBMITTING" || !intent) return;
    let view: string | null = journal?.view ?? null;
    if (view == null) {
      // The View in force as the order left: read from the room's live switches and the Views owner.
      try { view = viewNameAtSend(announcedArrangementCapture(), loadSavedLayouts(window.localStorage)); } catch { view = null; }
    }
    sentTicketRef.current = {
      decisionId: ensureDecision(),
      orderIntentId: journal?.orderIntentId ?? null,
      view,
      broker: "tastytrade",
      environment: server.environment ?? null,
      accountTail: account?.tail ?? null,
      instrumentType: intent.instrumentType,
      chartSymbol: intent.chartSymbol ?? null,
      action: intent.action,
      qty: intent.qty,
      orderType: intent.orderType ?? "Limit",
      limitPx: intent.limitPx,
      entryTriggerPx: intent.stopPx ?? null,
      protectiveStopPx: intent.protectiveStopPx ?? null,
      plannedStopPx: journal?.plannedStopPx ?? null,
      targetPx: journal?.targetPx ?? null,
      quote: intent.quote ?? null,
      sentAtMs: Date.now(),
      multiplier: journal?.multiplier ?? intent.multiplier ?? (intent.instrumentType === "Equity" ? 1 : null),
    };
    // Kept for this tab under the idempotency key tastytrade echoes back, so a reload keeps the offer.
    if (keyRef.current) { try { rememberTicketAtSend(window.sessionStorage, keyRef.current, sentTicketRef.current, Date.now()); } catch { /* this visit only */ } }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const accountBlocks = futures && account && account.futuresApproved !== true
    ? `Account …${account.tail} is not futures-enabled at tastytrade. Choose a futures-eligible account.`
    : null;
  const entryType = intent?.orderType ?? "Limit";
  const entryFields = intent ? tastytradeEntryFields(entryType, intent.limitPx, intent.stopPx ?? null) : null;
  const priceOk = entryFields != null;
  // §CXVII: the trader's own commitments on this device, asked before anything can be previewed.
  const guardrails = useGuardrails();
  const guard = intent ? checkOrder(guardrails, intent.instrumentType === "Equity" ? { kind: "EQUITY", qty: intent.qty }
    : intent.instrumentType === "Equity Option" ? { kind: "EQUITY_OPTION", qty: intent.qty, limitPx: intent.limitPx }
    : { kind: intent.instrumentType === "Future" ? "FUTURE" : "FUTURE_OPTION", qty: intent.qty }) : { ok: true as const };
  const ready = !!intent && !!account && !accountBlocks && priceOk && guard.ok && Number.isFinite(intent.qty) && intent.qty > 0 && !busy && !server.limits?.killSwitch;
  const dated = intent?.instrumentType === "Future" ? datedFuturesContract(intent.symbol, Date.now()) : null;
  const environment = server.environment;

  const summary = useMemo(() => {
    if (!intent) return null;
    return `LIVE · TASTYTRADE · ${environment ? environment.toUpperCase() : "ENV ?"} · …${account?.tail ?? "?"} · ${intent.action.toUpperCase()} ${intent.qty} ${intent.describe} · ${entryType === "Market" ? "MARKET · fill price unknown" : entryType === "Stop" ? `STOP ${intent.stopPx ?? "—"}` : entryType === "Stop Limit" ? `STOP ${intent.stopPx ?? "—"} · LIMIT ${intent.limitPx ?? "—"}` : `LIMIT ${intent.limitPx ?? "—"}`} · ${intent.instrumentType === "Cryptocurrency" || intent.tif === "GTC" ? "GTC" : "DAY"}`;
  }, [intent, account, environment, entryType]);

  /** The body both the preview and the send carry — the server checks the same fields. */
  const body = () => intent && entryFields ? {
    instrumentType: intent.instrumentType,
    ...(intent.instrumentType === "Equity Option" ? { optionOsi: intent.symbol } : { symbol: intent.symbol }),
    action: intent.action, qty: intent.qty,
    ...entryFields,
    ...(intent.tif ? { tif: intent.tif } : {}),
    accountIndex, environment,
    ...(intent.protectiveStopPx != null ? { protectiveStopPx: intent.protectiveStopPx } : {}),
    ...(intent.quote ? { quote: intent.quote } : {}),
    ...(intent.multiplier != null ? { multiplier: intent.multiplier } : {}),
  } : null;

  async function previewOrder() {
    if (!ready || accountIndex == null || !step({ type: "PREVIEW" })) return;
    const decisionId = ensureDecision();
    if (!decisionId) { step({ type: "REFUSE", reasons: ["No decision"] }); setAnswer({ state: "REFUSED_LOCAL", reason: "No decision to express — this order needs one." }); return; }
    setBusy(true); setAnswer(null); setRefusals([]); setPreview(null);
    try {
      const r = await fetch("/api/broker/tastytrade/order-dry-run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body(), decisionId }) });
      const j = await r.json().catch(() => null);
      if (isOwnerRefusal(j, r.status)) { setNotYours(true); return; }
      const gate = j?.preflight as { ok: boolean; refusals?: Refusal[] } & Partial<PreviewPass> | undefined;
      if (j?.state === "DRY_RUN_OK" && gate?.ok) {
        const bp = j.result?.["buying-power-effect"];
        const fee = j.result?.["fee-calculation"];
        setPreview({ pass: gate as PreviewPass, bp: bp?.["change-in-buying-power"] ? `${bp["change-in-buying-power-effect"] === "Debit" ? "−" : "+"}${bp["change-in-buying-power"]}` : null, fees: fee?.["total-fees"] ?? null });
        step({ type: "PREVIEW_OK" });
      } else {
        const list = gate && !gate.ok ? gate.refusals ?? [] : [];
        setRefusals(list);
        step({ type: "REFUSE", reasons: list.map(x => x.reason) });
        const errors = Array.isArray(j?.result?.errors) ? j.result.errors.map((e: { message?: string }) => e.message).join("; ") : null;
        setAnswer({ state: j?.state === "DRY_RUN_OK" ? "REFUSED_PREFLIGHT" : j?.state ?? `HTTP ${r.status}`, reason: j?.reason ?? errors ?? undefined });
      }
    } catch {
      step({ type: "REFUSE", reasons: ["The preview did not return."] });
      setAnswer({ state: "NOT_SENT", reason: "The preview did not return. Nothing was placed." });
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!intent || !entryFields || !confirmed || !canSend(phaseRef.current) || accountIndex == null) return;
    const decisionId = ensureDecision();
    if (!decisionId) { setAnswer({ state: "REFUSED_LOCAL", reason: "No decision to express — this order needs one." }); return; }
    if (!step({ type: "SEND" })) return;
    keyRef.current ??= `wmo_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    setBusy(true);
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), SEND_TIMEOUT_MS);
    try {
      const r = await fetch("/api/broker/tastytrade/order-submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body(), decisionId, clientOrderId: keyRef.current, confirmLive: true }),
        signal: abort.signal,
      });
      const j = await r.json().catch(() => null);
      if (isOwnerRefusal(j, r.status)) { setNotYours(true); return; }
      const state = j?.state ?? `HTTP ${r.status}`;
      step({ type: "SUBMIT_ANSWER", state, order: j?.order ?? null });
      if (Array.isArray(j?.refusals)) setRefusals(j.refusals);
      setAnswer({ state, reason: j?.reason ?? j?.error ?? (Array.isArray(j?.result?.errors) ? j.result.errors.map((e: { message?: string }) => e.message).join("; ") : undefined) });
      if (j?.order) setOrder(j.order);
      if (mustReconcileFirst(phaseRef.current)) reconcile();
    } catch {
      // Thrown, aborted or timed out: it may be at tastytrade. UNKNOWN, then ask — never resend.
      step({ type: "TIMEOUT" });
      setAnswer({ state: "UNKNOWN", reason: "The send did not answer. Reconciling with tastytrade before anything else." });
      reconcile();
    } finally {
      clearTimeout(timer);
      setBusy(false);
      setConfirmed(false);
    }
  }

  /** UNKNOWN is resolved by asking the broker for the idempotency key — never by resending. */
  function reconcile() {
    const key = keyRef.current;
    if (!key || !step({ type: "RECONCILE" })) return;
    fetch("/api/broker/tastytrade/orders", { cache: "no-store" })
      .then(r => r.json().catch(() => null))
      .then(j => {
        const found = j?.state === "OK" ? (j.accounts as { orders: TtOrderView[] }[]).flatMap(a => a.orders).find(o => o.externalId === key) ?? null : null;
        step({ type: "READBACK", order: found });
        if (found) { setOrder(found); setAnswer({ state: "RECONCILED", reason: "tastytrade has this order." }); }
        else setAnswer({ state: "UNKNOWN", reason: "tastytrade does not show this order yet. Check again before sending another." });
      })
      .catch(() => { step({ type: "TIMEOUT" }); });
  }

  async function cancel() {
    if (!order || accountIndex == null) return;
    setBusy(true);
    try {
      step({ type: "CANCEL" });
      const r = await fetch(`/api/broker/tastytrade/orders?accountIndex=${accountIndex}&id=${encodeURIComponent(order.id)}`, { method: "DELETE" });
      const j = await r.json().catch(() => null);
      if (j?.order) { setOrder(j.order); step({ type: "READBACK", order: j.order }); }
      else if (isOwnerRefusal(j, r.status)) setNotYours(true);
      else setAnswer({ state: j?.state ?? `HTTP ${r.status}`, reason: j?.reason ?? j?.error });
    } finally {
      setBusy(false);
    }
  }

  if (!intent) return null;
  if (notYours) {
    return (
      <section data-testid="tt-live-order" data-state="NOT_AVAILABLE" aria-label="Live order on tastytrade" style={{ marginTop: 10, border: "1px solid #3a3326", borderRadius: 4, padding: 8 }}>
        <p role="status" style={{ color: MUTED }}>{TASTYTRADE_NOT_AVAILABLE}</p>
      </section>
    );
  }
  const working = order && !isTerminal(order.state);
  const stateColor = (s: WmOrderState) => (s === "FILLED" ? GREEN : s === "REJECTED" || s === "UNKNOWN" ? RED : GOLD);
  const L = server.limits;
  const confirming = phase === "CONFIRMING";

  return (
    <section data-testid="tt-live-order" data-phase={phase} aria-label="Live order on tastytrade" style={{ marginTop: 10, border: `1px solid ${confirming ? RED : "#3a3326"}`, borderRadius: 4, padding: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: RED, fontWeight: 700, letterSpacing: ".08em" }}>LIVE</span>
        <span data-testid="tt-environment" style={{ color: environment === "production" ? RED : GOLD, fontWeight: 700, fontSize: 10, letterSpacing: ".08em" }}>{environment ? environment.toUpperCase() : "ENVIRONMENT UNKNOWN"}</span>
        <label style={{ color: MUTED, display: "flex", gap: 4, alignItems: "center" }}>
          Account
          <select aria-label="Account" value={accountIndex ?? ""} onChange={e => setAccountIndex(Number(e.target.value))} style={{ background: "#0b0a08", border: "1px solid #3a3326", padding: 2 }}>
            {(accounts ?? []).map(a => (
              <option key={a.index} value={a.index}>…{a.tail}{a.accountType ? ` · ${a.accountType}` : ""}{futures ? (a.futuresApproved ? " · futures" : " · no futures") : ""}</option>
            ))}
          </select>
        </label>
        <span data-testid="tt-phase" data-phase={phase} style={{ marginLeft: "auto", color: phase === "UNKNOWN" || phase === "REFUSED" ? RED : phase === "FILLED" ? GREEN : GOLD, fontSize: 10, letterSpacing: ".06em" }}>{PHASE_WORDS[phase]}</span>
      </div>
      {dated ? <p data-testid="tt-dated-contract" style={{ marginTop: 4, color: GOLD, fontVariantNumeric: "tabular-nums" }}>{intent.chartSymbol && intent.chartSymbol.toUpperCase() !== intent.symbol ? `${intent.chartSymbol} → ` : ""}{dated.label} · the contract that would be sent</p> : null}
      <p data-testid="tt-capital-moment" style={{ marginTop: 6, fontVariantNumeric: "tabular-nums", color: "#ede6d3" }}>{summary}</p>
      {server.limits?.killSwitch ? <p role="status" data-testid="tt-kill-engaged" style={{ color: RED, fontWeight: 700 }}>KILL SWITCH ENGAGED — nothing new can be sent. Cancel stays open.</p> : null}
      {server.state === "UNSET" || server.state === "NO_STORE" ? <p role="status" style={{ color: GOLD }}>Server limits are not set — every live send is refused. <button type="button" onClick={() => openSettings("execution")} style={{ color: GOLD, textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}>Set them in Settings › Execution</button></p> : null}
      {accountBlocks ? <p role="status" style={{ color: GOLD }}>{accountBlocks}</p> : null}
      {!priceOk ? <p role="status" style={{ color: GOLD }}>{entryType === "Stop Limit" ? "Set a positive stop trigger and limit price to send." : entryType === "Stop" ? "Set a positive stop trigger to send." : "Set a positive limit price to send."}</p> : null}
      {!guard.ok ? <p role="status" data-testid="tt-guardrail" style={{ color: GOLD }}>{guard.reason}{" "}<button type="button" data-testid="tt-guardrail-open-settings" onClick={() => openSettings("execution")} style={{ color: GOLD, textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}>Open Settings › Execution</button></p> : null}
      {refusals.length ? (
        <ul data-testid="tt-refusals" style={{ marginTop: 6, color: GOLD, paddingLeft: 14, listStyle: "disc" }}>
          {refusals.map((x, i) => <li key={`${x.code}-${i}`} data-code={x.code}>{x.reason}</li>)}
        </ul>
      ) : null}

      {!confirming ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
          <button type="button" data-testid="tt-preview" disabled={!ready || !(phase === "STAGED" || phase === "REFUSED" || phase === "PREVIEWED")} onClick={() => void previewOrder()}
            style={{ padding: "6px 12px", borderRadius: 3, border: `1px solid ${GOLD}`, color: GOLD, background: "transparent", opacity: !ready ? 0.5 : 1 }}>
            {phase === "PREVIEWING" ? "Previewing at tastytrade…" : "Preview live order"}
          </button>
          {phase === "PREVIEWED" ? (
            <button type="button" data-testid="tt-review" onClick={() => step({ type: "CONFIRM" })}
              style={{ padding: "6px 12px", borderRadius: 3, border: `1px solid ${RED}`, color: RED, background: "transparent" }}>
              Review &amp; confirm…
            </button>
          ) : null}
        </div>
      ) : (
        <div data-testid="tt-confirm-sheet" style={{ marginTop: 8, border: `1px solid ${RED}`, borderRadius: 4, padding: 8, display: "grid", gap: 4, fontVariantNumeric: "tabular-nums" }}>
          <strong style={{ color: RED, letterSpacing: ".06em" }}>CONFIRM A LIVE ORDER</strong>
          <span>Broker · tastytrade · {environment?.toUpperCase()} · account …{account?.tail}</span>
          <span>Contract · {dated?.label ?? intent.symbol}{intent.chartSymbol && intent.chartSymbol.toUpperCase() !== intent.symbol ? ` (from ${intent.chartSymbol})` : ""}</span>
          <span>{intent.action} {intent.qty} · {entryType}{intent.limitPx != null ? ` · limit ${intent.limitPx}` : ""}{intent.stopPx != null ? ` · trigger ${intent.stopPx}` : ""} · {intent.tif === "GTC" ? "GTC" : "DAY"}</span>
          <span>Notional {usd(preview?.pass.notionalUsd)} of {usd(L?.maxNotionalUsdPerOrder)} · loss at the stop {usd(preview?.pass.lossAtStopUsd)} of {usd(L?.maxLossUsdPerOrder)} · size {intent.qty} of {intent.instrumentType === "Equity" ? L?.maxSharesPerOrder ?? "—" : L?.maxContractsPerOrder ?? "—"}</span>
          {intent.protectiveStopPx != null ? <span>Protective stop {intent.protectiveStopPx}</span> : null}
          <span data-testid="tt-protection" data-protection={preview?.pass.protection}>Protection · {preview?.pass.riskBound === "PREMIUM" ? "defined risk: a long option's premium is its worst case" : preview?.pass.riskBound === "CLOSING" ? "this order closes risk" : preview ? PROTECTION_WORDS[preview.pass.protection] : "—"}</span>
          {preview?.bp || preview?.fees ? <span style={{ color: MUTED }}>tastytrade dry run · buying power {preview.bp ?? "—"} · fees {preview.fees ?? "—"}</span> : null}
          <span style={{ color: MUTED, fontSize: 11 }}>{CANCEL_REPLACE_LIMITS}</span>
          <label style={{ display: "flex", gap: 6, alignItems: "center", color: confirmed ? RED : MUTED, marginTop: 4 }}>
            <input type="checkbox" data-testid="tt-arm" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
            I have read this. Send it to tastytrade with real money.
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" data-testid="tt-send-live" disabled={!confirmed || busy} onClick={() => void send()}
              style={{ padding: "6px 12px", borderRadius: 3, border: `1px solid ${RED}`, color: confirmed ? "#fff" : RED, background: confirmed ? "#7a2a22" : "transparent", opacity: !confirmed || busy ? 0.5 : 1 }}>
              {busy ? "Sending to tastytrade…" : "Send LIVE order"}
            </button>
            <button type="button" data-testid="tt-back" onClick={() => { setConfirmed(false); step({ type: "BACK" }); }} style={{ padding: "6px 12px", borderRadius: 3, border: "1px solid #3a3326", color: MUTED, background: "transparent" }}>Back</button>
          </div>
        </div>
      )}

      {answer ? <p role="status" data-state={answer.state} style={{ marginTop: 6, color: answer.state === "ACKNOWLEDGED" || answer.state === "RECONCILED" ? GREEN : GOLD }}>{/^HTTP /.test(answer.state) ? `tastytrade did not answer clearly (${answer.state.slice(5)}).` : plainBrokerAnswer(answer.state)}{answer.reason ? ` · ${answer.reason}` : ""}</p> : null}
      {phase === "UNKNOWN" ? (
        <button type="button" data-testid="tt-reconcile" disabled={busy} onClick={() => reconcile()} style={{ marginTop: 4, padding: "2px 10px", border: `1px solid ${RED}`, color: RED, borderRadius: 3 }}>
          Ask tastytrade again (reconcile — never resend)
        </button>
      ) : null}
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
      {phase === "FILLED" && order?.state === "FILLED" && (sentTicketRef.current ??= ticketAtSendFor(order.externalId)) ? (
        <FillJournalOffer intent={sentTicketRef.current} order={order} />
      ) : null}
      <p style={{ marginTop: 4, color: MUTED }}>Real money. Market and stop orders have no guaranteed fill price; limit orders have no guaranteed fill.</p>
    </section>
  );
}
