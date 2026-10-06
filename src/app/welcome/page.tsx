"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { FEEDLESS_SURFACE } from "@/lib/os/osChrome";
import { usePublishOsStanding } from "@/components/os/osStandingContext";

/**
 * GUEST FIRST SESSION (Garden 18 ATHOS order P0.4 · PROPOSED plate 10,
 * 2026-10-05). A new trader reaches one useful market reading before any
 * sign-up: choose a market → open a starter view → inspect what it means and
 * what the live version needs.
 *
 * EVERY CANDLE HERE IS SIMULATED — generated in this browser from a fixed seed,
 * never a feed, never anyone's account. The page says so on the chart, in the
 * Inspect panel and in the footer. No live badge, no Founder data, no API call.
 * Public (authRoutes PUBLIC_INFO_PATHS).
 */
const GOLD = "#c9a55c", INK = "#ede6d3", MUTED = "#a89c80", LINE = "rgba(201,165,92,0.28)", UP = "#3ccf9c", DN = "#ef6a76";

type Bar = { o: number; h: number; l: number; c: number; v: number };
const MARKETS = [
  { id: "NQ", label: "NQ · Nasdaq-100 futures (sample)", start: 20000, step: 6, seed: 11 },
  { id: "BTC", label: "BTC · Bitcoin (sample)", start: 64000, step: 70, seed: 23 },
  { id: "AAPL", label: "AAPL · Apple (sample)", start: 230, step: 0.35, seed: 37 },
] as const;
type MarketId = (typeof MARKETS)[number]["id"];
type View = "CLEAN" | "PROFILE" | "STRUCTURE";

/** Deterministic, seeded sample — the same bars on every load. */
function simulate(start: number, step: number, seed: number, n = 60): Bar[] {
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const bars: Bar[] = [];
  let p = start;
  for (let i = 0; i < n; i++) {
    const drift = Math.sin(i / 9) * step * 0.6;
    const o = p, c = p + (rnd() - 0.5) * step * 3 + drift;
    const h = Math.max(o, c) + rnd() * step * 1.4, l = Math.min(o, c) - rnd() * step * 1.4;
    bars.push({ o, h, l, c, v: 200 + Math.round(rnd() * 800) });
    p = c;
  }
  return bars;
}

/** Volume-at-price over the sample: POC + 70% value area (simple, stated). */
function profileOf(bars: Bar[], rows = 24) {
  const lo = Math.min(...bars.map(b => b.l)), hi = Math.max(...bars.map(b => b.h));
  const size = (hi - lo) / rows;
  const vol = new Array(rows).fill(0);
  for (const b of bars) {
    const a = Math.max(0, Math.floor((b.l - lo) / size)), z = Math.min(rows - 1, Math.floor((b.h - lo) / size));
    for (let r = a; r <= z; r++) vol[r] += b.v / (z - a + 1);
  }
  const poc = vol.indexOf(Math.max(...vol));
  const total = vol.reduce((x, y) => x + y, 0);
  let a = poc, z = poc, acc = vol[poc];
  while (acc < total * 0.7 && (a > 0 || z < rows - 1)) {
    const next = (a > 0 ? vol[a - 1] : -1) >= (z < rows - 1 ? vol[z + 1] : -1) ? --a : ++z;
    acc += vol[next];
  }
  return { lo, size, vol, poc: lo + (poc + 0.5) * size, val: lo + a * size, vah: lo + (z + 1) * size };
}

/** Swing highs / lows: a bar higher (lower) than the 3 on each side. */
function swings(bars: Bar[]) {
  const out: { i: number; kind: "H" | "L"; p: number }[] = [];
  for (let i = 3; i < bars.length - 3; i++) {
    const w = bars.slice(i - 3, i + 4);
    if (bars[i].h === Math.max(...w.map(b => b.h))) out.push({ i, kind: "H", p: bars[i].h });
    if (bars[i].l === Math.min(...w.map(b => b.l))) out.push({ i, kind: "L", p: bars[i].l });
  }
  return out;
}

export default function WelcomePage() {
  usePublishOsStanding({ surface: "Welcome", feed: FEEDLESS_SURFACE });
  const [market, setMarket] = useState<MarketId>("NQ");
  const [view, setView] = useState<View>("CLEAN");
  const m = MARKETS.find(x => x.id === market)!;
  const bars = useMemo(() => simulate(m.start, m.step, m.seed), [m]);
  const prof = useMemo(() => profileOf(bars), [bars]);
  const sw = useMemo(() => swings(bars), [bars]);

  const W = 760, H = 360, padR = 70;
  const lo = Math.min(...bars.map(b => b.l)), hi = Math.max(...bars.map(b => b.h));
  const y = (p: number) => 14 + ((hi - p) / (hi - lo)) * (H - 28);
  // The profile gets its OWN lane right of the candles — a lens never covers
  // the newest bars (canon: no lens over the active candle).
  const lane = view === "PROFILE" ? 150 : 0;
  const plotW = W - padR - lane;
  const bw = plotW / bars.length;
  const x = (i: number) => i * bw + bw / 2;
  const dp = m.start < 1000 ? 2 : 0;
  const fmt = (p: number) => p.toFixed(dp);

  const inspect: Record<View, { title: string; lines: string[] }> = {
    CLEAN: { title: "Clean chart", lines: ["Candles only: open, high, low, close per bar.", "In WM Pro the price line carries its source and age — LIVE, DELAYED, STALE or UNAVAILABLE — never a guess."] },
    PROFILE: { title: "Volume profile", lines: [`Point of control ${fmt(prof.poc)} — the price with the most volume in this sample.`, `Value area ${fmt(prof.val)}–${fmt(prof.vah)} — where 70% of this sample's volume traded.`, "Live, WM Pro builds this from real trades and says when it is estimated from candles instead."] },
    STRUCTURE: { title: "Market structure", lines: [`${sw.filter(s => s.kind === "H").length} swing highs and ${sw.filter(s => s.kind === "L").length} swing lows in this sample (a bar beyond the 3 on each side).`, "Live, these become levels you can inspect — when they formed, and when price respected or broke them."] },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050506", color: INK, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", padding: "36px 16px 64px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: "0.32em", fontSize: 12, color: GOLD }}>WEALTHYMINDSETS PRO · YOUR MARKET SANCTUARY</div>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: 36, margin: "14px 0 8px", lineHeight: 1.15 }}>Read the market before you risk a dollar.</h1>
        <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.6, maxWidth: 720, margin: 0 }}>
          Try a real WM Pro reading on a sample chart — no account, no broker, nothing saved. Then see exactly what is live, estimated, delayed or unavailable when you sign in.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 18, marginTop: 26 }} className="wm-welcome-grid">
          <section aria-label="Guest sample chart" style={{ background: "#0b0c10", border: `1px solid ${LINE}`, borderRadius: 12, padding: 14, minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>1 · Market</span>
              {MARKETS.map(mk => (
                <button key={mk.id} type="button" aria-pressed={market === mk.id} onClick={() => setMarket(mk.id)}
                  style={{ minHeight: 36, padding: "0 12px", borderRadius: 8, border: `1px solid ${market === mk.id ? GOLD : "rgba(255,255,255,0.14)"}`, background: market === mk.id ? "rgba(201,165,92,0.14)" : "transparent", color: market === mk.id ? "#e8b923" : INK, cursor: "pointer", fontSize: 12 }}>
                  {mk.id}
                </button>
              ))}
              <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 700 }}>2 · View</span>
              {(["CLEAN", "PROFILE", "STRUCTURE"] as const).map(v => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
                  style={{ minHeight: 36, padding: "0 12px", borderRadius: 8, border: `1px solid ${view === v ? GOLD : "rgba(255,255,255,0.14)"}`, background: view === v ? "rgba(201,165,92,0.14)" : "transparent", color: view === v ? "#e8b923" : INK, cursor: "pointer", fontSize: 12 }}>
                  {v.charAt(0) + v.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#e0a050", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>
              {m.label.toUpperCase()} · 5M · SIMULATED — NOT MARKET DATA
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Simulated ${m.id} sample chart, ${view.toLowerCase()} view`} style={{ width: "100%", height: "auto", display: "block" }}>
              {view === "PROFILE" && (
                <g>
                  <rect x={0} y={y(prof.vah)} width={plotW} height={y(prof.val) - y(prof.vah)} fill="rgba(201,165,92,0.08)" />
                  {prof.vol.map((v, r) => {
                    const max = Math.max(...prof.vol);
                    const top = y(prof.lo + (r + 1) * prof.size), bot = y(prof.lo + r * prof.size);
                    return <rect key={r} x={plotW + 6} y={top} width={(v / max) * (lane - 12)} height={Math.max(1, bot - top - 1)} fill="rgba(201,165,92,0.28)" />;
                  })}
                  <line x1={0} x2={plotW + lane} y1={y(prof.poc)} y2={y(prof.poc)} stroke={GOLD} strokeDasharray="5 4" />
                </g>
              )}
              {bars.map((b, i) => (
                <g key={i}>
                  <line x1={x(i)} x2={x(i)} y1={y(b.h)} y2={y(b.l)} stroke={b.c >= b.o ? UP : DN} strokeWidth={1.2} />
                  <rect x={x(i) - bw * 0.3} y={y(Math.max(b.o, b.c))} width={bw * 0.6} height={Math.max(1.5, Math.abs(y(b.o) - y(b.c)))} fill={b.c >= b.o ? UP : DN} rx={1} />
                </g>
              ))}
              {view === "STRUCTURE" && sw.map(s => (
                <g key={`${s.kind}${s.i}`}>
                  <circle cx={x(s.i)} cy={s.kind === "H" ? y(s.p) - 8 : y(s.p) + 8} r={3.5} fill="none" stroke={s.kind === "H" ? "#8fb2d8" : "#e0a050"} strokeWidth={1.5} />
                </g>
              ))}
              {[hi, (hi + lo) / 2, lo].map(p => <text key={p} x={W - padR + 6} y={y(p) + 4} fill={MUTED} fontSize={11}>{fmt(p)}</text>)}
            </svg>
          </section>

          <aside aria-label="Inspect" style={{ background: "#0b0c10", border: `1px solid ${LINE}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: "0.12em" }}>3 · INSPECT</div>
            <h2 style={{ fontSize: 17, margin: "8px 0 6px" }}>{inspect[view].title}</h2>
            {inspect[view].lines.map(l => <p key={l} style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, margin: "0 0 8px" }}>{l}</p>)}
            <p style={{ fontSize: 12, color: "#e0a050", lineHeight: 1.5, margin: "12px 0 0" }}>Source: simulated in your browser. Nothing here is a price, a signal or advice.</p>
            <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
              <Link href="/login?mode=signup" style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", minHeight: 44, borderRadius: 8, border: `1px solid ${GOLD}`, background: "rgba(201,165,92,0.14)", color: "#e8b923", fontWeight: 700, textDecoration: "none" }}>Create a free account</Link>
              <Link href="/pricing" style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", minHeight: 44, borderRadius: 8, border: "1px solid rgba(255,255,255,0.14)", color: INK, textDecoration: "none" }}>See pricing</Link>
            </div>
          </aside>
        </div>

        <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.6, marginTop: 24, maxWidth: 860 }}>
          Guest mode · sample candles are simulated and labelled · no account data, no broker, no live orders.{" "}
          <Link href="/legal/risk" style={{ color: GOLD }}>Risk disclosure</Link> ·{" "}
          <Link href="/legal/market-data" style={{ color: GOLD }}>Market data</Link> ·{" "}
          <Link href="/login" style={{ color: GOLD }}>Sign in</Link>
        </p>
      </div>
      <style>{`@media (max-width: 860px) { .wm-welcome-grid { grid-template-columns: minmax(0,1fr) !important; } }`}</style>
    </div>
  );
}
