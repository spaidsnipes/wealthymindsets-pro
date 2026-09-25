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

/**
 * A HAND CAN PUT THINGS DOWN.
 *
 * MEASURED 2026-09-19 on live /charts. The rail had just been taught to report
 * `aria-pressed` truthfully for direct instruments, and that immediately made a
 * second defect visible: pressing Replay gave `pressed="true"`, and pressing it
 * AGAIN left it `"true"` with the panel still up. Three presses, one outcome.
 *
 * That is not a cosmetic wrinkle. `aria-pressed` is a CONTRACT, not a lamp: a
 * button that reports itself pressed promises that pressing it again un-presses
 * it. That is the entire meaning of the role. So the honest badge we shipped an
 * hour ago had made the button into a liar — the more accurately the rail
 * described the state, the more plainly it promised a toggle it did not have.
 *
 * The channel had exactly one verb, "pick up", so the rail could not have
 * offered anything else. It now has two. `pick-up` is the default so every
 * existing call site keeps its exact present meaning; the journey and the room
 * each decide what putting a thing down means for the equipment they own.
 */
export type EquipmentIntent = "pick-up" | "put-down";

export interface EquipmentRequest {
  readonly equipmentId: string;
  readonly intent: EquipmentIntent;
}

/** Rail side: "the trader picked this up" — or, with `put-down`, set it back. */
export function requestEquipment(
  equipmentId: string,
  intent: EquipmentIntent = "pick-up",
): void {
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent<EquipmentRequest>(EQUIPMENT_EVENT, { detail: { equipmentId, intent } }),
  );
}

/** Room side. Returns the unsubscribe — a listener per remount is a leak. */
export function subscribeEquipment(handler: (req: EquipmentRequest) => void): () => void {
  if (typeof document === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<EquipmentRequest>).detail;
    if (!detail || typeof detail.equipmentId !== "string") return;
    // NORMALISE AT THE DOOR. This is a DOM CustomEvent, so anything on the page
    // can dispatch it and an older bundle mid-deploy can dispatch one without
    // an intent at all. Every subscriber would otherwise have to re-derive the
    // default, and a subscriber that forgot would read `undefined` as "not
    // pick-up" and silently treat a pick-up as a put-down.
    handler({
      equipmentId: detail.equipmentId,
      intent: detail.intent === "put-down" ? "put-down" : "pick-up",
    });
  };
  document.addEventListener(EQUIPMENT_EVENT, listener);
  return () => document.removeEventListener(EQUIPMENT_EVENT, listener);
}

export const EQUIPMENT_STAGE_EVENT = "wm:equipment-stage";

/**
 * THE CHANNEL'S MEMORY OF THE ROOM'S LAST WORDS.
 *
 * MEASURED 2026-09-22 on live /charts with a Playwright probe: press Replay
 * (announce "drawer" arrives), the frame closes the Workspace panel on that
 * very announce, the rail UNMOUNTS — and its `openIds` state dies with it.
 * Reopen the door and the fresh rail shows Replay `aria-pressed="false"`
 * while the replay disclosure is still up. The 2026-09-19 liar, resurrected
 * through remount: the announce protocol was honest, but it only spoke once,
 * and the listener that needed it was not in the room when it was said.
 *
 * So the channel keeps a record of what the rooms have announced and not yet
 * retracted. THIS IS NOT THE STORE THE FILE HEADER ARGUES AGAINST: no room
 * state moves into the frame, nothing here is computed or inferred, and the
 * room remains the ONLY writer — this set is written exclusively by
 * `announceEquipmentStage`, with exactly the reducer the rail already applies
 * (`null` clears everything; a non-closed stage holds; `closed` releases).
 * A mounting rail reads it as its FIRST reading and then subscribes as
 * before. A room that unmounts without retracting is self-correcting: its
 * announce effects re-publish the honest booleans on remount, and no other
 * room's rail ever looks up ids that are not its own.
 */
const held = new Set<string>();

/** Rail side, on MOUNT: everything the rooms have announced and not retracted. */
export function heldEquipmentIds(): ReadonlySet<string> {
  return held;
}

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
  // The memory updates BEFORE the dispatch so a subscriber that reads
  // `heldEquipmentIds()` inside its handler never sees the past.
  if (equipmentId === null) held.clear();
  else if (stage !== "closed") held.add(equipmentId);
  else held.delete(equipmentId);
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

export const EQUIPMENT_ARRANGEMENT_EVENT = "wm:equipment-arrangement";

/**
 * WHICH DESK THE ROOM IS CURRENTLY ARRANGED AS.
 *
 * MEASURED 2026-09-22 on live /charts, immediately after WORKSPACE grew its
 * three named desks: press REGIME, watch both volume profiles arm on the
 * chart, reopen the Workspace hand — and all three desk tiles look exactly as
 * they did before the press. The rail offers three arrangements and reports
 * none of them. That is the same class of defect the stage announce was built
 * for ("what am I holding"), one question over: WHERE AM I SITTING.
 *
 * WHY THIS IS NOT `announceEquipmentStage`
 * ----------------------------------------
 * A desk is MOMENTARY: `roomEquipment` marks the three `momentary: true`, the
 * rail OMITS `aria-pressed` for them, and a Sentinel FORBIDS the room from
 * announcing a stage for a momentary entry. Those rules are correct and are
 * not being relaxed here. `aria-pressed` promises a toggle — press again and
 * it reverses — and pressing ORDER FLOW twice does not un-arrange the desk.
 *
 * "In force" is a different fact with a different grammar: exactly one of the
 * three can hold it, it is never reversed by a second press, and it can stop
 * being true without anybody pressing anything (the trader flips one switch by
 * hand in the Tools drawer and the desk becomes CUSTOM). So it gets its own
 * channel, its own attribute, and `aria-current` rather than `aria-pressed`.
 *
 * THE ROOM IS STILL THE ONLY WRITER, AND IT DOES NOT REMEMBER ITS OWN PRESSES.
 * What the room publishes here is `selectChartArrangement(...).activeId`
 * compiled from the LIVE switch positions — the same compiler the Tools door
 * reads. A rail-side memory of "the last desk I sent" would light REGIME
 * forever after one press, including after the trader hand-edited a switch and
 * left the desk entirely. `null` means CUSTOM, and CUSTOM is a real answer.
 */
let arrangedId: string | null = null;

/** Rail side, on MOUNT — see `heldEquipmentIds` for why a first reading exists. */
export function arrangedEquipmentId(): string | null {
  return arrangedId;
}

/** Room side: "this is the desk my switches currently add up to." */
export function announceEquipmentArrangement(equipmentId: string | null): void {
  arrangedId = equipmentId;
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent<string | null>(EQUIPMENT_ARRANGEMENT_EVENT, { detail: equipmentId }),
  );
}

/** Rail side. Returns the unsubscribe — a listener per remount is a leak. */
export function subscribeEquipmentArrangement(
  handler: (equipmentId: string | null) => void,
): () => void {
  if (typeof document === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<string | null>).detail;
    handler(typeof detail === "string" ? detail : null);
  };
  document.addEventListener(EQUIPMENT_ARRANGEMENT_EVENT, listener);
  return () => document.removeEventListener(EQUIPMENT_ARRANGEMENT_EVENT, listener);
}

/**
 * WHAT THE DESK CAN ACTUALLY DRAW — the second door's missing half.
 *
 * ── WHAT WAS MEASURED ─────────────────────────────────────────────────────
 *
 * MEASURED on the serving Worker, /charts?symbol=TSLA&tf=5m, 1440x900,
 * 2026-09-22. The Workspace hand offers the three desks with these labels and
 * nothing else attached to them:
 *
 *     Order Flow   The chart is arranged this way now
 *     Regime       Both volume profiles — where price has been accepted
 *     Review       Session profile and effort-against-result, after the fact
 *
 * Flat promises. `selectChartArrangement` exists precisely to stop that, and
 * says so in its own words: "an arrangement here is never presented as a
 * promise. Every one of them reports, BEFORE it is pressed, how many of its
 * own readings can draw on the tape in front of the trader right now."
 *
 * That guarantee reaches the TOOLS door, which renders `ChartArrangementBar`
 * and its per-desk `note`. It does not reach the WORKSPACE door, which was
 * added later (see `roomEquipment`'s "What was missing was a DOOR") and wired
 * the presses without the disclosure. ORDER FLOW arms five readings of which
 * four need an aggressor side; on the ordinary mute tape it paints one and the
 * hand still reads as though it paints five. A trader who pressed the button
 * named after the thing they wanted to see concludes the MARKET is quiet
 * rather than that the FEED is mute — the exact confusion the compiler's
 * docblock names, arriving through the door the compiler never got to speak
 * through.
 *
 * ── WHY A CHANNEL AND NOT A STATIC HINT ───────────────────────────────────
 *
 * The shortfall is not a property of the desk. It is a property of the desk
 * MEETING THIS TAPE, and it changes without anybody pressing anything: a feed
 * that starts stating an aggressor side mid-session moves ORDER FLOW from
 * PARTIAL to FULL. A sentence typed into `roomEquipment` could only ever be
 * the worst case or the best case, and both are wrong most of the time.
 *
 * So it follows `announceEquipmentArrangement` exactly: THE ROOM IS THE ONLY
 * WRITER, it publishes what the compiler measured rather than what it
 * remembers pressing, and the rail is told rather than inferring.
 *
 * ── EMPTY IS "NOT MEASURED", NOT "NOTHING IS WRONG" ───────────────────────
 *
 * The same distinction `selectFoldEscalation` draws between `undefined` and
 * `null`, and it matters for the same reason. A rail standing in a room that
 * owns no chart has NOBODY to measure these desks, and must not therefore
 * paint them as fully deliverable. So a FULL desk is published EXPLICITLY, as
 * an entry saying FULL — and an empty list means no room has answered. The
 * rail draws a confession only for a desk that is present and not FULL, which
 * keeps the calm case byte-identical while never letting silence read as
 * sufficiency.
 */
export const EQUIPMENT_SHORTFALL_EVENT = "wm:equipment-shortfall";

/** One desk, as the chart's live switch positions and live tape make it. */
export interface EquipmentShortfall {
  /** The rail's vocabulary — e.g. "arrange-order-flow". */
  readonly equipmentId: string;
  /** FULL desks are published too. See the note on empty-vs-FULL above. */
  readonly readiness: "FULL" | "PARTIAL" | "NONE";
  /** How many of the desk's readings can draw on this tape right now. */
  readonly deliverableCount: number;
  /** How many the desk arms in total. */
  readonly armedCount: number;
  /** The compiler's one-line form, printed on the tile. Optional for old publishers. */
  readonly shortNote?: string;
  /**
   * The compiler's own sentence, verbatim. NEVER composed here — a second
   * phrasing of the same shortfall is how the two doors start disagreeing
   * about one desk.
   */
  readonly note: string;
}

let equipmentShortfalls: readonly EquipmentShortfall[] = [];

/** Rail side, on MOUNT — see `heldEquipmentIds` for why a first reading exists. */
export function announcedEquipmentShortfalls(): readonly EquipmentShortfall[] {
  return equipmentShortfalls;
}

/** Room side: "this is what each of my desks can draw on the tape I have." */
export function announceEquipmentShortfalls(
  shortfalls: readonly EquipmentShortfall[],
): void {
  equipmentShortfalls = shortfalls;
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent<readonly EquipmentShortfall[]>(EQUIPMENT_SHORTFALL_EVENT, {
      detail: shortfalls,
    }),
  );
}

/** Rail side. Returns the unsubscribe — a listener per remount is a leak. */
export function subscribeEquipmentShortfalls(
  handler: (shortfalls: readonly EquipmentShortfall[]) => void,
): () => void {
  if (typeof document === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<readonly EquipmentShortfall[]>).detail;
    handler(Array.isArray(detail) ? detail : []);
  };
  document.addEventListener(EQUIPMENT_SHORTFALL_EVENT, listener);
  return () => document.removeEventListener(EQUIPMENT_SHORTFALL_EVENT, listener);
}

/**
 * SAVED LAYOUTS — the trader's own desks, over the SAME two-way wire.
 *
 * The Workspace door lists the trader's saved layouts beside Clean / Order
 * Flow / Regime / Review (F24 "Layout"; Garden 11: "Approved saved layouts").
 * It needs two things only the ROOM has, and gets each the way the four desks
 * already get theirs:
 *
 *   CAPTURE — "what is the chart arranged as right now", so Save has
 *   something to keep and a saved tile can light when it is in force. The
 *   room publishes the compiler's `captureArrangement(menu)` — the same
 *   reading `activeId` is compiled from — and the door is TOLD it, exactly as
 *   `announceEquipmentArrangement` tells the rail which desk is in force. The
 *   door never infers a switch position.
 *
 *   APPLY — "arrange the chart as this layout". The door sends the layout's
 *   switch set; the room runs it through `savedArrangementSwitches(…, menu)`
 *   and the SAME `arrangementDeskRef` → `applyRespectingLocks` door the four
 *   desks walk, so a saved layout can never set a switch a desk could not, and
 *   a locked lane holds against it as it holds against a desk.
 *
 * `null` capture is NOT MEASURED (no chart room is answering), never "all
 * off": the door disables Save rather than saving an empty desk.
 */
export const ARRANGEMENT_CAPTURE_EVENT = "wm:arrangement-capture";

export type ArrangementCapture = Readonly<Partial<Record<string, boolean>>>;

let arrangementCapture: ArrangementCapture | null = null;

/** Door side, on MOUNT — see `heldEquipmentIds` for why a first reading exists. */
export function announcedArrangementCapture(): ArrangementCapture | null {
  return arrangementCapture;
}

/** Room side: "these are my switch positions now" — or `null` when leaving. */
export function announceArrangementCapture(capture: ArrangementCapture | null): void {
  arrangementCapture = capture;
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent<ArrangementCapture | null>(ARRANGEMENT_CAPTURE_EVENT, { detail: capture }),
  );
}

/** Door side. Returns the unsubscribe — a listener per remount is a leak. */
export function subscribeArrangementCapture(
  handler: (capture: ArrangementCapture | null) => void,
): () => void {
  if (typeof document === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<ArrangementCapture | null>).detail;
    handler(detail && typeof detail === "object" && !Array.isArray(detail) ? detail : null);
  };
  document.addEventListener(ARRANGEMENT_CAPTURE_EVENT, listener);
  return () => document.removeEventListener(ARRANGEMENT_CAPTURE_EVENT, listener);
}

export const SAVED_LAYOUT_REQUEST_EVENT = "wm:saved-layout";

export interface SavedLayoutRequest {
  /** The layout's id in the door's list — for the room's own bookkeeping only. */
  readonly layoutId: string;
  /** The switch set to apply. The room re-validates it through the compiler. */
  readonly switches: Readonly<Partial<Record<string, boolean>>>;
}

/** Door side: "arrange the chart as this saved layout." */
export function requestSavedLayout(request: SavedLayoutRequest): void {
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent<SavedLayoutRequest>(SAVED_LAYOUT_REQUEST_EVENT, { detail: request }),
  );
}

/**
 * Room side. NORMALISED AT THE DOOR, like `subscribeEquipment`: a DOM event
 * anything can dispatch, so only boolean switch values survive to the handler.
 * The compiler then keeps only the TOGGLE rows the chart actually has.
 */
export function subscribeSavedLayoutRequests(
  handler: (request: SavedLayoutRequest) => void,
): () => void {
  if (typeof document === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<SavedLayoutRequest>).detail;
    if (!detail || typeof detail.layoutId !== "string") return;
    const raw = detail.switches;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const switches: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(raw)) if (typeof v === "boolean") switches[k] = v;
    handler({ layoutId: detail.layoutId, switches });
  };
  document.addEventListener(SAVED_LAYOUT_REQUEST_EVENT, listener);
  return () => document.removeEventListener(SAVED_LAYOUT_REQUEST_EVENT, listener);
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
