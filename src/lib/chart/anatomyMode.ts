/**
 * DUAL ANATOMY — the representation mode (Garden 16 master order §17: "OFF ·
 * MARKET · FOUNDER · FUSION"). An Appearance preference, never a truth: it
 * chooses how the SAME canonical absorption / exhaustion events are shown.
 * One key, one event name — the chart reads it, the Smart Money door writes it.
 */
export const ANATOMY_MODE_KEY = "wm_anatomyMode";
export const ANATOMY_MODE_EVENT = "wm-anatomy-mode";
export type AnatomyMode = "OFF" | "MARKET" | "FOUNDER" | "FUSION";
export const ANATOMY_MODES: readonly AnatomyMode[] = ["OFF", "MARKET", "FOUNDER", "FUSION"];

export function readAnatomyMode(): AnatomyMode {
  try {
    const v = typeof localStorage === "undefined" ? null : localStorage.getItem(ANATOMY_MODE_KEY);
    return v === "OFF" || v === "FOUNDER" || v === "FUSION" ? v : "MARKET";
  } catch { return "MARKET"; }
}

export function writeAnatomyMode(mode: AnatomyMode): void {
  try { localStorage.setItem(ANATOMY_MODE_KEY, mode); } catch { /* storage blocked: this session only */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ANATOMY_MODE_EVENT));
}
