"use client";

import React, { useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLandOnOpen } from "@/lib/chart/useLandOnOpen";
import { journalStorageKeys } from "@/lib/traderMemory/adapters/journalStorage";
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
        // The signed-in member's own book (Garden 19 member isolation) — the one key resolver.
        // Nobody signed in (or auth not yet resolved) = no book here, not an unreadable one.
        const keys = journalStorageKeys();
        raw = keys ? localStorage.getItem(keys.canonical) : null;
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

  // Opens below the chart — at 390 that was below the fold (sheriff batch 6).
  const landRef = useLandOnOpen<HTMLDivElement>();
  const headline = report?.headline;
  const tone: PnlTone = headline?.tone ?? "REFUSED";

  return (
    <div ref={landRef} tabIndex={-1} role="region" aria-label="Journal P&L stats" data-testid="pnl-stats-panel"
      className="border-t border-wm-border bg-wm-dark shrink-0 outline-none"
      // Lands ABOVE everything fixed at the foot of a phone: the thumb bar (52px)
      // AND the WAIT / WHY plaque over it (`--wm-g19-plaque`). Read on serving:
      // ada59d4 it sat under the thumb bar; e05c774, with a 72px margin, it
      // cleared the bar and sat under the plaque (y 731–808, bar at 792).
      // …and the page must be ABLE to scroll that far: read on f37005c the strip
      // stopped at y 691–771 with the plaque starting at 743 — the page ran out
      // of scroll 28px short. The strip carries the plaque's height as its own
      // bottom margin (0 where there is no plaque: desktop, tablet).
      style={{ scrollMarginBottom: "calc(64px + var(--wm-g19-plaque, 56px) + env(safe-area-inset-bottom))", marginBottom: "var(--wm-g19-plaque, 0px)" }}>
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
        {/* Garden 16 §17 (review, 2026-09-26): futures rows saved at $1 per
            point are in every figure here as recorded. Said on the strip, in
            words, with the whole sentence on hover and to a screen reader. */}
        {report && report.legacyFutures.note !== null && report.legacyFutures.chip !== null && (
          <span
            data-testid="pnl-stats-legacy-futures"
            className="ml-2 text-[9px] text-wm-gold"
            title={report.legacyFutures.note}
            aria-label={report.legacyFutures.note}
          >
            {report.legacyFutures.chip}
          </span>
        )}
        <button
          onClick={onClose}
          aria-label="Close the P&L stats strip"
          className="wm-tap-slop ml-auto p-1 hover:text-wm-text text-wm-text-dim transition-colors"
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
