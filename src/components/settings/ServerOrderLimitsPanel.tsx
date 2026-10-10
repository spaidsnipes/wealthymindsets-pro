"use client";

/**
 * SETTINGS › EXECUTION — THE SERVER-HELD LIMITS AND THE KILL SWITCH
 * (Garden 19 §23 / P0.3). The device commitments above are this browser's;
 * these are the deployment's, and the order-submit route reads them on every
 * live send. Unset → every live send is refused. The kill switch engages in
 * one press; releasing it takes a second, explicit press.
 */

import React, { useEffect, useState } from "react";

import { changeServerOrderLimits, useServerOrderLimits } from "@/lib/execution/useServerOrderLimits";

const field = "min-h-11 w-28 rounded-lg border border-wm-border bg-wm-surface px-2 py-1 text-xs text-wm-text outline-none focus-visible:ring-2 focus-visible:ring-wm-gold";
const CAPS = [
  ["maxContractsPerOrder", "Max contracts per order", "Futures and options"],
  ["maxSharesPerOrder", "Max shares per order", "Stocks and ETFs"],
  ["maxNotionalUsdPerOrder", "Max notional per order ($)", "Entry × point value × quantity"],
  ["maxLossUsdPerOrder", "Max loss at the stop per order ($)", "|Entry − protective stop| × point value × quantity; a long option's premium"],
  ["maxOrdersPerMinute", "Max live orders per minute", "Per broker; a whole number. Cancels are never counted"],
  ["maxOrdersPerDay", "Max live orders per day", "Per broker, per Eastern-time day; resets at midnight ET"],
] as const;
type CapKey = (typeof CAPS)[number][0];

export function ServerOrderLimitsPanel() {
  const s = useServerOrderLimits();
  const [draft, setDraft] = useState<Record<CapKey, string>>({ maxContractsPerOrder: "", maxSharesPerOrder: "", maxNotionalUsdPerOrder: "", maxLossUsdPerOrder: "", maxOrdersPerMinute: "", maxOrdersPerDay: "" });
  const [note, setNote] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  useEffect(() => {
    const l = s.limits;
    setDraft({
      maxContractsPerOrder: l?.maxContractsPerOrder != null ? String(l.maxContractsPerOrder) : "",
      maxSharesPerOrder: l?.maxSharesPerOrder != null ? String(l.maxSharesPerOrder) : "",
      maxNotionalUsdPerOrder: l?.maxNotionalUsdPerOrder != null ? String(l.maxNotionalUsdPerOrder) : "",
      maxLossUsdPerOrder: l?.maxLossUsdPerOrder != null ? String(l.maxLossUsdPerOrder) : "",
      maxOrdersPerMinute: l?.maxOrdersPerMinute != null ? String(l.maxOrdersPerMinute) : "",
      maxOrdersPerDay: l?.maxOrdersPerDay != null ? String(l.maxOrdersPerDay) : "",
    });
  }, [s.limits]);
  if (s.state === "NOT_OWNER") return null;
  const l = s.limits;
  const act = async (patch: Record<string, unknown>, ok: string) => {
    const r = await changeServerOrderLimits(patch);
    setNote(r.ok ? ok : `Not changed · ${r.reason}`);
  };
  return (
    <section data-testid="settings-server-limits" data-state={s.state} className="mt-5 border-t border-wm-border pt-3">
      <div className="text-xs font-semibold text-wm-text">On the server · {s.environment ? s.environment.toUpperCase() : "environment unknown"}</div>
      <p className="text-[10px] text-wm-text-muted">
        {s.state === "LOADING" ? "Reading the server's limits…"
          : s.state === "NO_STORE" ? "This deployment has no store for limits — every live send is refused."
          : s.state === "UNSET" ? "Never set — every live send is refused until these are saved."
          : s.state === "UNREADABLE" ? `Could not read the limits${s.reason ? ` · ${s.reason}` : ""} — sends are refused.`
          : "Read by the order route on every live send. Each cap is required; an empty one refuses."}
      </p>
      <div className="flex items-center justify-between gap-3 border-b border-wm-border/40 py-3">
        <div>
          <div className="text-xs font-semibold text-wm-text">Kill switch</div>
          <div className="text-[10px] text-wm-text-muted">{l?.killSwitch ? "ENGAGED — no new live order can be sent. Cancelling stays open." : "Released. One press engages it and disarms."}</div>
        </div>
        {l?.killSwitch ? (
          releasing
            ? <button type="button" data-testid="kill-release-confirm" onClick={() => { setReleasing(false); void act({ releaseKillSwitch: true }, "Kill switch released. Live trading stays DISARMED until you arm it."); }} className="min-h-11 rounded-lg border border-wm-gold px-3 text-xs font-bold text-wm-gold">Yes, release it</button>
            : <button type="button" data-testid="kill-release" onClick={() => setReleasing(true)} className="min-h-11 rounded-lg border px-3 text-xs font-bold" style={{ borderColor: "#e0786b", color: "#e0786b" }}>ENGAGED · release…</button>
        ) : (
          <button type="button" data-testid="kill-engage" onClick={() => void act({ killSwitch: true }, "Kill switch ENGAGED. Nothing new can be sent.")} className="min-h-11 rounded-lg border px-3 text-xs font-bold" style={{ borderColor: "#e0786b", color: "#e0786b" }}>ENGAGE</button>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-b border-wm-border/40 py-3">
        <div>
          <div className="text-xs font-semibold text-wm-text">Server arm</div>
          <div className="text-[10px] text-wm-text-muted">{l?.armed ? "ARMED on the server" : "DISARMED on the server (the default)"}</div>
        </div>
        <button type="button" role="switch" aria-checked={!!l?.armed} aria-label="Server live arm" data-testid="server-arm" disabled={!!l?.killSwitch || s.state === "NO_STORE"}
          onClick={() => void act({ armed: !l?.armed }, l?.armed ? "Disarmed on the server." : "Armed on the server.")}
          className="min-h-11 rounded-lg border px-3 text-xs font-bold" style={{ borderColor: l?.armed ? "#e0786b" : "#3a3326", color: l?.armed ? "#e0786b" : "#8a8271" }}>
          {l?.armed ? "ARMED" : "DISARMED"}
        </button>
      </div>
      {CAPS.map(([k, label, sub]) => (
        <div key={k} className="flex items-center justify-between gap-3 border-b border-wm-border/40 py-3">
          <div><div className="text-xs font-semibold text-wm-text">{label}</div><div className="text-[10px] text-wm-text-muted">{sub} · required</div></div>
          <input type="number" min={0} step="any" aria-label={`Server ${label}`} value={draft[k]} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} className={field} />
        </div>
      ))}
      <button type="button" data-testid="save-server-limits" disabled={s.state === "NO_STORE"}
        onClick={() => void act(Object.fromEntries(CAPS.map(([k]) => [k, draft[k].trim() === "" ? null : Number(draft[k])])), "Server limits saved. The order route reads them on the next send.")}
        className="mt-3 min-h-11 w-full rounded-xl border border-wm-gold text-sm font-bold text-wm-gold">
        Save server limits
      </button>
      {note ? <p role="status" className="mt-2 text-[11px] text-wm-text-muted">{note}</p> : null}
    </section>
  );
}
