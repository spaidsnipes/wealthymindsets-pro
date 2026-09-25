"use client";
/**
 * PREVIEW AT WEBULL — the non-money rung of the execution path (GP12 §40).
 *
 * Under a drawn Long/Short plan: a share count and one button. Webull is asked
 * to validate and price a LIMIT order at the plan's entry on the owner's
 * account WITHOUT placing it, and its own answer is printed back. There is no
 * place button here, on purpose — live orders open only on the Founder's
 * explicit live-test instruction.
 */
import React from "react";

type Answer =
  | { state: "PREVIEWED"; payload: unknown; accounts: Choice[]; accountIndex: number }
  | { state: "REJECTED"; status: number; reason: string; accounts?: Choice[] }
  | { state: "REFUSED_LOCAL" | "NO_ANSWER"; reason: string; accounts?: Choice[] }
  | { state: string; note?: string; reason?: string; error?: string; accounts?: Choice[] };
interface Choice { index: number; accountType: string | null; tail: string }

/** Webull's preview answer, flattened to readable scalar pairs — no guessing at field meaning. */
function scalars(payload: unknown, prefix = "", out: string[] = []): string[] {
  if (out.length >= 8 || payload == null) return out;
  if (typeof payload !== "object") {
    out.push(`${prefix || "answer"}: ${String(payload).slice(0, 40)}`);
    return out;
  }
  for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
    if (out.length >= 8) break;
    if (v != null && typeof v === "object") scalars(v, k, out);
    else if (v != null) out.push(`${k}: ${String(v).slice(0, 40)}`);
  }
  return out;
}

export function WebullOrderPreviewRow({
  symbol,
  side,
  entry,
  decisionId,
}: {
  symbol: string;
  side: "LONG" | "SHORT" | null;
  entry: number | null;
  decisionId: string | null;
}) {
  const [qty, setQty] = React.useState(1);
  const [accountIndex, setAccountIndex] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [answer, setAnswer] = React.useState<Answer | null>(null);

  const ready = !!side && entry != null && Number.isFinite(entry) && !!decisionId && qty > 0;

  const preview = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/broker/webull/order-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          side: side === "SHORT" ? "sell" : "buy",
          type: "limit",
          qty,
          limitPx: entry,
          tif: "day",
          decisionId,
          accountIndex,
        }),
      });
      setAnswer((await r.json()) as Answer);
    } catch (e) {
      setAnswer({ state: "NO_ANSWER", reason: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const choices = answer && "accounts" in answer ? answer.accounts ?? [] : [];
  const line =
    !answer ? null
    : answer.state === "PREVIEWED" ? `Webull priced it — NOT placed · ${scalars((answer as { payload: unknown }).payload).join(" · ") || "no fields returned"}`
    : answer.state === "REJECTED" ? `Webull refused the preview: ${(answer as { reason: string }).reason}`
    : `${answer.state.replace(/_/g, " ")}${"reason" in answer && answer.reason ? ` · ${answer.reason}` : ""}${"note" in answer && answer.note ? ` · ${answer.note}` : ""}${"error" in answer && answer.error ? ` · ${answer.error}` : ""}`;

  return (
    <div data-testid="webull-preview-row" data-preview-state={answer?.state ?? "IDLE"} className="mt-2 border-t border-wm-border pt-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="font-semibold uppercase tracking-[0.12em] text-wm-text-dim">Preview at Webull</span>
        <label className="flex items-center gap-1 text-wm-text-dim">
          shares
          <input
            type="number"
            min={1}
            step={1}
            value={qty}
            onChange={(e) => setQty(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            className="w-16 rounded border border-wm-border bg-transparent px-1 text-wm-text"
            aria-label="Shares to preview"
          />
        </label>
        {choices.length > 1 ? (
          <select
            value={accountIndex}
            onChange={(e) => setAccountIndex(Number(e.target.value))}
            className="rounded border border-wm-border bg-transparent px-1 text-wm-text"
            aria-label="Webull account"
          >
            {choices.map((c) => (
              <option key={c.index} value={c.index}>{`${c.accountType ?? "ACCOUNT"} ··${c.tail}`}</option>
            ))}
          </select>
        ) : null}
        <button
          type="button"
          onClick={preview}
          disabled={!ready || busy}
          data-testid="webull-preview-button"
          className="min-h-8 rounded border border-wm-border px-2 font-semibold text-wm-text hover:text-wm-gold disabled:opacity-40"
        >
          {busy ? "Asking Webull…" : `Preview ${side === "SHORT" ? "sell" : "buy"} ${qty} ${symbol} @ ${entry ?? "—"}`}
        </button>
      </div>
      {!ready && !answer ? (
        <p className="mt-1 text-[11px] text-wm-text-dim">
          {!decisionId ? "No DECISION_ID on this camera." : !side || entry == null ? "Draw a Long / Short Position to preview it." : "Enter a share count."}
        </p>
      ) : null}
      {line ? <p data-testid="webull-preview-answer" className="mt-1 text-[11px] text-wm-text">{line}</p> : null}
      <p className="mt-1 text-[10px] text-wm-text-dim">Preview only. Nothing is sent to the market from here.</p>
    </div>
  );
}

export default WebullOrderPreviewRow;
