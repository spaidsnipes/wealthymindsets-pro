/**
 * The one reader/writer of the trader's profile strength (Garden 18 §XXXIV).
 * The ink owner stays pure; the chart reloads its ink on "wm-vp-colors".
 */
import { PROFILE_STRENGTH_STORAGE_KEY, parseProfileStrength, type ProfileStrength } from "./profileFamilyInk";

export function readStoredProfileStrength(): ProfileStrength {
  try { return parseProfileStrength(localStorage.getItem(PROFILE_STRENGTH_STORAGE_KEY)); } catch { return "CANON"; }
}

export function writeStoredProfileStrength(v: ProfileStrength): void {
  try { localStorage.setItem(PROFILE_STRENGTH_STORAGE_KEY, v); } catch { /* this visit only */ }
  try { window.dispatchEvent(new Event("wm-vp-colors")); } catch { /* no window */ }
}
