"use client";

/**
 * RESEARCH HEAT ARCHIVE — Garden 18 §XCII.
 *
 * The registry's split, kept exactly: LIVE heat is the Scanner Deck's
 * Opportunity Map (/scanner/map); SAVED heat is here. A trader saves the map
 * at a moment worth remembering, then comes back to read it beside the market
 * now — what breadth was, who led, and who moved most since.
 *
 * Every number on this page is either a saved observation or arithmetic on
 * two observations. Snapshots live in this browser (no server table); the
 * room says so rather than implying a vault.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { usePublishOsStanding } from "@/components/os/osStandingContext";
import { selectHeatmapFeedObservation } from "@/lib/os/selectHeatmapFeedObservation";
import { WM } from "@/lib/design/wmTokens";
import { RoomStatePlaque } from "@/components/ui/RoomStatePlaque";
import { heatCellCameraHref } from "@/lib/routing/opportunityMap";
import {
  deleteHeatSnapshot, heatBreadth, heatLeaders, heatShifts, readHeatArchive,
  type HeatSnapshot,
} from "@/lib/research/heatArchive";

const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
const when = (ms: number | null) => (ms == null ? "time not given by the source" : new Date(ms).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }));
const tone = (v: number) => (v > 0 ? WM.state.ok : v < 0 ? WM.state.warn : WM.text.muted);

interface NowRead { readonly pcts: Record<string, number>; readonly observedAt: number | null; readonly quality: string }

function BreadthBar({ upShare, label }: { readonly upShare: number; readonly label: string }) {
  return (
    <div aria-label={label} role="img" style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: WM.state.warn, minWidth: 80 }}>
      <div style={{ width: `${Math.round(upShare * 100)}%`, background: WM.state.ok }} />
    </div>
  );
}

function Movers({ title, rows }: { readonly title: string; readonly rows: readonly [string, number][] }) {
  return (
    <div style={{ flex: "1 1 160px" }}>
      <div style={{ fontSize: 10, letterSpacing: 1.2, color: WM.text.muted, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{title}</div>
      {rows.map(([s, v]) => (
        <Link key={s} href={heatCellCameraHref(s)} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, lineHeight: "20px", color: WM.text.hero, textDecoration: "none" }}>
          <span style={{ fontWeight: 700 }}>{s}</span>
          <span style={{ color: tone(v), fontVariantNumeric: "tabular-nums" }}>{pct(v)}</span>
        </Link>
      ))}
    </div>
  );
}

export default function ResearchHeatArchivePage() {
  const [list, setList] = useState<readonly HeatSnapshot[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState<NowRead | null>(null);
  const [nowState, setNowState] = useState<"IDLE" | "LOADING" | "FAILED">("IDLE");

  useEffect(() => {
    const l = readHeatArchive();
    setList(l);
    setSelected(l[0]?.id ?? null);
  }, []);

  usePublishOsStanding({ surface: "Research Heat Archive", feed: selectHeatmapFeedObservation({ observedAt: now?.observedAt ?? null }) });

  const snap = useMemo(() => list.find(s => s.id === selected) ?? null, [list, selected]);
  useEffect(() => { setNow(null); setNowState("IDLE"); }, [selected]);

  const compare = useCallback(async () => {
    if (!snap) return;
    setNowState("LOADING");
    try {
      const syms = Object.keys(snap.pcts);
      const res = await fetch(`/api/heatmap?period=${encodeURIComponent(snap.period)}&syms=${encodeURIComponent(syms.join(","))}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const j = await res.json() as { results?: Record<string, number>; observedAt?: number | null; qualityState?: string };
      if (!j.results || !Object.keys(j.results).length) throw new Error("empty");
      setNow({ pcts: j.results, observedAt: typeof j.observedAt === "number" ? j.observedAt : null, quality: j.qualityState ?? "UNKNOWN" });
      setNowState("IDLE");
    } catch {
      setNowState("FAILED");
    }
  }, [snap]);

  const remove = (id: string) => {
    deleteHeatSnapshot(id);
    const l = readHeatArchive();
    setList(l);
    if (selected === id) setSelected(l[0]?.id ?? null);
  };

  const thenB = snap ? heatBreadth(snap.pcts) : null;
  const thenL = snap ? heatLeaders(snap.pcts) : null;
  const nowB = now ? heatBreadth(now.pcts) : null;
  const shifts = snap && now ? heatShifts(snap.pcts, now.pcts) : [];

  return (
    <div data-testid="research-heat-archive" style={{ padding: "20px 16px 40px", maxWidth: 1100, margin: "0 auto", color: WM.text.body }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, letterSpacing: 2, color: WM.gold.hero, margin: 0, textTransform: "uppercase" }}>Research Heat Archive</h1>
        <Link href="/scanner/map" style={{ fontSize: 12, color: WM.gold.mark }}>Live heat: Opportunity Map →</Link>
      </div>
      <p style={{ fontSize: 12.5, color: WM.text.muted, margin: "0 0 16px" }}>
        Heat you saved from the Opportunity Map, read beside the market now. Kept in this browser — saved heat does not travel to other devices.
      </p>

      {list.length === 0 ? (
        <RoomStatePlaque kind="empty" testId="heat-archive-empty" title="No saved heat yet.">
          Open the <Link href="/scanner/map" style={{ color: WM.gold.mark }}>Opportunity Map</Link> and press <b>Save this heat</b> at a moment you want to remember — an open, a breakout day, a flush.
        </RoomStatePlaque>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
          <ul aria-label="Saved heat" style={{ listStyle: "none", margin: 0, padding: 0, flex: "1 1 260px", maxWidth: 360, display: "flex", flexDirection: "column", gap: 6 }}>
            {list.map(s => {
              const b = heatBreadth(s.pcts);
              const on = s.id === selected;
              return (
                <li key={s.id}>
                  <button type="button" data-testid={`heat-snap-${s.id}`} aria-pressed={on} onClick={() => setSelected(s.id)}
                    style={{ width: "100%", textAlign: "left", borderRadius: 8, padding: "10px 12px", cursor: "pointer", background: on ? WM.surface.raised : WM.surface.mid, border: `1px solid ${on ? WM.border.strong : WM.border.line}`, color: WM.text.body }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, color: WM.text.hero, fontWeight: 700 }}>
                      <span>{new Date(s.savedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                      <span style={{ color: WM.gold.mark }}>{s.period}</span>
                    </div>
                    <div style={{ fontSize: 11, color: WM.text.muted, margin: "2px 0 6px" }}>{s.universe} · {b.total} symbols · {s.quality.toLowerCase()}</div>
                    <BreadthBar upShare={b.upShare} label={`${b.up} up, ${b.down} down`} />
                    {s.note ? <div style={{ fontSize: 11.5, marginTop: 6, fontStyle: "italic" }}>{s.note}</div> : null}
                  </button>
                </li>
              );
            })}
          </ul>

          {snap && thenB && thenL ? (
            <section data-testid="heat-snap-detail" style={{ flex: "2 1 420px", minWidth: 0, border: `1px solid ${WM.border.line}`, borderRadius: 8, padding: 16, background: WM.surface.mid }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <div style={{ color: WM.text.hero, fontWeight: 700 }}>{snap.universe} · {snap.period}</div>
                <button type="button" onClick={() => remove(snap.id)} style={{ fontSize: 11, color: WM.text.muted, background: "none", border: `1px solid ${WM.border.line}`, borderRadius: 4, padding: "3px 8px", cursor: "pointer" }}>Delete</button>
              </div>
              <div style={{ fontSize: 11.5, color: WM.text.muted, margin: "2px 0 12px" }}>
                Observed {when(snap.observedAt)} · saved {when(snap.savedAt)} · quality then: {snap.quality.toLowerCase()}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "6px 10px", alignItems: "center", fontSize: 12.5, marginBottom: 14 }}>
                <span style={{ color: WM.text.muted }}>Then</span>
                <BreadthBar upShare={thenB.upShare} label={`Then: ${thenB.up} up, ${thenB.down} down`} />
                <span style={{ fontVariantNumeric: "tabular-nums", color: WM.text.hero }}>{thenB.up} up · {thenB.down} down</span>
                {nowB ? (
                  <>
                    <span style={{ color: WM.text.muted }}>Now</span>
                    <BreadthBar upShare={nowB.upShare} label={`Now: ${nowB.up} up, ${nowB.down} down`} />
                    <span style={{ fontVariantNumeric: "tabular-nums", color: WM.text.hero }}>{nowB.up} up · {nowB.down} down</span>
                  </>
                ) : null}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 14 }}>
                <Movers title="Led then" rows={thenL.leaders} />
                <Movers title="Lagged then" rows={thenL.laggards} />
              </div>

              {now ? (
                <div data-testid="heat-compare">
                  <div style={{ fontSize: 10, letterSpacing: 1.2, color: WM.text.muted, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                    Moved most since · {snap.period} reading then → now ({now.quality.toLowerCase()}, observed {when(now.observedAt)})
                  </div>
                  {shifts.every(r => Math.abs(r.delta) < 0.005) ? (
                    <div data-testid="heat-unchanged" style={{ fontSize: 12.5, color: WM.text.body }}>
                      Nothing has moved since this was saved — the source is still reporting the same observation.
                    </div>
                  ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
                    <tbody>
                      {shifts.map(r => (
                        <tr key={r.symbol} style={{ borderTop: `1px solid ${WM.border.hair}` }}>
                          <td style={{ padding: "4px 0" }}><Link href={heatCellCameraHref(r.symbol)} style={{ color: WM.text.hero, fontWeight: 700, textDecoration: "none" }}>{r.symbol}</Link></td>
                          <td style={{ textAlign: "right", color: tone(r.then) }}>{pct(r.then)}</td>
                          <td style={{ textAlign: "center", color: WM.text.muted }}>→</td>
                          <td style={{ textAlign: "right", color: tone(r.now) }}>{pct(r.now)}</td>
                          <td style={{ textAlign: "right", color: tone(r.delta), paddingLeft: 10 }}>{r.delta > 0 ? "+" : ""}{r.delta.toFixed(2)} pts</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  )}
                </div>
              ) : (
                <button type="button" data-testid="heat-compare-now" onClick={compare} disabled={nowState === "LOADING"}
                  style={{ minHeight: 36, padding: "0 14px", borderRadius: 6, border: `1px solid ${WM.border.strong}`, background: "transparent", color: WM.gold.hero, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
                  {nowState === "LOADING" ? "Reading the market now…" : "Compare with now"}
                </button>
              )}
              {nowState === "FAILED" ? <div style={{ fontSize: 12, color: WM.state.warn, marginTop: 8 }}>The heat source did not answer just now. The saved snapshot is unchanged — try again in a moment.</div> : null}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
