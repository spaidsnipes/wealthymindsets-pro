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

/**
 * WHICH OF THE TWO HANDS THIS BELONGS IN.
 *
 * The Visual Systems canon (`Last Mile — What Still Stops the OS`, §3 component
 * law) splits the equipment a live market room hands a trader into exactly two
 * named buttons, and says what each may and may not contain:
 *
 *   WORKSPACE — "layout, replay scrub, draw tools, session, flatten,
 *               risk-geometry toggle". Must not become /workspace, must not
 *               list Rooms, must not host Smart Money.
 *   TOOLS     — "lenses + overlays + graduation toggles". **Must not become
 *               destinations**, must not ship twenty named tools as home.
 *
 * Before this field existed the OS frame satisfied the TOOLS button with
 * `OS_WORKBENCH` — the destination group. Pressing "Tools" over a live chart
 * offered /scanner, /news and the rest: the exact failure the canon names, and
 * the same second-house instinct that had just been cut out of the masthead.
 * The list was one click further in than the Rooms list had been, which is
 * lower, not different.
 *
 * So the kind is declared per piece of equipment, by the product, here — the
 * one file that already refuses to hold an href. A `kind` cannot route
 * anywhere either, which is the point: TOOLS can no longer be filled with
 * destinations by accident, because the only thing it can be filled with is
 * something already proven not to be one.
 *
 * It is REQUIRED rather than defaulted so that the compiler asks the question
 * of every future entry. A default would silently sort new equipment into
 * whichever hand the default happened to name.
 */
export type RoomEquipmentKind = "workspace" | "lens";

export interface RoomEquipment {
  /** Stable id. Appears in the URL, so it is part of the product's contract. */
  readonly id: string;
  /** What the trader calls it. Never an implementation name. */
  readonly label: string;
  /** What they will see, in their vocabulary. */
  readonly hint: string;
  /** Which of the canon's two hands this is picked up with. */
  readonly kind: RoomEquipmentKind;
  /**
   * TRUE when pressing it ACTS IN THE ROOM AT ONCE — no preview, no drawer, no
   * full experience.
   *
   * The journey grammar (threshold → drawer → full) is right for a READING: a
   * reading has depth, and the trader chooses how much of it to take. It is
   * wrong for an INSTRUMENT. "Draw" and "Replay" have no threshold state worth
   * previewing; asking a trader to press Draw and then press EXPAND to actually
   * draw would be the burial this whole rail exists to end, reinvented with
   * better manners.
   *
   * Direct equipment therefore never enters `useEquipmentJourney`. The room
   * subscribes to the channel itself and flips the control it already owns, so
   * the chart never unmounts and the URL never changes — which is the canon's
   * "overlay equipment wall, D≈0, chart stays".
   */
  readonly direct?: boolean;
  /**
   * THE DOOR IS REAL, THE ROOM BEHIND IT IS NOT FINISHED — SAY SO HERE.
   *
   * Set to the sentence the trader should read BEFORE they press. Undefined on
   * every honest piece of equipment, which is the point: this field exists so
   * that the ONE entry which cannot yet do what its label says has somewhere to
   * admit it, rather than being quietly deleted (which loses the work) or left
   * flattering (which is the FORBIDDEN "menu pretending to be an invention").
   *
   * MEASURED on production 2026-09-22, canvas-hash sampled at t+1s / t+6s /
   * t+11s after pressing Replay: the price pane kept repainting and the payload
   * kept GROWING — a live socket appending prints, not a camera walking
   * history. The panel that opens already confesses this in its own words. But
   * a confession you can only read AFTER you have engaged the instrument is the
   * confession arriving one press too late: by then an orange BAR REPLAY panel
   * is sitting under a LIVE masthead, and the Companion Camera Law's
   * "backtest historical replay and LIVE/LAST context must be impossible to
   * confuse" has already been spent.
   *
   * So the disclosure moves UP, to the menu, where it costs the trader nothing.
   *
   * NOT A `disabled`. The control still opens, because the panel it opens is
   * the honest one and a trader is entitled to look at equipment that exists.
   * Greying it out would also delete the only route by which the Founder can
   * SEE the unfinished work — and unfinished work that cannot be seen is how it
   * stays unfinished.
   */
  readonly unbuilt?: string;
}

/**
 * IS A COMPANION CAMERA ACTUALLY DRIVING THE BARS? — ONE OWNER, WHOLE PRODUCT.
 *
 * This lived as a local const inside `ChartsDashboard` for exactly one commit,
 * and one commit was enough to show the problem: the equipment REGISTRY needs
 * the same answer in order to decide whether to disclose at the menu, and a
 * registry that hardcoded its own `false` would be a second owner of a fact the
 * room already owns. Two owners of "is replay wired" is the same two-headed
 * horse this whole repair exists to kill, rebuilt one file over.
 *
 * So the fact lives here — the lowest file that both the room and the rail
 * already import — and there is exactly ONE edit to make on the day the real
 * wire lands (frozen CanonicalBar ancestry; never a slice of today's bars).
 *
 * Typed `boolean` rather than left as the literal `false` on purpose: the
 * narrowed type would let the compiler prune the true branches of every reader,
 * and those branches must stay compiled so flipping this is a one-line change
 * and not an excavation.
 */
export const REPLAY_DRIVES_THE_CAMERA: boolean = false;

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
      kind: "lens",
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
      kind: "lens",
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
      kind: "lens",
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
      kind: "lens",
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
      kind: "lens",
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
      kind: "lens",
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
      kind: "lens",
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
      kind: "lens",
    },
    /**
     * THE NINTH TENANT — and the entry that makes ORDER FLOW a property of the
     * TAPE rather than a property of /charts.
     *
     * The id is deliberately IDENTICAL to the chart room's, for the reason
     * stated at the second room below: equipment is named by what it IS, not by
     * where it was picked up. `deck-order-flow` would be two names for one
     * compilation, and the rail would then be telling the trader that the
     * deck's order flow is a different object from the chart room's. It is not
     * — both rooms compile it with the same hook off their own tape.
     *
     * WHY THE DECK EARNED IT. The deck already holds `recentTicks` for its own
     * chart and showed the trader nothing from it. Five finished readings —
     * value candle, absorption, delta divergence, liquidity weather, stacked
     * imbalance — were reachable from exactly one room in the product, and it
     * was not the room the Founder opens.
     *
     * THE LABEL IS THE TRADER'S NOUN. Not "microstructure", not "tape
     * selectors". THE HINT NAMES THE QUESTION, not the five modules behind it.
     */
    {
      id: "order-flow",
      label: "Order flow",
      hint: "Whether the side pressing is being paid for the effort it spends",
      kind: "lens",
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
      kind: "lens",
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
      kind: "lens",
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
      kind: "lens",
    },
    /**
     * THE CHART ROOM'S FOURTH TENANT — AND THE CORRECTION OF A SPLIT ROOM.
     *
     * This entry exists because of a structural complaint, not a feature
     * request: the Command Deck's WORKSPACE had NINE tenants and the chart
     * room had THREE readings, so six pieces of equipment could only be picked
     * up by LEAVING the market. The chain — the one that answers whether the
     * setup may be traded at all — was the worst of the six, because the room
     * where a trader decides to take a trade is this one.
     *
     * That is the split the canon's grammar was written against. WORKSPACE is
     * "the equipment the room you are standing in can hand you". A chart room
     * that cannot hand the trader the permission verdict is not a room with
     * less equipment; it is a room that makes the trader travel to find out
     * whether they are allowed to act on what is in front of them.
     *
     * THE ID IS THE DECK'S ID, AND THAT IS THE WHOLE POINT. There is one
     * decision chain per decision, not one per room. `charts-decision-chain`
     * would tell the trader the chart's permission is a different object from
     * the deck's — and the moment the two could disagree, one of them is lying.
     * See the note above `market-reality` for the rule in full.
     *
     * THIS IS A SECOND DOOR, NOT A SECOND COMPILATION. `ChartsDashboard`
     * ALREADY holds the chain: `chartCanvasVM.chain` is read there for
     * `availableR` and drives the permission verdict this room mints decisions
     * from. Nothing new is fetched, computed or judged — the room simply stops
     * hiding a compilation it has had all along.
     *
     * THE HINT IS THE DECK'S HINT, WORD FOR WORD. Two rooms describing one
     * piece of equipment differently is how a trader learns to believe they are
     * two pieces of equipment.
     */
    {
      id: "decision-chain",
      label: "Decision chain",
      hint: "What the setup still has to satisfy before it is permitted",
      kind: "lens",
    },
    /**
     * THE CHART ROOM'S FIFTH TENANT — THE FIRST THAT IS NOT ABOUT THIS MARKET.
     *
     * Everything above is a reading of the tape in front of the trader. This is
     * a reading of the TRADER, and it belongs here for the reason the deck's own
     * entry states out loud: Personal Edge carries NO PHASE GATE, deliberately,
     * because PREPARATION is exactly when "you have historically performed
     * badly in this context" is still actionable. Standing at a chart, about to
     * size a setup, IS preparation. A record readable only from another route is
     * a record consulted after it could have changed anything.
     *
     * NOT EVERY DECK TENANT FOLLOWS IT HERE, AND THAT IS THE POINT. The Mirror
     * is gated REVIEW / POST_EXIT; the Learning Genome and Practice Honesty are
     * gated REVIEW / LEARN. On a live chart each would read WITHHELD nearly
     * always — a rail entry that is permanently closed is worse than an absent
     * one, because the trader learns to stop pressing. Equipment travels when
     * the room can honestly hand it over, not because another room had it.
     *
     * SAME ID, SAME LABEL, SAME HINT AS THE DECK. There is one record of how
     * this trader has performed. `charts-personal-edge` would be a second name
     * for it, and two names is how a trader learns to believe there are two.
     */
    {
      id: "personal-edge",
      label: "Your personal edge",
      hint: "Where you have actually performed, measured across your whole record",
      kind: "lens",
    },
    /**
     * ── THE TWO INSTRUMENTS THE CHART ROOM ALWAYS HAD AND NEVER DECLARED ────
     *
     * Everything above this line is a READING. That is why "Tools" over a live
     * chart could be filled with destinations without anyone noticing the
     * contradiction: this room had registered no WORKSPACE equipment at all, so
     * the hand the canon reserves for instruments was empty and the frame
     * quietly filled it with the only list it had — the route list.
     *
     * These two are not new inventions and not new routes. `ChartsDashboard`
     * has owned both controls for a long time:
     *
     *   draw-tools  → `openDrawingTools()` (LeftDrawingSidebar / DrawingToolsPanel)
     *   bar-replay  → `startReplay()`      (BarReplayControls)
     *
     * They were reachable only from inside the chart's own toolbar — one of
     * them behind an "Advanced" menu — which is the canon's failure clause
     * ("the intelligence exists but requires hunting through implementation
     * containers") applied to the two instruments a trader reaches for most.
     * Declaring them here gives them a door in the room's own equipment hand
     * WITHOUT a second implementation: the room flips the state it already
     * holds. Two doors, one owner.
     *
     * `direct` because neither has a reading to preview. See the field's note.
     */
    {
      id: "draw-tools",
      label: "Draw",
      hint: "Mark the levels you are actually trading",
      kind: "workspace",
      direct: true,
    },
    /**
     * THE ONE ENTRY WHOSE HINT IS A PROMISE THE PRODUCT CANNOT KEEP TODAY.
     *
     * The hint below is retained WORD FOR WORD because it is the correct
     * description of the instrument, and rewriting it to describe the current
     * half-built state would mean rewriting it back later — and a hint that
     * changes is a hint nobody trusts. What is added is the disclosure beside
     * it, fed from the single owner above so that the menu, the panel's own
     * `chartFollowsCursor` confession and every fidelity surface in the chart
     * room cannot drift out of agreement with each other.
     */
    {
      id: "bar-replay",
      label: "Replay",
      hint: "Walk this market forward one bar at a time",
      kind: "workspace",
      direct: true,
      ...(REPLAY_DRIVES_THE_CAMERA
        ? null
        : { unbuilt: "Not wired to the chart yet — the candles keep running live" }),
    },
    /**
     * THE CHART ROOM'S EIGHTH TENANT — AND A CONTROL THAT WAS OFF THE SCREEN.
     *
     * MEASURED 2026-09-21 on local /charts at a 390x844 phone viewport, with
     * the auth RESPONSE stubbed for layout only. The toolbar's pinned cluster
     * (`.wm-chart-toolbar-pinned`) laid out 822px wide inside a 354px room, so
     * three of its controls reported these x-origins:
     *
     *     Appearance   x=526      Smart Money  x=633      Chart tools  x=752
     *
     * The viewport is 390 wide. Those controls were RENDERED, they consumed
     * 44px of the room's vertical floor, and they could not be reached without
     * a horizontal scroll nobody is told about. That is worse than absent: a
     * missing control teaches you to look elsewhere, an unreachable one teaches
     * you the product is broken.
     *
     * D-701's SALVAGE clause is the instruction for exactly this shape —
     * "MIGRATE LEGITIMATE ORGANS INTO WORKSPACE/TOOLS DRAWERS" — and §3 of the
     * Last Mile support doc says what Tools is FOR: "lenses + overlays +
     * graduation toggles". Smart Money is an overlay reading. It belongs in
     * the hand, not in a rail that runs off the edge of the glass.
     *
     * WHY `lens` AND NOT `workspace`. The two hands are not a size split. A
     * workspace instrument CHANGES THE CHART (Draw, Replay); a lens READS it.
     * Smart Money reads. Filing it under Workspace would have put a reading in
     * the hand a trader reaches into to alter the tape.
     *
     * WHY `direct` AND NOT A JOURNEY. The field's own note draws the line at
     * whether there is "a reading with depth worth previewing". Smart Money
     * already exists as ONE BOOLEAN the room owns (`smartMoneyOpen`), with no
     * threshold VM and no preview copy anywhere in the product. Inventing a
     * preview here would mean compiling a second opinion about the panel in
     * order to describe it — and a threshold that paraphrases a panel is how a
     * rail and a room start to disagree. Direct keeps ONE writer.
     *
     * THIS IS A SECOND DOOR, NOT A SECOND PANEL. The branch in
     * `ChartsDashboard` flips the exact `smartMoneyOpen` the toolbar button
     * flips. There is one `SmartMoneyPanel`; this gives it a door the thumb
     * can actually land on.
     *
     * NOT THE SAME EQUIPMENT AS `order-flow`, AND THE DISTINCTION IS OLD. The
     * room's own comment has said so since before this entry existed:
     * "detailed order-flow inspection belongs to the Smart Money doorway."
     * `order-flow` is the four readings that DRAW ON THE AXIS; Smart Money is
     * the read-out panel beside it. Two doors, two things.
     */
    {
      id: "smart-money",
      label: "Smart money",
      hint: "Who is actually pressing, and whether the tape can prove it",
      kind: "lens",
      direct: true,
    },
    /**
     * THE NINTH TENANT — AND THE REST OF THE STRIP THAT COULD NOT BE REACHED.
     *
     * `smart-money` above was ONE organ salvaged from `.wm-chart-toolbar-pinned`
     * and its own note closes by naming what was left behind: "NOT FIXED HERE:
     * Appearance and Chart tools are still off the glass at 390." This entry is
     * the rest of that salvage, and the measurement that forced it is not a
     * phone measurement at all.
     *
     * MEASURED 2026-09-21 at 1440x900 on local /charts, auth RESPONSE stubbed
     * for layout only — no password, no token, no account
     * (scratchpad/probe-toolbar-reach.mjs). The pinned cluster laid out 823px
     * wide, `position: sticky; right: 0`, over a band that is `overflow-x:
     * auto` with `scrollbarWidth: "none"`. Then `document.elementFromPoint` was
     * asked, for each of that band's nine controls, whether the point at its
     * own centre actually hits it:
     *
     *     UNREACHABLE: 2 of 9
     *       x  trading hours select   (x=290)
     *       x  Indicators             (x=463)
     *
     * This is the defect the repo already knows by name — "7 of 9 controls in
     * the DOM and unreachable" — sitting on the DESK, not the phone, where
     * nobody had thought to look for it. A strip that covers its neighbours is
     * not a strip that needs a wider breakpoint. It needs to not be a strip.
     *
     * D-701 demolishes it; SALVAGE says "MIGRATE LEGITIMATE ORGANS INTO
     * WORKSPACE/TOOLS DRAWERS". So the organs become one door.
     *
     * WHY `lens` AND NOT `workspace`. §3: Tools is "lenses + overlays +
     * graduation toggles". The drawer's own first organ is the profiles
     * catalogue — eight overlays that READ the tape — and Appearance is a
     * graduation toggle in the literal sense. Nothing behind this door changes
     * what the market did; it changes what is drawn about it.
     *
     * WHY `direct`. Same test the field's note sets: is there "a reading with
     * depth worth previewing"? No. This door opens a container of controls, not
     * a reading. A threshold VM here would have to paraphrase fourteen
     * unrelated behaviours, which is how a rail and a room start to disagree.
     *
     * WHY ONE DOOR AND NOT FOUR. Profiles, Arrangement, Appearance and the
     * chart menu were ONE cluster on the glass and are one cluster in the hand.
     * Declaring four entries would have been four rail rows for what the trader
     * has always reached for as a unit, and would have split state that lives
     * in one component across four booleans.
     *
     * HONEST EDGE: `ChartToolbar` — and therefore this drawer — is mounted only
     * while `activeTab` is "Chart" or "Options". On Financials or Valuation the
     * rail entry is painted and opens nothing. That is the same gate
     * `chart-draw-sheet` already carries and is recorded here rather than
     * smoothed over; curing it means mounting the toolbar on every tab, which
     * is a bigger change than this one and would be made for its own reasons.
     */
    {
      id: "chart-tools",
      label: "Chart tools",
      hint: "Profiles, arrangement, appearance and the chart's own menu",
      kind: "lens",
      direct: true,
    },
  ],
};

/**
 * Every equipment id this product declares, in any room, once each.
 *
 * WHY THIS IS EXPORTED AND NOT A PRIVATE DETAIL.
 *
 * The drawer now draws a GLYPH per entry, and a glyph is the one piece of an
 * equipment tile that does not arrive with the entry. The honest way to hold
 * that is a declared id→glyph map plus a sentinel that fails the build when the
 * two disagree — and a sentinel cannot compare against a list it cannot see.
 *
 * The alternative shipped in most codebases is a positional array or a
 * `?? fallbackIcon`, both of which fail SILENTLY: the eleventh reading quietly
 * wears the tenth one's picture, or every new reading wears the same generic
 * square, and nothing anywhere reports it.
 */
export function allRoomEquipmentIds(): readonly string[] {
  const seen = new Set<string>();
  for (const room of Object.values(EQUIPMENT_BY_ROOM)) {
    for (const item of room) seen.add(item.id);
  }
  return [...seen].sort();
}

/** The equipment for a room. Unknown room → `[]`, never a throw. */
export function roomEquipment(href: string | null | undefined): readonly RoomEquipment[] {
  if (!href) return [];
  // Query strings and hashes are part of a JOURNEY, not of the room's identity
  // — `/command-deck?equip=market-reality` is still the market room, and a room
  // that lost its own Workspace the moment you used it would be absurd.
  const path = href.split(/[?#]/)[0];
  return EQUIPMENT_BY_ROOM[path] ?? [];
}

/**
 * The equipment for a room that belongs in ONE of the canon's two hands.
 *
 * The OS frame asks this twice — once per button — instead of holding its own
 * idea of what Workspace and Tools contain. A frame that sorted equipment
 * itself would be a second product decision living in a layout file.
 */
export function roomEquipmentOfKind(
  href: string | null | undefined,
  kind: RoomEquipmentKind,
): readonly RoomEquipment[] {
  return roomEquipment(href).filter((e) => e.kind === kind);
}

/** True when `id` is equipment this room actually has. Guards URL-supplied ids. */
export function isRoomEquipment(href: string | null | undefined, id: string | null | undefined): boolean {
  if (!id) return false;
  return roomEquipment(href).some((e) => e.id === id);
}

/**
 * True when `id` is equipment this room has AND it takes the journey grammar.
 *
 * `useEquipmentJourney` must ask THIS, not `isRoomEquipment`. A `direct`
 * instrument that entered the journey would put the room at the threshold of a
 * reading that does not exist — the layer would be handed an id it has no
 * content for — and it would write `?equip=draw-tools` into the URL, which is
 * the one thing D≈0 promises not to do.
 */
export function isJourneyEquipment(
  href: string | null | undefined,
  id: string | null | undefined,
): boolean {
  if (!id) return false;
  return roomEquipment(href).some((e) => e.id === id && !e.direct);
}
