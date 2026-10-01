"use client";

/**
 * GARDEN 18 §XC–§XCIII — BROKER ELIGIBILITY, ACCOUNT AND PREFLIGHT for the
 * option the trader selected, inside the expression it belongs to.
 *
 * One WM ticket, the broker adapter second (§LXXIV): the contract is the
 * selected OSI identity (the route parses it; nothing here re-types strike,
 * expiry or right), the decision is the one the expression already carries,
 * and the answer is Webull's own preview. A preview is NOT an order — placing
 * is not enabled from here (§CXXIV), and the panel says so.
 */

import React, { useState } from "react";

type Answer = {
  readonly state?: string;
  readonly reason?: string;
  readonly note?: string;
  readonly payload?: unknown;
  readonly accounts?: readonly { index: number; accountType: string | null; tail: string }[];
  readonly accountIndex?: number;
};

const INTENTS = [
  { v: "BUY_TO_OPEN", label: "Buy to open", side: "buy" },
  { v: "SELL_TO_CLOSE", label: "Sell to close", side: "sell" },
] as const;

/** A short, honest reading of Webull's preview answer: its own fields, never invented. */
function previewWords(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Webull accepted the preview.";
  const flat = JSON.stringify(payload);
  const pick = (k: string) => {
    const m = new RegExp(`"${k}"\\s*:\\s*"?([^",}]+)`).exec(flat);
    return m ? m[1] : null;
  };
  const cost = pick("estimated_cost") ?? pick("estimatedCost");
  const fee = pick("estimated_transaction_fee") ?? pick("estimated_commission") ?? pick("commission");
  const parts = [cost ? `estimated cost ${cost}` : null, fee ? `fees ${fee}` : null].filter(Boolean);
  return parts.length ? `Webull accepted the preview · ${parts.join(" · ")}.` : `Webull accepted the preview · ${flat.slice(0, 160)}`;
}

export function WebullOptionPreflight({ osi, decisionId, referenceAsk }: {
  readonly osi: string;
  /** The decision this expression belongs to; null until it is recorded. */
  readonly decisionId: string | null;
  readonly referenceAsk: number | null;
}) {
  const [intent, setIntent] = useState<(typeof INTENTS)[number]["v"]>("BUY_TO_OPEN");
  const [qty, setQty] = useState(1);
  const [limit, setLimit] = useState<string>(referenceAsk != null ? referenceAsk.toFixed(2) : "");
  const [accountIndex, setAccountIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);

  async function preflight() {
    if (!decisionId || busy) return;
    setBusy(true);
    try {
      const side = INTENTS.find(i => i.v === intent)!.side;
      const r = await fetch("/api/broker/webull/order-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ optionOsi: osi, positionIntent: intent, side, qty, type: "limit", limitPx: Number(limit), tif: "day", decisionId, accountIndex }),
      });
      const j = (await r.json().catch(() => null)) as Answer | null;
      setAnswer(j ?? { state: `HTTP ${r.status}` });
      if (j && typeof j.accountIndex === "number") setAccountIndex(j.accountIndex);
    } catch {
      setAnswer({ state: "NO_ANSWER", reason: "The preflight request did not return." });
    } finally {
      setBusy(false);
    }
  }

  const state = answer?.state ?? null;
  const tone = state === "PREVIEWED" ? "text-wm-green" : state ? "text-wm-gold" : "text-wm-text-muted";
  return (
    <section aria-label="Broker preflight" data-testid="webull-option-preflight" className="mt-3 rounded border border-wm-border p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold uppercase tracking-wider text-[10px] text-wm-text-muted">Broker eligibility</span>
        <span data-testid="eligibility-webull" className="rounded border border-wm-gold/60 px-2 py-0.5 text-[10px] text-wm-gold">Webull · option preview</span>
        <span data-testid="eligibility-tastytrade" className="rounded border border-wm-border px-2 py-0.5 text-[10px] text-wm-text-muted" title="tastytrade has its client credentials but no refresh token: the owner has not signed in to tastytrade yet.">tastytrade · not connected</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-wm-text-muted">Intent</span>
          <select value={intent} onChange={e => setIntent(e.target.value as typeof intent)} className="rounded border border-wm-border bg-wm-dark px-1 py-1">
            {INTENTS.map(i => <option key={i.v} value={i.v}>{i.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-wm-text-muted">Contracts</span>
          <input type="number" min={1} step={1} value={qty} onChange={e => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="rounded border border-wm-border bg-wm-dark px-1 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-wm-text-muted">Limit premium</span>
          <input inputMode="decimal" value={limit} onChange={e => setLimit(e.target.value)} className="rounded border border-wm-border bg-wm-dark px-1 py-1" aria-describedby="limit-note" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-wm-text-muted">Account</span>
          <select value={accountIndex} onChange={e => setAccountIndex(Number(e.target.value))} className="rounded border border-wm-border bg-wm-dark px-1 py-1">
            {(answer?.accounts?.length ? answer.accounts : [{ index: 0, accountType: null, tail: "first" }]).map(a => (
              <option key={a.index} value={a.index}>{a.accountType ?? "Account"} · …{a.tail}</option>
            ))}
          </select>
        </label>
      </div>
      <p id="limit-note" className="mt-1 text-wm-text-muted">Limit starts at the reference ask (a stale reference is not an executable quote — set your own price).</p>
      <button
        type="button"
        data-testid="webull-preflight"
        onClick={() => void preflight()}
        disabled={!decisionId || busy || !(Number(limit) > 0)}
        className="mt-2 rounded border border-wm-gold px-3 py-2 text-wm-gold disabled:opacity-50"
      >
        {!decisionId ? "Record the expression first — preflight needs its decision" : busy ? "Asking Webull…" : "Preflight with Webull"}
      </button>
      {state ? (
        <p data-testid="webull-preflight-answer" data-state={state} className={`mt-2 ${tone}`} role="status">
          {state === "PREVIEWED" ? previewWords(answer?.payload) : `${state.replace(/_/g, " ")}${answer?.reason ? ` · ${answer.reason}` : answer?.note ? ` · ${answer.note}` : ""}`}
        </p>
      ) : null}
      <p className="mt-1 text-wm-text-muted">A preview is not an order. Placing an option order is not enabled from WM Pro yet.</p>
    </section>
  );
}
