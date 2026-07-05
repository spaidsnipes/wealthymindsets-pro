"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Trash2, Magnet, Lock, Eye, EyeOff,
  ChevronDown, Pen,
} from "lucide-react";

/* Every id here maps 1:1 to a real renderer branch in MainChart.tsx
   (DRAW_PTS / drawOne). Keep this union a SUPERSET of the ids used by
   LeftDrawingSidebar.tsx and ChartsDashboard.tsx. */
export type DrawingTool =
  | "cursor" | "crosshair" | "select" | "eraser"
  // lines
  | "trendline" | "ray" | "info-line" | "extended-line" | "trend-angle"
  | "hline" | "hray" | "vline" | "crossline"
  // channels
  | "parallel-channel" | "channel" | "regression" | "flat-channel" | "disjoint-channel"
  // pitchforks
  | "pitchfork" | "schiff" | "modified-schiff" | "inside-pitchfork"
  // fibonacci
  | "fibonacci" | "fib-ext" | "fib-channel" | "fib-timezone" | "fib-speed-fan"
  | "fib-time" | "fib-circles" | "fib-spiral" | "fib-arcs" | "fib-wedge" | "fib-pitchfan"
  // gann
  | "gann-box" | "gann-square-fixed" | "gann-square" | "gann-fan"
  // patterns
  | "xabcd" | "cypher" | "head-shoulders" | "abcd" | "pattern-triangle" | "three-drives"
  // elliott
  | "elliott-impulse" | "elliott-correction" | "elliott-triangle" | "elliott-double" | "elliott-triple"
  // cycles
  | "cyclic-lines" | "time-cycles" | "sine-line"
  // measure & positions
  | "price-range" | "date-range" | "date-price-range" | "measure"
  | "long-position" | "short-position"
  // brushes
  | "brush" | "highlighter"
  // arrows
  | "arrow" | "arrow-up" | "arrow-down"
  // shapes
  | "rect" | "rotated-rect" | "path" | "circle" | "ellipse" | "polyline"
  | "triangle" | "arc" | "curve" | "double-curve"
  // text & notes
  | "text" | "note" | "price-note" | "pin" | "callout" | "comment"
  | "price-label" | "signpost" | "flag";

interface ToolItem { id: DrawingTool; label: string; icon: string; desc: string; }
interface ToolGroup { label: string; color: string; tools: ToolItem[]; }

const TOOL_GROUPS: ToolGroup[] = [
  {
    label: "Lines", color: "#4FA3E0",
    tools: [
      { id: "trendline",     label: "Trend Line",      icon: "╱", desc: "Sloped line between two points to map a trend." },
      { id: "ray",           label: "Ray",             icon: "→", desc: "Line from a point extending to the right edge." },
      { id: "info-line",     label: "Info Line",       icon: "ⓘ", desc: "Trend line with price/bar/% distance readout." },
      { id: "extended-line", label: "Extended Line",   icon: "↔", desc: "Line extended infinitely in both directions." },
      { id: "trend-angle",   label: "Trend Angle",     icon: "∠", desc: "Trend line that reports its angle in degrees." },
      { id: "hline",         label: "Horizontal Line", icon: "─", desc: "Horizontal support/resistance across the chart." },
      { id: "hray",          label: "Horizontal Ray",  icon: "⊢", desc: "Horizontal line extending right from a level." },
      { id: "vline",         label: "Vertical Line",   icon: "│", desc: "Vertical line marking a specific time/bar." },
      { id: "crossline",     label: "Cross Line",      icon: "✛", desc: "Horizontal + vertical crosshair at one point." },
    ],
  },
  {
    label: "Channels", color: "#00D4AA",
    tools: [
      { id: "parallel-channel", label: "Parallel Channel", icon: "⫽", desc: "Two parallel trend lines forming a channel." },
      { id: "regression",       label: "Regression Trend", icon: "⟋", desc: "Least-squares fit with ±2σ deviation bands." },
      { id: "flat-channel",     label: "Flat Top / Bottom", icon: "⊏", desc: "Channel with a flat top or bottom edge." },
      { id: "disjoint-channel", label: "Disjoint Channel", icon: "⋕", desc: "Free-form channel with four movable anchors." },
    ],
  },
  {
    label: "Pitchforks", color: "#8B5CF6",
    tools: [
      { id: "pitchfork",        label: "Pitchfork",          icon: "Ψ",  desc: "Andrews' Pitchfork from three pivot points." },
      { id: "schiff",           label: "Schiff",             icon: "Ψ₁", desc: "Schiff variation — median from midpoint." },
      { id: "modified-schiff",  label: "Modified Schiff",    icon: "Ψ₂", desc: "Modified Schiff pitchfork variation." },
      { id: "inside-pitchfork", label: "Inside Pitchfork",   icon: "Ψᵢ", desc: "Inside Andrews' pitchfork variation." },
    ],
  },
  {
    label: "Fibonacci", color: "#F0B429",
    tools: [
      { id: "fibonacci",     label: "Fib Retracement",       icon: "φ",  desc: "Retracement levels between swing high/low." },
      { id: "fib-ext",       label: "Trend-Based Extension", icon: "φ↗", desc: "Project targets from a three-point move." },
      { id: "fib-channel",   label: "Fib Channel",           icon: "φ∥", desc: "Parallel fib levels along a channel." },
      { id: "fib-timezone",  label: "Fib Time Zone",         icon: "φⵗ", desc: "Vertical fib intervals across time." },
      { id: "fib-speed-fan", label: "Speed Resistance Fan",  icon: "φ⋔", desc: "Fan of fib-ratio trend lines." },
      { id: "fib-time",      label: "Trend-Based Fib Time",  icon: "φ⏱", desc: "Fib time projections from a move." },
      { id: "fib-circles",   label: "Fib Circles",           icon: "φ◎", desc: "Concentric fib-ratio circles." },
      { id: "fib-spiral",    label: "Fib Spiral",            icon: "✺",  desc: "Golden-ratio logarithmic spiral." },
      { id: "fib-arcs",      label: "Speed Resistance Arcs", icon: "φ◜", desc: "Fib-ratio arcs from a trend." },
      { id: "fib-wedge",     label: "Fib Wedge",             icon: "φ◁", desc: "Wedge of fib levels from an apex." },
      { id: "fib-pitchfan",  label: "Pitchfan",              icon: "φΨ", desc: "Pitchfork-style fib fan." },
    ],
  },
  {
    label: "Gann", color: "#F97316",
    tools: [
      { id: "gann-box",          label: "Gann Box",          icon: "⊞", desc: "Gann time/price grid box." },
      { id: "gann-square-fixed", label: "Gann Square Fixed", icon: "▣", desc: "Fixed-ratio Gann square." },
      { id: "gann-square",       label: "Gann Square",       icon: "◻", desc: "Gann square of time & price." },
      { id: "gann-fan",          label: "Gann Fan",          icon: "⋔", desc: "Fan of Gann angle lines (1x1, 2x1…)." },
    ],
  },
  {
    label: "Chart Patterns", color: "#EC4899",
    tools: [
      { id: "xabcd",            label: "XABCD Pattern",     icon: "X", desc: "Harmonic XABCD pattern with labeled pivots." },
      { id: "cypher",           label: "Cypher Pattern",    icon: "C", desc: "Cypher harmonic pattern." },
      { id: "head-shoulders",   label: "Head & Shoulders",  icon: "⋀", desc: "Head-and-shoulders with neckline." },
      { id: "abcd",             label: "ABCD Pattern",      icon: "A", desc: "ABCD harmonic pattern." },
      { id: "pattern-triangle", label: "Triangle Pattern",  icon: "◺", desc: "Triangle consolidation pattern." },
      { id: "three-drives",     label: "Three Drives",      icon: "3", desc: "Three-drives harmonic pattern." },
    ],
  },
  {
    label: "Elliott Waves", color: "#06B6D4",
    tools: [
      { id: "elliott-impulse",    label: "Impulse (1-2-3-4-5)", icon: "⑤", desc: "Five-wave Elliott impulse count." },
      { id: "elliott-correction", label: "Correction (A-B-C)",  icon: "Ⓒ", desc: "Three-wave A-B-C correction." },
      { id: "elliott-triangle",   label: "Triangle (A-E)",      icon: "Ⓔ", desc: "Five-point A-B-C-D-E triangle." },
      { id: "elliott-double",     label: "Double Combo (W-X-Y)", icon: "Ⓨ", desc: "W-X-Y double combination." },
      { id: "elliott-triple",     label: "Triple Combo (W-Z)",  icon: "Ⓩ", desc: "W-X-Y-X-Z triple combination." },
    ],
  },
  {
    label: "Cycles", color: "#94A3B8",
    tools: [
      { id: "cyclic-lines", label: "Cyclic Lines", icon: "◠", desc: "Evenly spaced vertical cycle lines." },
      { id: "time-cycles",  label: "Time Cycles",  icon: "◔", desc: "Repeating time-cycle markers." },
      { id: "sine-line",    label: "Sine Line",    icon: "∿", desc: "Sine wave fitted between two points." },
    ],
  },
  {
    label: "Measure", color: "#00D4AA",
    tools: [
      { id: "price-range",      label: "Price Range",       icon: "↕", desc: "Measure price & % move between two levels." },
      { id: "date-range",       label: "Date Range",        icon: "↔", desc: "Measure bars & time between two points." },
      { id: "date-price-range", label: "Date & Price Range", icon: "⤢", desc: "Measure both time and price in a box." },
      { id: "measure",          label: "Measure",           icon: "▱", desc: "Quick ruler for price/time/percent." },
    ],
  },
  {
    label: "Positions", color: "#F0B429",
    tools: [
      { id: "long-position",  label: "Long Position",  icon: "▲", desc: "Entry / stop / target with risk-reward zones." },
      { id: "short-position", label: "Short Position", icon: "▼", desc: "Short setup with risk-reward zones." },
    ],
  },
  {
    label: "Arrows", color: "#4FA3E0",
    tools: [
      { id: "arrow",      label: "Arrow",           icon: "↗", desc: "Straight arrow between two points." },
      { id: "arrow-up",   label: "Arrow Mark Up",   icon: "⬆", desc: "Up marker placed at a single point." },
      { id: "arrow-down", label: "Arrow Mark Down", icon: "⬇", desc: "Down marker placed at a single point." },
    ],
  },
  {
    label: "Brushes", color: "#EC4899",
    tools: [
      { id: "brush",       label: "Brush",       icon: "✏", desc: "Freehand brush stroke." },
      { id: "highlighter", label: "Highlighter", icon: "▬", desc: "Wide translucent freehand highlighter." },
    ],
  },
  {
    label: "Shapes", color: "#8B5CF6",
    tools: [
      { id: "rect",         label: "Rectangle",         icon: "▭", desc: "Box to highlight a zone." },
      { id: "rotated-rect", label: "Rotated Rectangle", icon: "◇", desc: "Rectangle at an arbitrary angle." },
      { id: "path",         label: "Path",              icon: "⌇", desc: "Multi-segment path (double-click to end)." },
      { id: "circle",       label: "Circle",            icon: "◯", desc: "Circle around a region." },
      { id: "ellipse",      label: "Ellipse",           icon: "⬭", desc: "Oval around a region." },
      { id: "polyline",     label: "Polyline",          icon: "⋁", desc: "Connected line segments (double-click to end)." },
      { id: "triangle",     label: "Triangle",          icon: "△", desc: "Three-point triangle shape." },
      { id: "arc",          label: "Arc",               icon: "◜", desc: "Curved arc between points." },
      { id: "curve",        label: "Curve",             icon: "⌒", desc: "Single smooth curve." },
      { id: "double-curve", label: "Double Curve",      icon: "∿", desc: "S-shaped double curve." },
    ],
  },
  {
    label: "Text & Notes", color: "#06B6D4",
    tools: [
      { id: "text",        label: "Text",        icon: "T",  desc: "Free text label anywhere on the chart." },
      { id: "note",        label: "Note",        icon: "✎",  desc: "Sticky note anchored to the chart." },
      { id: "price-note",  label: "Price Note",  icon: "❏",  desc: "Note pinned to a price level." },
      { id: "pin",         label: "Pin",         icon: "📌", desc: "Pin marker at a point." },
      { id: "callout",     label: "Callout",     icon: "💬", desc: "Text callout with a pointer." },
      { id: "comment",     label: "Comment",     icon: "✐",  desc: "Comment bubble on the chart." },
      { id: "price-label", label: "Price Label", icon: "🏷", desc: "Label showing the price at a point." },
      { id: "signpost",    label: "Signpost",    icon: "⚑",  desc: "Signpost marker with text." },
      { id: "flag",        label: "Flag Mark",   icon: "⚐",  desc: "Flag marker at a point." },
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
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const colorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);
  const [colorPos, setColorPos] = useState<{ left: number; top: number } | null>(null);

  // Anchor portal dropdowns to their triggers with fixed coords so they
  // escape the toolbar's `overflow` clipping.
  useEffect(() => {
    if (open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setMenuPos({ left: r.left, top: r.bottom + 6 });
    }
  }, [open]);
  useEffect(() => {
    if (showColors && colorRef.current) {
      const r = colorRef.current.getBoundingClientRect();
      setColorPos({ left: r.left, top: r.bottom + 6 });
    }
  }, [showColors]);

  useEffect(() => {
    if (!open && !showColors) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      setShowColors(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, showColors]);

  const activeLabel = (() => {
    if (activeTool === "cursor") return "Draw";
    if (activeTool === "select") return "Select";
    if (activeTool === "eraser") return "Eraser";
    for (const g of TOOL_GROUPS) {
      const t = g.tools.find(t => t.id === activeTool);
      if (t) return t.label;
    }
    return activeTool;
  })();

  const q = query.trim().toLowerCase();
  const groups = q
    ? TOOL_GROUPS.map(g => ({ ...g, tools: g.tools.filter(t => t.label.toLowerCase().includes(q) || t.id.includes(q)) }))
        .filter(g => g.tools.length)
    : TOOL_GROUPS;

  const pick = (id: DrawingTool) => { onToolChange(id); setOpen(false); setQuery(""); };

  return (
    <div ref={wrapRef} style={{ display: "flex", alignItems: "center", gap: 4, position: "relative", zIndex: 200 }}>
      {/* ── Main trigger ── */}
      <button
        ref={triggerRef}
        onClick={() => { setOpen(o => !o); setShowColors(false); }}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          height: 26, padding: "0 10px",
          background: open ? "rgba(0,212,170,0.15)" : "#131520",
          border: `1px solid ${open ? "rgba(0,212,170,0.5)" : "#1E2030"}`,
          borderRadius: 6, cursor: "pointer",
          color: activeTool !== "cursor" ? "#00D4AA" : (open ? "#00D4AA" : "#8B8FA8"),
          fontSize: 11, fontWeight: 700, transition: "all 0.15s", whiteSpace: "nowrap",
        }}
        title="Drawing Tools"
      >
        <Pen size={11} />
        <span style={{ maxWidth: 96, overflow: "hidden", textOverflow: "ellipsis" }}>{activeLabel}</span>
        <ChevronDown size={10} style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {/* ── Color swatch ── */}
      <button
        ref={colorRef}
        onClick={() => { setShowColors(v => !v); setOpen(false); }}
        style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, background: color, border: "2px solid rgba(255,255,255,0.2)", cursor: "pointer" }}
        title="Drawing Color"
      />

      {/* ── Utility buttons ── */}
      <button onClick={onMagnetToggle} title="Magnet — snap to OHLC" style={utilBtnStyle(magnetActive, "#4FA3E0")}><Magnet size={11} /></button>
      <button onClick={onLockToggle}   title="Lock drawings"        style={utilBtnStyle(lockActive,   "#F0B429")}><Lock   size={11} /></button>
      <button onClick={onVisToggle}    title={visible ? "Hide drawings" : "Show drawings"} style={utilBtnStyle(false, "#00D4AA")}>
        {visible ? <Eye size={11} /> : <EyeOff size={11} />}
      </button>
      <button onClick={onClearAll}     title="Clear all drawings"   style={utilBtnStyle(false, "#FF4D6A", true)}><Trash2 size={11} /></button>

      {/* ── Color picker (portal) ── */}
      {showColors && colorPos && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} style={{
          position: "fixed", top: colorPos.top, left: colorPos.left, zIndex: 99999,
          background: "#0D0E14", border: "1px solid #1E2030", borderRadius: 8, padding: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.7)", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6,
        }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => { onColorChange(c); setShowColors(false); }}
              style={{ width: 20, height: 20, borderRadius: 4, background: c, border: "none", cursor: "pointer", outline: color === c ? "2px solid white" : "none", outlineOffset: 2 }} />
          ))}
        </div>, document.body)}

      {/* ── Main dropdown (portal) ── */}
      {open && menuPos && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} style={{
          position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 99999,
          background: "#0D0E14", border: "1px solid #1E2030", borderRadius: 10,
          boxShadow: "0 12px 40px rgba(0,0,0,0.8)", padding: "12px 14px 14px",
          width: 620, maxWidth: "94vw", maxHeight: "78vh", overflowY: "auto",
        }}>
          {/* Header row: title + cursor / select / eraser quick picks */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9, gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#E2E8F0", letterSpacing: "0.08em" }}>DRAWING TOOLS</div>
            <div style={{ display: "flex", gap: 4 }}>
              {([
                { id: "cursor" as DrawingTool, label: "Cursor", icon: "↖" },
                { id: "select" as DrawingTool, label: "Select", icon: "⇱" },
                { id: "eraser" as DrawingTool, label: "Eraser", icon: "⌫" },
              ]).map(t => {
                const on = activeTool === t.id;
                return (
                  <button key={t.id} onClick={() => pick(t.id)}
                    style={{
                      padding: "3px 9px", borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: "pointer",
                      background: on ? "rgba(0,212,170,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${on ? "rgba(0,212,170,0.4)" : "#1E2030"}`,
                      color: on ? "#00D4AA" : "#8B8FA8",
                    }}>
                    {t.icon} {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <input
            value={query}
            autoFocus
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tools…"
            style={{
              width: "100%", height: 28, marginBottom: 10, padding: "0 10px",
              background: "#131520", border: "1px solid #1E2030", borderRadius: 6,
              color: "#E2E8F0", fontSize: 11, outline: "none",
            }}
          />

          {/* Category columns (masonry-style packing) */}
          <div style={{ columnCount: 3, columnGap: 14 }}>
            {groups.map(group => (
              <div key={group.label} style={{ breakInside: "avoid", marginBottom: 12 }}>
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: group.color,
                  marginBottom: 5, paddingBottom: 3, borderBottom: `1px solid ${group.color}30`, textTransform: "uppercase",
                }}>
                  {group.label}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {group.tools.map(tool => {
                    const isActive = activeTool === tool.id;
                    return (
                      <button key={tool.id} onClick={() => pick(tool.id)} title={tool.desc}
                        style={{
                          display: "flex", alignItems: "center", gap: 7, width: "100%",
                          padding: "5px 7px", borderRadius: 5,
                          background: isActive ? `${group.color}18` : "transparent",
                          border: `1px solid ${isActive ? `${group.color}50` : "transparent"}`,
                          color: isActive ? group.color : "#C0C8D8",
                          cursor: "pointer", textAlign: "left", fontSize: 11,
                          fontWeight: isActive ? 700 : 400, transition: "all 0.1s",
                        }}
                        onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "#E2E8F0"; } }}
                        onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#C0C8D8"; } }}
                      >
                        <span style={{ fontSize: 12, width: 20, textAlign: "center", color: isActive ? group.color : "#5A6788", fontFamily: "monospace", flexShrink: 0 }}>
                          {tool.icon}
                        </span>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tool.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {groups.length === 0 && (
              <div style={{ color: "#5A6788", fontSize: 11, padding: "8px 2px" }}>No tools match “{query}”.</div>
            )}
          </div>

          {/* Footer hint */}
          <div style={{ marginTop: 6, paddingTop: 8, borderTop: "1px solid #1E2030", fontSize: 9.5, color: "#5A6788", lineHeight: 1.5 }}>
            Click to place each point · drag for 2-point tools · double-click to finish a polyline/path ·
            pick <span style={{ color: "#8B8FA8" }}>Select</span> then click a drawing to edit or drag it.
          </div>
        </div>, document.body)}
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
