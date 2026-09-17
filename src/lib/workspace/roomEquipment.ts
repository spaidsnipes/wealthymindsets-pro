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
