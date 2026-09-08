"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MousePointer2, Move, Minus, TrendingUp, MoveHorizontal, MoveVertical,
  Ruler, Square, Circle, Triangle, Type, Pencil, Eraser, Trash2,
  Magnet, Lock, Eye, EyeOff, ArrowUpRight, Columns2,
} from "lucide-react";
import type { DrawingTool, DrawingStyle } from "./DrawingToolsPanel";
import { DrawingStylePopover, isStyleCapableTool, DRAWING_STYLE_POPOVER_WIDTH_PX } from "./DrawingToolsPanel";

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
  /**
   * "rail"  — the 40px vertical column beside the chart (desktop).
   * "sheet" — the same tools wrapped into a drawer, for viewports where
   *           globals.css hides the rail. See the block comment in the body.
   */
  variant?:       "rail" | "sheet";
}

export function LeftDrawingSidebar({
  activeTool, onToolChange, onClearAll,
  style, onStyleChange,
  magnetActive, onMagnetToggle,
  lockActive, onLockToggle,
  visible, onVisToggle,
  variant = "rail",
}: Props) {
  /**
   * MEASURED at 375px before this variant existed: `.wm-draw-rail` was
   * display:none with all TWENTY of its controls mounted at zero size —
   * cursor, trend line, ray, horizontal and vertical line, arrow, fib
   * retracement, rectangle, ellipse, triangle, delta+VP box, text, brush,
   * eraser, style, magnet, lock, hide and clear. No other visible control
   * reached any of them: the toolbar's "More chart tools" button expands
   * fullscreen/log-scale/percentage, not drawing.
   *
   * So a trader on a phone could not mark a level. Not "could do it
   * awkwardly" — there was no path. Master Index parity law: a limitation
   * must be explicit, intentional and canonically owned, not accidental
   * drift, and nothing here was intentional.
   *
   * This is the SAME component in both places, exactly as WatchlistPanel is.
   * A phone-specific copy would fork tool identity, the style popover and
   * the magnet/lock/visibility state — and the copy nobody reviews on a
   * phone is the one that rots.
   */
  const isSheet = variant === "sheet";
  const [styleOpen, setStyleOpen] = useState(false);
  const [stylePos, setStylePos]   = useState<{ left: number; top: number } | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  /**
   * The popover opens to the RIGHT of its anchor, which is correct beside a
   * 40px rail on a wide screen and off-screen inside a 320px drawer. Clamp
   * it to the viewport instead of letting it render where no one can reach
   * it — an unreachable style panel is the same defect as an unreachable
   * rail, one level down.
   */
  const anchorFor = (r: DOMRect, topPad = 0) => {
    const left = r.right + 6;
    if (typeof window === "undefined") return { left, top: r.top + topPad };
    const maxLeft = window.innerWidth - DRAWING_STYLE_POPOVER_WIDTH_PX - 8;
    return { left: Math.max(8, Math.min(left, maxLeft)), top: r.top + topPad };
  };

  useEffect(() => {
    if (styleOpen && railRef.current) {
      setStylePos(anchorFor(railRef.current.getBoundingClientRect(), 8));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleOpen]);

  const pickTool = (id: DrawingTool, el: HTMLElement) => {
    onToolChange(id);
    if (isStyleCapableTool(id)) {
      setStylePos(anchorFor(el.getBoundingClientRect()));
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
      className={isSheet ? "wm-draw-sheet" : "wm-draw-rail"}
      style={isSheet
        ? {
            display: "flex", flexDirection: "row", flexWrap: "wrap",
            alignItems: "center", alignContent: "flex-start", gap: 4,
            width: "100%", padding: 8,
            background: "#0D0E14",
            overflowY: "auto", position: "relative", zIndex: 30,
          }
        : {
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
        .wm-draw-rail .wm-draw-btn,
        .wm-draw-sheet .wm-draw-btn {
          width: 30px; height: 30px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.12s;
        }
        .wm-draw-rail .wm-draw-swatch,
        .wm-draw-sheet .wm-draw-swatch {
          width: 30px; height: 30px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: 1px solid transparent; cursor: pointer;
          transition: all 0.12s;
        }
        .wm-draw-rail .wm-draw-btn:focus-visible,
        .wm-draw-rail .wm-draw-swatch:focus-visible,
        .wm-draw-sheet .wm-draw-btn:focus-visible,
        .wm-draw-sheet .wm-draw-swatch:focus-visible {
          outline: 2px solid #4FA3E0; outline-offset: 2px;
        }
        @media (pointer: coarse) {
          .wm-draw-rail { width: 48px; }
          .wm-draw-rail .wm-draw-btn,
          .wm-draw-rail .wm-draw-swatch { width: 44px; height: 44px; }
        }
        /* The sheet only EXISTS on viewports where the rail is hidden, and it
           is reached by tapping. It does not wait for pointer:coarse — a
           touch laptop resized narrow gets the same 44px targets, because the
           reason for the size is the drawer, not the input device. */
        .wm-draw-sheet .wm-draw-btn,
        .wm-draw-sheet .wm-draw-swatch { width: 44px; height: 44px; }
      `}</style>

      {GROUPS.map((g, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div style={isSheet
              // flexBasis:100% forces a wrap, so a group divider still reads
              // as a group boundary once the column becomes rows.
              ? { flexBasis: "100%", height: 1, background: "#1E2030", margin: "6px 0" }
              : { width: 22, height: 1, background: "#1E2030", margin: "3px 0" }} />}
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

      <div style={isSheet
              // flexBasis:100% forces a wrap, so a group divider still reads
              // as a group boundary once the column becomes rows.
              ? { flexBasis: "100%", height: 1, background: "#1E2030", margin: "6px 0" }
              : { width: 22, height: 1, background: "#1E2030", margin: "3px 0" }} />

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