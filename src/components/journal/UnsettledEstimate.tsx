"use client";

/** UNSETTLED options read against each underlying's close on the expiry date — ESTIMATED, on the trader's click (§36/§37). */

import React, { useState } from "react";

import type { Episode } from "@/lib/broker/webullLedger";
import { expiryEstimate, parseOptionKey, summarizeExpiries, type ExpiryEstimate } from "@/lib/broker/expiryEstimate";
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const INK = "#ede6d3";
const LINE = "rgba(139,106,41,0.25)";
const usd = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}$${Math.abs(v).toFixed(2)}`;

export function UnsettledEstimate({ episodes }: { readonly episodes: readonly Episode[] }) {
  const unsettled = episodes.filter(e => e.label === "UNSETTLED" && parseOptionKey(e.instrumentKey));
  const [rows, setRows] = useState<ExpiryEstimate[] | null>(null);
  const [busy, setBusy] = useState(false);
  if (!unsettled.length) return null;
  const run = async () => {
    setBusy(true);
    const unders = [...new Set(unsettled.map(e => parseOptionKey(e.instrumentKey)!.underlying))];
    const daily = new Map<string, LegacyOhlcvTuple[]>();
    for (const u of unders) {
      try {
        const j = await (await fetch(`/api/yahoo?sym=${encodeURIComponent(u)}&type=candles&tf=1D&bars=700`, { cache: "no-store" })).json() as { candles?: LegacyOhlcvTuple[] };
        daily.set(u, Array.isArray(j.candles) ? j.candles : []);
      } catch { daily.set(u, []); }
    }
    setRows(unsettled.map(e => expiryEstimate(e, daily.get(parseOptionKey(e.instrumentKey)!.underlying) ?? [])!).filter(Boolean));
    setBusy(false);
  };
  const sum = rows ? summarizeExpiries(rows) : null;
  return (
    <div data-testid="unsettled-estimate" style={{ marginTop: 4, fontSize: 11, color: MUTED }}>
      {!rows ? (
        <button type="button" onClick={() => { void run(); }} disabled={busy}
          style={{ fontSize: 11, color: GOLD, background: "none", border: `1px solid ${LINE}`, borderRadius: 6, padding: "2px 10px", cursor: "pointer" }}>
          {busy ? "Reading each underlying's close…" : `Estimate the ${unsettled.length} from each underlying's close on its expiry date`}
        </button>
      ) : sum ? (
        <div style={{ display: "grid", gap: 3 }}>
          <div style={{ color: INK }}>
            <span style={{ color: GOLD }}>ESTIMATED</span> from the underlying&apos;s daily close on each expiry date: {sum.otm} finished out of the money (the long ones: {usd(sum.estimatedLongOtmNet)} paid in and almost certainly lost), {sum.itm} in the money (may have been exercised — not estimated), {sum.unknown} without a close to read. A market reading, not a broker figure; realised P&amp;L is unchanged.
          </div>
          <details>
            <summary style={{ cursor: "pointer", color: GOLD }}>Each position</summary>
            <ul style={{ margin: "4px 0 0", paddingLeft: 18, display: "grid", gap: 1 }}>
              {rows.map(r => <li key={r.episodeId}>{r.underlying} {r.expiry} {r.strike}{r.right}: close {r.close == null ? "—" : r.close.toFixed(2)} → {r.moneyness}{r.estimatedNet != null ? ` (${usd(r.estimatedNet)})` : ""}</li>)}
            </ul>
          </details>
        </div>
      ) : null}
    </div>
  );
}
