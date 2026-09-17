/**
 * equipmentChannel — how the rail's WORKSPACE reaches the Room it belongs to.
 *
 * WHY NOT A LINK
 * --------------
 * The obvious wiring is `<a href="/command-deck?equip=market-reality">`, and it
 * is the one thing this grammar cannot afford. A plain anchor tears the
 * document down and builds it again: the chart re-mounts, the feed reconnects,
 * the scroll position is lost, and the screen goes through a blank frame. That
 * is *exactly* the sensation the Founder's acceptance question is written to
 * catch — "did another app load?" — and it would be introduced by the very
 * control meant to prove it did not.
 *
 * So picking up equipment is not navigation. It is an event on the page you
 * are already standing in. The rail announces; the Room answers. Nothing
 * unmounts, nothing refetches, and the market never blinks.
 *
 * WHY NOT A REACT CONTEXT
 * -----------------------
 * The rail lives in the OS frame and the Room is `children` beneath it. A
 * context would put journey state in the frame, and the frame is shared by
 * every room in the product — one room's open drawer would become a field the
 * other twenty rooms carry around. The frame stays ignorant: it knows what
 * equipment this room HAS (`roomEquipment`) and that a request was made. What
 * that means is the Room's business.
 *
 * SSR-safe: every function no-ops without a `document`.
 */

import type { EquipmentStage } from "./equipmentJourney";

export const EQUIPMENT_EVENT = "wm:equipment";

export interface EquipmentRequest {
  readonly equipmentId: string;
}

/** Rail side: "the trader picked this up." */
export function requestEquipment(equipmentId: string): void {
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent<EquipmentRequest>(EQUIPMENT_EVENT, { detail: { equipmentId } }),
  );
}

/** Room side. Returns the unsubscribe — a listener per remount is a leak. */
export function subscribeEquipment(handler: (req: EquipmentRequest) => void): () => void {
  if (typeof document === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<EquipmentRequest>).detail;
    if (detail && typeof detail.equipmentId === "string") handler(detail);
  };
  document.addEventListener(EQUIPMENT_EVENT, listener);
  return () => document.removeEventListener(EQUIPMENT_EVENT, listener);
}

export const EQUIPMENT_STAGE_EVENT = "wm:equipment-stage";

export interface EquipmentStageAnnounce {
  readonly equipmentId: string | null;
  readonly stage: EquipmentStage;
}

/**
 * Room side: "this is what I am currently holding open."
 *
 * THE RAIL ANNOUNCES, THE ROOM ANSWERS — AND THEN THE ROOM ANSWERS BACK.
 *
 * Measured live on /command-deck: with the drawer open beside the chart, the
 * WORKSPACE entry that opened it looked exactly as it had when nothing was
 * open. The trader could see the equipment and see the rail and get no
 * confirmation from one about the other — which is a quiet way of failing the
 * acceptance question, because "did another app load?" is partly answered by
 * whether the room still shows you what you picked up in it.
 *
 * WHY THIS IS NOT THE CONTEXT THIS FILE ARGUES AGAINST
 * ---------------------------------------------------
 * The objection above is to journey state living in the OS FRAME, where one
 * room's open drawer becomes a field the other twenty rooms carry. This is an
 * event, not a store: the rail keeps a local reading of what it last heard,
 * scoped to itself, and drops it the moment the room changes. The frame still
 * knows nothing it has not just been told by the room standing in it.
 *
 * `null` + `closed` is the honest empty announce — "I am holding nothing" —
 * and must be sent on CLOSE, or the rail would mark equipment as open forever.
 */
export function announceEquipmentStage(
  equipmentId: string | null,
  stage: EquipmentStage,
): void {
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent<EquipmentStageAnnounce>(EQUIPMENT_STAGE_EVENT, {
      detail: { equipmentId, stage },
    }),
  );
}

/** Rail side. Returns the unsubscribe — a listener per remount is a leak. */
export function subscribeEquipmentStage(
  handler: (announce: EquipmentStageAnnounce) => void,
): () => void {
  if (typeof document === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<EquipmentStageAnnounce>).detail;
    if (detail && typeof detail.stage === "string") handler(detail);
  };
  document.addEventListener(EQUIPMENT_STAGE_EVENT, listener);
  return () => document.removeEventListener(EQUIPMENT_STAGE_EVENT, listener);
}

/**
 * Reflect the journey into the address bar WITHOUT a navigation.
 *
 * `history.replaceState` so the browser Back button still means "the previous
 * ROOM", not "one stage shallower in a drawer" — a Back that walked the stages
 * would make the trader press it four times to leave a page they entered once.
 * The URL is still honest and still shareable; it simply is not a stack.
 */
export function reflectJourneyInUrl(equipmentId: string | null, stage: EquipmentStage): void {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  if (!equipmentId || stage === "closed") {
    url.searchParams.delete("equip");
    url.searchParams.delete("stage");
  } else {
    url.searchParams.set("equip", equipmentId);
    url.searchParams.set("stage", stage);
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(window.history.state, "", next);
  }
}

/**
 * Read a journey back out of a URL. Used on mount so a shared link opens where
 * it says it does. `full` is deliberately NOT restorable from a cold URL: the
 * full experience has a RETURN control whose whole promise is "the room you
 * left", and a tab that opened straight into it has no such room to return to.
 */
export function readJourneyFromUrl(search: string): {
  equipmentId: string | null;
  stage: Exclude<EquipmentStage, "full">;
} {
  const params = new URLSearchParams(search);
  const equipmentId = params.get("equip");
  if (!equipmentId) return { equipmentId: null, stage: "closed" };
  const raw = params.get("stage");
  const stage = raw === "drawer" ? "drawer" : "preview";
  return { equipmentId, stage };
}
