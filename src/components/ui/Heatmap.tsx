"use client";
import * as React from "react";

/**
 * Heatmap — pure display primitive that renders a rows×cols cell grid.
 *
 * This primitive is data-driven and truth-safe:
 *  - Each cell carries `value: number | "UNKNOWN"`. UNKNOWN cells render
 *    a `?` glyph, not a color that reads as "resolved zero."
 *  - Confidence tier drives cell opacity so low-sample cells visually
 *    recede without disappearing.
 *  - Legend is required — a color cell with no scale is a lie.
 *  - onCellClick returns the full cell so consumers can drill through to
 *    Memory / Replay / Journal / Chart per the Founder's loop:
 *    "Heatmap discovers pattern → Memory proves examples → Replay
 *     explains it → Mirror interprets → Drill trains → Profile records
 *     improvement."
 *
 * Color encoding rules:
 *  - Uses monotone gold-intensity gradient by default (matches WM Pro
 *    identity). Diverging (positive/negative) requires explicit config.
 *  - Never red/green alone — patterns/text/border reinforce for a11y and
 *    color-blind safety.
 *
 * Not a chart library — this is a spatial cell renderer. Consumers pass
 * cells produced by pure selectors (e.g. selectProcessLandscape).
 */

export type HeatmapValue = number | "UNKNOWN";
export type HeatmapConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface HeatmapCell {
  rowKey: string;
  colKey: string;
  value: HeatmapValue;
  confidence: HeatmapConfidence;
  sampleCount: number;
  /** Any drilldown reference (decision ids, symbol, timestamp, etc.). */
  drilldownRef?: unknown;
  /** When UNKNOWN, why. */
  reason?: string;
}

export type HeatmapScheme = "monotone" | "diverging";

export interface HeatmapProps {
  cells: readonly HeatmapCell[];
  /** Ordered row keys (top→bottom). If omitted, derived from cells. */
  rowOrder?: readonly string[];
  /** Ordered column keys (left→right). If omitted, derived from cells. */
  colOrder?: readonly string[];
  /** Scheme: monotone (gold intensity) or diverging (positive/negative). */
  scheme?: HeatmapScheme;
  /** Value range for color mapping. If omitted, derived from cells. */
  min?: number;
  max?: number;
  /** For diverging, the neutral midpoint. Default 0. */
  midpoint?: number;
  /** Format cell value for display. */
  format?: (v: HeatmapValue) => string;
  /** Cell click handler — receives the full cell including drilldownRef. */
  onCellClick?: (cell: HeatmapCell) => void;
  /** Ariaa label for the entire heatmap. */
  ariaLabel?: string;
  /** Legend label — required to make color encoding truthful. */
  legendLabel: string;
  /** Legend unit (%, R, count). */
  legendUnit?: string;
  className?: string;
}

const defaultFormat = (v: HeatmapValue): string => {
  if (v === "UNKNOWN") return "?";
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2);
};

function colorFor(
  value: HeatmapValue,
  confidence: HeatmapConfidence,
  min: number,
  max: number,
  midpoint: number,
  scheme: HeatmapScheme,
): { background: string; text: string; opacity: number } {
  if (value === "UNKNOWN") {
    // Empty obsidian cell with a dim ? glyph
    return { background: "var(--wm-ob-2, #131317)", text: "var(--wm-text-3, #55503f)", opacity: 0.55 };
  }
  const opacity = confidence === "HIGH" ? 1 : confidence === "MEDIUM" ? 0.85 : 0.65;

  if (scheme === "diverging") {
    // Positive → gold, negative → dim ember-red, midpoint → obsidian neutral
    const delta = value - midpoint;
    const range = Math.max(Math.abs(max - midpoint), Math.abs(midpoint - min)) || 1;
    const norm = Math.max(-1, Math.min(1, delta / range));
    if (norm >= 0) {
      const intensity = norm;
      // Gold ramp: hair → line → mark → hero at higher intensity
      const bg = intensity > 0.75 ? "var(--wm-gold-hero, #d4af37)"
               : intensity > 0.5  ? "var(--wm-gold-mark, #c9a55c)"
               : intensity > 0.25 ? "var(--wm-gold-line, #8b6a29)"
                                  : "var(--wm-gold-hair, #6d5220)";
      const text = intensity > 0.5 ? "var(--wm-ob-0, #050506)" : "var(--wm-text-1, #ede6d3)";
      return { background: bg, text, opacity };
    } else {
      const intensity = -norm;
      // Muted ember for negative — desaturated so it doesn't fight identity
      const bg = intensity > 0.75 ? "#8c3d33"
               : intensity > 0.5  ? "#6d3128"
               : intensity > 0.25 ? "#4a231d"
                                  : "var(--wm-ob-3, #1c1c22)";
      const text = "var(--wm-text-1, #ede6d3)";
      return { background: bg, text, opacity };
    }
  }

  // Monotone gold-intensity
  const range = max - min || 1;
  const norm = Math.max(0, Math.min(1, (value - min) / range));
  const bg = norm > 0.75 ? "var(--wm-gold-hero, #d4af37)"
           : norm > 0.5  ? "var(--wm-gold-mark, #c9a55c)"
           : norm > 0.25 ? "var(--wm-gold-line, #8b6a29)"
                         : "var(--wm-gold-hair, #6d5220)";
  const text = norm > 0.5 ? "var(--wm-ob-0, #050506)" : "var(--wm-text-1, #ede6d3)";
  return { background: bg, text, opacity };
}

function LegendChip({ label, unit }: { label: string; unit?: string }) {
  return (
    <div className="flex items-center gap-2 mt-3 text-[10px] text-[color:var(--wm-text-2,#8a8271)]">
      <span className="uppercase tracking-[0.24em]">{label}</span>
      {unit && <span className="text-[color:var(--wm-gold-line,#8b6a29)]">({unit})</span>}
      <div className="flex items-center gap-0.5 ml-2">
        {[0.15, 0.4, 0.65, 0.9].map((n) => (
          <div
            key={n}
            className="w-3 h-3 border border-[color:var(--wm-gold-hair,#6d5220)]"
            style={{
              background:
                n > 0.75 ? "var(--wm-gold-hero, #d4af37)"
                : n > 0.5  ? "var(--wm-gold-mark, #c9a55c)"
                : n > 0.25 ? "var(--wm-gold-line, #8b6a29)"
                           : "var(--wm-gold-hair, #6d5220)",
            }}
            aria-hidden="true"
          />
        ))}
        <span className="ml-2 text-[color:var(--wm-text-3,#55503f)]">low → high</span>
      </div>
      <div className="ml-4 flex items-center gap-1">
        <span
          className="w-3 h-3 border border-[color:var(--wm-gold-hair,#6d5220)] flex items-center justify-center text-[8px]"
          style={{ background: "var(--wm-ob-2, #131317)", color: "var(--wm-text-3, #55503f)" }}
          aria-hidden="true"
        >?</span>
        <span className="text-[color:var(--wm-text-3,#55503f)]">unknown</span>
      </div>
    </div>
  );
}

export function Heatmap({
  cells,
  rowOrder,
  colOrder,
  scheme = "monotone",
  min: minProp,
  max: maxProp,
  midpoint = 0,
  format = defaultFormat,
  onCellClick,
  ariaLabel = "Heatmap",
  legendLabel,
  legendUnit,
  className,
}: HeatmapProps) {
  const { rows, cols, cellMap, min, max } = React.useMemo(() => {
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const cellMap = new Map<string, HeatmapCell>();
    const numerics: number[] = [];
    for (const c of cells) {
      rowSet.add(c.rowKey);
      colSet.add(c.colKey);
      cellMap.set(`${c.rowKey}||${c.colKey}`, c);
      if (typeof c.value === "number") numerics.push(c.value);
    }
    const rows = rowOrder ?? Array.from(rowSet);
    const cols = colOrder ?? Array.from(colSet);
    const min = minProp ?? (numerics.length ? Math.min(...numerics) : 0);
    const max = maxProp ?? (numerics.length ? Math.max(...numerics) : 1);
    return { rows, cols, cellMap, min, max };
  }, [cells, rowOrder, colOrder, minProp, maxProp]);

  if (cells.length === 0) {
    return (
      <div className={["wm-heatmap", className ?? ""].join(" ")} aria-label={ariaLabel}>
        <div
          className="p-4 text-center text-[12px] italic text-[color:var(--wm-text-2,#8a8271)] border border-dashed border-[color:var(--wm-gold-hair,#6d5220)] rounded-lg"
          role="status"
        >
          No cells to render — insufficient data for this view.
        </div>
      </div>
    );
  }

  return (
    <div className={["wm-heatmap", className ?? ""].join(" ")} role="table" aria-label={ariaLabel}>
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `auto repeat(${cols.length}, minmax(48px, 1fr))` }}
      >
        {/* header row */}
        <div />
        {cols.map((col) => (
          <div
            key={col}
            role="columnheader"
            className="text-[9px] tracking-[0.14em] uppercase text-[color:var(--wm-text-2,#8a8271)] text-center py-1"
          >
            {col}
          </div>
        ))}
        {/* body rows */}
        {rows.map((row) => (
          <React.Fragment key={row}>
            <div
              role="rowheader"
              className="text-[10px] tracking-[0.12em] uppercase text-[color:var(--wm-text-2,#8a8271)] pr-2 py-1 text-right"
            >
              {row}
            </div>
            {cols.map((col) => {
              const cell = cellMap.get(`${row}||${col}`);
              if (!cell) {
                return (
                  <div
                    key={`${row}||${col}`}
                    role="cell"
                    className="border border-[color:var(--wm-gold-hair,#6d5220)] border-opacity-30"
                    style={{ background: "var(--wm-ob-1, #0b0b0d)", minHeight: 32 }}
                    aria-label={`${row} × ${col}: no data`}
                  />
                );
              }
              const style = colorFor(cell.value, cell.confidence, min, max, midpoint, scheme);
              const clickable = !!onCellClick;
              const label =
                cell.value === "UNKNOWN"
                  ? `${row} × ${col}: unknown, ${cell.reason ?? "insufficient sample"}, sample ${cell.sampleCount}`
                  : `${row} × ${col}: ${format(cell.value)}${legendUnit ? ` ${legendUnit}` : ""}, confidence ${cell.confidence.toLowerCase()}, sample ${cell.sampleCount}`;
              return (
                <button
                  key={`${row}||${col}`}
                  role="cell"
                  onClick={clickable ? () => onCellClick!(cell) : undefined}
                  disabled={!clickable}
                  aria-label={label}
                  title={label}
                  className={[
                    "border text-[10px] tabular-nums",
                    "focus:outline focus:outline-2 focus:outline-[color:var(--wm-gold-hero,#d4af37)]",
                    clickable ? "cursor-pointer" : "cursor-default",
                  ].join(" ")}
                  style={{
                    background: style.background,
                    color: style.text,
                    opacity: style.opacity,
                    borderColor: "rgba(139,106,41,0.25)",
                    minHeight: 32,
                  }}
                >
                  {format(cell.value)}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <LegendChip label={legendLabel} unit={legendUnit} />
    </div>
  );
}

export default Heatmap;
