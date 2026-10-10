"use client";

/**
 * JOURNAL DAY LEDGER — the month as a calendar of daily net, and the running
 * net as a curve with its drawdown drawn as its OWN small chart beneath (one
 * axis each, never dual-axis). House pass 2026-10-10, order §18: the Journal
 * continues the Market Camera, in the same materials.
 *
 * Every number comes from `selectJournalDayLedger` over the one journal book:
 * live trades only (paper left out and counted), M0 held out, unreadable P&L
 * counted per day and never summed as zero. A day with no live trade is an
 * empty cell, not $0. With no live trade at all the room says so in the house
 * state plaque.
 */
import React, { useMemo, useState } from "react";
import { WM } from "@/lib/design/wmTokens";
import { RoomStatePlaque } from "@/components/ui/RoomStatePlaque";
import { monthWeeks, selectJournalCurve, selectJournalDayLedger, type DayLedgerRecord } from "@/lib/journal/journalDayLedger";

// Direction inks already used for broker day nets on this room (ProcessDays).
const UP = "#7fd1a8";
const DOWN = "#e0786b";
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const usd = (v: number, digits = 2) =>
  `${v > 0 ? "+" : v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const tone = (v: number | null) => (v == null ? WM.text.muted : v > 0 ? UP : v < 0 ? DOWN : WM.text.hero);

export function JournalDayLedger({ entries }: { readonly entries: readonly DayLedgerRecord[] }): React.ReactElement {
  const ledger = useMemo(() => selectJournalDayLedger(entries), [entries]);
  const byDay = useMemo(() => new Map(ledger.days.map(d => [d.day, d])), [ledger]);
  const months = useMemo(() => [...new Set(ledger.days.map(d => d.day.slice(0, 7)))].sort().reverse(), [ledger]);
  const curve = useMemo(() => selectJournalCurve(ledger.days), [ledger]);
  const [mi, setMi] = useState(0);

  const paperLine = ledger.paperLeftOut > 0
    ? `${ledger.paperLeftOut} paper ${ledger.paperLeftOut === 1 ? "record is" : "records are"} left out — paper is never mixed into live results.`
    : null;

  if (ledger.days.length === 0) {
    return (
      <div className="px-4 pt-4">
        <RoomStatePlaque kind="empty" testId="journal-day-ledger-empty" title="No live trade to place on a calendar yet.">
          The calendar and the running-net curve draw from your live journal trades, one day at a time.
          {paperLine ? <> {paperLine}</> : null}
        </RoomStatePlaque>
      </div>
    );
  }

  const ym = months[Math.min(mi, months.length - 1)];
  const monthDays = ledger.days.filter(d => d.day.startsWith(ym));
  const monthNet = Math.round(monthDays.reduce((n, d) => n + (d.net ?? 0), 0) * 100) / 100;
  const monthUnreadable = monthDays.reduce((n, d) => n + d.unreadable, 0);
  const monthLabel = new Date(`${ym}-01T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  // Curve geometry, in viewBox units; each SVG scales to its own box.
  const W = 640, H = 132, DH = 56, P = 6;
  const pts = curve.points;
  const eq = pts.map(p => p.equity);
  const lo = Math.min(0, ...eq), hi = Math.max(0, ...eq);
  const span = hi - lo || 1;
  const xAt = (i: number) => P + (pts.length <= 1 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (pts.length - 1));
  const yEq = (v: number) => H - P - ((v - lo) * (H - 2 * P)) / span;
  const ddSpan = Math.abs(curve.maxDrawdown) || 1;
  const yDd = (v: number) => P + (Math.abs(v) * (DH - 2 * P)) / ddSpan;
  const eqPath = pts.map((p, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yEq(p.equity).toFixed(1)}`).join(" ");
  const ddArea = pts.length
    ? `M${xAt(0).toFixed(1)},${P} ` + pts.map((p, i) => `L${xAt(i).toFixed(1)},${yDd(p.drawdown).toFixed(1)}`).join(" ") + ` L${xAt(pts.length - 1).toFixed(1)},${P} Z`
    : "";
  const last = pts[pts.length - 1];

  const navBtn = (disabled: boolean): React.CSSProperties => ({
    minWidth: 44, minHeight: 44, borderRadius: 6, fontSize: 16, background: "transparent",
    color: WM.gold.mark, border: `1px solid ${WM.border.line}`, opacity: disabled ? 0.35 : 1,
  });

  return (
    <section data-testid="journal-day-ledger" aria-label="Day ledger" className="mx-4 mt-4"
      style={{ border: `1px solid ${WM.border.line}`, borderRadius: 10, padding: 14, background: WM.surface.deep, display: "grid", gap: 14 }}>
      <header style={{ display: "grid", gap: 2 }}>
        <span style={{ fontSize: 11, letterSpacing: 1.2, color: WM.gold.mark, fontWeight: 800 }}>DAY LEDGER · LIVE TRADES</span>
        <span style={{ fontSize: 12, color: WM.text.muted }}>
          Your journal&apos;s live trades by day. An empty day had none — it is not a zero.{paperLine ? ` ${paperLine}` : ""}
          {ledger.undated > 0 ? ` ${ledger.undated} trade${ledger.undated === 1 ? " has" : "s have"} no readable date and ${ledger.undated === 1 ? "is" : "are"} not placed.` : ""}
        </span>
      </header>

      {/* ── The month ── */}
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" aria-label="Earlier month" disabled={mi >= months.length - 1}
            onClick={() => setMi(i => Math.min(i + 1, months.length - 1))} style={navBtn(mi >= months.length - 1)}>‹</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: WM.text.hero, fontWeight: 700, fontSize: 15 }}>{monthLabel}</div>
            <div data-testid="journal-day-ledger-month" style={{ fontSize: 12, color: WM.text.muted, fontVariantNumeric: "tabular-nums" }}>
              {monthDays.length} trading day{monthDays.length === 1 ? "" : "s"} · net{" "}
              <span style={{ color: tone(monthNet), fontWeight: 700 }}>{usd(monthNet)}</span>
              {monthUnreadable > 0 ? ` · ${monthUnreadable} trade${monthUnreadable === 1 ? "" : "s"} without a readable P&L, not summed` : ""}
            </div>
          </div>
          <button type="button" aria-label="Later month" disabled={mi === 0}
            onClick={() => setMi(i => Math.max(i - 1, 0))} style={navBtn(mi === 0)}>›</button>
        </div>
        <div role="grid" aria-label={`${monthLabel}, live net by day`}
          style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, fontVariantNumeric: "tabular-nums" }}>
          {DOW.map(d => (
            <div key={d} role="columnheader" style={{ fontSize: 11, color: WM.text.muted, letterSpacing: 0.6, textTransform: "uppercase", padding: "0 4px" }}>{d}</div>
          ))}
          {monthWeeks(ym).flat().map((day, i) => {
            const rec = day ? byDay.get(day) : undefined;
            return (
              <div key={day ?? `pad-${i}`} role="gridcell" data-day={day ?? undefined}
                aria-label={day ? (rec ? `${day}: ${rec.trades} trade${rec.trades === 1 ? "" : "s"}, net ${rec.net == null ? "not readable" : usd(rec.net)}` : `${day}: no live trade`) : undefined}
                style={{
                  minHeight: 54, borderRadius: 6, padding: "4px 5px", overflow: "hidden",
                  background: day ? (rec ? WM.surface.raised : WM.surface.mid) : "transparent",
                  border: day ? `1px solid ${rec ? WM.border.line : WM.border.hair}` : "none",
                  boxShadow: rec ? `inset 0 -2px 0 ${tone(rec.net)}` : undefined,
                }}>
                {day ? (
                  <>
                    <div style={{ fontSize: 11, color: WM.text.muted }}>{Number(day.slice(8))}</div>
                    {rec ? (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: tone(rec.net), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {rec.net == null ? "—" : usd(rec.net, 0)}
                        </div>
                        <div style={{ fontSize: 11, color: WM.text.muted }}>{rec.trades}×{rec.unreadable ? ` · ${rec.unreadable}?` : ""}</div>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Running net, then its drawdown as its own chart ── */}
      {pts.length > 0 ? (
        <figure style={{ margin: 0, display: "grid", gap: 6 }}>
          <figcaption style={{ display: "flex", flexWrap: "wrap", gap: "2px 16px", fontSize: 12, color: WM.text.muted, fontVariantNumeric: "tabular-nums" }}>
            <span style={{ letterSpacing: 1, fontSize: 11, color: WM.gold.mark, fontWeight: 800 }}>RUNNING NET</span>
            <span>{pts.length} day{pts.length === 1 ? "" : "s"} with a readable net</span>
            <span data-testid="journal-day-ledger-equity">now <b style={{ color: tone(last.equity) }}>{usd(last.equity)}</b></span>
          </figcaption>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
            aria-label={`Running net across ${pts.length} days, now ${usd(last.equity)}`}
            style={{ width: "100%", height: 132, display: "block", background: WM.surface.deepest, borderRadius: 6 }}>
            <line x1={P} x2={W - P} y1={yEq(0)} y2={yEq(0)} stroke={WM.border.line} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
            <path d={eqPath} fill="none" stroke={WM.gold.mark} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </svg>
          <figcaption style={{ display: "flex", flexWrap: "wrap", gap: "2px 16px", fontSize: 12, color: WM.text.muted, fontVariantNumeric: "tabular-nums", marginTop: 4 }}>
            <span style={{ letterSpacing: 1, fontSize: 11, color: WM.gold.mark, fontWeight: 800 }}>DRAWDOWN</span>
            <span data-testid="journal-day-ledger-max-drawdown">deepest fall from a running high{" "}
              <b style={{ color: WM.text.hero }}>{curve.maxDrawdown < 0 ? usd(curve.maxDrawdown) : "none"}</b>
            </span>
          </figcaption>
          <svg viewBox={`0 0 ${W} ${DH}`} preserveAspectRatio="none" role="img"
            aria-label={curve.maxDrawdown < 0 ? `Drawdown from the running high, deepest ${usd(curve.maxDrawdown)}` : "No drawdown from a running high"}
            style={{ width: "100%", height: 56, display: "block", background: WM.surface.deepest, borderRadius: 6 }}>
            <line x1={P} x2={W - P} y1={P} y2={P} stroke={WM.border.line} vectorEffect="non-scaling-stroke" />
            {ddArea ? <path d={ddArea} fill={`${DOWN}33`} stroke={DOWN} strokeWidth={1} vectorEffect="non-scaling-stroke" /> : null}
          </svg>
        </figure>
      ) : (
        <p style={{ margin: 0, fontSize: 12, color: WM.text.muted }}>No day has a readable P&amp;L yet, so there is no running net to draw.</p>
      )}
    </section>
  );
}

export default JournalDayLedger;
