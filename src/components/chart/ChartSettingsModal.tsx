"use client";

import React, { useState, useRef } from "react";
import { GAMMA_HEAT_CUSTOM_KEY, GAMMA_HEAT_PRESET_EVENT, GAMMA_HEAT_PRESET_KEY, GAMMA_HEAT_PRESETS, gammaHeatPreset, parseGammaHeatCustom } from "@/lib/chart/gammaHeatAppearance";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { X, Settings, Info, BarChart2 } from "lucide-react";
import { DialogBehaviour } from "@/components/ui/DialogFrame";
import { applyGammaHeatPreset, rgbTripletOf, applyProfilePreset, lawfulOrderLineLooks, ORDER_LINE_ALPHA_FLOOR, PROFILE_PRESET_RED_GREEN, type OrderLineDash } from "@/lib/chart/appearanceLaw";

import {
  CANDLE_DOWN_DEFAULT,
  CANDLE_UP_DEFAULT,
  CROSSHAIR_COLOR_DEFAULT,
  GRID_COLOR_DEFAULT,
  MARKET_FIELD_DEFAULT,
} from "@/lib/chart/marketFieldMaterial";

export interface ChartSettings {
  background: string;
  gridVisible: boolean;
  gridColor: string;
  crosshairVisible: boolean;
  crosshairColor: string;
  crosshairStyle: "solid" | "dashed" | "dotted";
  priceScaleVisible: boolean;
  priceScalePosition: "right" | "left";
  timeScaleVisible: boolean;
  logScale: boolean;
  autoScale: boolean;
  percentageMode: boolean;
  indexedTo100: boolean;
  candleUp: string;
  candleDown: string;
  wickUp: string;
  wickDown: string;
  borderUp: string;
  borderDown: string;
  neon?: boolean;   // WM Neon theme active → neon candle/VP/volume coloring
  candleTimer: boolean; // show the candlestick countdown on the live price line
  showPositions: boolean;
  showPnL: boolean;
  displayTimeZone: string; // IANA tz for the time axis + crosshair (e.g. "America/New_York")
  clock24h: boolean;       // true = 24h military time, false = 12h AM/PM clock
  // ORDER FLOW paint (finish-line §21: one Appearance owner). Colour only —
  // which bubbles exist, where, and how big is decided by the evidence.
  bigTradeBuy?: string;
  bigTradeSell?: string;
  deltaBuy?: string;
  deltaSell?: string;
  // Reading inks (same owner): the absorption shelf's words, the fused profile.
  absorptionInk?: string;
  fusedProfileInk?: string;
  // VOLUME (Founder order §5, 2026-10-09). Absent = the room's brass bars.
  volumeUp?: string;
  volumeDown?: string;
  // OPACITY DIALS — multipliers the attention governor applies last, floored so
  // nothing the trader turned on becomes unreadable. Absent = 1 (unchanged).
  profileOpacity?: number;
  wallOpacity?: number;
  memoryOpacity?: number;
  // SLICE B (Founder order §5): marks' size and weight. Absent = as shipped.
  bubbleScale?: number;          // big-trade disc size, 0.6–1.4
  footprintNumberStep?: number;  // footprint numbers, −1…+2 px against the row fit
  wallThickness?: number;        // options-wall ticks, 1–3 ×
  // ORDER LINES (Founder P0 2026-10-10). Absent = the room's: stop red, target
  // green, entry ivory, dashed 2px. Made lawful by appearanceLaw.lawfulOrderLineLooks
  // (never invisible, stop ≠ target, entry distinct) before anything paints.
  orderLineEntry?: string;
  orderLineStop?: string;
  orderLineTarget?: string;
  orderLineOpacity?: number;     // 0.6–1 (floored)
  orderLineWidth?: number;       // 1–4 px
  orderLineStyle?: OrderLineDash;
}

/** The volume bars' shipped colours as a picker can show them (the alpha is the room's, kept on paint). */
export const VOLUME_COLOR_PICKER_DEFAULTS = { volumeUp: "#c4a574", volumeDown: "#6e5a3c" } as const;

/** The shipped order-flow colours — the exact values the chart painted before. */
export const FLOW_COLOR_DEFAULTS = {
  bigTradeBuy: "#00D4AA",
  bigTradeSell: "#FF4D6A",
  deltaBuy: "#22C55E",
  deltaSell: "#EF4444",
  absorptionInk: "#E0BE5C",
  fusedProfileInk: "#F0BE46",
} as const;

export const DEFAULT_CHART_SETTINGS: ChartSettings = {
  // THE ROOM'S MATERIAL, not a charting-package navy. See
  // `lib/chart/marketFieldMaterial.ts` for why this is a named constant and
  // why an existing trader's storage needs a migration to ever see a change
  // to it.
  background: MARKET_FIELD_DEFAULT,
  gridVisible: true,
  gridColor: GRID_COLOR_DEFAULT,
  crosshairVisible: true,
  crosshairColor: CROSSHAIR_COLOR_DEFAULT,
  crosshairStyle: "solid",
  priceScaleVisible: true,
  priceScalePosition: "right",
  timeScaleVisible: true,
  logScale: false,
  autoScale: true,
  percentageMode: false,
  indexedTo100: false,
  // NOT A RAINBOW. Up and down are one brass held at two luminances, per
  // `WM_NewMockup_136_Fidelity_Five_Not_A_Rainbow.jpg`. The trader can still
  // pick anything they like in Appearance; this is only what the room ships.
  candleUp: CANDLE_UP_DEFAULT,
  candleDown: CANDLE_DOWN_DEFAULT,
  wickUp: CANDLE_UP_DEFAULT,
  wickDown: CANDLE_DOWN_DEFAULT,
  borderUp: CANDLE_UP_DEFAULT,
  borderDown: CANDLE_DOWN_DEFAULT,
  candleTimer: true,
  showPositions: true,
  showPnL: true,
  // Default to the user's actual local timezone (detected at runtime), 24h off.
  displayTimeZone: (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "America/New_York",
  clock24h: false,
};

// Common IANA timezones for the chart-settings dropdown (broker-style list).
export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "America/New_York",    label: "New York (ET)" },
  { value: "America/Chicago",     label: "Chicago (CT)" },
  { value: "America/Denver",      label: "Denver (MT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { value: "America/Anchorage",   label: "Anchorage (AKT)" },
  { value: "Pacific/Honolulu",    label: "Honolulu (HT)" },
  { value: "America/Sao_Paulo",   label: "São Paulo (BRT)" },
  { value: "Europe/London",       label: "London (GMT/BST)" },
  { value: "Europe/Berlin",       label: "Frankfurt (CET)" },
  { value: "Europe/Moscow",       label: "Moscow (MSK)" },
  { value: "Asia/Dubai",          label: "Dubai (GST)" },
  { value: "Asia/Kolkata",        label: "Mumbai (IST)" },
  { value: "Asia/Singapore",      label: "Singapore (SGT)" },
  { value: "Asia/Hong_Kong",      label: "Hong Kong (HKT)" },
  { value: "Asia/Shanghai",       label: "Shanghai (CST)" },
  { value: "Asia/Tokyo",          label: "Tokyo (JST)" },
  { value: "Australia/Sydney",    label: "Sydney (AET)" },
  { value: "UTC",                 label: "UTC" },
];

// Garden 16 §46 (2026-09-27): "Scales" (log · auto · % duplicated the price-axis
// buttons with no reader; Indexed-to-100 had no implementation) and "Trading"
// (no position overlay exists) were switches that changed nothing — withdrawn.
type Tab = "symbol" | "chart";

interface Props {
  open: boolean;
  onClose: () => void;
  symbol: string;
  settings: ChartSettings;
  onSettingsChange: (s: ChartSettings) => void;
}

function ColorSwatch({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
      <span style={{ fontSize: 12, color: "#8896BE" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "#8b8fa8", fontFamily: "monospace" }}>{value}</span>
        <input
          type="color"
          value={value}
          aria-label={label}
          className="wm-settings-control"
          onChange={e => onChange(e.target.value)}
          style={{ width: 28, height: 20, borderRadius: 4, border: "1px solid #263050", background: "none", cursor: "pointer", padding: 0 }}
        />
      </div>
    </div>
  );
}

/** A dial: 0.4–1.6 in tenths, 1 = as shipped. The whole row is the 44px touch target on a phone. */
function Dial({ value, onChange, label }: { value: number | undefined; onChange: (v: number) => void; label: string }) {
  const v = typeof value === "number" && Number.isFinite(value) ? value : 1;
  return (
    <label className="wm-settings-dial" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "6px 0", minHeight: 32 }}>
      <span style={{ fontSize: 12, color: "#8896BE" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="range" min={0.4} max={1.6} step={0.1} value={v} aria-label={label}
          aria-valuetext={`${Math.round(v * 100)} percent`}
          onChange={e => onChange(Number(e.target.value))}
          className="wm-settings-control" style={{ width: 120, accentColor: "#C9A55C" }} />
        <span style={{ fontSize: 11, color: "#8b8fa8", fontFamily: "monospace", minWidth: 36, textAlign: "right" }}>{Math.round(v * 100)}%</span>
      </span>
    </label>
  );
}

/** A row of choice chips — each a 44px target on a phone. */
/** ⚙ Walls & Gamma heatmap — five presets + Custom, written through the appearance owner. */
function GammaHeatSettings() {
  const readStore = () => {
    try { return gammaHeatPreset(localStorage.getItem(GAMMA_HEAT_PRESET_KEY), parseGammaHeatCustom(localStorage.getItem(GAMMA_HEAT_CUSTOM_KEY))); } catch { return gammaHeatPreset(null); }
  };
  const [cur, setCur] = useState(readStore);
  const write = (id: string, custom: { posRgb?: string; negRgb?: string; maxAlpha?: number } | null) => {
    try { applyGammaHeatPreset(localStorage, id, custom, () => window.dispatchEvent(new Event(GAMMA_HEAT_PRESET_EVENT))); } catch { /* private mode */ }
    setCur(readStore());
  };
  const toHex = (rgb: string) => "#" + rgb.split(",").map(n => Number(n).toString(16).padStart(2, "0")).join("");
  const presets = [...Object.values(GAMMA_HEAT_PRESETS).map(p => ({ id: p.id as string, label: p.label })), { id: "CUSTOM", label: "Custom" }];
  return (
    <div data-testid="gamma-heat-settings">
      <div role="group" aria-label="Gamma heatmap preset" style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "6px 0" }}>
        {presets.map(p => (
          <button key={p.id} type="button" aria-pressed={cur.id === p.id} className="wm-settings-control"
            onClick={() => write(p.id, p.id === "CUSTOM" ? { posRgb: cur.posRgb, negRgb: cur.negRgb, maxAlpha: cur.maxAlpha } : null)}
            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, cursor: "pointer", background: cur.id === p.id ? "#263050" : "#141824", border: `1px solid ${cur.id === p.id ? "#d4af37" : "#263050"}`, color: cur.id === p.id ? "#d4af37" : "#8896BE" }}>
            {p.label}
          </button>
        ))}
      </div>
      {cur.id === "CUSTOM" ? (
        <>
          <ColorSwatch value={toHex(cur.posRgb)} onChange={v => write("CUSTOM", { posRgb: rgbTripletOf(v) ?? cur.posRgb, negRgb: cur.negRgb, maxAlpha: cur.maxAlpha })} label="Positive gamma (solid)" />
          <ColorSwatch value={toHex(cur.negRgb)} onChange={v => write("CUSTOM", { posRgb: cur.posRgb, negRgb: rgbTripletOf(v) ?? cur.negRgb, maxAlpha: cur.maxAlpha })} label="Negative gamma (hatched)" />
          <Choice label="Heat strength" value={cur.maxAlpha} onChange={v => write("CUSTOM", { posRgb: cur.posRgb, negRgb: cur.negRgb, maxAlpha: v })}
            options={[{ v: 0.12, label: "Faint" }, { v: 0.24, label: "Medium" }, { v: 0.36, label: "Strong" }, { v: 0.5, label: "Max" }]} />
        </>
      ) : null}
      <div style={{ fontSize: 10, color: "#8b8fa8", marginTop: 4 }}>Positive is solid, negative is hatched in every preset. Two inks you make alike go back to the room's pair; heat never goes above 50% so candles stay readable.</div>
    </div>
  );
}

function Choice<T extends string | number>({ value, options, onChange, label }: { value: T; options: readonly { v: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 0" }}>
      <span style={{ fontSize: 12, color: "#8896BE" }}>{label}</span>
      <span style={{ display: "flex", gap: 4 }}>
        {options.map(o => (
          <button key={String(o.v)} type="button" aria-pressed={o.v === value} onClick={() => onChange(o.v)} className="wm-settings-control"
            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, cursor: "pointer",
              background: o.v === value ? "rgba(201,165,92,0.22)" : "#141824", border: `1px solid ${o.v === value ? "#C9A55C" : "#263050"}`, color: o.v === value ? "#ead9ad" : "#8896BE" }}>
            {o.label}
          </button>
        ))}
      </span>
    </div>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
      <span style={{ fontSize: 12, color: "#8896BE" }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        className="wm-settings-control"
        onClick={() => onChange(!value)}
        style={{
          width: 36, height: 18, borderRadius: 9, cursor: "pointer", border: "none",
          background: value ? "rgba(47,128,237,0.3)" : "#263050",
          position: "relative", transition: "background 0.2s",
        }}
      >
        <div style={{
          position: "absolute", top: 3, left: value ? 18 : 3, width: 12, height: 12,
          borderRadius: "50%", background: value ? "#2F80ED" : "#4A5580",
          transition: "left 0.2s, background 0.2s",
        }} />
      </button>
    </div>
  );
}

const SYMBOL_INFO: Record<string, { name: string; exchange: string; tickValue: string; description: string }> = {
  "ES1!":  { name: "E-mini S&P 500 Futures",  exchange: "CME GLOBEX", tickValue: "$12.50/tick", description: "E-mini S&P 500 Futures (0.25 pt tick)" },
  "NQ1!":  { name: "E-mini NASDAQ-100 Futures",exchange: "CME GLOBEX", tickValue: "$5.00/tick",  description: "E-mini NASDAQ-100 Futures (0.25 pt tick)" },
  "RTY1!": { name: "E-mini Russell 2000",       exchange: "CME GLOBEX", tickValue: "$5.00/tick",  description: "E-mini Russell 2000 Futures (0.1 pt tick)" },
  "YM1!":  { name: "E-mini Dow Jones",          exchange: "CBOT",       tickValue: "$5.00/tick",  description: "E-mini Dow Jones Futures (1 pt tick)" },
  "GC1!":  { name: "Gold Futures",              exchange: "COMEX",      tickValue: "$10.00/tick", description: "Gold Futures (0.10 troy oz)" },
  "CL1!":  { name: "Crude Oil WTI Futures",     exchange: "NYMEX",      tickValue: "$10.00/tick", description: "Light Sweet Crude Oil Futures (1000 bbl)" },
  "BTC":   { name: "Bitcoin",                   exchange: "CRYPTO",     tickValue: "Variable",    description: "Bitcoin / US Dollar" },
  "ETH":   { name: "Ethereum",                  exchange: "CRYPTO",     tickValue: "Variable",    description: "Ethereum / US Dollar" },
  "AAPL":  { name: "Apple Inc.",                exchange: "NASDAQ",     tickValue: "$0.01/share", description: "Common shares of Apple Inc." },
  "TSLA":  { name: "Tesla, Inc.",               exchange: "NASDAQ",     tickValue: "$0.01/share", description: "Common shares of Tesla, Inc." },
  "NVDA":  { name: "NVIDIA Corporation",        exchange: "NASDAQ",     tickValue: "$0.01/share", description: "Common shares of NVIDIA Corp." },
  "SPY":   { name: "SPDR S&P 500 ETF",         exchange: "NYSE Arca",  tickValue: "$0.01/share", description: "S&P 500 Index ETF (State Street)" },
  "QQQ":   { name: "Invesco QQQ Trust",         exchange: "NASDAQ",     tickValue: "$0.01/share", description: "NASDAQ-100 Index ETF (Invesco)" },
};

function getSymInfo(sym: string) {
  return SYMBOL_INFO[sym.toUpperCase()] ?? {
    name: sym, exchange: "N/A", tickValue: "N/A", description: sym
  };
}

const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: "symbol",  icon: <Info size={13} />,     label: "Symbol" },
  { id: "chart",   icon: <BarChart2 size={13} />, label: "Chart" },
];

export function ChartSettingsModal({ open, onClose, symbol, settings, onSettingsChange }: Props) {
  const dlgRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("chart");
  const dragControls = useDragControls();
  const s = settings;
  const set = (patch: Partial<ChartSettings>) => onSettingsChange({ ...s, ...patch });

  const info = getSymInfo(symbol);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 800 }}
          />

          <motion.div
            ref={dlgRef}
            id="chart-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Chart appearance"
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            dragElastic={0}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.18 }}
            style={{
              // Multi-device acceptance contract (iPhone ~375/390/393/430):
              // a fixed 520px width centred by `calc(50% - 260px)` computes
              // left = -65px at 390px viewport, so the modal hung off BOTH
              // edges at once and its controls were unreachable on phone.
              // Clamp the width to the viewport and never let left go under
              // the gutter. Desktop (>=568px) is byte-identical to before.
              position: "fixed", top: 64,
              left: "max(12px, calc(50% - 260px))",
              width: "min(520px, calc(100vw - 24px))", maxHeight: "80vh",
              background: "#0B0E1A",
              border: "1px solid #263050",
              borderRadius: 12,
              zIndex: 801,
              display: "flex", flexDirection: "column",
              boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
            }}
          >
            {/* It had the dialog ROLE but none of the behaviour (garden pass 2026-10-04). */}
            <DialogBehaviour targetRef={dlgRef} label="Chart appearance" onClose={onClose} />
            {/* Header — drag handle (grab to move the panel anywhere) */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              title="Drag to move this panel"
              style={{
              cursor: "move", userSelect: "none",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 18px", borderBottom: "1px solid #263050", flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Settings size={16} color="#2F80ED" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8FF" }}>Chart Settings</span>
                <span style={{ fontSize: 11, color: "#8896BE", background: "#141824", border: "1px solid #263050", borderRadius: 4, padding: "2px 7px" }}>
                  {symbol}
                </span>
              </div>
              <button aria-label="Close chart settings" onClick={onClose} style={{ color: "#8896BE", background: "none", border: "none", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #263050", flexShrink: 0 }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 5, padding: "9px 0", fontSize: 11, fontWeight: 600,
                    cursor: "pointer", background: "none", border: "none",
                    color: tab === t.id ? "#2F80ED" : "#8896BE",
                    borderBottom: tab === t.id ? "2px solid #2F80ED" : "2px solid transparent",
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", scrollbarWidth: "thin" }}>

              {/* SYMBOL TAB */}
              {tab === "symbol" && (
                <div>
                  <div style={{ background: "#141824", border: "1px solid #263050", borderRadius: 8, padding: "14px 16px", marginBottom: 12 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#E2E8FF", marginBottom: 4 }}>{symbol}</div>
                    <div style={{ fontSize: 13, color: "#8896BE", marginBottom: 10 }}>{info.name}</div>
                    <div style={{ fontSize: 11, color: "#8b8fa8", lineHeight: 1.6 }}>{info.description}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {[
                      { label: "Exchange", value: info.exchange },
                      { label: "Tick Value", value: info.tickValue },
                      { label: "Symbol", value: symbol },
                    ].map(row => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(38,48,80,0.5)" }}>
                        <span style={{ fontSize: 12, color: "#8896BE" }}>{row.label}</span>
                        <span style={{ fontSize: 12, color: "#E2E8FF", fontWeight: 600 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CHART TAB */}
              {tab === "chart" && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8b8fa8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Background</div>
                  <ColorSwatch value={s.background} onChange={v => set({ background: v })} label="Background color" />

                  <div style={{ height: 1, background: "#263050", margin: "12px 0" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8b8fa8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Grid</div>
                  <Toggle value={s.gridVisible} onChange={v => set({ gridVisible: v })} label="Show gridlines" />
                  {s.gridVisible && <ColorSwatch value={s.gridColor} onChange={v => set({ gridColor: v })} label="Grid color" />}

                  <div style={{ height: 1, background: "#263050", margin: "12px 0" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8b8fa8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Candle Timer</div>
                  <Toggle value={s.candleTimer} onChange={v => set({ candleTimer: v })} label="Show candlestick timer" />
                  <p style={{ fontSize: 11, color: "#8896BE", margin: "4px 0 0", lineHeight: 1.5 }}>
                    Live countdown to the current candle&apos;s close, pinned to the price line on the left edge. Flashes red in the final 5 seconds.
                  </p>

                  <div style={{ height: 1, background: "#263050", margin: "12px 0" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8b8fa8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Crosshair</div>
                  <Toggle value={s.crosshairVisible} onChange={v => set({ crosshairVisible: v })} label="Show crosshair" />
                  {s.crosshairVisible && (
                    <>
                      <ColorSwatch value={s.crosshairColor} onChange={v => set({ crosshairColor: v })} label="Crosshair color" />
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                        <span style={{ fontSize: 12, color: "#8896BE" }}>Line style</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          {(["solid", "dashed", "dotted"] as const).map(style => (
                            <button key={style} onClick={() => set({ crosshairStyle: style })} style={{
                              fontSize: 10, padding: "3px 8px", borderRadius: 4, cursor: "pointer",
                              background: s.crosshairStyle === style ? "rgba(47,128,237,0.2)" : "#141824",
                              border: `1px solid ${s.crosshairStyle === style ? "rgba(47,128,237,0.5)" : "#263050"}`,
                              color: s.crosshairStyle === style ? "#2F80ED" : "#8896BE",
                            }}>
                              {style}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div style={{ height: 1, background: "#263050", margin: "12px 0" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8b8fa8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Scales</div>
                  <Toggle value={s.priceScaleVisible} onChange={v => set({ priceScaleVisible: v })} label="Show price scale" />
                  <Toggle value={s.timeScaleVisible} onChange={v => set({ timeScaleVisible: v })} label="Show time scale" />

                  {/* ── Timezone + clock format ───────────────────────────── */}
                  <div style={{ height: 1, background: "#263050", margin: "12px 0" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8b8fa8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Time Zone &amp; Clock</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                    <span style={{ fontSize: 12, color: "#8896BE" }}>Time zone</span>
                    <select aria-label="Time zone"
                      value={s.displayTimeZone}
                      onChange={e => set({ displayTimeZone: e.target.value })}
                      style={{
                        fontSize: 11, padding: "4px 8px", borderRadius: 4, cursor: "pointer",
                        background: "#141824", border: "1px solid #263050", color: "#C7D0E8", maxWidth: 180,
                      }}
                    >
                      {TIMEZONE_OPTIONS.map(tz => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                    <span style={{ fontSize: 12, color: "#8896BE" }}>Clock format</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {([["12-hour", false], ["24-hour", true]] as const).map(([lbl, val]) => (
                        <button key={lbl} onClick={() => set({ clock24h: val })} style={{
                          fontSize: 10, padding: "3px 10px", borderRadius: 4, cursor: "pointer",
                          background: s.clock24h === val ? "rgba(47,128,237,0.2)" : "#141824",
                          border: `1px solid ${s.clock24h === val ? "rgba(47,128,237,0.5)" : "#263050"}`,
                          color: s.clock24h === val ? "#2F80ED" : "#8896BE",
                        }}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {s.priceScaleVisible && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                      <span style={{ fontSize: 12, color: "#8896BE" }}>Price scale position</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        {(["right", "left"] as const).map(pos => (
                          <button key={pos} onClick={() => set({ priceScalePosition: pos })} style={{
                            fontSize: 10, padding: "3px 10px", borderRadius: 4, cursor: "pointer",
                            background: s.priceScalePosition === pos ? "rgba(47,128,237,0.2)" : "#141824",
                            border: `1px solid ${s.priceScalePosition === pos ? "rgba(47,128,237,0.5)" : "#263050"}`,
                            color: s.priceScalePosition === pos ? "#2F80ED" : "#8896BE",
                          }}>
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ height: 1, background: "#263050", margin: "12px 0" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8b8fa8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Candle Colors</div>
                  <ColorSwatch value={s.candleUp}   onChange={v => set({ candleUp: v })}   label="Bull candle body" />
                  <ColorSwatch value={s.candleDown} onChange={v => set({ candleDown: v })} label="Bear candle body" />
                  <ColorSwatch value={s.wickUp}     onChange={v => set({ wickUp: v })}     label="Bull wick" />
                  <ColorSwatch value={s.wickDown}   onChange={v => set({ wickDown: v })}   label="Bear wick" />
                  <ColorSwatch value={s.borderUp}   onChange={v => set({ borderUp: v })}   label="Bull border" />
                  <ColorSwatch value={s.borderDown} onChange={v => set({ borderDown: v })} label="Bear border" />

                  <div style={{ height: 1, background: "#263050", margin: "12px 0" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8b8fa8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Order Flow Colors</div>
                  <ColorSwatch value={s.bigTradeBuy ?? FLOW_COLOR_DEFAULTS.bigTradeBuy}   onChange={v => set({ bigTradeBuy: v })}   label="Big trade · buy" />
                  <ColorSwatch value={s.bigTradeSell ?? FLOW_COLOR_DEFAULTS.bigTradeSell} onChange={v => set({ bigTradeSell: v })} label="Big trade · sell" />
                  <ColorSwatch value={s.deltaBuy ?? FLOW_COLOR_DEFAULTS.deltaBuy}         onChange={v => set({ deltaBuy: v })}       label="Delta bubble · net buy" />
                  <ColorSwatch value={s.deltaSell ?? FLOW_COLOR_DEFAULTS.deltaSell}       onChange={v => set({ deltaSell: v })}      label="Delta bubble · net sell" />
                  <ColorSwatch value={s.absorptionInk ?? FLOW_COLOR_DEFAULTS.absorptionInk}     onChange={v => set({ absorptionInk: v })}   label="Absorption shelf · words" />
                  <ColorSwatch value={s.fusedProfileInk ?? FLOW_COLOR_DEFAULTS.fusedProfileInk} onChange={v => set({ fusedProfileInk: v })} label="Fused profile · outline + POC/VA" />

                  <div style={{ height: 1, background: "#263050", margin: "12px 0" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8b8fa8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Volume Colors</div>
                  <ColorSwatch value={s.volumeUp ?? VOLUME_COLOR_PICKER_DEFAULTS.volumeUp}     onChange={v => set({ volumeUp: v })}   label="Volume · up bar" />
                  <ColorSwatch value={s.volumeDown ?? VOLUME_COLOR_PICKER_DEFAULTS.volumeDown} onChange={v => set({ volumeDown: v })} label="Volume · down bar" />

                  <div style={{ height: 1, background: "#263050", margin: "12px 0" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8b8fa8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Layer Opacity</div>
                  <Dial value={s.profileOpacity} onChange={v => set({ profileOpacity: v })} label="Profiles" />
                  <Dial value={s.wallOpacity}    onChange={v => set({ wallOpacity: v })}    label="Walls & options" />
                  <Dial value={s.memoryOpacity}  onChange={v => set({ memoryOpacity: v })}  label="Memory (fade)" />

                  <div style={{ height: 1, background: "#263050", margin: "12px 0" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8b8fa8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Marks</div>
                  <Choice label="Big-trade bubbles" value={s.bubbleScale ?? 1} onChange={v => set({ bubbleScale: v })}
                    options={[{ v: 0.7, label: "Small" }, { v: 1, label: "As shipped" }, { v: 1.3, label: "Large" }]} />
                  <Choice label="Footprint numbers" value={s.footprintNumberStep ?? 0} onChange={v => set({ footprintNumberStep: v })}
                    options={[{ v: -1, label: "Smaller" }, { v: 0, label: "Fit" }, { v: 1, label: "Larger" }, { v: 2, label: "Largest" }]} />
                  <Choice label="Wall thickness" value={s.wallThickness ?? 1} onChange={v => set({ wallThickness: v })}
                    options={[{ v: 1, label: "Thin" }, { v: 1.5, label: "Medium" }, { v: 2, label: "Thick" }]} />
                  <div role="group" aria-label="Profile colours" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 0" }}>
                    <span style={{ fontSize: 12, color: "#8896BE" }}>Profile colours</span>
                    <span style={{ display: "flex", gap: 4 }}>
                      {([["Room brass", null], ["Red / Green", PROFILE_PRESET_RED_GREEN]] as const).map(([lbl, preset]) => (
                        <button key={lbl} type="button" className="wm-settings-control"
                          onClick={() => { try { applyProfilePreset(localStorage, preset, () => window.dispatchEvent(new Event("wm-vp-colors"))); } catch { /* private mode */ } }}
                          style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, cursor: "pointer", background: "#141824", border: "1px solid #263050", color: "#8896BE" }}>
                          {lbl}
                        </button>
                      ))}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: "#8b8fa8", marginTop: 4 }}>Nothing you turn on can be dialled below readable.</div>

                  <div style={{ height: 1, background: "#263050", margin: "12px 0" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8b8fa8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Gamma Heatmap</div>
                  <GammaHeatSettings />

                  <div style={{ height: 1, background: "#263050", margin: "12px 0" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8b8fa8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Order Lines</div>
                  {(() => {
                    // The swatches show what will PAINT (the lawful look), so a choice the law refused reads back as refused.
                    const looks = lawfulOrderLineLooks(s, s.background);
                    return (
                      <div data-testid="order-line-settings">
                        <ColorSwatch value={looks.ENTRY.ink}  onChange={v => set({ orderLineEntry: v })}  label="Entry line" />
                        <ColorSwatch value={looks.STOP.ink}   onChange={v => set({ orderLineStop: v })}   label="Stop line" />
                        <ColorSwatch value={looks.TARGET.ink} onChange={v => set({ orderLineTarget: v })} label="Target line" />
                        <Choice label="Line opacity" value={looks.STOP.alpha} onChange={v => set({ orderLineOpacity: v })}
                          options={[{ v: ORDER_LINE_ALPHA_FLOOR, label: "Soft" }, { v: 0.8, label: "Medium" }, { v: 1, label: "Full" }]} />
                        <Choice label="Line thickness" value={looks.STOP.width} onChange={v => set({ orderLineWidth: v })}
                          options={[{ v: 1, label: "1px" }, { v: 2, label: "2px" }, { v: 3, label: "3px" }, { v: 4, label: "4px" }]} />
                        <Choice label="Line style (staged)" value={looks.STOP.dash} onChange={v => set({ orderLineStyle: v })}
                          options={[{ v: "solid", label: "Solid" }, { v: "dashed", label: "Dashed" }, { v: "dotted", label: "Dotted" }]} />
                        <div style={{ fontSize: 10, color: "#8b8fa8", marginTop: 4 }}>
                          Never fainter than {Math.round(ORDER_LINE_ALPHA_FLOOR * 100)}%. A stop and a target you make alike go back to red and green; an entry alike to either goes back to ivory. A working order is always solid.
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 18px", borderTop: "1px solid #263050", flexShrink: 0 }}>
              <button onClick={() => onSettingsChange(DEFAULT_CHART_SETTINGS)} style={{
                fontSize: 12, padding: "6px 14px", borderRadius: 5, cursor: "pointer",
                background: "#141824", border: "1px solid #263050", color: "#8896BE",
              }}>
                Reset defaults
              </button>
              <button onClick={onClose} style={{
                fontSize: 12, padding: "6px 14px", borderRadius: 5, cursor: "pointer",
                background: "rgba(47,128,237,0.2)", border: "1px solid rgba(47,128,237,0.4)", color: "#2F80ED", fontWeight: 700,
              }}>
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
