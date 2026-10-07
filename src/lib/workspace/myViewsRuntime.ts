/**
 * MY VIEWS — the browser half of the one Views owner (Drive Garden 18
 * snapshot 10-02 §B1–2, 2026-10-07).
 *
 * `savedLayouts.ts` owns the list (pure). This module only (a) tells the
 * arrangement compiler which starter Views the trader has edited, so a press
 * on ORDER FLOW — from the Workspace rail, the Tools panel or My Views —
 * arranges the chart as the trader's edit, and (b) tells the same tab when the
 * list changed (`storage` only fires in OTHER tabs). No second store: every
 * read goes through `loadSavedLayouts` on the one key.
 *
 * A proof scene presses the CANON starters: a proof must not depend on what
 * one trader edited on one device.
 */
import { setStarterArmsOverride } from "@/lib/marketData/viewModels/selectChartArrangement";
import { proofSceneHoldsWrites } from "@/lib/chart/proofScene";
import { loadSavedLayouts, MY_VIEWS_EVENT, SAVED_LAYOUTS_STORAGE_KEY, starterArmsFromList, type SavedLayout } from "./savedLayouts";

function pageStorage(): Pick<Storage, "getItem"> | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Register the trader's starter edits with the compiler (canon in a proof scene). */
export function syncStarterViews(list?: readonly SavedLayout[]): void {
  if (proofSceneHoldsWrites()) {
    setStarterArmsOverride(null);
    return;
  }
  setStarterArmsOverride(starterArmsFromList(list ?? loadSavedLayouts(pageStorage())));
}

/** The door committed a new list: re-register, and tell every reader in this tab. */
export function notifyMyViewsChanged(list: readonly SavedLayout[]): void {
  syncStarterViews(list);
  try {
    window.dispatchEvent(new Event(MY_VIEWS_EVENT));
  } catch {
    /* no window */
  }
}

/** Subscribe to Views changes from this tab and from other tabs. Returns the unsubscribe. */
export function subscribeMyViews(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === SAVED_LAYOUTS_STORAGE_KEY) handler();
  };
  window.addEventListener(MY_VIEWS_EVENT, handler);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(MY_VIEWS_EVENT, handler);
    window.removeEventListener("storage", onStorage);
  };
}

let installed = false;
/** Once per page: register the stored edits and keep them current across tabs. */
export function installMyViews(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  syncStarterViews();
  window.addEventListener("storage", (e) => {
    if (e.key === SAVED_LAYOUTS_STORAGE_KEY) syncStarterViews();
  });
}
