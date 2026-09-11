"use client";

import { useEffect, useRef, useState } from "react";
import { projectDecision, type DecisionProjection } from "@/lib/traderMemory/projectDecision";

/** Read-only projection of the existing account authority, never a local book. */
export function OptionDecisionReceipt({ decisionId, ownerId }: { decisionId: string; ownerId: string }) {
  const [answer, setAnswer] = useState<DecisionProjection | null>(null);
  const [checking, setChecking] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function inspect() {
    if (request.current || !ownerId) return;
    const controller = new AbortController();
    request.current = controller;
    setChecking(true);
    setAnswer(null);
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const transport: typeof fetch = (url, init) => {
        const headers = new Headers(init?.headers);
        headers.set("x-wm-intent-owner", ownerId);
        return fetch(url, { ...init, headers, signal: controller.signal });
      };
      const result = await projectDecision(decisionId, transport, controller.signal);
      setAnswer(controller.signal.aborted ? unavailable : result);
    } catch { setAnswer(unavailable); }
    finally {
      clearTimeout(timeout);
      request.current = null;
      setChecking(false);
    }
  }

  return <section aria-label="Shared decision receipt" className="mt-4 border-t border-wm-border pt-3">
    <h4 className="font-semibold">Your account record</h4>
    <p className="mt-1 text-wm-text-muted">Read this same decision without submitting or changing an order.</p>
    <button type="button" disabled={checking || !ownerId} onClick={() => void inspect()}
      className="mt-2 min-h-11 rounded border border-wm-border px-3 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold">
      {checking ? "Reading account record…" : "Check shared decision"}
    </button>
    <OptionDecisionReceiptAnswer answer={answer} />
  </section>;
}

const unavailable: DecisionProjection = { status: "UNVERIFIED", position: null,
  note: "Could not confirm the account record. Retry this same decision; no order was sent." };

export function OptionDecisionReceiptAnswer({ answer }: { answer: DecisionProjection | null }) {
  if (!answer) return null;
  const position = answer.status === "PROJECTED" ? answer.position : null;
  return <div className="mt-3" role="status">
    <p>{answer.note}</p>
    {position && <>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <dt className="text-wm-text-muted">Intent</dt><dd>{position.intent === null ? "Not observed" : "On account record"}</dd>
        <dt className="text-wm-text-muted">Execution</dt><dd>{position.executionState ?? "Not observed"}</dd>
        <dt className="text-wm-text-muted">Filled quantity</dt><dd>{position.quantityFilled ?? "Not observed"}</dd>
        <dt className="text-wm-text-muted">Protected quantity</dt><dd>{position.quantityProtected ?? "Not observed"}</dd>
        <dt className="text-wm-text-muted">Protection</dt><dd>{position.protectionState ?? "Not observed"}</dd>
      </dl>
      <p className="mt-2 text-wm-text-muted">Readback only. This does not certify a live position or current protection.</p>
      <details className="mt-3"><summary className="cursor-pointer py-2">Recorded intent and identity</summary>
        <p className="break-all">{position.decisionId} · revision {position.reconVersion}</p>
        <p className="mt-2 whitespace-pre-wrap break-words">{position.intent ?? "No intent observed."}</p>
      </details>
    </>}
  </div>;
}
