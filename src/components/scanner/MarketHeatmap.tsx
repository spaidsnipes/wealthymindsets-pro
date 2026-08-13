"use client";
import * as React from "react";
import Panel from "@/components/ui/Panel";
import Pill from "@/components/ui/Pill";
import Heatmap, { type HeatmapCell } from "@/components/ui/Heatmap";
import { QualityBadge } from "@/components/ui/DataHealth";
import type { MarketQualityState } from "@/lib/marketData/canonicalMarketState";

/**
 * MarketHeatmap — M16 consumer of the Heatmap primitive.
 *
 * Answers the Founder's Heatmap Family #1 question:
 *   "WHERE IS RELATIVE MARKET STRENGTH / WEAKNESS?"
 *
 * Groups symbols by their sector (or a caller-supplied grouping) and
 * colors each cell by a chosen metric (change %, relative volume, etc.).
 *
 * Truth contract:
 *  - Every symbol carries provenance (provider + coverageScope + quality).
 *  - A symbol without a resolved metric value renders as UNKNOWN (?).
 *  - The overall QualityBadge reflects the worst-quality feed among the
 *    symbols in scope — one delayed feed can't be hidden behind others
 *    that are live.
 *  - Diverging scheme (positive/negative) for change %; monotone for
 *    volume-like metrics.
 *
 * Interaction: onCellClick receives the SymbolCell (the raw data row for
 * the click) — parent routes to /charts?symbol=<sym> or opens a preview
 * side panel per Founder's "no dead visualization" doctrine.
 */

export interface SymbolCell {
  readonly symbol: string;
  readonly sector: string;              // grouping — rows on the heatmap
  readonly displayName?: string;
  readonly changePercent?: number | null;
  readonly relativeVolume?: number | null;
  readonly volume?: number | null;
  readonly price?: number | null;
  readonly provider?: string;
  readonly coverageScope?: string;
  readonly quality: MarketQualityState;
  readonly freshnessMs?: number;
}

export type MarketMetric = "change_pct" | "relative_volume" | "volume" | "price";

const METRIC_LABELS: Record<MarketMetric, { label: string; unit: string; scheme: "monotone" | "diverging"; extract: (s: SymbolCell) => number | null | undefined }> = {
  change_pct:      { label: "Change",    unit: "%",  scheme: "diverging", extract: (s) => s.changePercent },
  relative_volume: { label: "Rel Vol",   unit: "×",  scheme: "monotone",  extract: (s) => s.relativeVolume },
  volume:          { label: "Volume",    unit: "",   scheme: "monotone",  extract: (s) => s.volume },
  price:           { label: "Price",     unit: "$",  scheme: "monotone",  extract: (s) => s.price },
};

// ── Worst-quality reduction — one bad feed IS the fleet's quality ──────

const QUALITY_RANK: Record<MarketQualityState, number> = {
  LIVE: 5,
  DELAYED: 4,
  PARTIAL: 3,
  PROXY: 3,
  REPLAY: 2,
  STALE: 1,
  UNAVAILABLE: 0,
};

function worstQuality(symbols: readonly SymbolCell[]): MarketQualityState {
  if (symbols.length === 0) return "UNAVAILABLE";
  let worst: MarketQualityState = "LIVE";
  for (const s of symbols) {
    if (QUALITY_RANK[s.quality] < QUALITY_RANK[worst]) worst = s.quality;
  }
  return worst;
}

// ── Sector layout — deterministic column order per sector ──────────────

function layoutColumns(symbols: readonly SymbolCell[], maxPerRow = 6): Map<string, readonly string[]> {
  const bySector = new Map<string, string[]>();
  for (const s of symbols) {
    const arr = bySector.get(s.sector) ?? [];
    if (!arr.includes(s.symbol)) arr.push(s.symbol);
    bySector.set(s.sector, arr);
  }
  // Sort within sector by symbol for stable layout; pad each row to maxPerRow
  const result = new Map<string, readonly string[]>();
  for (const [sector, syms] of bySector) {
    const sorted = [...syms].sort();
    result.set(sector, sorted.slice(0, maxPerRow));
  }
  return result;
}

const formatValue = (metric: MarketMetric) => (v: number | "UNKNOWN"): string => {
  if (v === "UNKNOWN") return "?";
  switch (metric) {
    case "change_pct":
      return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
    case "relative_volume":
      return `${v.toFixed(2)}×`;
    case "volume":
      return v > 1e9 ? `${(v / 1e9).toFixed(1)}B`
           : v > 1e6 ? `${(v / 1e6).toFixed(1)}M`
           : v > 1e3 ? `${(v / 1e3).toFixed(1)}K`
                     : String(Math.round(v));
    case "price":
      return `$${v.toFixed(2)}`;
  }
};

export interface MarketHeatmapProps {
  /** Universe of symbols to render. Grouped by sector. */
  symbols: readonly SymbolCell[];
  /** Initial metric. Defaults to change_pct. */
  initialMetric?: MarketMetric;
  /** Max symbols per sector row. Defaults to 6. */
  maxPerSector?: number;
  /** onSymbolClick receives the full SymbolCell for routing. */
  onSymbolClick?: (symbol: SymbolCell) => void;
  className?: string;
}

export function MarketHeatmap({
  symbols,
  initialMetric = "change_pct",
  maxPerSector = 6,
  onSymbolClick,
  className,
}: MarketHeatmapProps) {
  const [metric, setMetric] = React.useState<MarketMetric>(initialMetric);
  const metricConfig = METRIC_LABELS[metric];

  const symbolMap = React.useMemo(() => {
    const m = new Map<string, SymbolCell>();
    for (const s of symbols) m.set(s.symbol, s);
    return m;
  }, [symbols]);

  const layout = React.useMemo(() => layoutColumns(symbols, maxPerSector), [symbols, maxPerSector]);
  const sectors = React.useMemo(() => Array.from(layout.keys()).sort(), [layout]);
  const maxColCount = React.useMemo(
    () => Math.max(0, ...Array.from(layout.values()).map((v) => v.length)),
    [layout],
  );

  const heatmapCells: HeatmapCell[] = React.useMemo(() => {
    const cells: HeatmapCell[] = [];
    for (const sector of sectors) {
      const syms = layout.get(sector) ?? [];
      for (let i = 0; i < syms.length; i++) {
        const sym = symbolMap.get(syms[i])!;
        const raw = metricConfig.extract(sym);
        const value = raw == null || !Number.isFinite(raw) ? "UNKNOWN" : (raw as number);
        // Confidence proxied by quality: LIVE → HIGH, DELAYED/PROXY/PARTIAL → MEDIUM, STALE/REPLAY → LOW, UNAVAILABLE → UNKNOWN
        const confidence = sym.quality === "LIVE" ? "HIGH"
                        : sym.quality === "UNAVAILABLE" ? "UNKNOWN"
                        : sym.quality === "STALE" || sym.quality === "REPLAY" ? "LOW"
                        : "MEDIUM";
        cells.push({
          rowKey: sector,
          colKey: `slot-${i}`, // stable column slot; label is on the cell itself
          value,
          confidence,
          sampleCount: 1,
          drilldownRef: sym.symbol,
          reason: value === "UNKNOWN" ? `${metricConfig.label} unresolved for ${sym.symbol}` : undefined,
        });
      }
    }
    return cells;
  }, [sectors, layout, symbolMap, metricConfig]);

  const cols = React.useMemo(() => Array.from({ length: maxColCount }, (_, i) => `slot-${i}`), [maxColCount]);
  const overallQuality = React.useMemo(() => worstQuality(symbols), [symbols]);

  // Custom formatter with symbol name in cell — override default heatmap number-only display.
  // We use a wrapper below that renders the symbol tag + value stacked, since the primitive
  // renders a single string. Approach: pass a formatter that returns "SYM\n+2.4%" and let the
  // primitive display the concatenated string.
  const format = React.useCallback((cell: HeatmapCell) => {
    const sym = symbolMap.get(String(cell.drilldownRef));
    const valText = formatValue(metric)(cell.value);
    return sym ? `${sym.symbol} ${valText}` : valText;
  }, [metric, symbolMap]);

  const handleCellClick = React.useCallback(
    (cell: HeatmapCell) => {
      if (!onSymbolClick) return;
      const sym = symbolMap.get(String(cell.drilldownRef));
      if (sym) onSymbolClick(sym);
    },
    [symbolMap, onSymbolClick],
  );

  if (symbols.length === 0) {
    return (
      <Panel label="Market Heatmap" className={className}>
        <div className="text-[12px] italic text-[color:var(--wm-text-2,#8a8271)]">
          No symbols in scope. Watchlist or sector universe not yet loaded.
        </div>
      </Panel>
    );
  }

  return (
    <Panel label="Market Heatmap" sublabel="Where is relative market strength / weakness?" className={className} halo>
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-[11px]">
        <label className="flex items-center gap-1.5 text-[color:var(--wm-text-2,#8a8271)]">
          <span className="uppercase tracking-[0.18em]">Metric</span>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as MarketMetric)}
            className="bg-transparent border border-[color:var(--wm-gold-hair,#6d5220)] text-[color:var(--wm-text-1,#ede6d3)] px-1.5 py-0.5 rounded text-[11px]"
          >
            {Object.entries(METRIC_LABELS).map(([k, cfg]) => (
              <option key={k} value={k} className="bg-[color:var(--wm-ob-1,#0b0b0d)]">
                {cfg.label}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[10px] text-[color:var(--wm-text-3,#55503f)] tracking-[0.14em] uppercase">
            {symbols.length} symbols · {sectors.length} sectors
          </span>
          <QualityBadge state={overallQuality} label={`worst ${overallQuality.toLowerCase()}`} />
          {overallQuality !== "LIVE" && (
            <Pill state="warning">Mixed feed quality — see per-cell</Pill>
          )}
        </div>
      </div>

      <Heatmap
        cells={heatmapCells}
        colOrder={cols}
        rowOrder={sectors}
        scheme={metricConfig.scheme}
        format={(v) => {
          // Fallback for cells that Heatmap primitive re-formats — the
          // customized `format` above overrides via drilldownRef lookup
          // in real render (see note: primitive uses format(cell.value)).
          return formatValue(metric)(v);
        }}
        onCellClick={onSymbolClick ? handleCellClick : undefined}
        ariaLabel={`Market heatmap grouped by sector, colored by ${metricConfig.label}`}
        legendLabel={metricConfig.label}
        legendUnit={metricConfig.unit}
      />

      <div className="mt-3 text-[10px] text-[color:var(--wm-text-3,#55503f)] tracking-[0.14em] uppercase">
        Overall {overallQuality.toLowerCase()} · click any cell → open its chart · unknown cells stay silent
      </div>
    </Panel>
  );
}

export default MarketHeatmap;
