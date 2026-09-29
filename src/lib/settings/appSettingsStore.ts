/**
 * THE ONE WRITER OF `wm_settings` (G12, 2026-09-29).
 *
 * Two surfaces wrote the same key by hand — the Settings panel's Save
 * (shellPanels) and the chart room's palette handoff (ChartsDashboard) — each
 * re-implementing "merge over what is stored, then announce". Both wrote
 * `chartTheme`; whichever saved last won, with nothing saying which. One
 * module now owns the read, the merge, the write and the one announcement
 * (`wm-settings-changed`). A write only touches the keys it names.
 */
export const APP_SETTINGS_KEY = "wm_settings";
export const APP_SETTINGS_EVENT = "wm-settings-changed";

export function readAppSettings(): Record<string, unknown> {
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(APP_SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch { return {}; }
}

/** Merge `patch` over what is stored, write once, announce once. Returns the stored result. */
export function writeAppSettings(patch: Record<string, unknown>): Record<string, unknown> {
  const next = { ...readAppSettings(), ...patch };
  try { localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next)); } catch { /* storage refused: the in-memory state still applies */ }
  try { window.dispatchEvent(new CustomEvent(APP_SETTINGS_EVENT)); } catch { /* no window (tests / server) */ }
  return next;
}
