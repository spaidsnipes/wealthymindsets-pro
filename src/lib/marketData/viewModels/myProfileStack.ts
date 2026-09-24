/**
 * SAVE MY STACK — P-110 family lock: "Multiple profiles may coexist through
 * the canonical profile stack with … Auto Arrange and Save My Stack."
 *
 * A trader's own stack is the set of PROFILE-family switches they had on when
 * they pressed Save. Only TOGGLE rows are kept: a dragged range (Delta + VP,
 * Anchored Range) is a drawing, not a switch, so restoring a stack never arms
 * a cursor or clears a range the trader drew.
 *
 * Restoring goes through the SAME switch door the Workspace desks use
 * (`applyArrangementSwitches`), so a saved stack can never set a switch the
 * desks could not. PURE.
 */

import { PROFILE_FAMILY, selectProfileMenu, type ProfileId } from "./selectProfileMenu";

export const MY_STACK_STORAGE_KEY = "wm_ofMyStack";

/** Every PROFILE-family TOGGLE row, in catalogue order. */
export function stackableProfileIds(): readonly ProfileId[] {
  return selectProfileMenu({ barsPresent: true, printsPresent: true, observedAggressorFlow: true, active: {}, families: ["PROFILE"] })
    .entries.filter(e => e.gesture === "TOGGLE").map(e => e.id);
}

/** The switch set to save: every stackable profile, on or off. */
export function captureMyStack(active: Readonly<Partial<Record<ProfileId, boolean>>>): Partial<Record<ProfileId, boolean>> {
  const out: Partial<Record<ProfileId, boolean>> = {};
  for (const id of stackableProfileIds()) out[id] = active[id] === true;
  return out;
}

/** Parse a stored stack; anything that is not a known stackable profile is dropped. */
export function parseMyStack(raw: string | null): Partial<Record<ProfileId, boolean>> | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const ids = new Set<string>(stackableProfileIds());
    const out: Partial<Record<ProfileId, boolean>> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (ids.has(k) && typeof v === "boolean" && PROFILE_FAMILY[k as ProfileId] === "PROFILE") out[k as ProfileId] = v;
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

export const countOn = (stack: Partial<Record<ProfileId, boolean>> | null) =>
  stack ? Object.values(stack).filter(Boolean).length : 0;
