"use client";

import { useEffect, useRef, useState } from "react";
import {
  OPTION_CHAIN_SOURCE,
  type OptionChainFidelity,
  type OptionChainSource,
  type OptionContract,
} from "@/lib/optionContractResponse";
import { formatOptionNumber } from "@/lib/optionCellFormat";
import { optionContractObservationTiming, type OptionsReceiptAge } from "@/lib/optionsChainRead";
import { mintDecisionId, type DecisionId } from "@/lib/traderMemory/decisionIdentity";
import { thisDeviceId } from "@/lib/traderMemory/deviceIdentity";
import { recordExpressionIntent } from "@/lib/traderMemory/recordExpressionIntent";
import { OptionDecisionReceipt } from "./OptionDecisionReceipt";

/** An expression under review, never a position or an executable quote. */
export function OptionExpressionIntent({ ownerId, underlying, contract, source, fidelity, providerPath, rightsPolicyId, onClear }: {
  ownerId: string; underlying: string; contract: OptionContract; source: OptionChainSource; fidelity: OptionChainFidelity;
  /**
   * The REVIEWED provider identity and rights policy, carried from
   * `capabilityRegistry` through the producer and the read path. `source` and
   * `fidelity` above say who spoke and how good the number is; these two say
   * what we are allowed to DO with it — and they are what survives into the
   * shared decision record, where the question gets asked months later.
   *
   * `null` means the registry could not resolve the producer: silence, not a
   * reviewed refusal. The read path already fails such a chain closed, so a
   * null here means something bypassed that gate, and recording must refuse.
   */
  providerPath: string | null; rightsPolicyId: string | null;
  onClear: () => void;
}) {
  const identity = useRef<{ decisionId: DecisionId; deviceId: string; intent: string } | null>(null);
  const pending = useRef(false);
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [receipt, setReceipt] = useState("");
  const [decisionId, setDecisionId] = useState("");
  const request = useRef<AbortController | null>(null);
  const [receiptClock, setReceiptClock] = useState<number | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const tick = () => setReceiptClock(Date.now());
    tick();
    const clock = window.setInterval(tick, 60_000);
    return () => window.clearInterval(clock);
  }, []);

  const observationTiming = optionContractObservationTiming(contract, receiptClock ?? Number.NaN);
  const timingLabel = (age: OptionsReceiptAge) => age.timing === "RECENT"
    ? `RECENT REFERENCE · ${age.label}`
    : age.timing === "STALE"
      ? `STALE REFERENCE · ${age.label}`
      : `REFERENCE TIMING UNVERIFIED · ${age.label}`;
  const quoteTiming = timingLabel(observationTiming.quote);
  const tradeTiming = timingLabel(observationTiming.trade);
  // A chain with no reviewed provenance may be LOOKED at — the trader can see
  // the reference and decide it is useless — but it must not be written into
  // the shared record, because that record outlives the screen and nothing in
  // it would later be able to answer "what were we allowed to do with this?".
  const reviewedProvenance = Boolean(providerPath && rightsPolicyId);
  const canRecord = receiptClock !== null && observationTiming.reviewable && reviewedProvenance;

  async function record() {
    if (pending.current || recorded || !purpose.trim() || !canRecord) return;
    pending.current = true;
    setBusy(true);
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      if (!identity.current) {
        const deviceId = thisDeviceId();
        const born = mintDecisionId({ cause: "EXPLICIT_INTENT", deviceId, nowMs: Date.now(), nonce: crypto.randomUUID() });
        if (!born.ok) { setReceipt(born.reason); return; }
        identity.current = { decisionId: born.identity.decisionId, deviceId,
          intent: `Review ${underlying} expression: ${contract.symbol}; ${contract.contractType}; strike ${contract.strike}; expiry ${contract.expirationDate}. Purpose: ${purpose.trim()}. Reference source ${source}; reviewed provider ${providerPath}; rights policy ${rightsPolicyId}; fidelity ${fidelity}; quote timestamp ${contract.quoteTimestamp ?? "not observed"}; quote timing ${observationTiming.quote.timing}; trade timestamp ${contract.tradeTimestamp ?? "not observed"}; trade timing ${observationTiming.trade.timing}; source OSI identity matches the selected underlying, side, expiry, and strike; executable quote and broker instrument mapping/support remain unverified. No order requested.` };
        setDecisionId(born.identity.decisionId);
      }
      const result = await recordExpressionIntent(identity.current, fetch, controller.signal, ownerId);
      setRecorded(result.recorded);
      setReceipt(result.note);
    } catch {
      setReceipt("Could not confirm the intent record. Retry keeps the same decision identity.");
    } finally { clearTimeout(timeout); pending.current = false; setBusy(false); }
  }

  return <section aria-label="Selected option expression" className="shrink-0 border-t border-wm-border bg-wm-dark p-3 text-xs text-wm-text">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">{underlying} → {contract.strike} {contract.contractType.toUpperCase()} · {contract.expirationDate}</h3>
      <button type="button" onClick={onClear} disabled={busy} className="underline">Clear expression</button>
    </div>
    <p className="mt-1 break-all font-mono text-wm-text-muted">{contract.symbol}</p>
    <p className="mt-2">Reference bid {formatOptionNumber(contract.bid, 2)} · ask {formatOptionNumber(contract.ask, 2)} · last {formatOptionNumber(contract.last, 2)}</p>
    <p className="mt-1 text-wm-gold" title={`Quote timestamp: ${contract.quoteTimestamp ?? "not observed"}; trade timestamp: ${contract.tradeTimestamp ?? "not observed"}`}>
      {source === OPTION_CHAIN_SOURCE ? "Alpaca" : "Unknown source"} reference · {fidelity.toLowerCase()} · quote {quoteTiming} · trade {tradeTiming} · not an executable quote
    </p>
    {reviewedProvenance
      ? <p className="mt-1 text-wm-text-muted">Reviewed provider {providerPath} · rights policy {rightsPolicyId}. Retention, redistribution and training rights are UNKNOWN for this reference; only your intent text is shared.</p>
      : <p role="status" className="mt-1 text-wm-gold">This chain carries no reviewed provider identity or rights policy. You can read it, but WM will not write it to the shared record — a decision that outlives the screen must be able to say what it was allowed to do with its source.</p>}
    {reviewedProvenance && !canRecord && <p role="status" className="mt-1 text-wm-gold">Reference timing is unverified for both the exact quote and trade. Recording stays unavailable until a provider observation has verifiable chronology.</p>}
    <p className="mt-1 text-wm-text-muted">Source OSI identity matches the selected underlying, side, expiry, and strike. Executable broker instrument mapping and support remain unverified. This review does not open a position.</p>
    <label className="mt-2 block">Purpose
      <input value={purpose} disabled={busy || !!identity.current} maxLength={500} onChange={e => setPurpose(e.target.value)} placeholder="What is the underlying thesis?" className="mt-1 w-full rounded border border-wm-border bg-wm-surface p-2" />
    </label>
    <button type="button" disabled={!ownerId || busy || recorded || !purpose.trim() || !canRecord} onClick={() => void record()} className="mt-2 rounded border border-wm-gold px-3 py-2 text-wm-gold disabled:opacity-50">{!ownerId ? "Sign in to record intent" : busy ? "Checking shared record…" : recorded ? "Intent recorded" : !reviewedProvenance ? "Source provenance unreviewed" : !canRecord ? "Reference timing unverified" : decisionId ? "Retry same intent" : "Record expression intent"}</button>
    <p role="status" className="mt-2">{receipt}</p>
    {decisionId && <p className="mt-1 break-all text-wm-text-muted">Decision: {decisionId}. Only intent text is shared; structured contract recovery is not yet supported.</p>}
    {decisionId && !busy && <OptionDecisionReceipt key={`${ownerId}:${decisionId}`} decisionId={decisionId} ownerId={ownerId} />}
  </section>;
}
