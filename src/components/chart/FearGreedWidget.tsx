"use client";

/**
 * Fear & Greed Widget
 * Real data from alternative.me/crypto/fear-and-greed-index/ (free, no key)
 * Falls back gracefully if API is unavailable.
 */

import React, { useState, useEffect } from "react";

type Sentiment = "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";

interface FGState {
  score:     number;
  label:     Sentiment;
  prev:      number;
  weekAgo:   number;
  timestamp: string;
}

function scoreToLabel(s: number): Sentiment {
  if (s <= 20) return "Extreme Fear";
  if (s <= 40) return "Fear";
  if (s <= 60) return "Neutral";
  if (s <= 80) return "Greed";
  return "Extreme Greed";
}

function scoreToColor(s: number): string {
  if (s <= 20) return "#FF2D55";
  if (s <= 40) return "#FF4D6A";
  if (s <= 60) return "#F0B429";
  if (s <= 80) return "#00D4AA";
  return "#00B88A";
}

async function fetchFearGreed(): Promise<FGState | null> {
  try {
    const res = await fetch(
      "https://api.alternative.me/fng/?limit=8&format=json",
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const data: Array<{ value: string; value_classification: string; timestamp: string }> = json.data ?? [];
    if (data.length < 2) return null;

    const current  = +data[0].value;
    const prev     = +data[1].value;
    const weekAgo  = +(data[7]?.value ?? data[data.length - 1].value);
    const ts       = new Date(+data[0].timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return {
      score:     current,
      label:     scoreToLabel(current),
      prev,
      weekAgo,
      timestamp: ts,
    };
  } catch {
    return null;
  }
}

export function FearGreedWidget() {
  const [state,   setState]   = useState<FGState | null>(null);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const data = await fetchFearGreed();
      if (!cancelled) {
        setState(data);
        setLoading(false);
      }
    };
    load();
    // Refresh every 5 minutes (the index updates once daily but this is cheap)
    const iv = setInterval(load, 5 * 60_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  if (loading) return (
    <div className="flex items-center gap-1.5 px-2 h-6 rounded text-xs font-semibold border border-wm-border bg-wm-surface shrink-0">
      <span className="text-[9px] text-wm-text-dim">F&G</span>
    </div>
  );

  if (!state) return (
    <div className="flex items-center gap-1.5 px-2 h-6 rounded text-xs font-semibold border border-wm-border bg-wm-surface shrink-0 cursor-default" title="Fear & Greed — unavailable">
      <span className="text-[9px] text-wm-text-dim">F&G —</span>
    </div>
  );

  const color  = scoreToColor(state.score);
  const change = state.score - state.prev;
  const pct    = ((state.score / 100) * 180) - 90; // -90° to +90° arc

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 h-6 rounded text-xs font-semibold border border-wm-border bg-wm-surface hover:bg-wm-card transition-colors"
        title="Crypto Fear & Greed Index — alternative.me"
      >
        <span className="text-[10px] font-mono font-black" style={{ color }}>{state.score}</span>
        <span className="text-[9px] text-wm-text-dim">{state.label.split(" ").pop()}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-9 right-0 z-50 w-72 bg-wm-card border border-wm-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />

            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-wm-text">Crypto Fear &amp; Greed</span>
                <div className="flex items-center gap-1 text-[9px] text-wm-green">
                  <span className="w-1.5 h-1.5 rounded-full bg-wm-green" />
                  alternative.me
                </div>
              </div>

              {/* Gauge */}
              <div className="flex flex-col items-center mb-4">
                <div className="relative" style={{ width: 140, height: 80 }}>
                  <svg viewBox="0 0 140 80" className="absolute inset-0">
                    <path d="M 14 72 A 56 56 0 0 1 126 72" fill="none" stroke="#252D38" strokeWidth="10" strokeLinecap="round" />
                    <path
                      d="M 14 72 A 56 56 0 0 1 126 72"
                      fill="none"
                      stroke={color}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${(state.score / 100) * 176} 176`}
                      opacity="0.85"
                    />
                    <text x="10"  y="76" fontSize="7" fill="#FF4D6A" textAnchor="middle">Fear</text>
                    <text x="70"  y="24" fontSize="7" fill="#F0B429" textAnchor="middle">Neutral</text>
                    <text x="130" y="76" fontSize="7" fill="#00D4AA" textAnchor="middle">Greed</text>
                  </svg>
                  <div
                    className="absolute bottom-2 left-1/2 origin-bottom transition-transform duration-700"
                    style={{
                      width: 2, height: 48,
                      background: `linear-gradient(to top, ${color}, white)`,
                      borderRadius: 2,
                      transform: `translateX(-50%) rotate(${pct}deg)`,
                    }}
                  />
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ background: color }} />
                </div>

                <div className="text-center mt-2">
                  <span className="text-2xl font-black" style={{ color }}>{state.score}</span>
                  <div className="text-xs font-bold mt-0.5" style={{ color }}>{state.label}</div>
                  <div className={`text-[10px] mt-0.5 ${change >= 0 ? "text-wm-green" : "text-wm-red"}`}>
                    {change >= 0 ? "▲" : "▼"} {Math.abs(change)} vs yesterday ({state.prev})
                  </div>
                </div>
              </div>

              {/* Historical context */}
              <div className="space-y-2">
                <div className="text-[9px] text-wm-text-dim uppercase tracking-wider font-semibold">Historical</div>
                {[
                  { label: "Yesterday", value: state.prev },
                  { label: "1 Week Ago", value: state.weekAgo },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[10px] text-wm-text-muted w-20 shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 bg-wm-surface rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${value}%`, background: scoreToColor(value) }} />
                    </div>
                    <span className="text-[9px] font-mono w-6 text-right" style={{ color: scoreToColor(value) }}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="text-[9px] text-wm-text-dim mt-3 text-center">
                Updated {state.timestamp} · Source: alternative.me
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
