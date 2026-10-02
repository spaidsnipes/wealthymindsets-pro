"use client";

/**
 * WEBULL LIFETIME LEDGER — Garden 18 v2 §29/§30/§36 in the Journal room.
 *
 * Outcome P&L from the broker's own records: every order Webull's order
 * history returns (all of the owner's accounts), rebuilt into episodes and
 * summed with Webull's itemised fees. Three truths kept apart on the page:
 *   ACTUAL BROKER RESULT — fills, prices, fees, exactly as Webull states them;
 *   RECONSTRUCTED — the episode grouping WM rebuilt from those fills;
 *   UNSETTLED — positions the history leaves open past expiry, never counted.
 * Read only. Nothing on this page sends, changes or cancels an order.
 */

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import { reconstructEpisodes, summarizeLedger, type Episode, type LedgerOrder, type LedgerSummary } from "@/lib/broker/webullLedger";
import { StoryReviewRow } from "@/components/journal/BrokerTruthToday";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const INK = "#ede6d3";
const LINE = "rgba(139,106,41,0.25)";
const UP = "#7fd1a8";
const DOWN = "#e0786b";

interface AccountRow { tail: string; accountType: string | null; orders: number; filled: number; askedBackTo: string; stoppedBecause: string; reason: string | null }
interface LedgerAnswer { partial?: boolean; state: string; reason?: string; asOf?: string; truth?: string; accounts?: AccountRow[]; orderCount?: number; summary?: LedgerSummary; episodes?: Episode[] }

const usd = (v: number | null | undefined, sign = true) => v == null ? "—" : `${sign && v > 0 ? "+" : v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (v: number | null | undefined) => v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const tone = (v: number | null | undefined) => v == null || v === 0 ? INK : v > 0 ? UP : DOWN;
const day = (iso: string | null) => iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const hold = (ms: number | null) => ms == null ? "—" : ms < 60_000 ? `${Math.round(ms / 1000)}s` : ms < 3_600_000 ? `${Math.round(ms / 60_000)}m` : ms < 86_400_000 ? `${(ms / 3_600_000).toFixed(1)}h` : `${(ms / 86_400_000).toFixed(1)}d`;

function Tile({ label, value, color, note }: { label: string; value: string; color?: string; note?: string }) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: "10px 12px", background: "rgba(16,14,10,0.6)" }}>
      <div style={{ fontSize: 10, letterSpacing: 1, color: MUTED, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color ?? INK, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{value}</div>
      {note ? <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{note}</div> : null}
    </div>
  );
}

/** Cumulative net, closed trades in close order. One series, zero line, hover readout. */
function EquityCurve({ points }: { points: LedgerSummary["equity"] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;
  const W = 900, H = 200, P = 8;
  const vals = points.map(p => p.cum);
  const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  const x = (i: number) => P + (i / (points.length - 1)) * (W - 2 * P);
  const y = (v: number) => P + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.cum).toFixed(1)}`).join("");
  const h = hover != null ? points[hover] : null;
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} role="img" aria-label="Cumulative net P&L by closed trade"
        onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); const i = Math.round(((e.clientX - r.left) / r.width * W - P) / (W - 2 * P) * (points.length - 1)); setHover(Math.max(0, Math.min(points.length - 1, i))); }}
        onMouseLeave={() => setHover(null)} style={{ display: "block" }}>
        <line x1={P} x2={W - P} y1={y(0)} y2={y(0)} stroke={LINE} strokeWidth={1} />
        <path d={d} fill="none" stroke={GOLD} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {hover != null ? <>
          <line x1={x(hover)} x2={x(hover)} y1={P} y2={H - P} stroke={MUTED} strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          <circle cx={x(hover)} cy={y(points[hover].cum)} r={4} fill={GOLD} stroke="#0b0a08" strokeWidth={2} />
        </> : null}
      </svg>
      {h ? (
        <div style={{ position: "absolute", top: 4, left: 8, fontSize: 11, color: INK, background: "rgba(11,10,8,0.9)", border: `1px solid ${LINE}`, borderRadius: 6, padding: "4px 8px", pointerEvents: "none" }}>
          Trade {hover! + 1} · {day(h.at)} · cumulative <span style={{ color: tone(h.cum), fontVariantNumeric: "tabular-nums" }}>{usd(h.cum)}</span>
        </div>
      ) : null}
    </div>
  );
}

function BucketTable({ title, rows, keyLabel }: { title: string; rows: LedgerSummary["byMonth"]; keyLabel: string }) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 11, letterSpacing: 1, color: GOLD, marginBottom: 6 }}>{title}</div>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
        <thead><tr style={{ color: MUTED, textAlign: "right" }}><th style={{ textAlign: "left", fontWeight: 500 }}>{keyLabel}</th><th style={{ fontWeight: 500 }}>Trades</th><th style={{ fontWeight: 500 }}>Win</th><th style={{ fontWeight: 500 }}>Fees</th><th style={{ fontWeight: 500 }}>Net</th></tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.key} style={{ borderTop: `1px solid ${LINE}`, textAlign: "right", color: INK }}>
            <td style={{ textAlign: "left", padding: "3px 0" }}>{r.key}</td><td>{r.trades}</td><td>{pct(r.trades ? r.wins / r.trades : null)}</td><td>{usd(r.fees, false)}</td>
            <td style={{ color: tone(r.net) }}>{usd(r.net)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function EpisodeRow({ e }: { e: Episode }) {
  const [open, setOpen] = useState(false);
  return (
    <div data-testid="ledger-episode" data-label={e.label} style={{ borderTop: `1px solid ${LINE}`, padding: "6px 0" }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ all: "unset", cursor: "pointer", display: "grid", gridTemplateColumns: "minmax(150px,1.4fr) minmax(170px,1.6fr) 70px 70px 90px 90px", gap: 8, width: "100%", fontSize: 12, color: INK, fontVariantNumeric: "tabular-nums", alignItems: "baseline" }}>
        <span style={{ color: MUTED }}>{open ? "▾" : "▸"} {day(e.openedAt)}</span>
        <span>{e.instrumentKey} <span style={{ color: MUTED, fontSize: 10 }}>{e.direction} ×{e.maxQuantity} · ·{e.accountId}</span></span>
        <span style={{ textAlign: "right" }}>{e.avgEntry.toFixed(2)}</span>
        <span style={{ textAlign: "right" }}>{e.avgExit == null ? "—" : e.avgExit.toFixed(2)}</span>
        <span style={{ textAlign: "right", color: MUTED }}>{hold(e.holdMs)}</span>
        <span style={{ textAlign: "right", color: e.label === "RECONSTRUCTED" ? tone(e.net) : MUTED }}>{e.label === "RECONSTRUCTED" ? usd(e.net) : e.label}</span>
      </button>
      {open ? (
        <div style={{ margin: "6px 0 2px 16px", fontSize: 11, color: MUTED }}>
          <div style={{ marginBottom: 4 }}>
            <Link href={`/charts?symbol=${encodeURIComponent(e.symbol)}&tf=1m`} data-testid="ledger-open-chart" style={{ color: GOLD, marginRight: 8 }}>Open {e.symbol} chart →</Link>
            <span style={{ color: GOLD }}>{e.label}</span> · gross {usd(e.gross)} · fees {usd(e.fees, false)} · net <span style={{ color: tone(e.net) }}>{usd(e.net)}</span> · ×{e.multiplier} per contract{e.note ? ` · ${e.note}` : ""}
          </div>
          {[...e.entries.map(f => ({ ...f, role: "ENTRY" })), ...e.exits.map(f => ({ ...f, role: "EXIT" }))].sort((a, b) => a.at.localeCompare(b.at)).map(f => (
            <div key={`${f.orderId}-${f.role}-${f.at}`} style={{ display: "flex", gap: 10, fontVariantNumeric: "tabular-nums" }}>
              <span style={{ width: 44, color: f.role === "ENTRY" ? INK : GOLD }}>{f.role}</span>
              <span style={{ width: 150 }} title={f.atIsPlacement ? "Webull stated no fill time for this order; its placement time stands in." : undefined}>{day(f.at)}{f.atIsPlacement ? " · placed" : ""}</span>
              <span style={{ width: 40 }}>{f.side}</span>
              <span style={{ width: 60 }}>{f.quantity} @ {f.price.toFixed(2)}</span>
              <span style={{ width: 90 }}>{f.orderType ?? ""}{f.comboType && f.comboType !== "NORMAL" ? ` · ${f.comboType}` : ""}</span>
              <span>fees {usd(f.fees, false)}</span>
              <span style={{ opacity: 0.6 }}>Webull order {f.orderId}</span>
            </div>
          ))}
          {/* §61: the trader's half of this trade — eight process marks and their own words, beside the broker's facts, never editing them. */}
          <StoryReviewRow storyKey={`webull-episode:${e.id}`} />
        </div>
      ) : null}
    </div>
  );
}

interface StepAnswer { state: string; reason?: string; asOf?: string; yearEmpty?: boolean; askedBackTo?: string; stoppedBecause?: string; pages?: number; cachedMonths?: number; orders?: LedgerOrder[] }

export function WebullLifetimeLedger() {
  const [data, setData] = useState<LedgerAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [shown, setShown] = useState(50);

  /**
   * One account-year per request, newest first, until two years in a row are
   * empty (or Webull refuses). Episodes and P&L are rebuilt here from the raw
   * orders by the same pure owner the server would use.
   */
  const load = () => {
    let alive = true;
    setLoading(true);
    (async () => {
      const once = async <T,>(q: string): Promise<T> => (await fetch(`/api/broker/webull/ledger${q}`, { cache: "no-store" })).json() as Promise<T>;
      // Webull's rate limit is shared by every read: a step refused for TOO_MANY is waited out and asked again.
      const get = async <T extends { state: string; reason?: string; stoppedBecause?: string },>(q: string): Promise<T> => {
        let r = await once<T>(q);
        for (const wait of [15_000, 30_000, 45_000]) {
          const limited = /TOO_MANY|429/i.test(`${r.state} ${r.reason ?? ""}`);
          if (!limited) break;
          if (alive) setProgress(`Webull asked us to slow down — waiting ${wait / 1000}s…`);
          await new Promise(res => setTimeout(res, wait));
          r = await once<T>(q);
        }
        return r;
      };
      const list = await get<{ state: string; reason?: string; accounts?: { index: number; tail: string; accountType: string | null }[] }>("");
      if (list.state !== "OK" || !list.accounts) { if (alive) setData({ state: list.state, reason: list.reason }); return; }
      const all: LedgerOrder[] = [];
      const rows: AccountRow[] = [];
      const publish = (final: boolean) => {
        if (!alive) return;
        const episodes = reconstructEpisodes(all, Date.now());
        setData({ state: "OK", asOf: new Date().toISOString(), truth: "ACTUAL BROKER RESULT · episodes RECONSTRUCTED from Webull order history", accounts: [...rows], orderCount: all.length, summary: summarizeLedger(episodes), episodes, partial: !final });
      };
      for (const acct of list.accounts) {
        const row: AccountRow = { tail: acct.tail, accountType: acct.accountType, orders: 0, filled: 0, askedBackTo: "", stoppedBecause: "QUIET_YEARS", reason: null };
        rows.push(row);
        let quiet = 0;
        outer: for (let k = 0; quiet < 2 && k <= 15; k++) {
          const probe = await get<StepAnswer>(`?account=${acct.index}&yearsBack=${k}&probe=1`);
          if (probe.state !== "OK" || probe.stoppedBecause === "REFUSED") { row.stoppedBecause = "REFUSED"; row.reason = probe.reason ?? probe.state; break; }
          row.askedBackTo = probe.askedBackTo ?? row.askedBackTo;
          if (probe.yearEmpty) { quiet++; continue; }
          quiet = 0;
          for (let m = 0; m < 12; m++) {
            if (alive) setProgress(`Reading ·${acct.tail} ${acct.accountType ?? ""} — ${k === 0 ? "this year" : `${k} year${k > 1 ? "s" : ""} back`}, month ${m + 1} of 12…`);
            const step = await get<StepAnswer>(`?account=${acct.index}&yearsBack=${k}&month=${m}`);
            if (step.state !== "OK") { row.stoppedBecause = "REFUSED"; row.reason = step.reason ?? step.state; break outer; }
            all.push(...(step.orders ?? []));
            row.orders += step.orders?.length ?? 0;
            row.filled += (step.orders ?? []).filter(o => o.status === "FILLED").length;
            row.askedBackTo = step.askedBackTo ?? row.askedBackTo;
            if (step.stoppedBecause === "REFUSED" || step.stoppedBecause === "PAGE_BUDGET") { row.stoppedBecause = step.stoppedBecause; row.reason = step.reason ?? null; break outer; }
            publish(false);
          }
        }
      }
      publish(true);
    })()
      .catch(e => { if (alive) setData({ state: "CONNECTION_FAILED", reason: e instanceof Error ? e.message : "unknown" }); })
      .finally(() => { if (alive) { setLoading(false); setProgress(null); } });
    return () => { alive = false; };
  };
  useEffect(load, []);

  const episodes = useMemo(() => {
    const all = [...(data?.episodes ?? [])].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
    return filter === "ALL" ? all : all.filter(e => e.symbol === filter || e.label === filter);
  }, [data, filter]);
  const s = data?.summary;
  const symbols = useMemo(() => [...new Set((data?.episodes ?? []).map(e => e.symbol))].sort(), [data]);

  return (
    <section data-testid="webull-lifetime-ledger" aria-label="Webull lifetime ledger" style={{ padding: "14px 16px", display: "grid", gap: 12, overflow: "auto", flex: 1, minHeight: 0 }}>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 15, letterSpacing: 1.5, color: GOLD }}>WEBULL LIFETIME LEDGER</h2>
        <span style={{ fontSize: 11, color: MUTED }}>{data?.truth ?? "Outcome P&L from Webull's own order records"}</span>
        <span style={{ flex: 1 }} />
        {data?.asOf ? <span style={{ fontSize: 10, color: MUTED }}>as of {day(data.asOf)}</span> : null}
        <button type="button" onClick={() => { load(); }} disabled={loading} style={{ fontSize: 11, color: GOLD, background: "none", border: `1px solid ${LINE}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>{loading ? "Reading Webull…" : "Refresh"}</button>
      </header>

      {progress ? <p data-testid="ledger-progress" role="status" style={{ color: MUTED, fontSize: 12, margin: 0 }}>{progress} Finished months are kept after the first read, so later visits are quick.</p> : null}
      {!data ? <p style={{ color: MUTED, fontSize: 12 }}>Reading every order Webull's history returns — each account, a year at a time.</p>
        : data.state !== "OK" ? <p data-testid="ledger-refusal" style={{ color: MUTED, fontSize: 12 }}>Webull history not readable: {data.state}{data.reason ? ` — ${data.reason}` : ""}. Nothing is shown in its place.</p>
        : s ? (
        <>
          {data.partial ? (
            <p data-testid="ledger-partial" role="status" style={{ margin: 0, fontSize: 12, color: GOLD }}>STILL READING — the figures below grow as each month arrives.</p>
          ) : null}
          {(data.accounts ?? []).some(a => a.stoppedBecause === "REFUSED" || a.stoppedBecause === "PAGE_BUDGET") ? (
            <p data-testid="ledger-incomplete" role="status" style={{ margin: 0, fontSize: 12, color: "#f0b429", border: "1px solid rgba(240,180,41,0.45)", borderRadius: 6, padding: "6px 10px" }}>
              INCOMPLETE — Webull stopped answering before the whole history was read (see the account lines below). Every figure on this page covers only the orders that were read. Refresh in a minute to read the rest.
            </p>
          ) : null}
          <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.6 }}>
            {(data.accounts ?? []).map(a => (
              <div key={a.tail}>·{a.tail} {a.accountType ?? ""}: {a.orders} orders ({a.filled} filled) · asked back to {a.askedBackTo} · {a.stoppedBecause === "QUIET_YEARS" ? "history quiet before that" : a.stoppedBecause}{a.reason ? ` — ${a.reason}` : ""}</div>
            ))}
            <div>First fill Webull returned: {day(s.firstFillAt)} · last: {day(s.lastFillAt)}. Earlier trading, if any, was not returned by Webull's order history and is not shown.</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8 }}>
            <Tile label="Net P&L · realised" value={usd(s.net)} color={tone(s.net)} note={`${s.closed} closed trades`} />
            <Tile label="Gross" value={usd(s.gross)} color={tone(s.gross)} />
            <Tile label="Fees paid" value={usd(s.fees, false)} note="Webull itemised" />
            <Tile label="Win rate" value={pct(s.winRate)} note={`${s.wins} W · ${s.losses} L${s.scratches ? ` · ${s.scratches} flat` : ""}`} />
            <Tile label="Expectancy" value={usd(s.expectancy)} color={tone(s.expectancy)} note="mean net per trade" />
            <Tile label="Profit factor" value={s.profitFactor == null ? "—" : s.profitFactor.toFixed(2)} />
            <Tile label="Avg win / loss" value={`${usd(s.avgWin)} / ${usd(s.avgLoss)}`} />
            <Tile label="Max drawdown" value={usd(-s.maxDrawdown)} color={s.maxDrawdown ? DOWN : INK} note="peak → trough, closed trades" />
            <Tile label="Largest win / loss" value={`${usd(s.largestWin)} / ${usd(s.largestLoss)}`} />
          </div>
          {s.unsettled ? (
            <p data-testid="ledger-unsettled" style={{ fontSize: 11, color: MUTED, margin: 0 }}>
              <span style={{ color: GOLD }}>UNSETTLED · {s.unsettled}</span> positions are still open in the order history after their expiry ({usd(s.unsettledCost, false)} paid into the long ones). Webull's order history does not say whether they expired, were exercised or closed elsewhere, so they are not in realised P&L.
              {" "}{s.unsettledShort ? `${s.unsettledShort} of them are shorts — a sell with no matching buy in what Webull returned. ` : ""}If every long one expired worthless, realised net would be <span style={{ color: tone(s.net - s.unsettledCost) }}>{usd(s.net - s.unsettledCost)}</span> — <span style={{ color: GOLD }}>ESTIMATED</span>, a bound, not a broker figure.
            </p>
          ) : null}

          <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, letterSpacing: 1, color: GOLD, marginBottom: 4 }}>CUMULATIVE NET · CLOSED TRADES</div>
            <EquityCurve points={s.equity} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 10 }}>
            <BucketTable title="BY MONTH" keyLabel="Month" rows={s.byMonth} />
            <BucketTable title="BY UNDERLYING" keyLabel="Symbol" rows={s.bySymbol} />
            <BucketTable title="BY ACCOUNT" keyLabel="Account" rows={s.byAccount.map(b => ({ ...b, key: `·${b.key}` }))} />
          </div>

          <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, letterSpacing: 1, color: GOLD }}>EPISODES · {episodes.length}</span>
              {["ALL", ...symbols, "UNSETTLED", "OPEN"].map(k => (
                <button key={k} type="button" onClick={() => { setFilter(k); setShown(50); }} aria-pressed={filter === k}
                  style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, cursor: "pointer", background: filter === k ? "rgba(201,165,92,0.15)" : "transparent", border: `1px solid ${filter === k ? GOLD : LINE}`, color: filter === k ? GOLD : MUTED }}>{k}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(150px,1.4fr) minmax(170px,1.6fr) 70px 70px 90px 90px", gap: 8, fontSize: 10, color: MUTED, letterSpacing: 0.8 }}>
              <span>OPENED</span><span>INSTRUMENT</span><span style={{ textAlign: "right" }}>AVG IN</span><span style={{ textAlign: "right" }}>AVG OUT</span><span style={{ textAlign: "right" }}>HELD</span><span style={{ textAlign: "right" }}>NET</span>
            </div>
            {episodes.slice(0, shown).map(e => <EpisodeRow key={e.id} e={e} />)}
            {episodes.length > shown ? <button type="button" onClick={() => setShown(n => n + 100)} style={{ marginTop: 6, fontSize: 11, color: GOLD, background: "none", border: `1px solid ${LINE}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>Show more ({episodes.length - shown} left)</button> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
