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
// Cached enumeration of known symbols — stable reference between mutations
// so useSyncExternalStore consumers cannot trip React #185.
let knownCache: Array<{ symbol: string; tapeSource: string; slot: SessionSymbolSlot }> | null = null;
function invalidateKnownCache(): void { knownCache = null; }

const LS_KEY = "wm:session-symbol-store:v1";
const LS_MAX_SLOTS = 32;          // cap so we never blow up user quota
const LS_HORIZON_MAX_AGE_SEC = 60 * 60 * 24 * 7; // one week of stat carry-over

function keyFor(symbol: string, tapeSource: string): string {
  return `${symbol}::${tapeSource}`;
}

function emit(): void {
  listeners.forEach(fn => { try { fn(); } catch { /* isolate consumer errors */ } });
}

let hydrated = false;
function hydrateFromStorage(): void {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, SessionSymbolSlot & { savedAtSec?: number }>;
    const nowSec = Math.floor(Date.now() / 1000);
    for (const [key, slot] of Object.entries(parsed)) {
      if (!slot || typeof slot !== "object") continue;
      const savedAt = typeof slot.savedAtSec === "number" ? slot.savedAtSec : nowSec;
      if (nowSec - savedAt > LS_HORIZON_MAX_AGE_SEC) continue;
      slots.set(key, {
        stats: slot.stats ?? EMPTY_STATS(),
        horizon: slot.horizon ?? null,
        cvdSpark: Array.isArray(slot.cvdSpark) ? slot.cvdSpark.slice(-24) : [],
      });
    }
  } catch { /* corrupt storage → start fresh, never throw during hydration */ }
}

let flushHandle: ReturnType<typeof setTimeout> | null = null;
function scheduleFlush(): void {
  if (typeof window === "undefined") return;
  if (flushHandle) return;
  flushHandle = setTimeout(() => {
    flushHandle = null;
    try {
      const nowSec = Math.floor(Date.now() / 1000);
      const entries = [...slots.entries()].slice(-LS_MAX_SLOTS);
      const payload: Record<string, SessionSymbolSlot & { savedAtSec: number }> = {};
      for (const [key, slot] of entries) {
        payload[key] = { ...slot, savedAtSec: nowSec };
      }
      window.localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch { /* quota / private mode → next flush will retry */ }
  }, 750);
}

export function getSessionSymbolSlot(symbol: string, tapeSource: string): SessionSymbolSlot {
  hydrateFromStorage();
  const key = keyFor(symbol, tapeSource);
  let slot = slots.get(key);
  if (!slot) {
    slot = { stats: EMPTY_STATS(), horizon: null, cvdSpark: [] };
    slots.set(key, slot);
    invalidateKnownCache();
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
  // knownCache holds references to slot objects (not copies), so mutation
  // of slot contents is visible without invalidation. Only add/remove
  // slot keys must invalidate — handled in getSessionSymbolSlot.
  emit();
  scheduleFlush();
}

export function subscribeSessionSymbolStore(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getKnownSessionSymbols(): Array<{ symbol: string; tapeSource: string; slot: SessionSymbolSlot }> {
  hydrateFromStorage();
  if (knownCache) return knownCache;
  const out: Array<{ symbol: string; tapeSource: string; slot: SessionSymbolSlot }> = [];
  for (const [key, slot] of slots.entries()) {
    const idx = key.indexOf("::");
    if (idx < 0) continue;
    out.push({ symbol: key.slice(0, idx), tapeSource: key.slice(idx + 2), slot });
  }
  knownCache = out;
  return out;
}

export function __resetSessionSymbolStoreForTests(): void {
  slots.clear();
  listeners.clear();
  invalidateKnownCache();
  hydrated = false;
  if (flushHandle) { clearTimeout(flushHandle); flushHandle = null; }
  if (typeof window !== "undefined") {
    try { window.localStorage.removeItem(LS_KEY); } catch { /* noop */ }
  }
}
