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

/** Per-slot validator — discards clearly-invalid persisted data so a
 *  corrupted storage entry cannot silently lie to the trader through
 *  the Vault chip or downstream selectors. Never throws. */
function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function validateStats(s: unknown): SessionTapeStats | null {
  if (!s || typeof s !== "object") return null;
  const raw = s as Record<string, unknown>;
  const stats: SessionTapeStats = {
    delta:         isFiniteNumber(raw.delta)         ? raw.delta         : 0,
    buyVol:        isFiniteNumber(raw.buyVol)        ? Math.max(0, raw.buyVol)        : 0,
    sellVol:       isFiniteNumber(raw.sellVol)       ? Math.max(0, raw.sellVol)       : 0,
    tradeCount:    isFiniteNumber(raw.tradeCount)    ? Math.max(0, Math.floor(raw.tradeCount))    : 0,
    bigTradeCount: isFiniteNumber(raw.bigTradeCount) ? Math.max(0, Math.floor(raw.bigTradeCount)) : 0,
  };
  return stats;
}
function validateHorizon(h: unknown): SessionTapeHorizon | null {
  if (!h || typeof h !== "object") return null;
  const raw = h as Record<string, unknown>;
  if (typeof raw.sym !== "string" || !raw.sym) return null;
  if (typeof raw.tapeSrc !== "string" || !raw.tapeSrc) return null;
  if (!isFiniteNumber(raw.startedAtSec) || raw.startedAtSec <= 0) return null;
  return { sym: raw.sym, tapeSrc: raw.tapeSrc, startedAtSec: Math.floor(raw.startedAtSec) };
}
function validateCvdSpark(a: unknown): number[] {
  if (!Array.isArray(a)) return [];
  const clean: number[] = [];
  for (const v of a) if (isFiniteNumber(v)) clean.push(v);
  return clean.slice(-24);
}

let hydrated = false;
function hydrateFromStorage(): void {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return;
    const nowSec = Math.floor(Date.now() / 1000);
    for (const [key, entry] of Object.entries(parsed as Record<string, unknown>)) {
      // Reject keys without our `${symbol}::${tapeSource}` shape — that's
      // a sign of foreign / corrupted / older-schema data. Fail closed.
      if (!key || typeof key !== "string" || key.indexOf("::") < 0) continue;
      if (!entry || typeof entry !== "object") continue;
      const rec = entry as Record<string, unknown>;
      const savedAt = isFiniteNumber(rec.savedAtSec) ? rec.savedAtSec : nowSec;
      if (nowSec - savedAt > LS_HORIZON_MAX_AGE_SEC) continue;
      const stats = validateStats(rec.stats) ?? EMPTY_STATS();
      const horizon = validateHorizon(rec.horizon);
      const cvdSpark = validateCvdSpark(rec.cvdSpark);
      slots.set(key, { stats, horizon, cvdSpark });
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

/**
 * User-facing clear for a single (symbol, tapeSource) slot. Wipes the
 * in-memory slot AND schedules a localStorage flush so the trader's
 * decision to forget a symbol survives a reload. Fanout listeners are
 * notified so the Vault / header pill / detail page reflect the change
 * immediately.
 *
 * Returns true when a slot was actually removed, false when the
 * (symbol, tapeSource) had no slot to begin with.
 */
export function clearSessionSymbol(symbol: string, tapeSource: string): boolean {
  hydrateFromStorage();
  const key = keyFor(symbol, tapeSource);
  const existed = slots.delete(key);
  if (existed) {
    invalidateKnownCache();
    emit();
    scheduleFlush();
  }
  return existed;
}

/** User-facing clear for EVERY slot. Same fanout + flush as the
 *  per-symbol clear. Used by the "clear all memory" action. */
export function clearAllSessionSymbols(): number {
  hydrateFromStorage();
  const count = slots.size;
  if (count === 0) return 0;
  slots.clear();
  invalidateKnownCache();
  emit();
  scheduleFlush();
  return count;
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
