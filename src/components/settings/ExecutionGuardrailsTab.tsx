"use client";

/**
 * SETTINGS › EXECUTION — Garden 18 §CXVII. Commitments made by the calm trader
 * for the pressured one. Saved here; obeyed by every Send LIVE button before it
 * can arm (lib/execution/guardrails). Cancel and exit are never limited.
 */

import React, { useEffect, useState } from "react";

import type { Guardrails } from "@/lib/execution/guardrails";
import { useGuardrails, writeGuardrails } from "@/lib/execution/useGuardrails";

const field = "min-h-11 w-28 rounded-lg border border-wm-border bg-wm-surface px-2 py-1 text-xs text-wm-text outline-none focus-visible:ring-2 focus-visible:ring-wm-gold";

export function ExecutionGuardrailsTab() {
  const saved = useGuardrails();
  const [draft, setDraft] = useState<Guardrails>(saved);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => setDraft(saved), [saved]);
  const num = (v: number | null) => (v == null ? "" : String(v));
  const set = (k: keyof Guardrails) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = e.target.value.trim() === "" ? null : Number(e.target.value);
    setDraft(d => ({ ...d, [k]: n != null && Number.isFinite(n) && n > 0 ? n : null }));
  };
  const Row = ({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 border-b border-wm-border/40 py-3">
      <div><div className="text-xs font-semibold text-wm-text">{label}</div><div className="text-[10px] text-wm-text-muted">{sub}</div></div>
      {children}
    </div>
  );
  return (
    <div data-testid="settings-execution">
      <p className="pt-2 text-[11px] text-wm-text-muted">Set these while you are calm. Every live order button checks them before it can arm; cancelling or exiting is never limited.</p>
      <Row label="Live trading" sub={draft.liveArmed ? "Armed — live orders may be sent after preview and an armed press" : "Disarmed — no live order can be armed anywhere"}>
        <button type="button" role="switch" aria-checked={draft.liveArmed} aria-label="Live trading armed"
          onClick={() => setDraft(d => ({ ...d, liveArmed: !d.liveArmed }))}
          className="min-h-11 rounded-lg border px-3 text-xs font-bold"
          style={{ borderColor: draft.liveArmed ? "#e0786b" : "#3a3326", color: draft.liveArmed ? "#e0786b" : "#8a8271" }}>
          {draft.liveArmed ? "ARMED" : "DISARMED"}
        </button>
      </Row>
      <Row label="Max contracts per order" sub="Options, futures and futures options · empty = no ceiling">
        <input type="number" min={1} step={1} aria-label="Max contracts per order" value={num(draft.maxContractsPerOrder)} onChange={set("maxContractsPerOrder")} className={field} />
      </Row>
      <Row label="Max shares per order" sub="Stocks and ETFs · empty = no ceiling">
        <input type="number" min={1} step={1} aria-label="Max shares per order" value={num(draft.maxSharesPerOrder)} onChange={set("maxSharesPerOrder")} className={field} />
      </Row>
      <Row label="Max option premium per order ($)" sub="Stock options: limit × contracts × 100 · futures are capped by contracts (their multiplier is not held yet)">
        <input type="number" min={1} step={1} aria-label="Max option premium per order" value={num(draft.maxOptionPremiumPerOrder)} onChange={set("maxOptionPremiumPerOrder")} className={field} />
      </Row>
      <button type="button" data-testid="save-guardrails" onClick={() => { writeGuardrails(draft); setNote("Commitments saved on this device. Every live order button now obeys them."); }}
        className="mt-3 min-h-11 w-full rounded-xl border border-wm-gold text-sm font-bold text-wm-gold">
        Save commitments
      </button>
      {note ? <p role="status" className="mt-2 text-[11px] text-wm-text-muted">{note}</p> : null}
    </div>
  );
}
