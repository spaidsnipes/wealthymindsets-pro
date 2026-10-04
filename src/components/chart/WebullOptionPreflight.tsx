"use client";

/**
 * GARDEN 18 §XC–§XCIII — BROKER ELIGIBILITY, ACCOUNT AND PREFLIGHT for the
 * option the trader selected, inside the expression it belongs to.
 *
 * One WM ticket, the broker adapter second (§LXXIV): the contract is the
 * selected OSI identity (the route parses it; nothing here re-types strike,
 * expiry or right), the decision is the one the expression already carries,
 * and the answer is the broker's own preview / dry run. A preview is NOT an
 * order: the live send (WebullLiveOrder / TastytradeLiveOrder) appears only
 * after the broker accepts it, and only an armed press sends.
 */

import React, { useEffect, useState } from "react";

import { TastytradeLiveOrder } from "@/components/chart/TastytradeLiveOrder";
import { WebullLiveOrder } from "@/components/chart/WebullLiveOrder";
import { isOwnerRefusal, plainBrokerAnswer } from "@/lib/broker/ownerRefusal";

type Answer = {
  readonly state?: string;
  readonly reason?: string;
  readonly note?: string;
  readonly error?: string;
  readonly code?: string;
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

/** tastytrade's dry-run answer in its own documented fields (buying-power-effect, fee-calculation, warnings). */
function dryRunWords(result: unknown): string {
  const r = (result ?? {}) as { "buying-power-effect"?: { "change-in-buying-power"?: string; "change-in-buying-power-effect"?: string }; "fee-calculation"?: { "total-fees"?: string; "total-fees-effect"?: string }; warnings?: { message?: string }[] };
  const bp = r["buying-power-effect"];
  const fee = r["fee-calculation"];
  const parts = [
    bp?.["change-in-buying-power"] ? `buying power ${bp["change-in-buying-power-effect"] === "Debit" ? "−" : "+"}${bp["change-in-buying-power"]}` : null,
    fee?.["total-fees"] ? `fees ${fee["total-fees"]}` : null,
    r.warnings?.length ? `warnings: ${r.warnings.map(w => w.message).filter(Boolean).join("; ")}` : null,
  ].filter(Boolean);
  return `tastytrade accepted the dry run${parts.length ? ` · ${parts.join(" · ")}` : ""} — nothing was placed.`;
}

export function WebullOptionPreflight({ osi, decisionId, referenceAsk, referenceIsLive = false }: {
  readonly osi: string;
  /** The decision this expression belongs to; null until it is recorded. */
  readonly decisionId: string | null;
  readonly referenceAsk: number | null;
  /** True when referenceAsk is tastytrade's live ask, not the indicative reference. */
  readonly referenceIsLive?: boolean;
}) {
  const [intent, setIntent] = useState<(typeof INTENTS)[number]["v"]>("BUY_TO_OPEN");
  const [qty, setQty] = useState(1);
  const [limit, setLimit] = useState<string>(referenceAsk != null ? referenceAsk.toFixed(2) : "");
  // The starting limit follows the reference until the trader types their own
  // price — so a live ask that arrives after mount replaces a stale one, and
  // the trader's own number is never overwritten.
  const limitTouched = React.useRef(false);
  useEffect(() => {
    if (!limitTouched.current && referenceAsk != null) setLimit(referenceAsk.toFixed(2));
  }, [referenceAsk]);
  const [accountIndex, setAccountIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  // §LXXVI: the trader chooses the route; a failure on one never reroutes to the other.
  const [route, setRoute] = useState<"WEBULL" | "TASTYTRADE">("WEBULL");
  const [tt, setTt] = useState<{ connected: boolean; note: string } | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/broker/tastytrade/status", { cache: "no-store" })
      .then(r => r.json().catch(() => null))
      .then((j: { capabilities?: { connected?: boolean; accounts?: number; note?: string }; connected?: boolean; accounts?: number; note?: string; error?: string; code?: string } | null) => {
        if (!live) return;
        const c = j?.capabilities ?? j;
        setTt({ connected: Boolean(c?.connected) && (c?.accounts ?? 0) > 0, note: isOwnerRefusal(j) ? "Not available on your account." : c?.note || j?.error || "" });
      })
      .catch(() => { if (live) setTt({ connected: false, note: "Status did not answer." }); });
    return () => { live = false; };
  }, []);

  async function preflight() {
    if (!decisionId || busy) return;
    setBusy(true);
    try {
      const side = INTENTS.find(i => i.v === intent)!.side;
      const r = route === "WEBULL"
        ? await fetch("/api/broker/webull/order-preview", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ optionOsi: osi, positionIntent: intent, side, qty, type: "limit", limitPx: Number(limit), tif: "day", decisionId, accountIndex }),
          })
        : await fetch("/api/broker/tastytrade/order-dry-run", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ instrumentType: "Equity Option", optionOsi: osi, action: intent === "BUY_TO_OPEN" ? "Buy to Open" : "Sell to Close", qty, type: "Limit", limitPx: Number(limit), decisionId, accountIndex }),
          });
      const j = (await r.json().catch(() => null)) as Answer | null;
      // guest audit 2026-10-04: the owner gate's 403 has no state — it must still answer, in plain words.
      if (isOwnerRefusal(j, r.status)) setAnswer({ state: "NOT_AVAILABLE" });
      else if (!j?.state) setAnswer({ state: "NO_ANSWER", reason: j?.error ?? `The broker answered ${r.status} with no reading.` });
      else setAnswer(j);
      if (j && typeof j.accountIndex === "number") setAccountIndex(j.accountIndex);
    } catch {
      setAnswer({ state: "NO_ANSWER", reason: "The preflight request did not return." });
    } finally {
      setBusy(false);
    }
  }

  const state = answer?.state ?? null;
  const tone = state === "PREVIEWED" ? "text-wm-green" : state && state !== "NOT_AVAILABLE" ? "text-wm-gold" : "text-wm-text-muted";
  return (
    <section aria-label="Broker preflight" data-testid="webull-option-preflight" className="mt-3 rounded border border-wm-border p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold uppercase tracking-wider text-[10px] text-wm-text-muted">Broker eligibility</span>
        {(["WEBULL", "TASTYTRADE"] as const).map(b => {
          const eligible = b === "WEBULL" || tt?.connected === true;
          const label = b === "WEBULL" ? "Webull · option preview" : tt === null ? "tastytrade · checking" : tt.connected ? "tastytrade · dry run" : "tastytrade · not connected";
          return (
            <button
              key={b}
              type="button"
              data-testid={`eligibility-${b.toLowerCase()}`}
              aria-pressed={route === b}
              disabled={!eligible}
              title={b === "TASTYTRADE" && tt && !tt.connected ? (tt.note || "tastytrade is not connected on this deployment.") : undefined}
              onClick={() => { setRoute(b); setAnswer(null); }}
              className="rounded border px-2 py-0.5 text-[10px] disabled:opacity-50"
              style={{ borderColor: route === b ? "rgba(212,175,55,0.8)" : "rgba(139,106,41,0.35)", color: route === b ? "#d4af37" : "#C8C0AE" }}
            >
              {label}
            </button>
          );
        })}
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
          <input inputMode="decimal" value={limit} onChange={e => { limitTouched.current = true; setLimit(e.target.value); }} className="rounded border border-wm-border bg-wm-dark px-1 py-1" aria-describedby="limit-note" />
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
      <p id="limit-note" className="mt-1 text-wm-text-muted">{referenceIsLive ? "Limit starts at tastytrade's live ask and follows it until you type your own price." : "Limit starts at the reference ask (a stale reference is not an executable quote — set your own price)."}</p>
      <button
        type="button"
        data-testid="webull-preflight"
        onClick={() => void preflight()}
        disabled={!decisionId || busy || !(Number(limit) > 0)}
        className="mt-2 rounded border border-wm-gold px-3 py-2 text-wm-gold disabled:opacity-50"
      >
        {!decisionId ? "Record the expression first — preflight needs its decision" : busy ? `Asking ${route === "WEBULL" ? "Webull" : "tastytrade"}…` : route === "WEBULL" ? "Preflight with Webull" : "Dry run on tastytrade"}
      </button>
      {state ? (
        <p data-testid="webull-preflight-answer" data-state={state} className={`mt-2 ${tone}`} role="status">
          {state === "PREVIEWED" ? previewWords(answer?.payload) : state === "DRY_RUN_OK" ? dryRunWords((answer as { result?: unknown } | null)?.result) : state === "NOT_AVAILABLE" ? "Not available on your account." : `${plainBrokerAnswer(state)}${answer?.reason ? ` · ${answer.reason}` : answer?.note ? ` · ${answer.note}` : ""}`}
        </p>
      ) : null}
      {state === "PREVIEWED" && route === "WEBULL" && decisionId ? (
        <WebullLiveOrder
          intent={{ osi, positionIntent: intent, qty, limitPx: Number(limit) > 0 ? Number(limit) : null }}
          accountIndex={accountIndex}
          accountLabel={(() => { const a = answer?.accounts?.find(x => x.index === accountIndex); return a ? `${a.accountType ?? "Account"} · …${a.tail}` : `account #${accountIndex + 1}`; })()}
          decisionId={decisionId}
        />
      ) : null}
      {state === "DRY_RUN_OK" && route === "TASTYTRADE" && decisionId ? (
        <TastytradeLiveOrder
          intent={{ instrumentType: "Equity Option", symbol: osi, action: intent === "BUY_TO_OPEN" ? "Buy to Open" : "Sell to Close", qty, limitPx: Number(limit) > 0 ? Number(limit) : null, describe: osi }}
          ensureDecision={() => decisionId}
        />
      ) : null}
      <p className="mt-1 text-wm-text-muted">A preview is not an order. A live order is sent only by the armed button that appears once the broker accepts the preview.</p>
    </section>
  );
}
