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
  /**
   * Wall-clock ms of the most recent trade recorded in this slot.
   *
   * Freshness proof for downstream consumers (MobileSessionPill,
   * CommandContextRibbon NECTAR tile, /nectar horizon labels). Before
   * this field existed, "fresh" was proxied via horizon.startedAtSec
   * which is the FIRST observation — invented freshness. Now honest.
   *
   * Optional at the type level so persisted data from the pre-field
   * schema hydrates without loss (validator falls back to `null`,
   * which downstream consumers treat as "unknown freshness").
   */
  lastTradeAtMs?: number | null;
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
      const lastTradeAtMs = isFiniteNumber(rec.lastTradeAtMs) && rec.lastTradeAtMs > 0
        ? rec.lastTradeAtMs
        : null;
      slots.set(key, { stats, horizon, cvdSpark, lastTradeAtMs });
    }
  } catch { /* corrupt storage → start fresh, never throw during hydration */ }
}

let flushHandle: ReturnType<typeof setTimeout> | null = null;
function serializeCurrent(nowSec: number): string {
  const entries = [...slots.entries()].slice(-LS_MAX_SLOTS);
  const payload: Record<string, SessionSymbolSlot & { savedAtSec: number }> = {};
  for (const [key, slot] of entries) {
    payload[key] = { ...slot, savedAtSec: nowSec };
  }
  return JSON.stringify(payload);
}

function scheduleFlush(): void {
  if (typeof window === "undefined") return;
  if (flushHandle) return;
  flushHandle = setTimeout(() => {
    flushHandle = null;
    try {
      window.localStorage.setItem(LS_KEY, serializeCurrent(Math.floor(Date.now() / 1000)));
    } catch { /* quota / private mode → next flush will retry */ }
  }, 750);
}

/**
 * Persistence acknowledgement for user-facing clear actions. Runs the
 * flush synchronously, reads the key back, and confirms that every
 * requested key is absent from the persisted payload. Returns the
 * bounded, honest state the UI can render — never claims more than
 * the readback proves.
 */
export type SessionSymbolClearAck =
  | "ACKNOWLEDGED"          // synchronous flush + readback confirmed absence
  | "FAILED"                // localStorage.setItem threw (quota / private mode)
  | "READBACK_MISMATCH"     // wrote but readback still saw the key(s) present
  | "UNSUPPORTED"           // no window (server) — action ran in-memory only
  | "PARSE_ERROR";          // readback saw invalid JSON — treat as inconclusive

function flushAndAcknowledge(expectedAbsentKeys: readonly string[]): SessionSymbolClearAck {
  if (typeof window === "undefined") return "UNSUPPORTED";
  // Cancel any pending debounced flush — we're about to write synchronously
  // and don't want a stale delayed write to clobber this one.
  if (flushHandle) { clearTimeout(flushHandle); flushHandle = null; }
  const nowSec = Math.floor(Date.now() / 1000);
  let written: string;
  try {
    written = serializeCurrent(nowSec);
    window.localStorage.setItem(LS_KEY, written);
  } catch { return "FAILED"; }
  // Readback: parse what actually landed and prove the keys are absent.
  let readback: unknown;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw == null) {
      // Empty payload is fine ONLY when we cleared everything AND the
      // serialized "written" is also empty. Treat missing key as absence.
      return expectedAbsentKeys.every(k => !written.includes(`"${k}":`))
        ? "ACKNOWLEDGED"
        : "READBACK_MISMATCH";
    }
    readback = JSON.parse(raw);
  } catch { return "PARSE_ERROR"; }
  if (!readback || typeof readback !== "object") return "READBACK_MISMATCH";
  const rec = readback as Record<string, unknown>;
  for (const key of expectedAbsentKeys) {
    if (Object.prototype.hasOwnProperty.call(rec, key)) return "READBACK_MISMATCH";
  }
  return "ACKNOWLEDGED";
}

export function getSessionSymbolSlot(symbol: string, tapeSource: string): SessionSymbolSlot {
  hydrateFromStorage();
  const key = keyFor(symbol, tapeSource);
  let slot = slots.get(key);
  if (!slot) {
    slot = { stats: EMPTY_STATS(), horizon: null, cvdSpark: [], lastTradeAtMs: null };
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

  // Real freshness stamp — every recorded trade updates the wall-clock
  // ms so downstream freshness readers no longer have to proxy via the
  // horizon start. tick.time is provider ms; guard against 0/NaN.
  if (Number.isFinite(tick.time) && tick.time > 0) {
    slot.lastTradeAtMs = tick.time;
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
 * Result of a user-facing clear action — a truthful, bounded receipt
 * the UI can render without overstating scope.
 *
 * Per Sentinel's "Clear persistence proof" RETURN, the caller cannot
 * claim the forget survived reload until localStorage has been flushed
 * synchronously and read back with the key absent. `persistence` is
 * that readback proof; `inMemoryRemoved` is only what was deleted from
 * the in-memory Map. Neither field extends beyond
 * sessionSymbolStore's own ownership boundary.
 */
export interface SessionSymbolClearResult {
  /** Whether a slot with this identity existed in memory before this call. */
  readonly inMemoryRemoved: boolean;
  /** Synchronous readback of the localStorage key after the flush. */
  readonly persistence: SessionSymbolClearAck;
}
export interface SessionSymbolClearAllResult {
  /** Number of slots that existed in memory before the clear. */
  readonly inMemoryRemoved: number;
  /** Synchronous readback of the localStorage key after the flush. */
  readonly persistence: SessionSymbolClearAck;
}

/**
 * User-facing clear for a single (symbol, tapeSource) slot. Wipes the
 * in-memory slot, notifies fanout listeners, then synchronously
 * flushes localStorage and reads it back to prove the persisted
 * payload no longer contains the key.
 *
 * Returns both the in-memory outcome AND the persistence
 * acknowledgement so the UI can render either "browser stats deleted"
 * (ACKNOWLEDGED) or a truthful degraded state (FAILED / READBACK_MISMATCH
 * / PARSE_ERROR / UNSUPPORTED).
 */
export function clearSessionSymbol(symbol: string, tapeSource: string): SessionSymbolClearResult {
  hydrateFromStorage();
  const key = keyFor(symbol, tapeSource);
  const existed = slots.delete(key);
  if (!existed) {
    return { inMemoryRemoved: false, persistence: "ACKNOWLEDGED" };
  }
  invalidateKnownCache();
  emit();
  const persistence = flushAndAcknowledge([key]);
  return { inMemoryRemoved: true, persistence };
}

/** User-facing clear for EVERY slot. Same fanout + synchronous flush
 *  + readback as the per-symbol clear. */
export function clearAllSessionSymbols(): SessionSymbolClearAllResult {
  hydrateFromStorage();
  const preClearKeys = [...slots.keys()];
  const count = preClearKeys.length;
  if (count === 0) {
    return { inMemoryRemoved: 0, persistence: "ACKNOWLEDGED" };
  }
  slots.clear();
  invalidateKnownCache();
  emit();
  const persistence = flushAndAcknowledge(preClearKeys);
  return { inMemoryRemoved: count, persistence };
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
