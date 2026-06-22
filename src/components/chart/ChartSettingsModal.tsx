"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Info, BarChart2, TrendingUp, Sliders } from "lucide-react";

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
  showPositions: boolean;
  showPnL: boolean;
}

export const DEFAULT_CHART_SETTINGS: ChartSettings = {
  background: "#0B0E1A",
  gridVisible: true,
  gridColor: "#1A2035",
  crosshairVisible: true,
  crosshairColor: "#4A6080",
  crosshairStyle: "solid",
  priceScaleVisible: true,
  priceScalePosition: "right",
  timeScaleVisible: true,
  logScale: false,
  autoScale: true,
  percentageMode: false,
  indexedTo100: false,
  candleUp: "#00C076",
  candleDown: "#FF4D67",
  wickUp: "#00C076",
  wickDown: "#FF4D67",
  borderUp: "#00C076",
  borderDown: "#FF4D67",
  showPositions: true,
  showPnL: true,
};

type Tab = "symbol" | "chart" | "scales" | "trading";

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
        <span style={{ fontSize: 11, color: "#4A5580", fontFamily: "monospace" }}>{value}</span>
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: 28, height: 20, borderRadius: 4, border: "1px solid #263050", background: "none", cursor: "pointer", padding: 0 }}
        />
      </div>
    </div>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
      <span style={{ fontSize: 12, color: "#8896BE" }}>{label}</span>
      <button
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
  { id: "scales",  icon: <Sliders size={13} />,   label: "Scales" },
  { id: "trading", icon: <TrendingUp size={13} />, label: "Trading" },
];

export function ChartSettingsModal({ open, onClose, symbol, settings, onSettingsChange }: Props) {
  const [tab, setTab] = useState<Tab>("chart");
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
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.18 }}
            style={{
              position: "fixed", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: 520, maxHeight: "80vh",
              background: "#0B0E1A",
              border: "1px solid #263050",
              borderRadius: 12,
              zIndex: 801,
              display: "flex", flexDirection: "column",
              boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
            }}
          >
            {/* Header */}
            <div style={{
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
              <button onClick={onClose} style={{ color: "#8896BE", background: "none", border: "none", cursor: "pointer" }}>
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
                    <div style={{ fontSize: 11, color: "#4A5580", lineHeight: 1.6 }}>{info.description}</div>
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
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#4A5580", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Background</div>
                  <ColorSwatch value={s.background} onChange={v => set({ background: v })} label="Background color" />

                  <div style={{ height: 1, background: "#263050", margin: "12px 0" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#4A5580", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Grid</div>
                  <Toggle value={s.gridVisible} onChange={v => set({ gridVisible: v })} label="Show gridlines" />
                  {s.gridVisible && <ColorSwatch value={s.gridColor} onChange={v => set({ gridColor: v })} label="Grid color" />}

                  <div style={{ height: 1, background: "#263050", margin: "12px 0" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#4A5580", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Crosshair</div>
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
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#4A5580", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Scales</div>
                  <Toggle value={s.priceScaleVisible} onChange={v => set({ priceScaleVisible: v })} label="Show price scale" />
                  <Toggle value={s.timeScaleVisible} onChange={v => set({ timeScaleVisible: v })} label="Show time scale" />
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
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#4A5580", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Candle Colors</div>
                  <ColorSwatch value={s.candleUp}   onChange={v => set({ candleUp: v })}   label="Bull candle body" />
                  <ColorSwatch value={s.candleDown} onChange={v => set({ candleDown: v })} label="Bear candle body" />
                  <ColorSwatch value={s.wickUp}     onChange={v => set({ wickUp: v })}     label="Bull wick" />
                  <ColorSwatch value={s.wickDown}   onChange={v => set({ wickDown: v })}   label="Bear wick" />
                  <ColorSwatch value={s.borderUp}   onChange={v => set({ borderUp: v })}   label="Bull border" />
                  <ColorSwatch value={s.borderDown} onChange={v => set({ borderDown: v })} label="Bear border" />
                </div>
              )}

              {/* SCALES TAB */}
              {tab === "scales" && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#4A5580", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Price Scale Mode</div>
                  <Toggle value={s.logScale}      onChange={v => set({ logScale: v })}      label="Logarithmic scale" />
                  <Toggle value={s.autoScale}     onChange={v => set({ autoScale: v })}     label="Auto scale" />
                  <Toggle value={s.percentageMode} onChange={v => set({ percentageMode: v })} label="Percentage mode" />
                  <Toggle value={s.indexedTo100}  onChange={v => set({ indexedTo100: v })}  label="Indexed to 100" />
                  <div style={{ marginTop: 12, padding: "12px", background: "#141824", borderRadius: 6, border: "1px solid #263050" }}>
                    <p style={{ fontSize: 11, color: "#8896BE", margin: 0, lineHeight: 1.6 }}>
                      <strong style={{ color: "#E2E8FF" }}>Log scale</strong> — Use logarithmic price axis for long-term charts.<br/>
                      <strong style={{ color: "#E2E8FF" }}>Percentage mode</strong> — Show price as % change from first bar.<br/>
                      <strong style={{ color: "#E2E8FF" }}>Indexed to 100</strong> — Normalize first bar to 100 for comparison.
                    </p>
                  </div>
                </div>
              )}

              {/* TRADING TAB */}
              {tab === "trading" && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#4A5580", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Trade Overlay</div>
                  <Toggle value={s.showPositions} onChange={v => set({ showPositions: v })} label="Show positions on chart" />
                  <Toggle value={s.showPnL}       onChange={v => set({ showPnL: v })}       label="Show P&L on chart" />
                  <div style={{ marginTop: 12, padding: "12px", background: "#141824", borderRadius: 6, border: "1px solid #263050" }}>
                    <p style={{ fontSize: 11, color: "#8896BE", margin: 0, lineHeight: 1.6 }}>
                      When enabled, open positions will be shown as horizontal lines on the chart with entry price and unrealized P&L displayed.
                    </p>
                  </div>
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
