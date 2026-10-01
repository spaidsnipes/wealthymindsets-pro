/**
 * The one reader/writer of the trader's profile strength (Garden 18 §XXXIV).
 * The ink owner stays pure; the chart reloads its ink on "wm-vp-colors".
 */
import { PROFILE_STRENGTH_STORAGE_KEY, parseProfileStrength, type ProfileStrength } from "./profileFamilyInk";
import { currentProofScene, proofSceneHoldsWrites } from "@/lib/chart/proofScene";

/** A proof scene holds its strength for the page only (same rule as visual roles). */
let sceneStrength: ProfileStrength | null = null;

export function readStoredProfileStrength(): ProfileStrength {
  if (proofSceneHoldsWrites() && (sceneStrength || currentProofScene().clean)) return sceneStrength ?? "CANON";
  try { return parseProfileStrength(localStorage.getItem(PROFILE_STRENGTH_STORAGE_KEY)); } catch { return "CANON"; }
}

export function writeStoredProfileStrength(v: ProfileStrength): void {
  if (proofSceneHoldsWrites()) sceneStrength = v;
  else try { localStorage.setItem(PROFILE_STRENGTH_STORAGE_KEY, v); } catch { /* this visit only */ }
  try { window.dispatchEvent(new Event("wm-vp-colors")); } catch { /* no window */ }
}
