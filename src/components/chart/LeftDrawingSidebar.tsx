"use client";

import React, { useState } from "react";
import {
  MousePointer2, Move, Minus, TrendingUp, MoveHorizontal, MoveVertical,
  Ruler, Square, Circle, Triangle, Type, Pencil, Eraser, Trash2,
  Magnet, Lock, Eye, EyeOff, ArrowUpRight,
} from "lucide-react";
import type { DrawingTool } from "./DrawingToolsPanel";

interface Item { id: DrawingTool; label: string; icon: React.ReactNode; }

// TradingView-style vertical rail. Compact, always-visible icon column.
const GROUPS: { items: Item[] }[] = [
  { items: [
    { id: "cursor",    label: "Cursor",          icon: <MousePointer2 size={15} /> },
    { id: "select",    label: "Select / Move",   icon: <Move size={15} /> },
  ]},
  { items: [
    { id: "trendline", label: "Trend Line",      icon: <TrendingUp size={15} /> },
    { id: "ray",       label: "Ray",             icon: <ArrowUpRight size={15} /> },
    { id: "hline",     label: "Horizontal Line", icon: <MoveHorizontal size={15} /> },
    { id: "vline",     label: "Vertical Line",   icon: <MoveVertical size={15} /> },
    { id: "arrow",     label: "Arrow",           icon: <Minus size={15} style={{ transform: "rotate(-45deg)" }} /> },
  ]},
  { items: [
    { id: "fibonacci", label: "Fib Retracement", icon: <Ruler size={15} /> },
    { id: "rect",      label: "Rectangle",       icon: <Square size={15} /> },
    { id: "ellipse",   label: "Ellipse",         icon: <Circle size={15} /> },
    { id: "triangle",  label: "Triangle",        icon: <Triangle size={15} /> },
  ]},
  { items: [
    { id: "text",      label: "Text",            icon: <Type size={15} /> },
    { id: "brush",     label: "Draw / Brush",    icon: <Pencil size={15} /> },
    { id: "eraser",    label: "Eraser",          icon: <Eraser size={15} /> },
  ]},
];

const COLORS = ["#00D4AA","#4FA3E0","#F0B429","#FF4D6A","#8B5CF6","#FFFFFF","#F97316","#06B6D4"];

interface Props {
  activeTool:     DrawingTool;
  onToolChange:   (t: DrawingTool) => void;
  onClearAll:     () => void;
  color:          string;
  onColorChange:  (c: string) => void;
  magnetActive:   boolean;
  onMagnetToggle: () => void;
  lockActive:     boolean;
  onLockToggle:   () => void;
  visible:        boolean;
  onVisToggle:    () => void;
}

export function LeftDrawingSidebar({
  activeTool, onToolChange, onClearAll,
  color, onColorChange,
  magnetActive, onMagnetToggle,
  lockActive, onLockToggle,
  visible, onVisToggle,
}: Props) {
  const [showColors, setShowColors] = useState(false);

  const btn = (active: boolean, activeColor = "#00D4AA"): React.CSSProperties => ({
    width: 30, height: 30, borderRadius: 6, display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer", transition: "all 0.12s",
    background: active ? `${activeColor}22` : "transparent",
    border: `1px solid ${active ? `${activeColor}55` : "transparent"}`,
    color: active ? activeColor : "#8B8FA8",
  });

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      width: 40, flexShrink: 0, padding: "6px 0",
      background: "#0D0E14", borderRight: "1px solid #1E2030",
      overflowY: "auto", position: "relative", zIndex: 30,
    }}>
      {GROUPS.map((g, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div style={{ width: 22, height: 1, background: "#1E2030", margin: "3px 0" }} />}
          {g.items.map(it => (
            <button key={it.id} title={it.label} onClick={() => onToolChange(it.id)}
              style={btn(activeTool === it.id)}
              onMouseEnter={e => { if (activeTool !== it.id) (e.currentTarget as HTMLElement).style.color = "#E2E8F0"; }}
              onMouseLeave={e => { if (activeTool !== it.id) (e.currentTarget as HTMLElement).style.color = "#8B8FA8"; }}
            >{it.icon}</button>
          ))}
        </React.Fragment>
      ))}

      <div style={{ width: 22, height: 1, background: "#1E2030", margin: "3px 0" }} />

      {/* Color swatch */}
      <div style={{ position: "relative" }}>
        <button title="Drawing color" onClick={() => setShowColors(v => !v)}
          style={{ width: 22, height: 22, borderRadius: 5, background: color, border: "2px solid rgba(255,255,255,0.25)", cursor: "pointer" }} />
        {showColors && (
          <div style={{
            position: "absolute", left: "calc(100% + 6px)", top: 0, zIndex: 9999,
            background: "#0D0E14", border: "1px solid #1E2030", borderRadius: 8, padding: 8,
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
          }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => { onColorChange(c); setShowColors(false); }}
                style={{ width: 20, height: 20, borderRadius: 4, background: c, border: "none",
                  cursor: "pointer", outline: color === c ? "2px solid white" : "none", outlineOffset: 2 }} />
            ))}
          </div>
        )}
      </div>

      <button title="Magnet — snap to price" onClick={onMagnetToggle} style={btn(magnetActive, "#4FA3E0")}><Magnet size={14} /></button>
      <button title="Lock drawings" onClick={onLockToggle} style={btn(lockActive, "#F0B429")}><Lock size={14} /></button>
      <button title={visible ? "Hide drawings" : "Show drawings"} onClick={onVisToggle} style={btn(false)}>
        {visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
      <button title="Clear all drawings" onClick={onClearAll} style={btn(false, "#FF4D6A")}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#FF4D6A"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#8B8FA8"}
      ><Trash2 size={14} /></button>
    </div>
  );
}
