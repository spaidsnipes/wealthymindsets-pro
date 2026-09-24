/**
 * PROFILE STACK PRESETS — H-601 / H-601A (Founder hard-hat correction,
 * 2026-09-24): "Presets: Clean / Day Trader / Auction / Order Flow / Memory /
 * Research."
 *
 * A preset is a named position of the PROFILE family's own switches — nothing
 * else. It never touches a reading lens, an order-flow tool or a Workspace
 * desk (those arrange the whole camera; a preset arranges only the profile
 * stack). Only TOGGLE rows take part: a dragged range (Delta + VP, Anchored
 * Range) is a drawing, and a preset must never arm a cursor or clear a range
 * the trader drew. Applying goes through the same switch door as the desks
 * and Save My Stack.
 *
 * Which preset is lit is COMPILED from the live switches, never remembered:
 * flip one profile by hand and no preset is lit any more.
 *
 * PURE.
 */

import type { ProfileId } from "./selectProfileMenu";
import { stackableProfileIds } from "./myProfileStack";

export type PresetId = "CLEAN" | "DAY_TRADER" | "AUCTION" | "ORDER_FLOW" | "MEMORY" | "RESEARCH";

export interface ProfilePreset {
  readonly id: PresetId;
  readonly label: string;
  /** Why these species, in one line. */
  readonly note: string;
  readonly on: readonly ProfileId[];
}

export const PROFILE_PRESETS: readonly ProfilePreset[] = [
  { id: "CLEAN", label: "Clean", note: "price alone — every profile off", on: [] },
  {
    id: "DAY_TRADER", label: "Day Trader",
    note: "today's developing value, the session, and what is on screen",
    on: ["LIVING_PROFILE", "SESSION", "VISIBLE_RANGE_PROFILE"],
  },
  {
    id: "AUCTION", label: "Auction",
    note: "auction letters, the session, value migrating, prior value carried forward",
    on: ["TPO_PROFILE", "SESSION", "VALUE_MIGRATION", "PROFILE_MEMORY"],
  },
  {
    id: "ORDER_FLOW", label: "Order Flow",
    note: "developing value beside where each bar's own volume concentrated",
    on: ["LIVING_PROFILE", "VALUE_CANDLE", "VISIBLE_RANGE_PROFILE"],
  },
  {
    id: "MEMORY", label: "Memory",
    note: "prior sessions: carried-forward value, the composite, the fingerprint",
    on: ["PROFILE_MEMORY", "COMPOSITE_PROFILE", "PROFILE_DNA"],
  },
  {
    id: "RESEARCH", label: "Research",
    note: "structure-anchored, fused, composite and fingerprint — the slow reads",
    on: ["STRUCTURE_PROFILE", "PROFILE_FUSION", "COMPOSITE_PROFILE", "PROFILE_DNA"],
  },
];

/** The switch set a preset sends: every stackable profile, on or off. */
export function presetSwitches(id: PresetId): Partial<Record<ProfileId, boolean>> {
  const p = PROFILE_PRESETS.find(x => x.id === id);
  const on = new Set<ProfileId>(p?.on ?? []);
  const out: Partial<Record<ProfileId, boolean>> = {};
  for (const sid of stackableProfileIds()) out[sid] = on.has(sid);
  return out;
}

/** The preset the live switches are sitting at, or null. */
export function matchPreset(active: Readonly<Partial<Record<ProfileId, boolean>>>): PresetId | null {
  const ids = stackableProfileIds();
  for (const p of PROFILE_PRESETS) {
    const on = new Set<ProfileId>(p.on);
    if (ids.every(id => (active[id] === true) === on.has(id))) return p.id;
  }
  return null;
}
