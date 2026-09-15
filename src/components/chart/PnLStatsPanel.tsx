"use client";

import React, { useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  compilePnlStats,
  type PnlStatsReport,
  type PnlTone,
} from "@/lib/chart/pnlStatsFacts";

/* COLOUR IS A CLAIM. Green, red and gold are measurement colours; a refusal
   gets the dim colour and says why in its own words. The old strip painted an
   empty journal's `0.0%` win rate RED and its `+$0.00` net GREEN. */
const TONE_COLOR: Record<PnlTone, string> = {
  POSITIVE: "#00D4AA",
  NEGATIVE: "#FF4D6A",
  NEUTRAL: "#E8EDF3",
  REFUSED: "#6B7683",
};

export function PnLStatsPanel({ onClose }: { onClose: () => void }) {
  /* One fact object for the whole strip. The six numbers used to be six
     zero-initialised useState slots, which meant "WM has not read anything yet"
     and "WM measured your trades and they net to zero" were the SAME on-screen
     state — in full measurement colour. See src/lib/chart/pnlStatsFacts.ts. */
  const [report, setReport] = useState<PnlStatsReport | null>(null);

  useEffect(() => {
    /* The parse lives in the owner so a throw becomes a NAMED state. The
       previous loader wrapped everything in `catch {}` and left the initial
       zeros coloured on screen when storage was unreadable. */
    const loadStats = () => {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem("wm_journal_entries");
      } catch {
        // Storage itself is unavailable (private mode, blocked origin). An
        // unreadable record is exactly what the owner names for this.
        raw = "{unavailable";
      }
      setReport(compilePnlStats(raw));
    };
    loadStats();
    const iv = setInterval(loadStats, 5000);
    return () => clearInterval(iv);
  }, []);

  const headline = report?.headline;
  const tone: PnlTone = headline?.tone ?? "REFUSED";

  return (
    <div className="border-t border-wm-border bg-wm-dark shrink-0">
      <div className="flex items-center px-3 h-7 border-b border-wm-border">
        <span className="text-[10px] font-semibold text-wm-text-muted uppercase tracking-wider">P&amp;L Stats</span>
        <div className="flex items-center gap-1 ml-3">
          {/* §9 MOTION LAW: this dot pulsed in BOTH branches. The number beside
              it is a settled historical total, not a stream. A pulse claims
              "this is changing right now", which was false whether the trader
              was up or down. The sign, the arrow and the colour already carry
              direction; the motion carried only urgency it had not earned. */}
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: TONE_COLOR[tone] }}
          />
          <span
            className="text-xs font-bold font-mono"
            style={{ color: TONE_COLOR[tone] }}
            title={headline?.reason}
            aria-label={
              headline
                ? `Net profit and loss: ${headline.text}. ${headline.reason}`
                : "Net profit and loss has not been read from the journal yet."
            }
          >
            {tone === "POSITIVE" ? (
              <TrendingUp size={11} className="inline mr-0.5" />
            ) : tone === "NEGATIVE" ? (
              <TrendingDown size={11} className="inline mr-0.5" />
            ) : (
              /* A net of exactly zero is a SCRATCH and a refusal is not a
                 direction. Neither one earns an arrow. */
              <Minus size={11} className="inline mr-0.5" />
            )}
            {headline ? headline.text : "Reading…"}
          </span>
        </div>
        {/* A SCOPE UNSTATED IS A SCOPE ASSUMED. This strip sits under a live
            chart, where "Net P&L" reads as the session — it never was. */}
        <span
          className="ml-2 text-[9px] text-wm-text-dim"
          title="Every figure in this strip is computed over every trade in the journal, not just today's session."
        >
          journal, all-time
        </span>
        {report && report.skipped > 0 && (
          <span
            className="ml-2 text-[9px] text-wm-gold"
            title={`${report.skipped} stored journal row${report.skipped === 1 ? "" : "s"} carried no usable P&L and were left out of every figure here rather than counted as zero.`}
            aria-label={`${report.skipped} journal rows were skipped as unreadable and excluded from these figures.`}
          >
            {report.skipped} skipped
          </span>
        )}
        <button
          onClick={onClose}
          aria-label="Close the P&L stats strip"
          className="ml-auto p-1 hover:text-wm-text text-wm-text-dim transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex items-center gap-0 overflow-x-auto px-3 py-1.5">
        {(report?.stats ?? []).map((s, i) => (
          <React.Fragment key={s.label}>
            <div
              className="flex flex-col items-center px-3 shrink-0"
              title={s.reason}
              aria-label={`${s.label}: ${s.text}. ${s.reason}`}
            >
              <span className="text-[9px] text-wm-text-dim uppercase tracking-wider whitespace-nowrap">{s.label}</span>
              <span
                className="font-bold font-mono mt-0.5 whitespace-nowrap"
                style={{
                  color: TONE_COLOR[s.tone],
                  // A refusal is a sentence, not a figure, so it is not sized
                  // like the headline number it replaces.
                  fontSize: s.label === "Net P&L" && s.state === "MEASURED" ? 15 : 11,
                }}
              >
                {s.text}
              </span>
            </div>
            {i < (report?.stats.length ?? 0) - 1 && <div className="w-px h-8 bg-wm-border/50 shrink-0" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
