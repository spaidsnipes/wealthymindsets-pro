/**
 * roomEquipment — what equipment the CURRENT Room has, and nothing else.
 *
 * WHY THIS IS NOT THE TOOL DIRECTORY
 * ----------------------------------
 * The rail already carries a list of other destinations. That list answers
 * "where else can I go". WORKSPACE answers a different question entirely:
 * "what can I pick up WITHOUT going anywhere". The two were collapsed into one
 * heading for months, and the cost was that every new invention could only be
 * shipped as a new place to travel to — which is why the product grew a route
 * per idea and the Founder could not find any of them from the chart.
 *
 * So this list is keyed by the room you are standing in, and every entry is an
 * EQUIPMENT ID, never an href. An entry here cannot become a navigation
 * because there is nowhere for it to navigate to.
 *
 * HONEST EMPTINESS
 * ----------------
 * A room with no equipment yet returns `[]`, and the rail renders NOTHING for
 * it — not an empty panel, not a "coming soon". A Workspace heading over an
 * empty list is a painted door, and this codebase has paid for painted doors
 * before (see the note on OS_ROOMS in WMOperatingSystem).
 */

/**
 * The chart room's path comes from its OWNER, not from a string typed here.
 * `founderLanding.ts` is the single writer of that route, and a repo-wide
 * Sentinel enforces it — a private copy of "/charts" in this file would keep
 * compiling and keep passing on the day the route moved, while quietly
 * unregistering the room's entire Workspace.
 */
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

export interface RoomEquipment {
  /** Stable id. Appears in the URL, so it is part of the product's contract. */
  readonly id: string;
  /** What the trader calls it. Never an implementation name. */
  readonly label: string;
  /** What they will see, in their vocabulary. */
  readonly hint: string;
}

/**
 * Keyed by room href. Deliberately a small, hand-held map rather than a scan:
 * equipment is a product decision per room, not a side effect of a file
 * existing somewhere.
 */
const EQUIPMENT_BY_ROOM: Readonly<Record<string, readonly RoomEquipment[]>> = {
  "/command-deck": [
    {
      id: "market-reality",
      label: "Market reality",
      hint: "What is resolved, what is missing, what blocks entry",
    },
    /**
     * The SECOND tenant of the grammar, and the reason the grammar was made
     * generic. This one is also a subtraction: the passport used to be pinned
     * open in the room's document band whether the trader wanted it or not,
     * which is the "permanently displaying every invention on MARKET" the
     * directive bans. It is now picked up, and it is now enterable.
     *
     * The hint is in the trader's vocabulary on purpose — it says what they
     * will SEE (where a reading came from, what would break it), never how the
     * engine arrived at it.
     *
     * THE LABEL SAYS WHOSE PASSPORT IT IS, AND THAT IS NOT DECORATION.
     * ---------------------------------------------------------------
     * This read "Object passport" for one commit, and on the live rail that
     * put the word *passport* twice within four lines:
     *
     *     ROOMS      … Heatmaps · **Passport** · Paper Trade …
     *     WORKSPACE  … Market reality · **Object passport**
     *
     * The ROOM one is `/nectar` — the trader's OWN passport, their memory. The
     * equipment one is a MARKET OBJECT's. Unrelated things, one noun, adjacent
     * on screen. That is precisely the collapse this file's header says cost
     * the product months: the "where can I go" list and the "what can I pick up
     * without going anywhere" list must stay distinguishable, and they are not
     * distinguishable if they share a word.
     *
     * So the label carries the canon name in full — the same words the stamp
     * band directly above the chart already prints (MARKET OBJECT PASSPORT).
     * Longer, and worth it: a trader can tell at a glance that this one is the
     * market's, not theirs.
     */
    {
      id: "market-object-passport",
      label: "Market object passport",
      hint: "Where each reading came from, and what would break it",
    },
    /**
     * THE THIRD TENANT — AND THE ONE WITH THE WORST STARTING POSITION.
     *
     * Every `DecisionChainPanel` mount on this room sat TWO `<details>` deep:
     * the Workspace toggle, then "Deep read · story · auction lens · decision
     * chain · steward · fidelity". There was no path to the chain that was not
     * a second press, and `buriedOnlyIsARegister.test.ts` measured it as one of
     * twenty-two components in that position. The burial rule in
     * `roomAdoptsEquipment.sentinel.test.ts` could not reach it, because that
     * rule is stated per equipment DESCRIPTOR and the chain was not equipment.
     *
     * That is the directive's failure clause verbatim — the intelligence exists
     * but requires hunting through implementation containers — applied to the
     * single most consequential reading the deck compiles. The nine-node chain
     * is what says whether a trade may be taken and what is unresolved if not.
     *
     * The numbered section in the drawer is NOT removed. It is deep reading in
     * its proper sequence, and deleting it to make room for a rail entry would
     * be a Sentinel deciding the product. What changes is that the chain now
     * also has a door: one press, no disclosure, from the room's own Workspace.
     *
     * THE HINT NAMES THE VERDICT, NOT THE MACHINERY. "Nine checks" would be an
     * implementation count; what the trader gets is an answer about whether the
     * setup is permitted and what is missing if it is not.
     */
    {
      id: "decision-chain",
      label: "Decision chain",
      hint: "What the setup still has to satisfy before it is permitted",
    },
  ],

  /**
   * THE GRAMMAR'S SECOND ROOM — and the first evidence it is a grammar at all.
   *
   * Two tenants proved the equipment LAYER was not the market canvas's private
   * chrome. Both of them still lived in one room, so what remained unproven was
   * the other half: that a ROOM can adopt the grammar without the grammar being
   * rebuilt for it. /charts adopting `market-reality` costs one entry here and
   * one descriptor in the dashboard, and nothing else — no route, no second
   * compiler, no per-room copy of the journey wiring (see useEquipmentJourney).
   *
   * WHY THIS ID AND NOT A NEW INVENTION. /charts already reads
   * `useMarketCanvasVM` for the summary pill in its wordmark row — the SAME
   * compilation the deck's first tenant renders, off the same canonical
   * identity. The pill can only ever say the verdict; pressing it is the first
   * time the room can show the trader WHY. That is equipment appearing where
   * the reading already was, which is the opposite of the "one route per
   * invention" this file's header was written against.
   *
   * The id is deliberately IDENTICAL to the deck's. Equipment is named by what
   * it IS, not by where it was picked up; forking `charts-market-reality` would
   * be two names for one compilation, and the rail would then be telling the
   * trader that the chart room's market reality is a different object from the
   * deck's. It is not.
   */
  [INSTRUMENT_VIEW_ROUTE]: [
    {
      id: "market-reality",
      label: "Market reality",
      hint: "What is resolved, what is missing, what blocks entry",
    },
    /**
     * THE CHART ROOM HAD NO DOOR TO THIS AT ALL ON DESKTOP.
     *
     * `chartPassportVM` was compiled on every render of this room and reachable
     * through exactly one path: a `<details>` nested inside the Decision Why
     * MODAL DRAWER, behind a trigger that only renders when
     * `narrowViewport || optionsOpen`. On a desktop Chart tab — the Founder's
     * own view — that trigger is not rendered, so the passport existed, was
     * correct, and could not be opened by anybody.
     *
     * That is worse than the burial the deck was cured of: there the evidence
     * was three drawers down, here there was no stair at all. And it is the
     * directive's failure clause word for word — the intelligence exists but
     * requires hunting through implementation containers.
     *
     * The entry is registered rather than un-collapsed because a passport
     * pinned permanently open on MARKET is the other banned thing. Equipment is
     * the correct mechanism: one press from the rail, nothing on the chart until
     * the trader asks.
     *
     * The label carries the canon name in full for the same reason the deck's
     * does — `/nectar` is a ROOM called "Passport" and is the trader's OWN. See
     * the deck entry above, and the Sentinel that pins it.
     */
    {
      id: "market-object-passport",
      label: "Market object passport",
      hint: "Where each reading came from, and what would break it",
    },
  ],
};

/** The equipment for a room. Unknown room → `[]`, never a throw. */
export function roomEquipment(href: string | null | undefined): readonly RoomEquipment[] {
  if (!href) return [];
  // Query strings and hashes are part of a JOURNEY, not of the room's identity
  // — `/command-deck?equip=market-reality` is still the market room, and a room
  // that lost its own Workspace the moment you used it would be absurd.
  const path = href.split(/[?#]/)[0];
  return EQUIPMENT_BY_ROOM[path] ?? [];
}

/** True when `id` is equipment this room actually has. Guards URL-supplied ids. */
export function isRoomEquipment(href: string | null | undefined, id: string | null | undefined): boolean {
  if (!id) return false;
  return roomEquipment(href).some((e) => e.id === id);
}
