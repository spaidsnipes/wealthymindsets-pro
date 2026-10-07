/**
 * TOOL DOOR — "open the family door that holds THIS tool" (Drive Garden 18
 * snapshot 10-02 §B5, 2026-10-07). Active Tools' Configure is a deep link: it
 * picks up the door that owns the tool's settings and asks that door to bring
 * the tool's own row forward.
 *
 * ONE OWNER of the id → door map; the doors (ProfilesMenu grids) listen. The
 * door is picked up through `requestEquipment` — the same event the rail
 * uses, so the frame closes the Tools sheet and the drawer opens exactly as
 * if the trader had pressed the door. Because the door's grid MOUNTS after
 * the drawer opens, the request is also held briefly for the first door that
 * mounts holding that tool (`takePendingToolDoor`).
 *
 * SSR-safe: everything no-ops without a `document`.
 */
import { PROFILE_FAMILY, type ProfileId } from "@/lib/marketData/viewModels/selectProfileMenu";
import { requestEquipment } from "./equipmentChannel";

export const TOOL_DOOR_EVENT = "wm:tool-door";
/** A door that mounts later than this after the press is not answering this press. */
export const TOOL_DOOR_HOLD_MS = 4000;

/** Rail equipment ids that hold tool settings on /charts. */
export type ToolDoorId = "order-flow" | "chart-tools";

/**
 * Which door holds this tool's settings, or null when no door does (the tool
 * lives only in the finder, e.g. Session Bands) — Configure then opens the
 * tool's ⓘ card instead of pretending.
 *
 *   ORDER_FLOW family + footprint / Big Trades → Tools › the W (order-flow)
 *   PROFILE and READING families              → Tools › Chart tools
 */
export function familyDoorFor(id: string): ToolDoorId | null {
  if (id.startsWith("FP_")) return "order-flow";
  const family = (PROFILE_FAMILY as Readonly<Record<string, string | undefined>>)[id];
  if (family === "ORDER_FLOW") return "order-flow";
  if (family === "PROFILE" || family === "READING") return "chart-tools";
  return null;
}

let pending: { readonly id: string; readonly at: number } | null = null;

/** Open the tool's family door and ask it to bring the tool forward. False when no door holds it. */
export function openToolDoor(id: string, now: number = Date.now()): boolean {
  const door = familyDoorFor(id);
  if (!door || typeof document === "undefined") return false;
  pending = { id, at: now };
  requestEquipment(door, "pick-up");
  document.dispatchEvent(new CustomEvent<{ id: string }>(TOOL_DOOR_EVENT, { detail: { id } }));
  return true;
}

/** A door that just mounted: is a fresh request waiting for one of its rows? Consumed on take. */
export function takePendingToolDoor(holds: (id: string) => boolean, now: number = Date.now()): string | null {
  if (!pending || now - pending.at > TOOL_DOOR_HOLD_MS || !holds(pending.id)) return null;
  const id = pending.id;
  pending = null;
  return id;
}

/** A mounted door listens. Returns the unsubscribe. */
export function subscribeToolDoor(handler: (id: string) => void): () => void {
  if (typeof document === "undefined") return () => {};
  const listener = (e: Event) => {
    const id = (e as CustomEvent<{ id?: unknown }>).detail?.id;
    if (typeof id === "string") handler(id);
  };
  document.addEventListener(TOOL_DOOR_EVENT, listener);
  return () => document.removeEventListener(TOOL_DOOR_EVENT, listener);
}

/** For a door's own row lookup: is this a catalogue reading id? */
export function isProfileId(id: string): id is ProfileId {
  return id in PROFILE_FAMILY;
}
