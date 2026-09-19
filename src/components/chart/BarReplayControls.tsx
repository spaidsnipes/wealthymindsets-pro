"use client";

import React from "react";
import { Play, Pause, SkipBack, SkipForward, Square } from "lucide-react";

export type ReplaySpeed = 0.5 | 1 | 2 | 5;

interface Props {
  active: boolean;
  playing: boolean;
  speed: ReplaySpeed;
  position: number;   // bar index
  total: number;      // total bars
  currentTime: number; // unix seconds
  /**
   * M9 DISCLOSURE — does the chart behind this panel actually follow the cursor?
   *
   * This is REQUIRED and has NO DEFAULT on purpose. A default would let a call
   * site inherit the flattering answer by saying nothing, and the flattering
   * answer is exactly the lie this prop exists to prevent: today the cursor
   * advances, the clock walks through the session, the counter climbs — and
   * the chart behind it never moves, because `replayBars` is passed by nobody
   * and read by nothing (see MainChart.tsx, where both replay props are
   * declared, destructured, and then ignored).
   *
   * While this is false the panel must NOT render a walking timestamp, a
   * progress bar, or a position-of-total counter, because every one of those
   * is a claim about the chart. It renders the disclosure and the way out
   * instead. Flipping this to true is M9's SECOND repair — the real wire,
   * which must read frozen CanonicalBar ancestry, never re-derive today's
   * version of old bars.
   */
  chartFollowsCursor: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onStop: () => void;
  onSpeedChange: (s: ReplaySpeed) => void;
}

function fmtTime(t: number): string {
  if (!t) return "--";
  const d = new Date(t * 1000);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export function BarReplayControls({
  active, playing, speed, position, total, currentTime, chartFollowsCursor,
  onPlay, onPause, onStepBack, onStepForward, onStop, onSpeedChange,
}: Props) {
  if (!active) return null;

  // M9 DISCLOSURE — the chart does not follow the cursor, so say so and stop
  // making claims about it. No walking clock, no progress bar, no
  // position-of-total: each of those is a sentence about a chart that is not
  // moving. Keep the way out, because a panel the trader cannot dismiss is a
  // worse defect than the one being disclosed.
  if (!chartFollowsCursor) {
    return (
      <div
        data-testid="bar-replay-controls"
        data-chart-follows-cursor="false"
        style={{
          position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
          zIndex: 400,
          background: "#141824",
          border: "1px solid #F5A623",
          borderRadius: 10,
          padding: "8px 14px",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 4px 24px rgba(245,166,35,0.25)",
          pointerEvents: "auto",
          userSelect: "none",
          maxWidth: "min(460px, calc(100vw - 32px))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4, paddingRight: 8, borderRight: "1px solid #263050" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F5A623" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#F5A623", letterSpacing: "0.06em" }}>BAR REPLAY</span>
        </div>
        <span style={{ fontSize: 11, color: "#E2E8FF", lineHeight: 1.4 }}>
          Not wired to the chart yet — these controls would move a cursor, not the
          candles. Nothing you see behind this panel is a replay.
        </span>
        <CtrlBtn onClick={onStop} icon={<Square size={12} />} title="Close replay" danger />
      </div>
    );
  }

  const SPEEDS: ReplaySpeed[] = [0.5, 1, 2, 5];
  const pct = total > 0 ? (position / total) * 100 : 0;

  return (
    <div
      data-testid="bar-replay-controls"
      data-chart-follows-cursor="true"
      style={{
      position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
      zIndex: 400,
      background: "#141824",
      border: "1px solid #2F80ED",
      borderRadius: 10,
      padding: "8px 14px",
      display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 4px 24px rgba(47,128,237,0.3)",
      pointerEvents: "auto",
      userSelect: "none",
    }}>
      {/* Replay badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, paddingRight: 8, borderRight: "1px solid #263050" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: playing ? "#FF4D67" : "#F5A623", animation: playing ? "pulse 1s infinite" : "none" }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "#F5A623", letterSpacing: "0.06em" }}>BAR REPLAY</span>
      </div>

      {/* Time display */}
      <div style={{ fontSize: 11, color: "#E2E8FF", fontFamily: "monospace", minWidth: 130, textAlign: "center" }}>
        {fmtTime(currentTime)}
      </div>

      {/* Progress */}
      <div style={{ width: 80, height: 3, background: "#263050", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#2F80ED", borderRadius: 2, transition: "width 0.1s" }} />
      </div>
      <span style={{ fontSize: 10, color: "#8896BE" }}>{position}/{total}</span>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <CtrlBtn onClick={onStepBack}    icon={<SkipBack size={13} />}    title="Step back" />
        <CtrlBtn onClick={playing ? onPause : onPlay}
          icon={playing ? <Pause size={13} /> : <Play size={13} />}
          title={playing ? "Pause" : "Play"}
          accent
        />
        <CtrlBtn onClick={onStepForward} icon={<SkipForward size={13} />} title="Step forward" />
        <CtrlBtn onClick={onStop}        icon={<Square size={12} />}       title="Stop replay" danger />
      </div>

      {/* Speed */}
      <div style={{ display: "flex", gap: 3, paddingLeft: 8, borderLeft: "1px solid #263050" }}>
        {SPEEDS.map(s => (
          <button key={s} onClick={() => onSpeedChange(s)} style={{
            fontSize: 9, padding: "3px 5px", borderRadius: 3, cursor: "pointer",
            background: speed === s ? "rgba(47,128,237,0.25)" : "#0B0E1A",
            border: `1px solid ${speed === s ? "#2F80ED" : "#263050"}`,
            color: speed === s ? "#2F80ED" : "#8896BE",
            fontWeight: 700,
          }}>
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}

function CtrlBtn({ onClick, icon, title, accent, danger }: { onClick: () => void; icon: React.ReactNode; title?: string; accent?: boolean; danger?: boolean }) {
  const color = danger ? "#FF4D67" : accent ? "#2F80ED" : "#8896BE";
  return (
    /*
      THE ONLY WAY OUT HAS TO BE REACHABLE AND HITTABLE.

      MEASURED 2026-09-19 on live /charts. On the disclosure branch this button
      is the ONE control in the panel — the "way out" the branch above is
      written to preserve — and it measured 14x26, not 26x26. The row is
      `display:flex` with `maxWidth: min(460px, ...)` and the disclosure
      sentence is long, so the icon button was the thing that gave: `width` is
      a basis, not a floor, and a flex item shrinks below it. `flexShrink: 0`
      makes the declared width mean what it says. The longer the honest
      disclosure text gets, the more the exit was being squeezed — the sentence
      and the escape hatch were competing for the same pixels.

      `aria-label` as well as `title`, because these buttons are icon-only.
      `title` is the weakest naming source there is: it does not appear on
      touch at all, and it is a tooltip rather than a name. Leaving it as the
      sole name meant the only exit from a panel whose entire purpose is to
      confess a defect was itself unnamed to a screen reader.

      `type="button"` so a future move into a form cannot turn Stop into a
      submit.
    */
    <button onClick={onClick} title={title} aria-label={title} type="button" style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      width: 26, height: 26, borderRadius: 5, cursor: "pointer",
      background: accent ? "rgba(47,128,237,0.15)" : "transparent",
      border: `1px solid ${accent ? "rgba(47,128,237,0.3)" : "transparent"}`,
      color,
      transition: "all 0.12s",
    }}>
      {icon}
    </button>
  );
}
