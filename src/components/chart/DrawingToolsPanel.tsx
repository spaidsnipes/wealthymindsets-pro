"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Trash2, Magnet, Lock, Eye, EyeOff,
  ChevronDown, Pen,
} from "lucide-react";

export type DrawingTool =
  | "cursor" | "crosshair"
  | "trendline" | "ray" | "extended-line" | "hline" | "vline" | "hray"
  | "channel" | "pitchfork" | "parallel-channel" | "disjoint-channel" | "regression"
  | "fibonacci" | "fib-ext" | "fib-fan" | "fib-arc" | "fib-time" | "fib-channel" | "gann-fan"
  | "rect" | "ellipse" | "triangle" | "path" | "curve"
  | "text" | "callout" | "note" | "price-label" | "arrow"
  | "brush" | "highlighter" | "eraser"
  | "xabcd" | "abcd" | "head-shoulders"
  | "long-position" | "short-position"
  | "date-range" | "price-range" | "date-price-range" | "measure"
  | "fib-circles";

interface ToolItem {
  id: DrawingTool;
  label: string;
  icon: string;
}

// Only tools that do UNIQUE things in the canvas renderer
const TOOL_GROUPS: { label: string; color: string; tools: ToolItem[] }[] = [
  {
    label: "Lines",
    color: "#4FA3E0",
    tools: [
      { id: "trendline",     label: "Trend Line",     icon: "╱" },
      { id: "ray",           label: "Ray",            icon: "→" },
      { id: "hray",          label: "Horiz. Ray",     icon: "⟶" },
      { id: "hline",         label: "Horiz. Line",    icon: "—" },
      { id: "vline",         label: "Vert. Line",     icon: "|" },
      { id: "extended-line", label: "Extended Line",  icon: "↔" },
      { id: "arrow",         label: "Arrow",          icon: "↗" },
    ],
  },
  {
    label: "Channels & Shapes",
    color: "#00D4AA",
    tools: [
      { id: "channel",  label: "Channel",    icon: "⫠" },
      { id: "rect",     label: "Rectangle",  icon: "▭" },
      { id: "ellipse",  label: "Ellipse",    icon: "◯" },
    ],
  },
  {
    label: "Fibonacci",
    color: "#F0B429",
    tools: [
      { id: "fibonacci", label: "Fib Retracement", icon: "φ" },
      { id: "fib-ext",   label: "Fib Extension",   icon: "φ+" },
    ],
  },
  {
    label: "Measure",
    color: "#F97316",
    tools: [
      { id: "long-position",  label: "Long Setup",   icon: "↑$" },
      { id: "short-position", label: "Short Setup",  icon: "↓$" },
      { id: "price-range",    label: "Price Range",  icon: "⟺$" },
    ],
  },
  {
    label: "Annotate",
    color: "#06B6D4",
    tools: [
      { id: "text",  label: "Text",  icon: "T" },
      { id: "brush", label: "Draw",  icon: "✏" },
    ],
  },
  {
    label: "Edit",
    color: "#94A3B8",
    tools: [
      { id: "eraser", label: "Eraser", icon: "⌫" },
    ],
  },
];

const COLORS = [
  "#00D4AA","#4FA3E0","#F0B429","#FF4D6A","#8B5CF6",
  "#FFFFFF","#94A3B8","#F97316","#06B6D4","#EC4899",
];

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

export function DrawingToolsPanel({
  activeTool, onToolChange, onClearAll,
  color, onColorChange,
  magnetActive, onMagnetToggle,
  lockActive, onLockToggle,
  visible, onVisToggle,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && !showColors) return;
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setShowColors(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, showColors]);

  const activeLabel = (() => {
    if (activeTool === "cursor") return "Cursor";
    for (const g of TOOL_GROUPS) {
      const t = g.tools.find(t => t.id === activeTool);
      if (t) return t.label;
    }
    return activeTool;
  })();

  return (
    <div ref={wrapRef} style={{ display: "flex", alignItems: "center", gap: 4, position: "relative", zIndex: 200 }}>
      {/* ── Main trigger ── */}
      <button
        onClick={() => { setOpen(o => !o); setShowColors(false); }}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          height: 26, padding: "0 10px",
          background: open ? "rgba(0,212,170,0.15)" : "#131520",
          border: `1px solid ${open ? "rgba(0,212,170,0.5)" : "#1E2030"}`,
          borderRadius: 6, cursor: "pointer",
          color: open ? "#00D4AA" : "#8B8FA8",
          fontSize: 11, fontWeight: 700,
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}
        title="Drawing Tools"
      >
        <Pen size={11} />
        <span style={{ maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis" }}>
          {activeTool === "cursor" ? "Draw" : activeLabel}
        </span>
        <ChevronDown size={10} style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {/* ── Color swatch ── */}
      <button
        onClick={() => { setShowColors(v => !v); setOpen(false); }}
        style={{
          width: 20, height: 20, borderRadius: 4, flexShrink: 0,
          background: color, border: "2px solid rgba(255,255,255,0.2)",
          cursor: "pointer",
        }}
        title="Drawing Color"
      />

      {/* ── Utility buttons ── */}
      <button onClick={onMagnetToggle} title="Magnet" style={utilBtnStyle(magnetActive, "#4FA3E0")}><Magnet size={11} /></button>
      <button onClick={onLockToggle}   title="Lock"   style={utilBtnStyle(lockActive,   "#F0B429")}><Lock   size={11} /></button>
      <button onClick={onVisToggle}    title={visible ? "Hide drawings" : "Show drawings"} style={utilBtnStyle(false, "#00D4AA")}>
        {visible ? <Eye size={11} /> : <EyeOff size={11} />}
      </button>
      <button onClick={onClearAll}     title="Clear All drawings" style={utilBtnStyle(false, "#FF4D6A", true)}>
        <Trash2 size={11} />
      </button>

      {/* ── Color picker ── */}
      {showColors && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 9999,
          background: "#0D0E14", border: "1px solid #1E2030",
          borderRadius: 8, padding: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6,
        }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => { onColorChange(c); setShowColors(false); }}
              style={{
                width: 20, height: 20, borderRadius: 4, background: c, border: "none",
                cursor: "pointer", outline: color === c ? "2px solid white" : "none", outlineOffset: 2,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Main dropdown ── */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 9999,
          background: "#0D0E14", border: "1px solid #1E2030",
          borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.8)",
          padding: "12px 14px", minWidth: 420,
          maxWidth: "90vw", maxHeight: "70vh", overflowY: "auto",
        }}>
          {/* Header with cursor/crosshair quick picks */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#E2E8F0", letterSpacing: "0.08em" }}>DRAWING TOOLS</div>
            <div style={{ display: "flex", gap: 4 }}>
              {([
                { id: "cursor" as DrawingTool, label: "Cursor", icon: "↖" },
                { id: "crosshair" as DrawingTool, label: "Crosshair", icon: "✛" },
              ] as const).map(t => (
                <button key={t.id} onClick={() => { onToolChange(t.id); setOpen(false); }}
                  style={{
                    padding: "3px 10px", borderRadius: 5, fontSize: 11, fontWeight: 700,
                    background: activeTool === t.id ? "rgba(0,212,170,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${activeTool === t.id ? "rgba(0,212,170,0.4)" : "#1E2030"}`,
                    color: activeTool === t.id ? "#00D4AA" : "#8B8FA8", cursor: "pointer",
                  }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tool groups */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {TOOL_GROUPS.map(group => (
              <div key={group.label}>
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
                  color: group.color, marginBottom: 5, paddingBottom: 3,
                  borderBottom: `1px solid ${group.color}30`,
                  textTransform: "uppercase",
                }}>
                  {group.label}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {group.tools.map(tool => {
                    const isActive = activeTool === tool.id;
                    return (
                      <button key={tool.id} onClick={() => { onToolChange(tool.id); setOpen(false); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 7,
                          padding: "5px 8px", borderRadius: 5,
                          background: isActive ? `${group.color}18` : "transparent",
                          border: `1px solid ${isActive ? `${group.color}50` : "transparent"}`,
                          color: isActive ? group.color : "#C0C8D8",
                          cursor: "pointer", textAlign: "left",
                          fontSize: 11, fontWeight: isActive ? 700 : 400,
                          transition: "all 0.12s",
                        }}
                        onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "#E2E8F0"; } }}
                        onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#C0C8D8"; } }}
                      >
                        <span style={{ fontSize: 12, width: 18, textAlign: "center", color: isActive ? group.color : "#4A5070", fontFamily: "monospace" }}>
                          {tool.icon}
                        </span>
                        {tool.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function utilBtnStyle(active: boolean, activeColor: string, danger = false): React.CSSProperties {
  return {
    width: 24, height: 24, borderRadius: 5, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: active ? `${activeColor}18` : "transparent",
    border: `1px solid ${active ? `${activeColor}50` : "transparent"}`,
    color: active ? activeColor : danger ? "#8B8FA8" : "#8B8FA8",
    cursor: "pointer", transition: "all 0.12s",
  };
}
