/** Shared chart / drawing types — used by MainChart, DrawingToolsPanel, sidebars. */

export type DashStyle = "solid" | "dashed" | "dotted";

export interface DrawingStyle {
  color:   string;
  width:   number;   // 1–4 px
  dash:    DashStyle;
  opacity: number;   // 0–100
}

export const DEFAULT_DRAWING_STYLE: DrawingStyle = {
  color: "#00D4AA", width: 2, dash: "solid", opacity: 100,
};

export type DrawingTool =
  | "cursor" | "crosshair" | "select" | "eraser"
  | "trendline" | "ray" | "info-line" | "extended-line" | "trend-angle"
  | "hline" | "hray" | "vline" | "crossline"
  | "parallel-channel" | "channel" | "regression" | "flat-channel" | "disjoint-channel"
  | "pitchfork" | "schiff" | "modified-schiff" | "inside-pitchfork"
  | "fibonacci" | "fib-ext" | "fib-channel" | "fib-timezone" | "fib-speed-fan"
  | "fib-time" | "fib-circles" | "fib-spiral" | "fib-arcs" | "fib-wedge" | "fib-pitchfan"
  | "gann-box" | "gann-square-fixed" | "gann-square" | "gann-fan"
  | "xabcd" | "cypher" | "head-shoulders" | "abcd" | "pattern-triangle" | "three-drives"
  | "elliott-impulse" | "elliott-correction" | "elliott-triangle" | "elliott-double" | "elliott-triple"
  | "cyclic-lines" | "time-cycles" | "sine-line"
  | "price-range" | "date-range" | "date-price-range" | "measure"
  | "long-position" | "short-position"
  | "delta-vp"
  | "brush" | "highlighter"
  | "arrow" | "arrow-up" | "arrow-down"
  | "rect" | "rotated-rect" | "path" | "circle" | "ellipse" | "polyline"
  | "triangle" | "arc" | "curve" | "double-curve"
  | "text" | "note" | "price-note" | "pin" | "callout" | "comment"
  | "price-label" | "signpost" | "flag";

export type LogicalPt = { price: number; time: number };

export interface DrawStyle {
  color: string;
  width: number;
  dash: DashStyle;
  fill: boolean;
  opacity: number;
}

export interface ChartDrawing {
  id: number;
  tool: string;
  pts: LogicalPt[];
  style: DrawStyle;
  text?: string;
}

export function isStyleCapableTool(t: DrawingTool): boolean {
  return t !== "cursor" && t !== "select" && t !== "eraser" && t !== "crosshair";
}