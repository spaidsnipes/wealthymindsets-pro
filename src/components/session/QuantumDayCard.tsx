"use client";

/** QUANTIFY · QUALIFY · SIMPLIFY (ATH mockup S-QD1) — his own journal, read through quantumDay.ts. */
import React, { useEffect, useState } from "react";
import { readJournalStorage } from "@/lib/traderMemory/adapters/journalStorage";
import { liveJournalRecords } from "@/lib/journal/paperEntry";
import { readQuantumDay, type QuantumDay, type QuantumTrade } from "@/lib/session/quantumDay";

const GOLD = "#d4a94a", MUTED = "#9a927f";
const usd = (n: number | null) => (n == null ? "—" : `${n < 0 ? "−" : "+"}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
const pc = (f: number) => `${Math.round(f * 100)}%`;

export function QuantumDayCard({ card, title }: { readonly card: React.CSSProperties; readonly title: React.CSSProperties }) {
  const [q, setQ] = useState<QuantumDay | null>(null);
  useEffect(() => {
    try {
      const read = readJournalStorage(window.localStorage);
      const recs = liveJournalRecords(read.records as Record<string, unknown>[]) as Record<string, unknown>[];
      const trades: QuantumTrade[] = recs.map(r => ({ date: String(r.date ?? ""), pnl: Number(r.pnl), setup: typeof r.setup === "string" ? r.setup : null, processQuality: typeof r.processQuality === "string" ? r.processQuality : null, plannedRDollars: typeof r.plannedRDollars === "number" ? r.plannedRDollars : null }));
      setQ(readQuantumDay(trades));
    } catch { setQ({ known: false, why: "Your journal could not be read on this device." }); }
  }, []);
  const stat = (n: string, l: string) => <div><div style={{ font: "700 20px Georgia, serif" }}>{n}</div><div style={{ color: MUTED, fontSize: 11.5 }}>{l}</div></div>;
  const bar = (f: number) => <div style={{ height: 8, background: "#1c1a15", borderRadius: 4, margin: "3px 0 8px" }}><i style={{ display: "block", height: "100%", width: pc(f), background: GOLD, borderRadius: 4 }} /></div>;
  return (
    <section style={card} data-testid="session-quantum" data-known={q?.known ? "true" : "false"}>
      <div style={title}>Quantify · qualify · simplify</div>
      {!q ? null : !q.known ? <div style={{ color: MUTED, fontSize: 13 }}>{q.why}</div> : (
        <>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>Your last {q.window.days} trading days · {q.window.trades} journaled trades ({q.window.from} → {q.window.to})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {stat(String(q.quantify.tradesPerDay), "trades / day")}{stat(pc(q.quantify.winRate), "win rate")}{stat(usd(q.quantify.netPerDay), "net / day")}
            {stat(usd(q.quantify.avgWin), "avg win")}{stat(usd(q.quantify.avgLoss), "avg loss")}{stat(`${q.quantify.greenDays}/${q.window.days}`, "green days")}
          </div>
          <div style={{ ...title, marginTop: 14 }}>Qualify · inputs, not outputs</div>
          <div style={{ color: MUTED, fontSize: 12 }}>Named setup {pc(q.qualify.withSetup)}</div>{bar(q.qualify.withSetup)}
          <div style={{ color: MUTED, fontSize: 12 }}>Planned risk {pc(q.qualify.withPlannedRisk)}</div>{bar(q.qualify.withPlannedRisk)}
          <div style={{ fontSize: 12.5 }}>Followed plan {pc(q.qualify.followedPlan)} → {usd(q.qualify.netFollowed)} · broke rules {pc(q.qualify.brokeRules)} → {usd(q.qualify.netBroke)}</div>
          <div style={{ ...title, marginTop: 14 }}>Simplify · your 20%</div>
          {q.simplify.core.length ? <div style={{ fontSize: 13.5 }}>{q.simplify.core.map(l => `${l.setup} ${usd(l.net)}`).join(" · ")} → <b>{pc(q.simplify.coreShare)} of your profit</b></div>
            : <div style={{ color: MUTED, fontSize: 12.5 }}>No named setup made money yet — name your setups when you journal.</div>}
          {q.simplify.cut.length ? <div style={{ color: "#e5546b", fontSize: 12.5, marginTop: 4 }}>Cut: {q.simplify.cut.map(l => `${l.setup} ${usd(l.net)}`).join(" · ")}</div> : null}
          {q.simplify.unnamedNet !== 0 ? <div style={{ color: MUTED, fontSize: 11.5, marginTop: 4 }}>Trades with no setup named: {usd(q.simplify.unnamedNet)}</div> : null}
        </>
      )}
      <div style={{ color: MUTED, fontSize: 11, marginTop: 10 }}>From your own journal on this device · after Myron Golden&apos;s Quantum-ply, in our words.</div>
    </section>
  );
}
