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
import type { ProfileId } from "./selectProfileMenu";

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
  /**
   * LOCK (H-601A stack controls). A locked lane keeps its switch position
   * when a preset, a Workspace desk or Restore sends a switch set; only the
   * trader's own hand in the Profiles grid moves it.
   */
  readonly locked?: readonly StackSpecies[];
  /**
   * WIDTH (stack controls). How much of its OWN lane a histogram may use —
   * never more than the lane, so a width can never make two lanes overlap.
   */
  readonly width?: Readonly<Partial<Record<StackSpecies, number>>>;
  /** H-601 #3 — the two lanes fused into a new profile object, or none. */
  readonly fusion?: readonly StackSpecies[] | null;
}

/** Lanes whose glass carries absolute row volume — the only honest fusion sources. */
export const FUSABLE_SPECIES: readonly StackSpecies[] = ["LIVING", "COMPOSITE", "VISIBLE_RANGE"];

export function setFusion(prefs: ProfileStackPrefs, pair: readonly StackSpecies[] | null): ProfileStackPrefs {
  const ok = pair && pair.length === 2 && pair[0] !== pair[1] && pair.every(s => FUSABLE_SPECIES.includes(s));
  return { ...prefs, fusion: ok ? [pair![0], pair![1]] : null };
}

/** The share of its lane a histogram may use. Never above 1: the plan owns the lane. */
export const WIDTH_STEPS = [1, 0.7, 0.45] as const;

export function stackWidth(sp: StackSpecies, prefs: ProfileStackPrefs): number {
  const v = prefs.width?.[sp];
  return typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0.45, v)) : 1;
}

export function cycleWidth(prefs: ProfileStackPrefs, sp: StackSpecies): ProfileStackPrefs {
  const cur = stackWidth(sp, prefs);
  const k = WIDTH_STEPS.findIndex(s => Math.abs(s - cur) < 0.01);
  return { ...prefs, width: { ...(prefs.width ?? {}), [sp]: WIDTH_STEPS[(k + 1) % WIDTH_STEPS.length] } };
}

export const DEFAULT_STACK_PREFS: ProfileStackPrefs = { order: STACK_SPECIES, opacity: {}, locked: [], width: {}, fusion: null };

/** The Profiles-door switch each stacked lane answers to. */
export const STACK_PROFILE_ID: Readonly<Record<StackSpecies, ProfileId>> = {
  LIVING: "LIVING_PROFILE",
  COMPOSITE: "COMPOSITE_PROFILE",
  VISIBLE_RANGE: "VISIBLE_RANGE_PROFILE",
};

export function isLocked(sp: StackSpecies, prefs: ProfileStackPrefs): boolean {
  return (prefs.locked ?? []).includes(sp);
}

export function toggleLock(prefs: ProfileStackPrefs, sp: StackSpecies): ProfileStackPrefs {
  const cur = prefs.locked ?? [];
  return { ...prefs, locked: cur.includes(sp) ? cur.filter(x => x !== sp) : [...cur, sp] };
}

/** A switch set with every locked lane's switch removed — the lock holds. */
export function withoutLocked<T extends Readonly<Partial<Record<ProfileId, boolean>>>>(switches: T, prefs: ProfileStackPrefs): Partial<Record<ProfileId, boolean>> {
  const out: Partial<Record<ProfileId, boolean>> = { ...switches };
  for (const sp of prefs.locked ?? []) delete out[STACK_PROFILE_ID[sp]];
  return out;
}

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
    const o = JSON.parse(raw) as { order?: unknown; opacity?: unknown; locked?: unknown; width?: unknown; fusion?: unknown };
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
    const locked = Array.isArray(o.locked)
      ? (o.locked.filter(s => (STACK_SPECIES as readonly string[]).includes(s as string)) as StackSpecies[])
      : [];
    const width: Partial<Record<StackSpecies, number>> = {};
    if (o.width && typeof o.width === "object") {
      for (const sp of STACK_SPECIES) {
        const v = (o.width as Record<string, unknown>)[sp];
        if (typeof v === "number" && Number.isFinite(v)) width[sp] = Math.min(1, Math.max(0.45, v));
      }
    }
    const fusion = Array.isArray(o.fusion) ? setFusion(DEFAULT_STACK_PREFS, o.fusion as StackSpecies[]).fusion ?? null : null;
    return { order: full, opacity, locked, width, fusion };
  } catch {
    return DEFAULT_STACK_PREFS;
  }
}
