"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MousePointer2, Move, Minus, TrendingUp, MoveHorizontal, MoveVertical,
  Ruler, Square, Circle, Triangle, Type, Pencil, Eraser, Trash2,
  Magnet, Lock, Eye, EyeOff, ArrowUpRight, Columns2,
} from "lucide-react";
import type { DrawingTool, DrawingStyle } from "./DrawingToolsPanel";
import { DrawingStylePopover, isStyleCapableTool } from "./DrawingToolsPanel";

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
    { id: "delta-vp",  label: "Delta + VP Box",  icon: <Columns2 size={15} /> },
  ]},
  { items: [
    { id: "text",      label: "Text",            icon: <Type size={15} /> },
    { id: "brush",     label: "Draw / Brush",    icon: <Pencil size={15} /> },
    { id: "eraser",    label: "Eraser",          icon: <Eraser size={15} /> },
  ]},
];

interface Props {
  activeTool:     DrawingTool;
  onToolChange:   (t: DrawingTool) => void;
  onClearAll:     () => void;
  style:          DrawingStyle;
  onStyleChange:  (patch: Partial<DrawingStyle>) => void;
  magnetActive:   boolean;
  onMagnetToggle: () => void;
  lockActive:     boolean;
  onLockToggle:   () => void;
  visible:        boolean;
  onVisToggle:    () => void;
}

export function LeftDrawingSidebar({
  activeTool, onToolChange, onClearAll,
  style, onStyleChange,
  magnetActive, onMagnetToggle,
  lockActive, onLockToggle,
  visible, onVisToggle,
}: Props) {
  const [styleOpen, setStyleOpen] = useState(false);
  const [stylePos, setStylePos]   = useState<{ left: number; top: number } | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (styleOpen && railRef.current) {
      const r = railRef.current.getBoundingClientRect();
      setStylePos({ left: r.right + 6, top: r.top + 8 });
    }
  }, [styleOpen]);

  const pickTool = (id: DrawingTool, el: HTMLElement) => {
    onToolChange(id);
    if (isStyleCapableTool(id)) {
      const r = el.getBoundingClientRect();
      setStylePos({ left: r.right + 6, top: r.top });
      setStyleOpen(true);
    } else {
      setStyleOpen(false);
    }
  };

  // Only the DYNAMIC (state-driven) styles live inline; box-size, focus ring, and
  // the ≥44px touch target live in the scoped stylesheet below so a
  // `@media (pointer: coarse)` query can enlarge the hit area on touch without
  // regressing the compact desktop rail (WM-DRAW-P0-01 §8.1 / Micah "keep the
  // visual small inside a larger hit area").
  const btn = (active: boolean, activeColor = "#00D4AA"): React.CSSProperties => ({
    background: active ? `${activeColor}22` : "transparent",
    border: `1px solid ${active ? `${activeColor}55` : "transparent"}`,
    color: active ? activeColor : "#8B8FA8",
  });

  return (
    <div
      ref={railRef}
      className="wm-draw-rail"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
        flexShrink: 0, padding: "6px 0",
        background: "#0D0E14", borderRight: "1px solid #1E2030",
        overflowY: "auto", position: "relative", zIndex: 30,
      }}
    >
      {/* Scoped a11y + touch-target styles. Desktop stays compact (30px); coarse
          pointers (touch) get ≥44px hit areas; every control shows a
          :focus-visible ring for keyboard users. */}
      <style>{`
        .wm-draw-rail { width: 40px; }
        .wm-draw-rail .wm-draw-btn {
          width: 30px; height: 30px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.12s;
        }
        .wm-draw-rail .wm-draw-swatch {
          width: 30px; height: 30px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: 1px solid transparent; cursor: pointer;
          transition: all 0.12s;
        }
        .wm-draw-rail .wm-draw-btn:focus-visible,
        .wm-draw-rail .wm-draw-swatch:focus-visible {
          outline: 2px solid #4FA3E0; outline-offset: 2px;
        }
        @media (pointer: coarse) {
          .wm-draw-rail { width: 48px; }
          .wm-draw-rail .wm-draw-btn,
          .wm-draw-rail .wm-draw-swatch { width: 44px; height: 44px; }
        }
      `}</style>

      {GROUPS.map((g, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div style={{ width: 22, height: 1, background: "#1E2030", margin: "3px 0" }} />}
          {g.items.map(it => (
            <button
              key={it.id}
              className="wm-draw-btn"
              title={it.label}
              aria-label={it.label}
              aria-pressed={activeTool === it.id}
              onClick={e => pickTool(it.id, e.currentTarget)}
              style={btn(activeTool === it.id)}
              onMouseEnter={e => { if (activeTool !== it.id) (e.currentTarget as HTMLElement).style.color = "#E2E8F0"; }}
              onMouseLeave={e => { if (activeTool !== it.id) (e.currentTarget as HTMLElement).style.color = "#8B8FA8"; }}
            >{it.icon}</button>
          ))}
        </React.Fragment>
      ))}

      <div style={{ width: 22, height: 1, background: "#1E2030", margin: "3px 0" }} />

      {/* Style swatch — ≥44px tap area on touch, with the small colour chip
          centered inside so the visual stays compact. */}
      <button
        className="wm-draw-swatch"
        title="Drawing style"
        aria-label="Drawing style"
        aria-haspopup="dialog"
        aria-expanded={styleOpen}
        onClick={() => setStyleOpen(v => !v)}
      >
        <span
          aria-hidden="true"
          style={{
            width: 22, height: 22, borderRadius: 5,
            background: style.color,
            border: `2px solid ${styleOpen ? "#4FA3E0" : "rgba(255,255,255,0.25)"}`,
            opacity: style.opacity / 100,
          }}
        />
      </button>

      <button className="wm-draw-btn" title="Magnet — snap to price" aria-label="Magnet — snap to price" aria-pressed={magnetActive} onClick={onMagnetToggle} style={btn(magnetActive, "#4FA3E0")}><Magnet size={14} /></button>
      <button className="wm-draw-btn" title="Lock drawings" aria-label="Lock drawings" aria-pressed={lockActive} onClick={onLockToggle} style={btn(lockActive, "#F0B429")}><Lock size={14} /></button>
      <button className="wm-draw-btn" title={visible ? "Hide drawings" : "Show drawings"} aria-label={visible ? "Hide drawings" : "Show drawings"} aria-pressed={!visible} onClick={onVisToggle} style={btn(false)}>
        {visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
      <button className="wm-draw-btn" title="Clear all drawings" aria-label="Clear all drawings" onClick={onClearAll} style={btn(false, "#FF4D6A")}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#FF4D6A"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#8B8FA8"}
      ><Trash2 size={14} /></button>

      {styleOpen && stylePos && typeof document !== "undefined" && (
        <DrawingStylePopover
          style={style}
          onChange={onStyleChange}
          anchor={stylePos}
          onClose={() => setStyleOpen(false)}
        />
      )}
    </div>
  );
}