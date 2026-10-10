"use client";

/**
 * ONE BROKER READBACK FOR THE WHOLE CHART ROOM (Founder P0 2026-10-09).
 *
 * The trade ticket and the chart's positions / working-orders strip must read the SAME poll of
 * tastytrade's orders and positions (read routes only) — never one each, never two clocks. This store
 * owns that poll and the contract a chart symbol resolves to:
 *
 *   · it runs only while at least one reader is ENABLED (the caller enables it for the broker OWNER
 *     with a connected rail — a guest or a proof scene never starts it);
 *   · every 3 s while any reader is FAST (the ticket is open), every 10 s otherwise;
 *   · PAUSED while the tab is hidden, with one read on return;
 *   · one request pair at a time — a second reader never doubles the polling;
 *   · the last answer is KEPT when a reader unmounts (closing the ticket does not blank the strip),
 *     and a failed read keeps the last answer and marks it not-ok, so it ages to STALE honestly.
 *
 * It never sends, cancels or modifies anything.
 */

import { useEffect, useMemo, useSyncExternalStore } from "react";

import { tastyFrontMonthFor } from "@/lib/broker/tastyFrontMonth";
import { readTastytradeOrder, type TtOrderView } from "@/lib/broker/tastytradeOrderState";
import { canonicalAssetClass, cryptoBaseTicker } from "@/lib/marketData/canonicalIdentity";

import { READBACK_STALE_MS, readTastytradePosition, selectBrokerOrderLines, type BrokerLinesResult, type BrokerPositionRow, type BrokerReadback } from "./brokerOrderLines";

export const READBACK_FAST_MS = 3_000;
export const READBACK_SLOW_MS = 10_000;

const EMPTY: BrokerReadback = { asOfMs: null, ok: false, orders: [], positions: [] };

interface State { readonly rb: BrokerReadback; readonly nowMs: number }
let state: State = { rb: EMPTY, nowMs: 0 };
const listeners = new Set<() => void>();
const readers = new Map<symbol, { fast: boolean }>();
let timer: ReturnType<typeof setTimeout> | null = null;
let reading = false;
let visibilityBound = false;

const emit = () => { for (const l of listeners) l(); };
const hidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";
/** The poll interval the current readers ask for; null = nobody is reading. PURE on its inputs. */
export function readbackIntervalMs(readerFast: readonly boolean[], isHidden: boolean): number | null {
  if (!readerFast.length || isHidden) return null;
  return readerFast.some(Boolean) ? READBACK_FAST_MS : READBACK_SLOW_MS;
}

/** Orders + positions answers → one readback. PURE; null when either answer is not OK. */
export function readbackFromAnswers(o: unknown, p: unknown, nowMs: number): BrokerReadback | null {
  const oo = o as { state?: string; accounts?: { index?: unknown; tail?: unknown; orders: unknown[] }[] } | null;
  const pp = p as { state?: string; accounts?: { positions?: unknown[] }[] } | null;
  if (oo?.state !== "OK" || pp?.state !== "OK" || !Array.isArray(oo.accounts) || !Array.isArray(pp.accounts)) return null;
  const orderAccounts: Record<string, { index: number; tail: string }> = {};
  const orders = oo.accounts.flatMap(a => (a.orders ?? []).map(x => {
    const v = x && typeof x === "object" && "state" in (x as object) ? (x as TtOrderView) : readTastytradeOrder(x);
    if (v && typeof a.index === "number" && typeof a.tail === "string") orderAccounts[v.id] = { index: a.index, tail: a.tail };
    return v;
  }).filter((x): x is TtOrderView => !!x));
  const positions = pp.accounts.flatMap(a => (a.positions ?? []).map(readTastytradePosition).filter((x): x is BrokerPositionRow => !!x));
  const tails = oo.accounts.map(a => (typeof a.tail === "string" ? a.tail : null)).filter((t): t is string => !!t);
  return { asOfMs: nowMs, ok: true, orders, positions, tails, orderAccounts };
}

async function readOnce(): Promise<void> {
  if (reading) return;                    // one request pair at a time, however many readers
  reading = true;
  try {
    const [o, p] = await Promise.all([
      fetch("/api/broker/tastytrade/orders", { cache: "no-store" }).then(r => r.json().catch(() => null)),
      fetch("/api/broker/tastytrade/positions", { cache: "no-store" }).then(r => r.json().catch(() => null)),
    ]);
    const next = readbackFromAnswers(o, p, Date.now());
    state = { rb: next ?? { ...state.rb, ok: false }, nowMs: Date.now() };
  } catch {
    state = { rb: { ...state.rb, ok: false }, nowMs: Date.now() };
  } finally {
    reading = false;
  }
  emit();
}

function schedule(immediate: boolean): void {
  if (timer) { clearTimeout(timer); timer = null; }
  const every = readbackIntervalMs([...readers.values()].map(r => r.fast), hidden());
  if (every === null) return;             // nobody reading, or the tab is hidden: paused
  const run = () => { void readOnce().then(() => { timer = null; schedule(false); }); };
  if (immediate) run(); else timer = setTimeout(run, every);
}

function bindVisibility(): void {
  if (visibilityBound || typeof document === "undefined") return;
  visibilityBound = true;
  document.addEventListener("visibilitychange", () => schedule(!hidden()));
}

function addReader(fast: boolean): () => void {
  const id = Symbol("reader");
  const first = readers.size === 0;
  const wasFast = [...readers.values()].some(r => r.fast);
  readers.set(id, { fast });
  bindVisibility();
  // The first reader reads at once; a new FAST reader pulls the next read forward; otherwise the running clock stands.
  if (first || (fast && !wasFast)) schedule(first || state.rb.asOfMs === null || Date.now() - (state.rb.asOfMs ?? 0) > READBACK_FAST_MS);
  return () => { readers.delete(id); schedule(false); };   // the last answer is kept — nothing is blanked
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const snapshot = () => state;
const serverSnapshot = (): State => ({ rb: EMPTY, nowMs: 0 });

/**
 * The shared readback. `enabled` = the caller is the broker owner with a connected rail and is not in a
 * proof scene; `fast` = the ticket is open. Returns the last answer (kept across unmounts) and a clock
 * that moves it to STALE when reads stop answering.
 */
export function useBrokerReadback(enabled: boolean, fast: boolean): { readonly rb: BrokerReadback; readonly nowMs: number } {
  const s = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  useEffect(() => (enabled ? addReader(fast) : undefined), [enabled, fast]);
  // The clock alone ages a fresh readback to STALE while the tab is visible.
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => { if (!hidden()) { state = { ...state, nowMs: Date.now() }; emit(); } }, READBACK_STALE_MS / 2);
    return () => clearInterval(t);
  }, [enabled]);
  return enabled ? s : { rb: EMPTY, nowMs: s.nowMs };
}

/* ── contract resolution: one answer per chart symbol, shared ─────────────── */

export interface BrokerContract { readonly symbol: string; readonly streamer: string }
export type ContractAnswer =
  | { readonly state: "RESOLVING" }
  | { readonly state: "RESOLVED"; readonly contract: BrokerContract }
  | { readonly state: "NONE"; readonly why: string };

const contracts = new Map<string, ContractAnswer>();
const contractListeners = new Set<() => void>();
const RESOLVING: ContractAnswer = { state: "RESOLVING" };
export const CONTRACT_NOT_NAMED = "tastytrade did not name a tradable contract for this future (not connected, or no listed month).";
export const NO_USD_PAIR = "This coin has no USD pair WM can name exactly.";

/** The executable contract a chart symbol resolves to — never a continuous symbol routed blind. */
export function resolveBrokerContract(chartSymbol: string): ContractAnswer {
  const key = chartSymbol.toUpperCase();
  const have = contracts.get(key);
  if (have) return have;
  const cls = canonicalAssetClass(chartSymbol);
  const set = (a: ContractAnswer) => { contracts.set(key, a); for (const l of contractListeners) l(); };
  if (cls === "futures") {
    contracts.set(key, RESOLVING);
    void tastyFrontMonthFor(chartSymbol).then(c => set(c ? { state: "RESOLVED", contract: c } : { state: "NONE", why: CONTRACT_NOT_NAMED }), () => set({ state: "NONE", why: CONTRACT_NOT_NAMED }));
    return RESOLVING;
  }
  if (cls === "crypto") {
    const base = cryptoBaseTicker(chartSymbol);
    const a: ContractAnswer = base ? { state: "RESOLVED", contract: { symbol: `${base}/USD`, streamer: `${base}/USD:CXTALP` } } : { state: "NONE", why: NO_USD_PAIR };
    contracts.set(key, a); return a;
  }
  if (cls === "forex" || cls === "options") { const a: ContractAnswer = { state: "NONE", why: "No broker contract is named for this market here." }; contracts.set(key, a); return a; }
  const a: ContractAnswer = { state: "RESOLVED", contract: { symbol: key, streamer: key } };
  contracts.set(key, a); return a;
}

/** A future whose contract could not be named is asked again the next time a reader mounts (a rail may have connected). */
export function forgetUnresolvedContract(chartSymbol: string): void {
  const key = chartSymbol.toUpperCase();
  if (contracts.get(key)?.state === "NONE" && canonicalAssetClass(chartSymbol) === "futures") {
    contracts.delete(key);
    for (const l of contractListeners) l();
  }
}

export function useBrokerContract(chartSymbol: string, enabled = true): ContractAnswer {
  const sub = (cb: () => void) => { contractListeners.add(cb); return () => { contractListeners.delete(cb); }; };
  const get = () => (enabled ? resolveBrokerContract(chartSymbol) : RESOLVING);
  return useSyncExternalStore(sub, get, () => RESOLVING);
}

/* ── the strip's read hook ────────────────────────────────────────────────── */

export type BookStripState = "NOT_READ" | "RESOLVING" | "NO_CONTRACT" | "FLAT" | "LONG" | "SHORT";
export interface BrokerBookStrip {
  readonly state: BookStripState;
  /** The executable contract read (e.g. "/NQZ6"), or null. */
  readonly contract: string | null;
  readonly quantity: number | null;
  readonly averagePrice: number | null;
  /** Only when a position is held. UNPROTECTED = no working closing stop was read for it. */
  readonly protection: "PROTECTED" | "UNPROTECTED" | null;
  readonly working: number;
  /** When tastytrade last answered, or null. */
  readonly asOfMs: number | null;
  readonly freshness: "FRESH" | "STALE" | "NEVER_READ";
  /** One line, e.g. "LONG 2 @ 25010.25 · UNPROTECTED · 1 working · as of 2:31:05 PM". */
  readonly words: string;
}

/** PURE: the strip's reading from a selected broker result. */
export function bookStripFrom(contract: ContractAnswer, r: BrokerLinesResult | null, clock: (ms: number) => string): BrokerBookStrip {
  const base = { contract: contract.state === "RESOLVED" ? contract.contract.symbol : null, quantity: null, averagePrice: null, protection: null, working: 0, asOfMs: null, freshness: "NEVER_READ" as const };
  if (contract.state === "RESOLVING") return { ...base, state: "RESOLVING", words: "Naming the contract…" };
  if (contract.state === "NONE") return { ...base, state: "NO_CONTRACT", words: contract.why };
  if (!r || r.readback === "NEVER_READ") return { ...base, state: "NOT_READ", words: "Position not read yet." };
  const asOf = r.asOfMs ?? null;
  const tail = `${r.working ?? 0} working · as of ${asOf !== null ? clock(asOf) : "—"}${r.readback === "STALE" ? " · STALE — tastytrade has not answered since" : ""}`;
  const common = { contract: contract.contract.symbol, working: r.working ?? 0, asOfMs: asOf, freshness: r.readback };
  if (!r.position) return { ...common, state: "FLAT", quantity: null, averagePrice: null, protection: null, words: `FLAT · ${tail}` };
  const row = r.position.row;
  const state: BookStripState = row.direction === "Long" ? "LONG" : "SHORT";
  return {
    ...common, state, quantity: row.quantity, averagePrice: row.averageOpenPrice, protection: r.position.protection,
    words: `${state} ${row.quantity} @ ${row.averageOpenPrice} · ${r.position.protection} · ${tail}`,
  };
}

/**
 * For a chart strip: the position / working-orders state of the chart's symbol, from the SAME poll the
 * ticket reads. `enabled` must be true only for the broker owner with a connected rail (never in a
 * proof scene). Slow cadence — the ticket, when open, speeds the shared poll up for everyone.
 */
export function useBrokerBookStrip(chartSymbol: string, enabled: boolean): BrokerBookStrip {
  const contract = useBrokerContract(chartSymbol, enabled);
  const { rb, nowMs } = useBrokerReadback(enabled, false);
  return useMemo(() => {
    if (!enabled) return bookStripFrom({ state: "NONE", why: "Not read — no broker rail is open for this account." }, null, () => "");
    const r = contract.state === "RESOLVED" ? selectBrokerOrderLines(rb, contract.contract.symbol, null, null, nowMs) : null;
    return bookStripFrom(contract, r, ms => new Date(ms).toLocaleTimeString());
  }, [enabled, contract, rb, nowMs]);
}

/** Test seam: forget everything. */
export function resetBrokerReadbackStoreForTest(): void {
  state = { rb: EMPTY, nowMs: 0 }; readers.clear(); contracts.clear(); if (timer) clearTimeout(timer); timer = null; reading = false;
}
