/**
 * The WOW dock on WM Pro (Founder order 2026-11-01): ONE dock, owned and served by WOW OS
 * (https://thewow.online/wow-dock.js), carried by every ATH app. A member stays in WM Pro —
 * chart and trades in view — and opens their WOW Passport, the Lounge (read + post), WOW Radio,
 * WOW Music and WOW TV in a side panel (desktop) or bottom sheet (phone). Music keeps playing
 * when the dock is closed. "Enter WOW OS" opens thewow.online in its own tab.
 *
 * WM Pro copies none of it: the dock frames WOW OS's own rooms (docked mode). WM Pro's CSP is
 * frame-ancestors only, so nothing else changes here; WOW OS allows wealthymindsetspro.com to
 * frame the docked rooms (frame-ancestors on thewow.online, ?dock=1 only).
 */
export const WOW_DOCK_ORIGIN = "https://thewow.online";
export const WOW_DOCK_SRC = `${WOW_DOCK_ORIGIN}/wow-dock.js`;

/** Signed-in members only, once the session check has finished (guests already have WOW's own doors). */
export function shouldLoadWowDock(auth: { signedIn: boolean; checking: boolean }): boolean {
  return !auth.checking && auth.signedIn;
}

interface ScriptLike { src: string; defer: boolean; setAttribute(name: string, value: string): void }
export interface WowDockEnv {
  window: { WOWDock?: unknown };
  document: { createElement(tag: "script"): ScriptLike; querySelector(sel: string): unknown; head: { appendChild(node: ScriptLike): unknown } };
}

/**
 * Add the WOW dock script ONCE, with NO floating button (data-launcher="none", 2026-11-06).
 * Measured on serving /charts: the floating WOW pill sat on the phone timeframe row and on the
 * desktop volume pane. WM Pro opens the dock from its own menus instead — the Community rail
 * (desktop) and More → Community (phone) — through openWowDock below. Left side, lifted above
 * WM Pro's bottom bars, is where the dock's now-playing chip and phone sheet sit.
 */
export function loadWowDock(env: WowDockEnv): boolean {
  if (env.window.WOWDock || env.document.querySelector("script[data-wow-dock-loader]")) return false;
  const s = env.document.createElement("script");
  s.src = WOW_DOCK_SRC;
  s.defer = true;
  s.setAttribute("data-app", "WM Pro");
  s.setAttribute("data-launcher", "none");
  s.setAttribute("data-side", "left");
  s.setAttribute("data-bottom", "64");
  s.setAttribute("data-wow-dock-loader", "");
  env.document.head.appendChild(s);
  return true;
}

/**
 * WM Pro's own WOW door (Community rail, phone More). Opens the dock on the given room when the
 * dock is loaded (signed-in members); otherwise answers false so the caller falls back to opening
 * WOW OS in its own tab.
 */
export function openWowDock(room: "lounge" | "passport" | "radio" | "music" | "tv" = "lounge", win: { WOWDock?: unknown } | undefined = typeof window === "undefined" ? undefined : (window as never)): boolean {
  const dock = win?.WOWDock as { open?: (room: string) => void } | undefined;
  if (!dock || typeof dock.open !== "function") return false;
  dock.open(room);
  return true;
}
