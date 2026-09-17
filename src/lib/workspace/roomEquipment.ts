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
    /**
     * THE FOURTH TENANT, AND THE FIRST THAT IS NOT ABOUT THE MARKET.
     *
     * The three above are all compilations of the tape. A grammar that only
     * ever carried market readings would have earned a narrower name than
     * WORKSPACE — it would be a market-widget rail, and the half of WM Pro that
     * is the trader's own record (journal, decisions, review) would still have
     * no way to be picked up without travelling to another route. That is the
     * "one route per invention" this file's header was written against, and it
     * would have survived three tenants without anybody noticing.
     *
     * THE LABEL SAYS WHOSE MIRROR IT IS, for the same reason both passport
     * entries say whose passport. The rail's ROOMS list is a list of places;
     * "Mirror" alone would read as one more of them. "Your behaviour mirror"
     * cannot — a room is not *yours*.
     *
     * THE HINT IS THE PANEL'S OWN DOCTRINE IN THE TRADER'S WORDS. Mirror
     * REFLECTS, never diagnoses; so the hint promises a record, not a verdict.
     * "What you did wrong" would be a diagnosis, and the product would then owe
     * the trader a judgement it has deliberately refused to make.
     */
    {
      id: "behaviour-mirror",
      label: "Your behaviour mirror",
      hint: "What you actually did this session, not what you meant to do",
    },
    /**
     * THE FIFTH TENANT — THE MIRROR'S LONGER-MEMORY SIBLING.
     *
     * The Mirror reflects the session you just finished. This reflects the
     * BOOK: which playbook, direction and session the trader has actually
     * performed in across every decision WM has a record of. Same subject —
     * the trader — over a different horizon, which is why it belongs on the
     * rail next to the Mirror rather than folded into it.
     *
     * ITS STARTING POSITION WAS BURIAL WITH NO SECOND MOUNT. The deck's only
     * `PersonalEdgeChip` sat one `<details>` deep, and
     * `buriedOnlyIsARegister.test.ts` measured it as one of the room's
     * remaining twenty. Nothing is un-collapsed here: the chip stays exactly
     * where it is, and gains a door that is not a second press.
     *
     * THE LABEL SAYS WHOSE EDGE IT IS. Same reason both passports name their
     * owner and the Mirror is "YOUR behaviour mirror": the ROOMS list is
     * full of places, and "Personal edge" alone could read as one more of
     * them. It cannot be a room, because a room is not *yours*.
     *
     * THE HINT PROMISES A MEASUREMENT, NOT A PREDICTION. "Where you will do
     * well" would be a forecast the selector explicitly refuses to make —
     * `selectPersonalEdge` will not call a bucket RESOLVED below its sample
     * threshold, on the Founder rule that there is never certainty from
     * three. So the hint is stated in the past tense.
     */
    {
      id: "personal-edge",
      label: "Your personal edge",
      hint: "Where you have actually performed, measured across your whole record",
    },
    /**
     * THE SIXTH TENANT — AND THE ONE THE ROOM IS ALLOWED TO REFUSE.
     *
     * The Learning Genome is the deck's dense diagnostic: four dimensions of
     * how the trader reads, reasons, executes and transfers, plus the drill it
     * prescribes. Its in-room mount sits one `<details>` deep, gated on
     * REVIEW/LEARN, and `buriedOnlyIsARegister.test.ts` measured it among the
     * room's remaining nineteen buried-only components.
     *
     * WHY THIS ENTRY IS NOT A WAY AROUND THE ROOM'S OWN GATE.
     * ------------------------------------------------------
     * The in-room mount sits inside `<SceneAdmitsAmbient>`, which withholds
     * backward-looking surfaces whenever the scene says the room belongs to the
     * market. A rail entry that ignored that would be a second, louder path to
     * a surface the room had deliberately closed — the same defect the third
     * tenant's `SceneAdmits` gate was written against.
     *
     * So the refusal TRAVELS WITH THE EQUIPMENT: the descriptor carries the
     * gate inside `renderDepth`, and its preview verdict says WITHHELD before
     * the trader presses anything. A door that sometimes says "not now, and
     * here is why" is not a painted door — it is the product declining out
     * loud instead of appearing broken.
     *
     * THE LABEL SAYS WHOSE LEARNING IT IS, like every other trader-owned entry
     * on this rail. The ROOMS list is a list of places; a room is not *yours*.
     *
     * THE HINT NAMES THE SUBJECT, NOT THE SCORE. "How well you are doing"
     * would be a grade; what this measures is WHICH part of the work is the
     * bottleneck, which is a different and more useful sentence.
     */
    {
      id: "learning-genome",
      label: "Your learning genome",
      hint: "Which part of your work is the bottleneck, and the drill for it",
    },
    /**
     * THE SEVENTH TENANT — AND THE FIRST WHOSE OWN CONTAINER WAS THE PROBLEM.
     *
     * Every tenant before this one was BURIED: correct component, correct
     * output, no door. This one was buried AND carried a second door of its
     * own. `PracticeHonestyLayer` renders a `<details>`, and its in-room mount
     * sits inside another `<details>` — so reaching it was two presses, and
     * enrolling it naively would have made the equipment drawer a third. That
     * is drawer-inside-drawer, which the interaction directive bans by name.
     *
     * The cure is a prop, not a deletion: `disclosed` tells the component that
     * its container IS the disclosure, so behind this door it renders flat. The
     * in-room mount keeps its fold, because in the room nobody asked yet.
     *
     * WHY IT DESERVES A DOOR AT ALL. Five modules measure the ways the practice
     * book was easier than a real venue — locate, fill, rest, cancel, stop. A
     * trader reading a green practice record with no idea which of those
     * easements produced it is reading a flattering fiction. This is the single
     * most consequential sentence WM can say about paper trading, and it lived
     * two folds deep.
     *
     * THE ROOM'S OWN GATE TRAVELS WITH IT. The in-room mount is gated to
     * REVIEW/LEARN, because §9 INTERRUPTION LAW forbids a retrospective taking
     * the room while capital is exposed. The descriptor carries the same gate
     * and says WITHHELD before the trader presses, so the rail cannot become a
     * louder path to a surface the room deliberately closed.
     *
     * THE LABEL SAYS WHOSE PRACTICE IT IS, like every other trader-owned entry.
     * THE HINT NAMES THE SUBJECT, NOT THE VERDICT: it promises to say how the
     * book was easier, never to grade the trader for it.
     */
    {
      id: "practice-honesty",
      label: "Your practice honesty",
      hint: "How the practice book was easier than a real venue would have been",
    },
    /**
     * THE EIGHTH TENANT — AND THE SECOND DOUBLE BURIAL.
     *
     * `ATHOSInterventionPanel` was buried twice, like tenant 7, but by two
     * different mechanisms and only one of them was a container.
     *
     * The first burial was a MARKET GATE — `{chainVm && <ATHOSInterventionPanel/>}`
     * — which silenced five statements about the TRADER whenever the tape was
     * unreadable. That was removed in `f12998a3` as a defect in its own right,
     * before this enrolment, because it was wrong independently of whether
     * ATHOS ever became equipment. The baton is
     * WM-PRO-ATHOS-DECOUPLING-2026-09-17.
     *
     * The second burial is the one this entry cures: the panel sits inside the
     * room's "Deep read" `<details>`, so the single most time-critical thing WM
     * can say — that the trader has hit their declared loss limit — waits
     * behind a fold.
     *
     * WHY IT DESERVES A DOOR. Seven detectors, five of them reading nothing but
     * the trader's own decision record: post-exit continuation integrity,
     * missed-profit re-entry revenge, success-triggered rule bending,
     * post-rule-violation separation, and max losses reached. Those are the
     * sentences a trader needs at the moment they are least likely to go
     * looking for them.
     *
     * §14 "SILENCE IS A FEATURE" TRAVELS WITH IT, AND IS NOT WEAKENED. The
     * panel still renders nothing in the room when it has nothing to say. The
     * ONE thing the door changes is that a deliberate press is answered with a
     * sentence rather than a blank — a painted door is not silence, it is a
     * broken control. The descriptor says QUIET before the press, so the rail
     * never promises noise it does not have.
     *
     * THE LABEL NAMES THE SUBJECT, NOT THE MACHINERY. Not "ATHOS" — that is an
     * internal system name, and the directive forbids exposing the
     * architecture in Founder-facing UI. What the trader gets is WM watching
     * how they are behaving this session.
     *
     * THE HINT PROMISES AN INTERRUPTION, NOT A GRADE.
     */
    {
      id: "session-watch",
      label: "What WM is watching",
      hint: "Anything in how you are trading this session worth stopping for",
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
    /**
     * THE CHART ROOM'S THIRD TENANT — AND THE LARGEST SINGLE BURIAL IN WM.
     *
     * Five finished, tested inventions — value candle, absorption anatomy,
     * delta divergence, liquidity weather, stacked imbalance — each had exactly
     * ONE mount in the entire product, and it was the same mount: a long
     * scrolling column inside `SmartMoneyPanel`, a legacy side panel that must
     * first be opened from a chart control and then scrolled past several other
     * sections. Five inventions, one door, and the door was a scroll.
     *
     * That is this file's own header clause, at its worst: "every one of its
     * inventions was reached by opening a legacy panel and scrolling". The chart
     * room is where the trader spends the most time and it could hand them the
     * least.
     *
     * WHY THIS IS ONE ENTRY AND NOT FIVE. Five rail entries would be a card farm
     * on a rail — and worse, it would ask a trader to know which of five nouns
     * answers the question they actually have. They have ONE question: is this
     * push real. All five readings are answers to it, and the preview ranks them
     * by how much each CONSTRAINS A DECISION rather than by how loud it is.
     *
     * IT IS A SUBTRACTION, NOT AN ADDITION. The legacy panel keeps its column;
     * nothing is deleted and no surface is duplicated. Both surfaces read ONE
     * compilation out of `useOrderFlowReadings` — not the same rule written
     * twice, literally the same objects — so the widget cannot say ABSORBED over
     * a panel that says BALANCED. Two copies of a rule agree exactly until one
     * is edited.
     *
     * THE FEED'S OWN LIMIT TRAVELS WITH THE EQUIPMENT. These readings need a
     * per-trade aggressor tape, and not every feed carries one. The preview says
     * NO TAPE before the trader presses anything, and says which feeds do carry
     * one — so a quiet widget is a disclosed fact rather than a broken control.
     *
     * THE LABEL IS THE TRADER'S NOUN, NOT THE MACHINERY'S. Not "microstructure",
     * not "tape selectors" — order flow is what a trader calls this.
     *
     * THE HINT NAMES THE QUESTION, NOT THE MODULES. A count of five would be an
     * implementation number; what the trader gets is whether the effort being
     * spent is being paid for.
     */
    {
      id: "order-flow",
      label: "Order flow",
      hint: "Whether the side pressing is being paid for the effort it spends",
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
