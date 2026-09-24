/**
 * PROFILE STACK PREFERENCES — P-110 family lock: the profile stack supports
 * "show/hide, reorder, … opacity … Auto Arrange and Save My Stack."
 *
 * Show/hide is the Profiles door itself; Auto Arrange is `planProfileStack`;
 * Save My Stack is `myProfileStack`. This owns the last two the trader asked
 * for that geometry cannot decide on its own: the ORDER of the stacked lanes
 * (innermost first) and each lane's OPACITY. The plan still owns geometry —
 * a preference can re-order lanes and dim a histogram, never overlap two.
 *
 * PURE.
 */

import type { StackSpecies } from "./profileStackPlan";

export const STACK_PREFS_STORAGE_KEY = "wm_ofStackPrefs";
export const STACK_SPECIES: readonly StackSpecies[] = ["LIVING", "COMPOSITE", "VISIBLE_RANGE"];
export const STACK_LABEL: Readonly<Record<StackSpecies, string>> = {
  LIVING: "Living Profile",
  COMPOSITE: "Composite Profile",
  VISIBLE_RANGE: "Visible Range Profile",
};
/** The three opacity steps a lane can take. Never 0: dim, never delete (F27). */
export const OPACITY_STEPS = [1, 0.6, 0.3] as const;

export interface ProfileStackPrefs {
  /** Innermost (rightmost) first. */
  readonly order: readonly StackSpecies[];
  readonly opacity: Readonly<Partial<Record<StackSpecies, number>>>;
}

export const DEFAULT_STACK_PREFS: ProfileStackPrefs = { order: STACK_SPECIES, opacity: {} };

/** The species that WILL draw, in the trader's order (unknown ones keep catalogue order). */
export function orderStack(present: readonly StackSpecies[], prefs: ProfileStackPrefs): StackSpecies[] {
  const rank = (s: StackSpecies) => {
    const i = prefs.order.indexOf(s);
    return i < 0 ? STACK_SPECIES.indexOf(s) + 100 : i;
  };
  return [...present].sort((a, b) => rank(a) - rank(b));
}

export function stackOpacity(sp: StackSpecies, prefs: ProfileStackPrefs): number {
  const v = prefs.opacity[sp];
  return typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0.3, v)) : 1;
}

export function moveSpecies(prefs: ProfileStackPrefs, sp: StackSpecies, dir: -1 | 1): ProfileStackPrefs {
  const order = [...orderStack(STACK_SPECIES, prefs)];
  const i = order.indexOf(sp);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return prefs;
  [order[i], order[j]] = [order[j], order[i]];
  return { ...prefs, order };
}

export function cycleOpacity(prefs: ProfileStackPrefs, sp: StackSpecies): ProfileStackPrefs {
  const cur = stackOpacity(sp, prefs);
  const k = OPACITY_STEPS.findIndex(s => Math.abs(s - cur) < 0.01);
  const next = OPACITY_STEPS[(k + 1) % OPACITY_STEPS.length];
  return { ...prefs, opacity: { ...prefs.opacity, [sp]: next } };
}

export function parseStackPrefs(raw: string | null): ProfileStackPrefs {
  if (!raw) return DEFAULT_STACK_PREFS;
  try {
    const o = JSON.parse(raw) as { order?: unknown; opacity?: unknown };
    const order = Array.isArray(o.order)
      ? (o.order.filter(s => (STACK_SPECIES as readonly string[]).includes(s as string)) as StackSpecies[])
      : [];
    const opacity: Partial<Record<StackSpecies, number>> = {};
    if (o.opacity && typeof o.opacity === "object") {
      for (const sp of STACK_SPECIES) {
        const v = (o.opacity as Record<string, unknown>)[sp];
        if (typeof v === "number" && Number.isFinite(v)) opacity[sp] = Math.min(1, Math.max(0.3, v));
      }
    }
    const full = [...new Set([...order, ...STACK_SPECIES])];
    return { order: full, opacity };
  } catch {
    return DEFAULT_STACK_PREFS;
  }
}
