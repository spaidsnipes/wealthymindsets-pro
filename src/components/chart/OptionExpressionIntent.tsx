"use client";

import { useEffect, useRef, useState } from "react";
import {
  OPTION_CHAIN_SOURCE,
  nominalOptionExpiryMs,
  type OptionChainFidelity,
  type OptionChainSource,
  type OptionContract,
} from "@/lib/optionContractResponse";
import { selectQuoteStance } from "@/lib/expressionCard";
import { formatOptionNumber } from "@/lib/optionCellFormat";
import { optionContractObservationTiming, optionsObservationStamp, type OptionsReceiptAge } from "@/lib/optionsChainRead";
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

  // THE THREE PRE-TRADE JUDGEMENTS (BUILD ORDER §3, the attached object).
  //
  // Delegated to the same owner /paper uses, so the chart and the blotter
  // cannot hold different opinions about what WIDE means. `receiptClock` is
  // null until the first post-mount tick, which yields timeFit UNKNOWN — the
  // honest answer before this browser has stated what time it is, and the
  // reason the clock is not read during render (that was a live #418
  // hydration defect in this repo once already).
  const stance = selectQuoteStance({
    bid: contract.bid ?? null,
    ask: contract.ask ?? null,
    // No modeled premium is offered here. This surface reviews an OBSERVED
    // chain; inventing a MODELED number where the provider printed nothing
    // would manufacture certainty at exactly the moment the trader is deciding.
    expiryMs: nominalOptionExpiryMs(contract.expirationDate),
    nowMs: receiptClock,
  });
  const observationTiming = optionContractObservationTiming(contract, receiptClock ?? Number.NaN);
  const timingLabel = (age: OptionsReceiptAge) => age.timing === "RECENT"
    ? `RECENT REFERENCE · ${age.label}`
    : age.timing === "STALE"
      ? `STALE REFERENCE · ${age.label}`
      : `REFERENCE TIMING UNVERIFIED · ${age.label}`;
  const quoteTiming = timingLabel(observationTiming.quote);
  const tradeTiming = timingLabel(observationTiming.trade);
  // THE INSTANT, NOT THE AGE. `quoteTiming`/`tradeTiming` above are relative —
  // "4m old" is only as good as the clock that said so, and a trader cannot
  // check it against anything. These absolute stamps lived ONLY in the `title`
  // attribute two paragraphs down, which is a pointer affordance: on the phone
  // and iPad that the mobile-and-visual-confirmation standard names PRIMARY,
  // there is no hover, so the one auditable fact about a reference price was
  // unreachable on the devices that matter most. They are rendered as text now.
  // Null when this browser has not yet stated the time — the same post-mount
  // gate the stance already waits on, because local zone rendering during SSR
  // is the #418 hydration defect this repo has shipped before.
  const quoteStamp = optionsObservationStamp(contract.quoteTimestamp ?? null, receiptClock ?? Number.NaN);
  const tradeStamp = optionsObservationStamp(contract.tradeTimestamp ?? null, receiptClock ?? Number.NaN);
  // "not observed" and "we cannot say when yet" are different facts. A provider
  // that printed a timestamp this browser has not yet been able to localise was
  // still observed; calling that "not observed" would blame the provider for
  // our own clock. Three outcomes, three words.
  const stampText = (raw: string | null | undefined, stamp: string | null) =>
    stamp ?? (raw ? "awaiting this browser's clock" : "not observed");
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
    {/* The attached object's three pre-trade judgements. Every one of them
        states its own UNKNOWN rather than going quiet, because a missing row
        reads as "nothing to worry about" and that is the one thing it never
        means. No colour carries a meaning a word does not also carry. */}
    <dl className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-3" aria-label="Contract stance">
      <div>
        <dt className="text-wm-text-muted">Sell-now reference</dt>
        <dd>
          {stance.premium === null
            ? <span className="text-wm-gold">UNKNOWN · no sourced quote</span>
            : <>{formatOptionNumber(stance.premium, 2)} · <span className="text-wm-gold">{stance.role}</span></>}
        </dd>
      </div>
      <div>
        <dt className="text-wm-text-muted">Spread</dt>
        <dd>
          {stance.spreadHealth === "UNKNOWN"
            ? <span className="text-wm-gold">UNKNOWN</span>
            : <>{formatOptionNumber(stance.spreadAbs, 2)} · {formatOptionNumber(stance.spreadPctOfMid, 1)}% of mid · <span className={stance.spreadHealth === "WIDE" ? "text-wm-gold" : undefined}>{stance.spreadHealth}</span></>}
        </dd>
      </div>
      <div>
        <dt className="text-wm-text-muted">Time fit</dt>
        {/* The caveat that used to live here as a `title` said the reading ran
            one hour conservative under Eastern Standard Time. That was true of
            a hardcoded 20:00Z and is no longer true of anything —
            `nominalOptionExpiryMs` now resolves the real New York close — so
            it is deleted rather than reworded. What survives of it is the
            genuine remaining limit, and that is rendered as TEXT below, for
            the same reason the observation stamps were: this surface's primary
            devices have no hover, and a caveat nobody can reach is a caveat
            that is not being made. */}
        <dd>
          {stance.timeFit === "UNKNOWN"
            ? <span className="text-wm-gold">UNKNOWN</span>
            : <><span className={stance.timeFit === "0DTE" || stance.timeFit === "EXPIRED" ? "text-wm-gold" : undefined}>{stance.timeFit}</span>{stance.hoursToExpiry !== null && stance.hoursToExpiry > 0 && <> · {formatOptionNumber(stance.hoursToExpiry, 0)}h to nominal expiry</>}</>}
        </dd>
      </div>
    </dl>
    <p className="mt-1 text-wm-text-muted">The sell-now reference is the conservative exit number for a long contract and carries the role it came from. A MID is not an offer anyone has made. Spread health and time fit describe this contract only; neither says the option market is open. Time fit is measured to the standard 16:00 New York close and does not know about half-days or holidays.</p>
    <p className="mt-1 text-wm-gold" title={`Quote timestamp: ${contract.quoteTimestamp ?? "not observed"}; trade timestamp: ${contract.tradeTimestamp ?? "not observed"}`}>
      {source === OPTION_CHAIN_SOURCE ? "Alpaca" : "Unknown source"} reference · {fidelity.toLowerCase()} · quote {quoteTiming} · trade {tradeTiming} · not an executable quote
    </p>
    {/* The same two observations as an INSTANT rather than an age, so the
        trader can hold them against the clock in front of them. This is the
        `asOf` half of role/source/asOf; the role sits in the stance grid above
        and the source in the line above this one. Text, not a tooltip — the
        primary devices have no hover. */}
    <p className="mt-1 text-wm-text-muted">
      Observed at · quote {stampText(contract.quoteTimestamp, quoteStamp)} · trade {stampText(contract.tradeTimestamp, tradeStamp)}. The provider stated the instant; your device stated the time zone.
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
