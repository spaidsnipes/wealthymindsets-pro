"use client";

import { useEffect, useRef, useState } from "react";
import type { OptionContract } from "@/lib/optionContractResponse";
import { formatOptionNumber } from "@/lib/optionCellFormat";
import { mintDecisionId, type DecisionId } from "@/lib/traderMemory/decisionIdentity";
import { thisDeviceId } from "@/lib/traderMemory/deviceIdentity";
import { recordExpressionIntent } from "@/lib/traderMemory/recordExpressionIntent";

/** An expression under review, never a position or an executable quote. */
export function OptionExpressionIntent({ ownerId, underlying, contract, source, fidelity, providerTimestamp, onClear }: {
  ownerId: string; underlying: string; contract: OptionContract; source: "alpaca"; fidelity: "INDICATIVE"; providerTimestamp: string; onClear: () => void;
}) {
  const identity = useRef<{ decisionId: DecisionId; deviceId: string; intent: string } | null>(null);
  const pending = useRef(false);
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [receipt, setReceipt] = useState("");
  const [decisionId, setDecisionId] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function record() {
    if (pending.current || recorded || !purpose.trim()) return;
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
          intent: `Review ${underlying} expression: ${contract.symbol}; ${contract.contractType}; strike ${contract.strike}; expiry ${contract.expirationDate}. Purpose: ${purpose.trim()}. Reference source ${source}; fidelity ${fidelity}; provider timestamp ${providerTimestamp}; executable quote and contract binding unverified. No order requested.` };
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
    <p className="mt-1 text-wm-gold">{source === "alpaca" ? "Alpaca" : "Unknown source"} reference · {fidelity.toLowerCase()} · provider {providerTimestamp} · not an executable quote</p>
    <p className="mt-1 text-wm-text-muted">Contract-to-underlying binding and broker support need verification. This review does not open a position.</p>
    <label className="mt-2 block">Purpose
      <input value={purpose} disabled={busy || !!identity.current} maxLength={500} onChange={e => setPurpose(e.target.value)} placeholder="What is the underlying thesis?" className="mt-1 w-full rounded border border-wm-border bg-wm-surface p-2" />
    </label>
    <button type="button" disabled={!ownerId || busy || recorded || !purpose.trim()} onClick={() => void record()} className="mt-2 rounded border border-wm-gold px-3 py-2 text-wm-gold disabled:opacity-50">{!ownerId ? "Sign in to record intent" : busy ? "Checking shared record…" : recorded ? "Intent recorded" : decisionId ? "Retry same intent" : "Record expression intent"}</button>
    <p role="status" className="mt-2">{receipt}</p>
    {decisionId && <p className="mt-1 break-all text-wm-text-muted">Decision: {decisionId}. Only intent text is shared; structured contract recovery is not yet supported.</p>}
  </section>;
}
