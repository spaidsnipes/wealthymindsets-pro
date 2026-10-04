"use client";
/**
 * JOURNAL › BROKER LEDGER › TASTYTRADE — Garden 18 v2 §29/§36. The second
 * rail of the Lifetime Ledger: round trips from tastytrade's own trade
 * transactions (its cash, its fees), ACTUAL BROKER RESULT. Read once on open;
 * accounts by last four only. Nothing here is a model or a simulation.
 */
import React, { useEffect, useState } from "react";

import Link from "next/link";
import { ttChartSymbol, type TtLedgerSummary, type TtRoundTrip } from "@/lib/broker/tastytradeLedger";

const GOLD = "#C9A55C", MUTED = "#8a8271", INK = "#ede6d3", LINE = "rgba(139,106,41,0.25)", UP = "#7fd1a8", DOWN = "#e0786b";
const money = (v: number) => `${v < 0 ? "−" : v > 0 ? "+" : ""}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" }) : "—");

interface AccountRead { readonly tail: string; readonly state: string; readonly reason?: string; readonly fills?: number; readonly pages?: number; readonly truncated?: boolean; readonly trips?: TtRoundTrip[]; readonly summary?: TtLedgerSummary }

export function TastytradeLedger() {
  const [state, setState] = useState<"LOADING" | "OK" | "REFUSED" | "FAILED">("LOADING");
  const [accounts, setAccounts] = useState<readonly AccountRead[]>([]);
  const [reason, setReason] = useState<string>("");
  useEffect(() => {
    let alive = true;
    fetch("/api/broker/tastytrade/ledger", { cache: "no-store" })
      .then(async r => {
        const j = await r.json().catch(() => null) as { state?: string; accounts?: AccountRead[]; reason?: string } | null;
        if (!alive) return;
        if (r.status === 403) { setState("REFUSED"); setReason("Owner only."); return; }
        if (!j || j.state !== "OK") { setState("FAILED"); setReason(j?.reason ?? j?.state ?? `HTTP ${r.status}`); return; }
        setAccounts(j.accounts ?? []); setState("OK");
      })
      .catch(e => { if (alive) { setState("FAILED"); setReason(String(e)); } });
    return () => { alive = false; };
  }, []);

  return (
    <section data-testid="tastytrade-ledger" aria-label="tastytrade ledger" style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 14px", background: "rgba(16,14,10,0.5)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 15, letterSpacing: 1.5, color: GOLD, textTransform: "uppercase" }}>tastytrade</div>
        <div style={{ fontSize: 11, color: MUTED }}>Round trips from tastytrade's own trade transactions — its cash and fees · ACTUAL BROKER RESULT</div>
      </div>
      {state === "LOADING" ? <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>Reading tastytrade's history…</div> : null}
      {state === "REFUSED" || state === "FAILED" ? <div style={{ fontSize: 12, color: DOWN, marginTop: 8 }}>{state === "REFUSED" ? "tastytrade history is owner-only." : `tastytrade history could not be read: ${reason}`}</div> : null}
      {state === "OK" && accounts.length === 0 ? <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>No tastytrade accounts.</div> : null}
      {accounts.map(a => (
        <div key={a.tail} data-testid={`tt-ledger-${a.tail}`} style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: INK, fontWeight: 700 }}>Account ·{a.tail} <span style={{ color: MUTED, fontWeight: 400 }}>{a.state === "READ" ? `· ${a.fills} fills · ${a.pages} page${a.pages === 1 ? "" : "s"}${a.truncated ? " · TRUNCATED at the page cap — older history not read" : ""}` : `· ${a.reason ?? a.state}`}</span></div>
          {a.summary ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 6, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
              <span>Closed <b style={{ color: INK }}>{a.summary.closed}</b></span>
              <span>Wins <b style={{ color: UP }}>{a.summary.wins}</b> · Losses <b style={{ color: DOWN }}>{a.summary.losses}</b></span>
              <span>Net <b style={{ color: a.summary.net >= 0 ? UP : DOWN }}>{money(a.summary.net)}</b></span>
              <span>Fees <b style={{ color: INK }}>{money(-a.summary.fees)}</b></span>
              {a.summary.open ? <span style={{ color: MUTED }}>{a.summary.open} open — no result until flat</span> : null}
            </div>
          ) : null}
          {a.summary && a.summary.byInstrumentType.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4, fontSize: 11, color: MUTED }}>
              {a.summary.byInstrumentType.map(t => <span key={t.type}>{t.type}: {t.trades} · <span style={{ color: t.net >= 0 ? UP : DOWN }}>{money(t.net)}</span></span>)}
            </div>
          ) : null}
          {a.trips && a.trips.length ? (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
              <thead><tr style={{ color: MUTED, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                <th style={{ textAlign: "left", padding: "3px 0" }}>Closed</th><th style={{ textAlign: "left" }}>Instrument</th><th style={{ textAlign: "left" }}>Side</th>
                <th style={{ textAlign: "right" }}>Max qty</th><th style={{ textAlign: "right" }}>Fees</th><th style={{ textAlign: "right" }}>Net</th>
              </tr></thead>
              <tbody>
                {a.trips.slice(0, 60).map((t, i) => (
                  <tr key={`${t.symbol}-${t.openedAt}-${i}`} style={{ borderTop: `1px solid ${LINE}` }}>
                    <td style={{ padding: "3px 0", color: MUTED }}>{t.truth === "OPEN" ? "open" : day(t.closedAt)}</td>
                    <td style={{ color: INK }}>
                      {t.symbol}
                      {ttChartSymbol(t) && (
                        <Link href={`/charts?symbol=${encodeURIComponent(ttChartSymbol(t)!)}`} data-testid="tt-ledger-open-chart"
                          aria-label={`Open ${ttChartSymbol(t)} chart`}
                          style={{ color: GOLD, marginLeft: 8, fontSize: 11, fontWeight: 700 }}>chart →</Link>
                      )}
                    </td>
                    <td style={{ color: MUTED }}>{t.direction}</td>
                    <td style={{ textAlign: "right" }}>{t.maxQty}</td>
                    <td style={{ textAlign: "right", color: MUTED }}>{money(-t.fees)}</td>
                    <td style={{ textAlign: "right", color: t.truth === "OPEN" ? MUTED : t.net >= 0 ? UP : DOWN }}>{t.truth === "OPEN" ? "OPEN" : money(t.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : a.state === "READ" ? <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>No trades on this account in the history read.</div> : null}
        </div>
      ))}
    </section>
  );
}
