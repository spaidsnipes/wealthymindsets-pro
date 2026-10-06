"use client";

/**
 * THE CHART ROOM'S DRAWERS, LOADED ON OPEN.
 *
 * PHONE LOAD SPEED (2026-10-06): the order ticket (with its broker live-order
 * lanes), the DOM ladder, the P&L stats strip and the indicator settings modal
 * each mount only behind an open flag in ChartsDashboard, yet they shipped in
 * the /charts first-load JS every trader waits on before the chart can paint.
 * They now load as their own chunks, and are warmed on idle once the room is
 * standing, so the first open does not wait on a network round trip.
 * ChartsDashboard renders them exactly as before — same names, same props.
 */
import dynamic from "next/dynamic";

const loadTradePanel = () => import("./TradePanel");
const loadDOMPanel = () => import("./DOMPanel");
const loadPnLStatsPanel = () => import("./PnLStatsPanel");
const loadIndicatorSettingsModal = () => import("./IndicatorSettingsModal");

export const TradePanel = dynamic(() => loadTradePanel().then(m => m.TradePanel), { ssr: false });
export const DOMPanel = dynamic(() => loadDOMPanel().then(m => m.DOMPanel), { ssr: false });
export const PnLStatsPanel = dynamic(() => loadPnLStatsPanel().then(m => m.PnLStatsPanel), { ssr: false });
export const IndicatorSettingsModal = dynamic(() => loadIndicatorSettingsModal().then(m => m.IndicatorSettingsModal), { ssr: false });

if (typeof window !== "undefined") {
  const warm = () => { void loadTradePanel(); void loadDOMPanel(); void loadPnLStatsPanel(); void loadIndicatorSettingsModal(); };
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  // Give the room's own first paint the network first, then warm on idle.
  window.setTimeout(() => { if (ric) ric(warm, { timeout: 4000 }); else warm(); }, 3000);
}
