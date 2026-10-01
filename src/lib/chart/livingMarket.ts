/**
 * LIVING MARKET · LIVE / STILL — one presentation state (Garden 16 §7/§13/§15).
 *
 * LIVE  = the canvas may show its bounded, self-driven motion (bubble breath,
 *         arrival ease, drift toward home).
 * STILL = the SAME objects, at the SAME price/time, settled: full size, at
 *         home, no breath. Nothing is removed, nothing turns generic, no state
 *         restarts — STILL ≠ disabled, ≠ screenshot, ≠ stale.
 *
 * The operating system's "reduce motion" request settles the canvas too
 * (REDUCED_MOTION), whatever the trader's choice — accessibility wins.
 *
 * PURE except for the storage helpers, which never throw.
 */

export type LivingMarket = "LIVE" | "STILL";
export const LIVING_MARKET_KEY = "wm_livingMarket";
export const LIVING_MARKET_EVENT = "wm:living-market";

export function readLivingMarket(): LivingMarket {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(LIVING_MARKET_KEY) === "STILL" ? "STILL" : "LIVE";
  } catch {
    return "LIVE";
  }
}

export function writeLivingMarket(mode: LivingMarket): void {
  const previous = readLivingMarket();
  try { window.localStorage.setItem(LIVING_MARKET_KEY, mode); } catch { /* storage unavailable: the state still holds for this page */ }
  if (typeof window !== "undefined" && previous !== mode && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent<LivingMarket>(LIVING_MARKET_EVENT, { detail: mode }));
  }
}

/** Same-page controls and other windows settle the same evidence immediately. */
export function listenForLivingMarket(change: (mode: LivingMarket) => void): () => void {
  const onChange = (event: Event) => {
    const mode = (event as CustomEvent<LivingMarket>).detail;
    if (mode === "LIVE" || mode === "STILL") change(mode);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === LIVING_MARKET_KEY || event.key === null) change(readLivingMarket());
  };
  window.addEventListener(LIVING_MARKET_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(LIVING_MARKET_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** The receipt word the canvas publishes. */
export function livingMarketReceipt(mode: LivingMarket, reduced: boolean): "LIVE" | "STILL" | "STILL:REDUCED_MOTION" {
  if (reduced) return "STILL:REDUCED_MOTION";
  return mode;
}

/** May the canvas animate this frame? */
export function motionAllowed(mode: LivingMarket, reduced: boolean): boolean {
  return mode === "LIVE" && !reduced;
}
