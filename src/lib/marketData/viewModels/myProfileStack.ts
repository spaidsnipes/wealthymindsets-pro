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
 *
 * ── NOW THE LEGACY FORMAT, 2026-09-25 ──────────────────────────────────────
 * The one "My stack" slot in Tools became the first entry of WORKSPACE ›
 * Saved layouts (F24 "Layout"; see `src/lib/workspace/savedLayouts.ts`). The
 * Save/Restore bar is gone; nothing writes `wm_ofMyStack` any more. This file
 * stays the ONE reader of that key (`parseMyStack`, used by the migration)
 * and the one definition of what the old button wrote (`captureMyStack`, the
 * migration tests' fixture), so the old slot remains readable forever and is
 * never deleted.
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
