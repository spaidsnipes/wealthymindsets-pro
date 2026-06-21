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
  active, playing, speed, position, total, currentTime,
  onPlay, onPause, onStepBack, onStepForward, onStop, onSpeedChange,
}: Props) {
  if (!active) return null;

  const SPEEDS: ReplaySpeed[] = [0.5, 1, 2, 5];
  const pct = total > 0 ? (position / total) * 100 : 0;

  return (
    <div style={{
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
    <button onClick={onClick} title={title} style={{
      display: "flex", alignItems: "center", justifyContent: "center",
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
