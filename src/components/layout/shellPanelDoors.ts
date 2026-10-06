/**
 * THE SHELL PANELS' DOORS — the few light facts a shell needs BEFORE any panel
 * is open: the unread badge count, the Settings tab vocabulary and the
 * open-settings event.
 *
 * PHONE LOAD SPEED (2026-10-06): these lived inside `shellPanels.tsx`, so the
 * shells' static import of the badge count dragged every panel (search,
 * notifications, the whole Settings tree — census, ledger, saved layouts,
 * guardrails) into the root layout chunk, which ships to /login, /welcome and
 * /pricing. The panels are drawer-only, so the shells now load them on open
 * (and warm them on idle); the facts the closed shell reads live here.
 * `shellPanels` re-exports every one of them, so it is still the one owner.
 */

export const INITIAL_NOTIFS: Array<{ id:number; read:boolean; time:string; icon:string; title:string; body:string }> = [];

/**
 * How many unread notifications a shell should badge before the panel has ever
 * been opened. The shells ASK rather than filtering the seed themselves — a
 * header that keeps its own copy of this count is a second owner of it, and
 * would go on reading zero on the day the seed stops being empty.
 */
export function initialUnreadNotificationCount(): number {
  return INITIAL_NOTIFS.filter((n) => !n.read).length;
}

export type SettingsTabId = "display"|"chart"|"views"|"intelligence"|"execution"|"watchlist"|"connections"|"accessibility"|"account";
export const SETTINGS_TAB_IDS: readonly SettingsTabId[] = ["display","chart","views","intelligence","execution","watchlist","connections","accessibility","account"];
/** Any surface can open Settings at a tab without a page load: dispatch this event (detail: { tab }). */
export const OPEN_SETTINGS_EVENT = "wm:open-settings";
export function openSettings(tab?: SettingsTabId): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT, { detail: { tab } }));
}

/** Fetch the panels' chunk ahead of the first open (idempotent — the module cache dedupes). */
export function warmShellPanels(): void {
  if (typeof window === "undefined") return;
  const go = () => { void import("@/components/layout/shellPanels"); };
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(go, { timeout: 4000 }); else window.setTimeout(go, 2500);
}
