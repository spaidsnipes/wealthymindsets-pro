/**
 * TRADE REPLAY — Journal → Replay seam (Garden 18 v2 §34/§80) — PURE.
 *
 * One broker episode replayed on the bars of the instrument actually traded:
 * the option contract's own 1-minute candles (dxFeed streamer symbol, e.g.
 * `.TSLA261002C390`), with the episode's fills as markers. The replay cursor
 * hides every bar after it — no future-candle contamination — and a marker is
 * shown only once its fill time is at or before the cursor.
 */
import type { Episode } from "@/lib/broker/webullLedger";
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

/** "TSLA 2026-10-02 387.5C" → ".TSLA261002C387.5"; a stock key → the ticker itself. */
export function optionStreamerFor(instrumentKey: string): string | null {
  const m = /^([A-Z.]+) (\d{4})-(\d{2})-(\d{2}) ([\d.]+)([CP])$/.exec(instrumentKey.trim());
  if (!m) return /^[A-Z.]{1,6}$/.test(instrumentKey.trim()) ? instrumentKey.trim() : null;
  const [, root, y, mo, d, strike, right] = m;
  const k = Number(strike);
  if (!Number.isFinite(k)) return null;
  return `.${root}${y.slice(2)}${mo}${d}${right}${String(k)}`;
}

/** Minutes of context around the episode. */
export const REPLAY_PAD_BEFORE_MIN = 45;
export const REPLAY_PAD_AFTER_MIN = 30;

/** The replay window, in epoch ms. */
export function replayWindow(e: Pick<Episode, "openedAt" | "closedAt">): { from: number; to: number } {
  const open = Date.parse(e.openedAt);
  const close = e.closedAt ? Date.parse(e.closedAt) : open;
  return { from: open - REPLAY_PAD_BEFORE_MIN * 60_000, to: close + REPLAY_PAD_AFTER_MIN * 60_000 };
}

/** Bars inside the window only (bar times in seconds), oldest first. */
export function barsInWindow(bars: readonly LegacyOhlcvTuple[], w: { from: number; to: number }): LegacyOhlcvTuple[] {
  return bars.filter(b => b.time * 1000 >= w.from && b.time * 1000 <= w.to);
}

export interface ReplayMarker { readonly at: number; readonly price: number; readonly side: "BUY" | "SELL"; readonly role: "ENTRY" | "EXIT"; readonly quantity: number }

export function replayMarkers(e: Pick<Episode, "entries" | "exits">): ReplayMarker[] {
  return [
    ...e.entries.map(f => ({ at: Date.parse(f.at), price: f.price, side: f.side, role: "ENTRY" as const, quantity: f.quantity })),
    ...e.exits.map(f => ({ at: Date.parse(f.at), price: f.price, side: f.side, role: "EXIT" as const, quantity: f.quantity })),
  ].sort((a, b) => a.at - b.at);
}

/**
 * What the replay may show with the cursor at bar index `cursor`: the bars up
 * to and including it, and only the markers whose fill time is at or before
 * that bar's close. Nothing later leaks in.
 */
export function replayFrame(bars: readonly LegacyOhlcvTuple[], markers: readonly ReplayMarker[], cursor: number, barSec = 60) {
  const i = Math.max(0, Math.min(bars.length - 1, cursor));
  const visible = bars.slice(0, i + 1);
  const until = visible.length ? (visible[visible.length - 1].time + barSec) * 1000 : -Infinity;
  return { visible, markers: markers.filter(m => m.at < until), until };
}

export interface Excursions {
  /** Best open profit while held, per contract (or share), in dollars. */
  readonly mfe: number;
  /** Worst open loss while held, per contract (or share), in dollars (≤ 0). */
  readonly mae: number;
  /** Realised move per contract, in dollars. */
  readonly realised: number;
  /** realised ÷ mfe — only for a trade that realised a gain (a loss has nothing captured). */
  readonly capture: number | null;
  readonly barsHeld: number;
}

/**
 * MFE / MAE / capture (Garden 18 v2 §36), MEASURED from the contract's own bars
 * between entry and exit — bar extremes, so intrabar order is not claimed.
 */
export function excursions(bars: readonly LegacyOhlcvTuple[], e: Pick<Episode, "openedAt" | "closedAt" | "avgEntry" | "avgExit" | "direction" | "multiplier">): Excursions | null {
  if (!e.closedAt || e.avgExit == null) return null;
  const from = Math.floor(Date.parse(e.openedAt) / 60_000) * 60, to = Date.parse(e.closedAt) / 1000;
  const held = bars.filter(b => b.time >= from && b.time <= to);
  if (!held.length) return null;
  const hi = Math.max(...held.map(b => b.high)), lo = Math.min(...held.map(b => b.low));
  const dir = e.direction === "LONG" ? 1 : -1;
  const m = e.multiplier;
  const best = dir === 1 ? hi - e.avgEntry : e.avgEntry - lo;
  const worst = dir === 1 ? lo - e.avgEntry : e.avgEntry - hi;
  const realised = dir * (e.avgExit - e.avgEntry);
  const r2 = (x: number) => Math.round(x * m * 100) / 100;
  return { mfe: r2(Math.max(0, best)), mae: r2(Math.min(0, worst)), realised: r2(realised), capture: best > 0 && realised > 0 ? Math.round((realised / best) * 100) / 100 : null, barsHeld: held.length };
}

export interface ExcursionSummary {
  readonly measured: number;
  readonly avgMfe: number | null;
  readonly avgMae: number | null;
  /** Mean capture over winners only. */
  readonly avgCaptureWinners: number | null;
  readonly losers: number;
  /** Losers whose contract traded above (long) / below (short) the entry while held. */
  readonly losersGreenFirst: number;
}

/** Aggregate MEASURED excursions; only trades with bars count. */
export function summarizeExcursions(rows: readonly Excursions[]): ExcursionSummary {
  const n = rows.length;
  const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);
  const winners = rows.filter(r => r.realised > 0 && r.capture != null);
  const losers = rows.filter(r => r.realised < 0);
  return {
    measured: n,
    avgMfe: mean(rows.map(r => r.mfe)),
    avgMae: mean(rows.map(r => r.mae)),
    avgCaptureWinners: mean(winners.map(r => r.capture!)),
    losers: losers.length,
    losersGreenFirst: losers.filter(r => r.mfe > 0).length,
  };
}
