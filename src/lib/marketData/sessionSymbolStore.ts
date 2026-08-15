/**
 * sessionSymbolStore — per-symbol session tape memory that survives symbol
 * switches within a single tab session.
 *
 * PROBLEM SOLVED (Founder 2026-08-14): switching from BTC to TSLA on the
 * chart used to reset session stats + tape horizon + CVD sparkline back to
 * zero, destroying the running observation window. Traders refused to switch
 * symbols out of fear of losing collected data.
 *
 * DESIGN: A tiny per-tab store keyed by `${symbol}::${tapeSource}` that keeps
 * running stats + horizon + sparkline buffer per symbol. When the chart
 * switches back to a symbol we've already seen this tab, the accumulated
 * counters return exactly as they were. Nothing is durably persisted — this
 * remains session-only until provider rawPersistenceRight is ALLOWED per the
 * capability registry.
 *
 * A `subscribe` fanout lets multiple consumers (chip, banners, future
 * multi-symbol panels) react without threading refs through the tree.
 */

export interface SessionTapeStats {
  delta: number;
  buyVol: number;
  sellVol: number;
  tradeCount: number;
  bigTradeCount: number;
}

export interface SessionTapeHorizon {
  sym: string;
  tapeSrc: string;
  startedAtSec: number;
}

export interface SessionSymbolSlot {
  stats: SessionTapeStats;
  horizon: SessionTapeHorizon | null;
  cvdSpark: number[];
}

const EMPTY_STATS = (): SessionTapeStats => ({
  delta: 0, buyVol: 0, sellVol: 0, tradeCount: 0, bigTradeCount: 0,
});

const slots = new Map<string, SessionSymbolSlot>();
const listeners = new Set<() => void>();

function keyFor(symbol: string, tapeSource: string): string {
  return `${symbol}::${tapeSource}`;
}

function emit(): void {
  listeners.forEach(fn => { try { fn(); } catch { /* isolate consumer errors */ } });
}

export function getSessionSymbolSlot(symbol: string, tapeSource: string): SessionSymbolSlot {
  const key = keyFor(symbol, tapeSource);
  let slot = slots.get(key);
  if (!slot) {
    slot = { stats: EMPTY_STATS(), horizon: null, cvdSpark: [] };
    slots.set(key, slot);
  }
  return slot;
}

export function recordSessionTrade(
  symbol: string,
  tapeSource: string,
  tick: { side?: "buy" | "sell" | null; size: number; time: number },
  isBigTrade: boolean,
): void {
  const slot = getSessionSymbolSlot(symbol, tapeSource);
  if (tick.side === "buy")  { slot.stats.buyVol  += tick.size; slot.stats.delta += tick.size; }
  if (tick.side === "sell") { slot.stats.sellVol += tick.size; slot.stats.delta -= tick.size; }
  slot.stats.tradeCount += 1;
  if (isBigTrade) slot.stats.bigTradeCount += 1;

  if (!slot.horizon) {
    const startedAtSec = Math.floor(tick.time / 1000);
    if (Number.isFinite(startedAtSec) && startedAtSec > 0) {
      slot.horizon = { sym: symbol, tapeSrc: tapeSource, startedAtSec };
    }
  }
}

export function pushCvdSample(symbol: string, tapeSource: string): void {
  const slot = getSessionSymbolSlot(symbol, tapeSource);
  slot.cvdSpark.push(slot.stats.delta);
  if (slot.cvdSpark.length > 24) slot.cvdSpark.shift();
  emit();
}

export function subscribeSessionSymbolStore(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getKnownSessionSymbols(): Array<{ symbol: string; tapeSource: string; slot: SessionSymbolSlot }> {
  const out: Array<{ symbol: string; tapeSource: string; slot: SessionSymbolSlot }> = [];
  for (const [key, slot] of slots.entries()) {
    const idx = key.indexOf("::");
    if (idx < 0) continue;
    out.push({ symbol: key.slice(0, idx), tapeSource: key.slice(idx + 2), slot });
  }
  return out;
}

export function __resetSessionSymbolStoreForTests(): void {
  slots.clear();
  listeners.clear();
}
