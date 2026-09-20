/**
 * SENTINEL — the grammar is REACHED, not merely written.
 *
 * `equipmentJourney.test.ts` proves the reducer is correct. A correct reducer
 * with no adopter is the exact failure this repo keeps paying for: a cure that
 * exists, passes every "is it written?" probe, and never touches the product.
 * Three shipped defects in one week had that shape — a panel rendered three
 * drawers deep, a hidden-tab stamp published from a callback that does not run
 * while hidden, a dedupe cache "bounded" by discarding live keys.
 *
 * So every assertion below asks WHERE, and several of them encode a specific
 * wrong-but-green implementation that would otherwise satisfy a weaker rule.
 *
 * NEVER DELETE THIS SENTINEL — re-pin it to the meaning, with stronger
 * assertions than it had.
 */

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { INTERNAL_NAMES } from "@/lib/design/internalNames";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
// The REAL registry, not a re-parse of its source. What the rail renders is
// what this function returns, so that is what the room must be compared against.
import { roomEquipment } from "./roomEquipment";

/** COMMENT-STRIPPED: every claim below is also discussed in prose in-file. */
const read = (rel: string) =>
  fs
    .readFileSync(path.join(process.cwd(), rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const RAIL = "src/components/os/WMOperatingSystem.tsx";
const DECK = "src/app/command-deck/page.tsx";
const LAYER = "src/components/experience/RoomEquipmentLayer.tsx";
const HOOK = "src/lib/workspace/useEquipmentJourney.ts";

/**
 * EVERY ROOM THAT HAS ADOPTED THE GRAMMAR, AND WHAT EACH ONE OWES.
 *
 * WHY THIS TABLE REPLACED A CONSTANT NAMED `DECK`.
 * ------------------------------------------------
 * Every assertion in the adoption block used to read `/command-deck`'s page,
 * because it was the only room with equipment. Two things then happened at
 * once: `/charts` adopted the grammar, and the fifty lines of journey wiring
 * the deck ran inline moved into `useEquipmentJourney` so the second room
 * could not fork them.
 *
 * Either change alone would have turned this block red, and the tempting fix
 * in both cases is a deletion — drop the wiring assertions because the deck no
 * longer contains that code, or leave them pointed at the deck and never check
 * the new room. Both are the "green and dead" failure this file was written
 * against. So the rules were SPLIT by owner instead:
 *
 *   the WIRING assertions now read the HOOK  — proven once, for every room
 *   the ADOPTION assertions loop over ROOMS  — proven per room, every room
 *
 * A room that appears in `roomEquipment.ts` and not in this table is caught by
 * the coverage control in `equipmentIsNotADestination.sentinel.test.ts`.
 */
const ROOMS = [
  {
    href: "/command-deck",
    /** How the room spells its own href at the call site — a literal, or the
     *  route owner's constant where one exists. /charts may not retype "/charts". */
    hrefExpr: '"/command-deck"',
    rel: DECK,
    /** The prop the layer is handed — a chooser here, one descriptor on /charts. */
    content: "equipmentContent",
    /**
     * What this room renames the hook's `journey` to. Rooms do not share this
     * name and must not be made to: the deck's `equipment` and the chart room's
     * `chartEquipment` are both correct, and a rule that hard-coded either one
     * would be asserting a coincidence of naming rather than the wiring.
     *
     * It is carried per-room so the chooser rule below can demand the room key
     * its choice off THE JOURNEY — not off a prop, a piece of local state, or a
     * stale copy that agrees with the rail until the day it doesn't.
     */
    journey: "equipment",
    descriptors: [
      { id: "market-reality", memo: "marketRealityEquipment", reads: /verdict:\s*marketCanvas\.verdict/, deps: "[marketCanvas]", depth: "MarketCanvasPanel" },
      { id: "market-object-passport", memo: "passportEquipment", reads: /vm=\{passport\}/, deps: "[passport]", depth: "MarketObjectPassportPanel" },
      /**
       * THE THIRD TENANT, AND THE FIRST ONE ENROLLED TO CURE A BURIAL RATHER
       * THAN TO DISCHARGE A BAN.
       *
       * The two above were subtractions — surfaces pinned permanently open on
       * MARKET, moved behind a press. This one is the opposite defect: every
       * `DecisionChainPanel` mount on the deck sat two `<details>` deep, so the
       * room's most consequential reading had no door that was not a second
       * press. `buriedOnlyIsARegister.test.ts` measured it and named it.
       *
       * `deps` is `[chainVm, sceneCompilation]` and BOTH halves are load-
       * bearing. The scene half is what stops the rail offering a door the room
       * has deliberately closed: the in-room chain sits behind
       * `<SceneAdmits element="THESIS_GEOMETRY">`, and equipment that ignored
       * that gate would be a second, louder path to a surface the compiler had
       * refused. A descriptor that dropped `sceneCompilation` would still
       * type-check and still render a chain in a CLOSED session.
       */
      {
        id: "decision-chain",
        memo: "decisionChainEquipment",
        reads: /vm=\{chainVm\}/,
        deps: "[chainVm, sceneCompilation]",
        depth: "DecisionChainPanel",
      },
      /**
       * THE FOURTH TENANT, AND THE ONE THAT TURNS THREE EXAMPLES INTO A GRAMMAR.
       *
       * The three above are all compilations of the tape. Until one of them was
       * not, "equipment" and "market widget" were the same set, and nothing in
       * this file could tell the difference. The Mirror is the trader's own
       * record — `selectMirror` is pinned by a separate Sentinel as never
       * reading market state at any depth — so its adoption is the evidence
       * that the layer is about REACH, not about the tape.
       *
       * `deps` is `[mirrorVm, phase]` and, as with the chain, both halves are
       * load-bearing. `phase` is what carries REVIEW/POST_EXIT — the gate
       * `theMirrorIsNotAMarketPanel.enforcement.test.ts` states as the only
       * moments a Mirror is not an overclaim. A descriptor that dropped it
       * would type-check and would offer a reflection during PREPARATION, which
       * is a claim about a session that has not happened.
       *
       * `reads` is `vm={mirrorVm}` rather than a `selectMirror(` call, and that
       * is the point of this atom's other half: the room compiles the
       * reflection ONCE and hands the same object to both consumers.
       */
      {
        id: "behaviour-mirror",
        memo: "mirrorEquipment",
        reads: /vm=\{mirrorVm\}/,
        deps: "[mirrorVm, phase]",
        depth: "MirrorPanel",
      },
      /**
       * THE FIFTH TENANT — AND THE ONE WHOSE `deps` ARE SHORT ON PURPOSE.
       *
       * Every descriptor above carries its subject's gate in `deps`: the chain
       * carries `sceneCompilation` so scene withholding travels, the Mirror
       * carries `phase` so REVIEW/POST_EXIT travels. This one is
       * `[personalEdgeVm]` alone, and the absence is the claim.
       *
       * Personal Edge has NO phase gate, deliberately. The Mirror is gated
       * because reflecting on a session you are still inside is an overclaim;
       * this is the opposite — "you have historically performed badly in this
       * context" is worth most during PREPARATION, while it is still
       * actionable. A `phase` dep here would not merely be redundant: it would
       * invite a gate that reproduces the exact defect
       * `theMirrorIsNotAMarketPanel.enforcement.test.ts` exists to forbid — a
       * panel that disappears precisely when it is most useful.
       *
       * So an edit that gives this descriptor a `phase` dep fails HERE, and
       * the reason is one scroll away.
       */
      {
        id: "personal-edge",
        memo: "personalEdgeEquipment",
        reads: /vm=\{personalEdgeVm\}/,
        deps: "[personalEdgeVm]",
        depth: "PersonalEdgeChip",
      },
      /**
       * THE SIXTH TENANT — AND THE SECOND WHOSE `deps` CARRY A REFUSAL.
       *
       * Its `deps` are `[learningGenome, sceneCompilation]` and, exactly as
       * with the chain, the scene half is LOAD-BEARING rather than tidy. The
       * in-room genome sits behind `<SceneAdmitsAmbient>`, which withholds
       * backward-looking surfaces when the room belongs to the market. A
       * descriptor that dropped `sceneCompilation` would still type-check,
       * still render, and would be a second and louder path to a surface the
       * room had deliberately closed.
       *
       * Read against the FIFTH tenant's note directly above — which argues
       * that Personal Edge must NOT carry `phase` — these two are the pair
       * that stops this column being read as a habit. A gate belongs in the
       * deps when the room already enforces one, and must stay out when the
       * room does not. `phase` on the edge would invent a refusal; dropping
       * the scene here would discard one.
       */
      {
        id: "learning-genome",
        memo: "learningGenomeEquipment",
        reads: /genome=\{learningGenome\.genome\}/,
        deps: "[learningGenome, sceneCompilation]",
        depth: "LearningGenomeInspector",
      },
      /**
       * THE SEVENTH TENANT — and the first whose DEPTH prop is not `unabridged`.
       *
       * `reads` pins `disclosed`, not a data prop, because that IS this
       * tenant's whole contract. The component carries its own `<details>` for
       * its in-room home; behind an equipment door that fold would be
       * drawer-inside-drawer, which the directive bans by name. A descriptor
       * that rendered `<PracticeHonestyLayer />` bare would compile, pass every
       * other rule in this file, and ship the banned burial — so the prop is
       * pinned here rather than trusted.
       *
       * `deps` carries `experienceContext.mode` for the same reason the genome
       * above carries `sceneCompilation`: the room gates this surface to
       * REVIEW/LEARN under §9 INTERRUPTION LAW, and a door that ignored the
       * room's own refusal would be a louder path to a closed surface. It is
       * the mode and not a scene because this room's refusal is stated in the
       * mode — copying the genome's gate here would be a habit, not a rule.
       */
      {
        id: "practice-honesty",
        memo: "practiceHonestyEquipment",
        reads: /<PracticeHonestyLayer disclosed unabridged=\{unabridged\} \/>/,
        deps: "[practiceHonesty, experienceContext.mode]",
        depth: "PracticeHonestyLayer",
      },
      /**
       * THE EIGHTH TENANT — the second whose contract is a BEHAVIOURAL prop.
       *
       * `reads` pins `disclosed` for the same reason tenant 7 does, and for one
       * additional reason tenant 7 did not have. For the practice layer,
       * `disclosed` only removed a `<details>`. Here it ALSO decides whether an
       * empty result is a blank or a sentence — `ATHOSInterventionPanel` is a
       * §14 silent-mode component that returns null with zero DOM footprint
       * when it has nothing to say, and §14 is its NORMAL state, not its error
       * state. A descriptor that rendered `<ATHOSInterventionPanel interventions={…} />`
       * bare would compile, pass every other rule in this file, and ship a door
       * that opens onto nothing on most sessions. That is the painted door.
       *
       * `deps` is `[athos]` alone, and deliberately so. The room does NOT gate
       * this surface on mode or scene: a statement about how the trader is
       * behaving is wanted in every phase, and gating it was the exact defect
       * removed in `f12998a3`. Adding `experienceContext.mode` here to match
       * its neighbour would be a habit, not a rule — and would quietly
       * reintroduce a gate on the trader's own record.
       */
      {
        id: "session-watch",
        memo: "sessionWatchEquipment",
        reads: /disclosed\s+unabridged=\{unabridged\}/,
        deps: "[athos]",
        depth: "ATHOSInterventionPanel",
      },
      /**
       * THE NINTH TENANT — ORDER FLOW, adopted by the MARKET room second.
       *
       * `reads` pins the room's OWN readings object, not the hook, for the same
       * reason the chart room's entry does: a descriptor that called
       * `useOrderFlowReadings` inside itself would compile a second read of a
       * moving tape and could report a verdict on a different moment than the
       * candles a few pixels away are drawing. The deps line carries the same
       * three the chart room's does — a descriptor missing `symbol` would keep
       * rendering TSLA's tape verdict under NVDA's chart.
       */
      {
        id: "order-flow",
        memo: "orderFlowEquipment",
        reads: /readings=\{orderFlowReadings\}/,
        deps: "[orderFlowReadings, orderFlowStanding, symbol]",
        depth: "OrderFlowDepthPanel",
      },
    ],
  },
  {
    href: INSTRUMENT_VIEW_ROUTE,
    // NOT a literal. `founderLanding.ts` owns this path repo-wide, and the room
    // that retyped it would drift from the registry entry the moment it moved.
    hrefExpr: "INSTRUMENT_VIEW_ROUTE",
    rel: "src/components/chart/ChartsDashboard.tsx",
    content: "chartEquipmentContent",
    journey: "chartEquipment",
    descriptors: [
      {
        id: "market-reality",
        memo: "chartMarketRealityEquipment",
        reads: /verdict:\s*chartMarketCanvas\.verdict/,
        deps: "[chartMarketCanvas]",
        depth: "MarketCanvasPanel",
      },
      /**
       * The chart room's passport. Pinned to `chartPassportVM` on purpose: that
       * memo is ALSO what the Decision Why drawer renders, and a second
       * `selectMarketObjectPassport` call would let the two surfaces disagree
       * about how much of one object's lineage is sealed.
       */
      {
        id: "market-object-passport",
        memo: "chartPassportEquipment",
        reads: /vm=\{chartPassportVM\}/,
        deps: "[chartPassportVM]",
        depth: "MarketObjectPassportPanel",
      },
      /**
       * ORDER FLOW — the largest single burial this room had, and the reason
       * the `reads` pin below names the ROOM'S OWN tape rather than the hook.
       *
       * Five finished readings lived in exactly one place each: a scrolling
       * column inside a legacy side panel. They are compiled here now, off
       * `recentTicks` — the very stream this room already holds for its
       * candles — so the equipment cannot report a verdict on a different
       * moment of the tape than the chart underneath it is drawing.
       *
       * ONE descriptor, not five, because a trader does not decide to look at
       * "delta divergence"; they ask whether the side pressing is being paid
       * for its effort. The five are how that question gets answered, which is
       * why they are depth behind one door, not five rail entries.
       */
      {
        id: "order-flow",
        memo: "chartOrderFlowEquipment",
        reads: /readings=\{chartOrderFlowReadings\}/,
        deps: "[chartOrderFlowReadings, chartOrderFlowStanding, symbol]",
        depth: "OrderFlowDepthPanel",
      },
      /**
       * THE CHAIN — brought into the room where the decision is actually made.
       *
       * It was deck-only, which meant a trader had to LEAVE the market to find
       * out whether they were permitted to act on it. The `reads` pin names
       * `chartCanvasVM.chain` deliberately: that is the compilation this room
       * ALREADY holds (it drives `availableR` and the permission verdict this
       * room mints decisions from). A `selectDecisionChain` call inside the
       * descriptor would be a second permission opinion able to disagree with
       * the one this room just refused to mint a decision on.
       */
      {
        id: "decision-chain",
        memo: "chartDecisionChainEquipment",
        reads: /const chainVm = chartCanvasVM\.chain;/,
        deps: "[chartCanvasVM.chain]",
        depth: "DecisionChainPanel",
      },
    ],
  },
] as const;

describe("SENTINEL — WORKSPACE sits beneath ROOMS and opens equipment, not pages", () => {
  const rail = read(RAIL);

  it("the Workspace block is mounted BETWEEN the room list and the other destinations", () => {
    const rooms = rail.indexOf("OS_ROOMS.map");
    const workspace = rail.indexOf("<RoomWorkspaceRail");
    const tools = rail.indexOf("OS_WORKBENCH.map");
    expect(rooms, `${RAIL} → the room list is gone; re-pin this`).toBeGreaterThan(-1);
    expect(workspace, `${RAIL} → WORKSPACE is not mounted in the rail at all`).toBeGreaterThan(-1);
    expect(workspace, `${RAIL} → WORKSPACE must sit BENEATH ROOMS`).toBeGreaterThan(rooms);
    expect(
      workspace,
      `${RAIL} → WORKSPACE has drifted below the other-destination list; it is the current room's equipment, not a footer`,
    ).toBeLessThan(tools);
  });

  it("equipment entries are BUTTONS with no href — one cannot become a route", () => {
    // The whole ban: "one route per invention". An <a href> here is how the
    // twenty-second route gets added without anyone deciding to add one.
    const start = rail.indexOf("function RoomWorkspaceRail");
    const body = rail.slice(start, rail.indexOf("\n}", start));
    expect(start, `${RAIL} → RoomWorkspaceRail is gone; re-pin this`).toBeGreaterThan(-1);
    expect(body, `${RAIL} → equipment must be a control, not a destination`).toMatch(/<button/);
    expect(body, `${RAIL} → an href here is a route per invention`).not.toMatch(/href=/);
    expect(body, `${RAIL} → the rail must ask the ROOM, not navigate`).toMatch(
      /requestEquipment\(/,
    );
  });

  it("the rail SHOWS what is already in the trader's hand", () => {
    // With the drawer open beside the chart, the Workspace entry that opened it
    // looked exactly as it had when nothing was open. That is a quiet way to
    // fail the acceptance question: "did another app load?" is partly answered
    // by whether the room still shows you what you picked up IN it.
    //
    // Scoped to the rail's own body, and to BOTH halves of the wiring. A
    // subscribe with no open state is a listener that changes no pixel; an open
    // style with no subscribe can never turn on. Either alone is green and dead.
    const start = rail.indexOf("function RoomWorkspaceRail");
    const body = rail.slice(start, rail.indexOf("\n}", start));
    expect(body, `${RAIL} → the rail never hears the room`).toMatch(
      /subscribeEquipmentStage\(/,
    );
    expect(body, `${RAIL} → the rail hears the room and paints nothing`).toMatch(
      /data-equipment-open=/,
    );
    // The rail must never INFER a stage. If it could, it would mark equipment
    // open that the room had already closed — and the room is the only thing
    // that actually knows.
    expect(body, `${RAIL} → the rail must be TOLD the stage, never derive one`).not.toMatch(
      /readJourneyFromUrl|useSearchParams/,
    );
  });

  it("the open state is in the accessible name, not only in the paint", () => {
    // A gold left edge is invisible to a screen reader, and "what am I holding"
    // is the orientation a non-sighted trader has least of.
    const start = rail.indexOf("function RoomWorkspaceRail");
    const body = rail.slice(start, rail.indexOf("\n}", start));
    expect(body, `${RAIL} → open equipment is announced only in colour`).toMatch(
      /aria-pressed=\{open\}/,
    );
  });

  it("a room with no equipment renders no heading", () => {
    const start = rail.indexOf("function RoomWorkspaceRail");
    const body = rail.slice(start, rail.indexOf("\n}", start));
    expect(body, `${RAIL} → a Workspace heading over an empty list is a painted door`).toMatch(
      /equipment\.length === 0\)\s*return null/,
    );
  });

  it("the rail no longer stacks WORKSPACE on a near-synonym heading", () => {
    // "Workbench" sat one word from "Workspace" and meant the opposite thing:
    // somewhere else to GO. Two near-identical nouns adjacent in the same rail
    // is how the distinction the restore exists to make gets lost again.
    expect(rail, `${RAIL} → "Workbench" is back beside "Workspace"`).not.toMatch(/>Workbench</);
  });
});

describe("SENTINEL — the journey wiring has ONE owner", () => {
  const hook = read(HOOK);

  it("the wiring listens for the rail's request and answers back", () => {
    expect(hook, `${HOOK} → nothing listens for the rail's request`).toMatch(
      /subscribeEquipment\(/,
    );
    // And answers BACK. The rail can only show what is in the trader's hand if
    // the room says what it is holding; a room that only listens leaves the
    // Workspace entry looking identical open and closed.
    expect(hook, `${HOOK} → the room never tells the rail what it is holding`).toMatch(
      /announceEquipmentStage\(/,
    );
    // A room may only OPEN equipment it actually has. Without this, a stale
    // request broadcast while the trader was mid-navigation would open, in the
    // NEW room, a piece of equipment that room does not own.
    // REMAPPED 2026-09-19: the guard is now `isJourneyEquipment`, which is the
    // same refusal plus one more — a DIRECT instrument (Draw, Replay) has no
    // threshold, so letting one into the journey would park the room in front
    // of a reading that does not exist and write `?equip=` for a control that
    // changed no address. Strictly stronger than what this line demanded.
    expect(hook, `${HOOK} → a room would accept equipment it does not have`).toMatch(
      /isJourneyEquipment\(roomHref/,
    );
  });

  it("the URL and the rail are two readings of ONE fact", () => {
    // Computed in separate effects, they drift: the address bar says `drawer`
    // while the Workspace entry says nothing is open, and the trader is looking
    // at both. Pinned to adjacency in the SAME effect body.
    const reflect = hook.indexOf("reflectJourneyInUrl(journey");
    const announce = hook.indexOf("announceEquipmentStage(journey");
    expect(reflect, `${HOOK} → the URL reflection is gone; re-pin this`).toBeGreaterThan(-1);
    expect(announce, `${HOOK} → the rail announcement is gone; re-pin this`).toBeGreaterThan(-1);
    expect(
      announce - reflect,
      `${HOOK} → the URL and the rail are computed apart; they will disagree`,
    ).toBeLessThan(200);
    expect(announce).toBeGreaterThan(reflect);
  });

  it("every stage of the journey is actually reachable", () => {
    // A layer wired for OPEN only would render a widget that can never be
    // expanded, entered, or returned from — the grammar written down and then
    // half-built, which is the shape this file exists to catch.
    for (const action of ["OPEN", "EXPAND", "ENTER", "RETURN", "CLOSE"]) {
      expect(hook, `${HOOK} → no dispatch reaches the ${action} stage`).toMatch(
        new RegExp(`type:\\s*"${action}"`),
      );
    }
  });

  it("ENTER measures the ROOM's scroll, not the window's", () => {
    // The room scrolls in this OS; the document does not. `window.scrollY` is
    // permanently 0 here, so a RETURN built on it would pass every unit test
    // and always drop the trader at the top — losing their place while
    // reporting success.
    //
    // Scoped to the reader ENTER calls, not to the whole file: the fallback for
    // surfaces genuinely outside the OS frame legitimately mentions `window`,
    // and a file-wide ban would have to be softened rather than re-pinned.
    const at = hook.indexOf("export function readRoomScroll");
    expect(at, `${HOOK} → readRoomScroll is gone; re-pin this`).toBeGreaterThan(-1);
    const body = hook.slice(at, hook.indexOf("\n}", at));
    expect(body, `${HOOK} → ENTER must record the room's own offset FIRST`).toMatch(
      /room\.scrollTop[\s\S]*window\.scrollY/,
    );
    expect(hook, `${HOOK} → the room scroller must be found by its OS testid`).toMatch(
      /data-testid="os-room"/,
    );
  });

  it("the offset is restored when the full experience is left", () => {
    expect(hook, `${HOOK} → RETURN promises a place and nothing keeps it`).toMatch(
      /pendingScrollRestore\(/,
    );
  });

  it("the journey never becomes a route", () => {
    // reflectJourneyInUrl uses replaceState on the SAME pathname. A router
    // push, or an /equipment/... route, is the banned shape.
    expect(hook, `${HOOK} → the journey must stay in this room`).toMatch(/reflectJourneyInUrl\(/);
    expect(hook, `${HOOK} → a push would make Back walk the stages`).not.toMatch(
      /router\.push\([^)]*equip/,
    );
  });

  it("the wiring compiles nothing — a room hands its own readings down", () => {
    // The hook is now the one place every room's journey passes through, which
    // makes it the most expensive possible location for a second brain: a
    // `useMarketCanvasVM` here would silently become every room's second
    // opinion at once.
    expect(hook, `${HOOK} → the wiring must never compile a reading`).not.toMatch(
      /\b(compose|select|use)[A-Z]\w*VM\(/,
    );
    expect(hook, `${HOOK} → fetching here would be every room's second brain`).not.toMatch(
      /useSyncExternalStore|useSWR|fetch\(/,
    );
  });
});

describe.each(ROOMS)("SENTINEL — $href ADOPTS the journey", (room) => {
  const rel = room.rel;
  const src = read(rel);
  // The room's source and its path, under the names the assertions below have
  // used since this file only knew about one room. Kept so the re-pin is a
  // change of SCOPE, not a rewrite of every message the Sentinel can print.
  const deck = src;
  const DECK = rel;

  /**
   * NO EQUIPMENT PANEL IS BURIED IN A DRAWER — IN ANY ROOM THAT HAS ADOPTED.
   *
   * `documentWallIsNotADrawer.enforcement.test.ts` owns this rule and proves it
   * beautifully — for `/command-deck` and nothing else. Its scope is a single
   * `const REL = "src/app/command-deck/page.tsx"`, written when the deck was
   * the only room with equipment. /charts then adopted the grammar and
   * inherited none of it.
   *
   * That is not hypothetical for this room. `chartPassportVM` was compiled on
   * every render and its ONLY path was a `<details>` nested inside the Decision
   * Why modal drawer, gated on `narrowViewport || optionsOpen` — so on a
   * desktop Chart tab there was no path at all. The cure is three commits old
   * and, outside the Decision Why window that
   * `chartPassportAccessibility.test.ts` inspects, nothing was watching for it
   * to come back.
   *
   * The rule is stated per ROOM and per DESCRIPTOR rather than per file, so the
   * third room enrols itself by appearing in `ROOMS` — and a room in
   * `roomEquipment.ts` that never appears here is caught by the coverage
   * control in `equipmentIsNotADestination.sentinel.test.ts`. A hard-coded
   * second file path would be the deck's coverage hole copied, not closed.
   *
   * WHAT THIS ASSERTS, AND THE STRONGER RULE IT DELIBERATELY DOES NOT.
   *
   * The rule is that at least ONE mount of each equipment panel sits at zero
   * `<details>` depth — the room must have a door that is not behind a
   * disclosure. That is the exact historical defect stated positively: the
   * chart passport's ONLY path was buried, so the room had zero doors.
   *
   * The first draft asserted the stronger thing — that NO mount may sit inside
   * a `<details>` — and it went red immediately on a real finding worth
   * recording rather than erasing: `/command-deck` mounts `MarketCanvasPanel`
   * a second time at TWO `<details>` deep, inside the Workspace toggle and
   * then the "Evidence & reasoning" drawer. That is the same nest the passport
   * and the receipt were lifted out of, and the deck's own comment three lines
   * below it says so; the canvas was left behind.
   *
   * It is NOT deleted here, and the rule was NOT kept at a strength that would
   * force the deletion. Two existing Sentinels pin that mount as intentional
   * scene composition — `commandDeckClutterConservation.test.ts` requires the
   * canvas not be removed while decluttering, and `responsiveShell.test.ts`
   * pins its ORDER relative to `<SceneAdmissionPanel>` inside the room. Whether
   * an audit copy of the canvas belongs in that drawer now that `market-reality`
   * is one press from the WORKSPACE rail is a FOUNDER-FACING product call, not
   * a call a guard gets to make by going red. Writing a rule that forces a
   * visible subtraction is how a Sentinel starts deciding the product.
   *
   * So the finding is carried in the baton and in this comment, where the next
   * hand can see it, instead of being silently blessed by a softened rule or
   * silently acted on by a unilateral delete.
   */
  it("every equipment panel has at least one door that is not behind a <details>", () => {
    // A real balance count, not "is there a <details> earlier in the file".
    // Rooms open and close disclosures above these mounts, and treating those
    // as enclosing would fire on a correct layout — the fastest way to get a
    // Sentinel deleted.
    const depthAt = (offset: number) => {
      const before = src.slice(0, offset);
      const opens = before.match(/<details[\s>]/g)?.length ?? 0;
      const closes = before.match(/<\/details>/g)?.length ?? 0;
      return opens - closes;
    };

    for (const d of room.descriptors) {
      const mounts: number[] = [];
      const re = new RegExp(`<${d.depth}[\\s/>]`, "g");
      for (let m = re.exec(src); m; m = re.exec(src)) mounts.push(m.index);

      // Vacuity control. A renamed panel would make this loop empty and the
      // rule would pass having inspected nothing — the same permanently-green
      // silence the pixel-revive guard exists to prevent, one directory over.
      expect(
        mounts.length,
        `${rel} → ${d.depth} is never mounted; this rule would pass having checked nothing`,
      ).toBeGreaterThan(0);

      const depths = mounts.map(depthAt);
      expect(
        Math.min(...depths),
        `${rel} → every ${d.depth} mount is behind a <details> (depths ${depths.join(", ")}). ` +
          `The room has no door to its own equipment that is not a second press — ` +
          `this is the zero-doors defect the chart passport shipped with`,
      ).toBe(0);
    }
  });

  it("the room mounts the equipment layer and consumes the shared wiring", () => {
    expect(src, `${rel} → the layer is imported but never rendered`).toMatch(
      /<RoomEquipmentLayer[\s/>]/,
    );
    // The room names ITSELF to the hook. A room that passed another room's href
    // would accept that room's equipment ids and refuse its own.
    expect(
      src,
      `${rel} → ${room.href} does not consume useEquipmentJourney under its own href`,
    ).toMatch(
      new RegExp(`useEquipmentJourney\\(\\s*${room.hrefExpr}`),
    );
  });

  it("the layer is handed the ROOM'S OWN compilation — not a second one", () => {
    // `vm={composeSomething(...)}` would type-check and look right while the
    // full experience quietly disagreed with the widget beside the chart.
    // Naming the room's existing binding is what makes it one brain.
    // Scoped to the element's own props. A bare file-wide search for
    // `vm={marketCanvas}` was VACUOUS — the deck has rendered
    // `<MarketCanvasPanel vm={marketCanvas} />` inside the evidence drawer for
    // months, so the rule passed against the pre-adoption source and would
    // have kept passing if the layer were handed anything at all.
    const mount = deck.indexOf("<RoomEquipmentLayer");
    const props = deck.slice(mount, deck.indexOf("/>", mount));
    expect(mount, `${DECK} → the layer is not mounted`).toBeGreaterThan(-1);
    // RE-PINNED TWICE OVER. First the layer stopped taking the vm and started
    // taking a descriptor; now the room has more than one tenant, so it hands
    // down a SELECTED descriptor. The rule follows the indirection rather than
    // shrinking to fit it: every descriptor the room can hand over must be
    // built from a binding the room already holds, because the failure this
    // guards is not "the first equipment forked a second brain" — it is any of
    // them doing it.
    expect(props, `${DECK} → the equipment must be handed a descriptor`).toMatch(
      new RegExp(`content=\\{${room.content}\\}`),
    );
    const chooser = deck.indexOf(`const ${room.content}`);
    expect(chooser, `${DECK} → the room no longer builds ${room.content}`).toBeGreaterThan(-1);
    // RE-PINNED to the chooser's OWN extent. This read `chooser + 400` — a
    // fixed character count, which is a rule pinned to a file's current
    // length rather than to its meaning. It went red on a CORRECT eighth
    // tenant (the entry pushed `equipment.equipmentId` past the window), and
    // it would have gone quietly WEAKER on a room that shrank, accepting a
    // memo name that merely happened to sit downstream of the chooser.
    //
    // The chooser is exactly one statement, and the object literal it selects
    // from contains no `;`, so the first semicolon is its true end. Cutting
    // there is both stable under growth and strictly stronger: every
    // descriptor memo must now appear INSIDE the chooser, not merely near it.
    const choiceEnd = deck.indexOf(";", chooser);
    expect(
      choiceEnd,
      `${DECK} → ${room.content} has no statement end — the chooser was rewritten`,
    ).toBeGreaterThan(chooser);
    const choice = deck.slice(chooser, choiceEnd);
    // A room with more than one tenant must SELECT by the id the rail asked
    // for. A room with exactly one has nothing to select between, and demanding
    // a chooser there would be demanding dead code — so the rule follows the
    // room's actual tenancy instead of being stated once and worked around.
    if (room.descriptors.length > 1) {
      // RE-PINNED when /charts became the second room with two tenants. This
      // read `/equipment\.equipmentId/` — the DECK's binding name — which was a
      // rule about one room's spelling wearing a generic name. It passed for
      // the deck by construction and would have failed the chart room for
      // choosing a different local identifier, which is not a defect.
      //
      // Keyed off the room's OWN journey binding instead, and then made harder:
      // that binding must be the one `useEquipmentJourney` produced. A room
      // that selected on a prop, on local state, or on a stale copy of the id
      // would satisfy the old regex and still show the trader a different piece
      // of equipment than the rail marked open.
      expect(
        src,
        `${rel} → ${room.journey} must be the journey the hook produced, not a local of the same name`,
      ).toMatch(new RegExp(`journey:\\s*${room.journey}\\s*,`));
      expect(
        choice,
        `${rel} → the choice must be keyed by the id the RAIL asked for (${room.journey}.equipmentId)`,
      ).toMatch(new RegExp(`${room.journey}\\.equipmentId`));
    }

    // Every descriptor, not just the first. `descriptors` names the memo and
    // the room binding it is required to read; a new equipment whose memo is
    // absent from this list still cannot escape, because the chooser above
    // must map an id to a descriptor and a descriptor that compiles is caught
    // by the scan below.
    for (const d of room.descriptors) {
      const at = deck.indexOf(`const ${d.memo}`);
      expect(at, `${DECK} → the room no longer builds ${d.memo}`).toBeGreaterThan(-1);
      expect(choice, `${DECK} → ${d.memo} is built but never handed to anything`).toContain(d.memo);
      const built = deck.slice(at, deck.indexOf(d.deps, at) + d.deps.length);
      expect(built, `${DECK} → ${d.memo} must read the room's own reading`).toMatch(d.reads);
      expect(
        built,
        `${DECK} → ${d.memo} compiled its own reading — that is a second brain`,
      ).not.toMatch(/\b(compose|select)[A-Z]\w*\(/);
    }
    // The SUBJECT rides the same rule as the vm. The full experience takes the
    // chart away, so its symbol line is the only thing left naming the market;
    // if the equipment resolved a symbol of its own it could name a DIFFERENT
    // one than the chart the trader entered from, and there would be nothing
    // on screen to catch it. `symbol` and `timeframe` are the room's bindings.
    expect(props, `${DECK} → the subject must be the ROOM's own symbol`).toMatch(
      /subject=\{\{\s*symbol,\s*timeframe\s*\}\}/,
    );
  });

  /**
   * THE EQUIPMENT SPEAKS WM, NOT THE MACHINERY'S NAME.
   *
   * FOUND BY A LIVE WALK OF PROD, NOT BY THIS SUITE. The eighth tenant's rail
   * label was deliberately written as "What WM is watching" to keep the
   * internal system name off a Founder surface — and then the body copy of the
   * same equipment said "ATHOS has watched this session". Every test was green.
   *
   * That is the shape this file exists to catch: a decision made correctly in
   * one place and quietly contradicted in the place the trader actually reads.
   * Naming the intent in a comment is not the same as pinning it, so it is
   * pinned here, over STRING LITERALS only — the component may go on being
   * called ATHOSInterventionPanel, because an import is not something a trader
   * can see. What ships in quotes is what ships on screen.
   */
  it("the equipment's Founder-facing words do not speak the internal system name", () => {
    // Explicit rather than clever. A regex over "anything that looks internal"
    // would be a rule nobody could predict the meaning of; a named list is a
    // decision, and adding to it is also a decision.
    //
    // THE LIST USED TO BE DECLARED RIGHT HERE, and it was copied a third time
    // once the product-wide JSX scan was written. Three copies of one security
    // decision is the drift this suite exists to prevent, so the list and the
    // whole record of WHY each name is on it — including the two names that
    // were narrowed OUT of the first draft because they turned out to be
    // trader vocabulary and a shipped route — now live in one place:
    //
    //     src/lib/design/internalNames.ts
    //
    // Read that file before adding a name. The bar is: show that the trader is
    // never taught it and never navigates to it. Looking internal is not
    // evidence.

    // WRITTEN ONCE THE NAIVE VERSION WAS CAUGHT BEING VACUOUS. The first draft
    // tried to extract string literals with /"([^"\\]{8,})"/g and quietly
    // matched the GAPS BETWEEN literals instead — quote pairing does not
    // survive a regex over real source. The probe (putting the internal name
    // back into the headline) passed, which is how it was found.
    //
    // The standalone-token test needs no tokenizer and is not fooled: every
    // legitimate code occurrence is a longer identifier (`ATHOSIntervention`,
    // `ATHOSInterventionPanel`, `chainVm.dlar`), and \b refuses those. A bare
    // `ATHOS` in a room's descriptor block is prose, and prose here is copy.

    // (a) THE RAIL. Read from the REAL registry, not its source, so a label
    // computed at runtime cannot slip past a source scan.
    for (const entry of roomEquipment(room.href)) {
      for (const bad of INTERNAL_NAMES) {
        expect(
          `${entry.label} ${entry.hint}`,
          `${room.href} → rail entry "${entry.id}" speaks an internal name to the trader`,
        ).not.toMatch(bad);
      }
    }

    // (b) THE DESCRIPTOR. The preview's headline and title are the words the
    // trader reads BEFORE deciding whether to open anything, and they live in
    // the room rather than in the registry — the exact seam the defect fell
    // through.
    for (const d of room.descriptors) {
      const at = deck.indexOf(`const ${d.memo}`);
      const built = deck.slice(at, deck.indexOf(d.deps, at) + d.deps.length);
      for (const bad of INTERNAL_NAMES) {
        expect(
          built,
          `${DECK} → ${d.memo} shows the trader an internal system name ` +
            `(${bad.source}). The rail label is not the only surface — the ` +
            `preview headline is what the trader reads before deciding ` +
            `whether to open anything.`,
        ).not.toMatch(bad);
      }
    }
  });

  /**
   * THE RAIL AND THE ROOM MUST NAME THE SAME EQUIPMENT — MEASURED, NOT ASSUMED.
   *
   * This rule exists because the gap was FOUND, not imagined. Deleting
   * `market-object-passport` from the chart room's registry entry in
   * `roomEquipment.ts` left all 68 tests in this directory green.
   *
   * That is the worst failure shape this suite can have. The registry is what
   * the WORKSPACE rail renders; the descriptor is what the room hands the layer
   * when a rail entry is pressed. Every other rule in this file inspects the
   * ROOM side. Nothing compared the two. So an equipment could be un-registered
   * — vanishing from the rail, unreachable by any press, which is exactly the
   * "zero doors" defect this atom was written to cure — while its descriptor sat
   * in the room fully built, fully type-checked, and never tested against. The
   * suite would have reported a clean bill of health about a door that no longer
   * existed.
   *
   * The comparison is BIDIRECTIONAL on purpose, because each direction is a real
   * failure with a different smell:
   *
   *   rail ⊅ room  →  a rail entry with nothing behind it (a painted door —
   *                   see the HONEST EMPTINESS note in roomEquipment.ts)
   *   room ⊅ rail  →  a built descriptor the rail can never ask for (dead code
   *                   wearing the shape of a feature)
   *
   * It calls the REAL `roomEquipment()` instead of re-parsing the file, so a
   * registry that computes its keys cannot make this scan go blind the way an
   * earlier literal-only scan in this codebase did.
   */
  it("every rail entry has a descriptor, and every descriptor has a rail entry", () => {
    // ── REMAPPED 2026-09-19 · DESCRIPTORS ARE FOR READINGS ─────────────────
    // A DIRECT instrument (Draw, Replay) has no descriptor and must not have
    // one: it opens no threshold, has no verdict to preview and no depth to
    // render — it flips a control the room already owns. Comparing it against
    // the descriptor list would demand a fake reading be built around a draw
    // tool purely to satisfy a scan.
    //
    // The bidirectional property this rule exists for is UNCHANGED for every
    // reading. Instruments are covered by their own rule in
    // `equipmentIsNotADestination.sentinel.test.ts` ("every DIRECT instrument
    // is answered by the room that declares it"), so neither kind is left with
    // a door that opens onto nothing.
    const registered = roomEquipment(room.href)
      .filter((e) => !e.direct)
      .map((e) => e.id)
      .sort();
    const described = room.descriptors.map((d) => d.id).sort();

    expect(
      registered.length,
      `${room.href} → the registry lists no equipment at all; this rule would pass vacuously`,
    ).toBeGreaterThan(0);

    expect(
      registered,
      `${room.href} → the WORKSPACE rail and the room disagree about what equipment exists. ` +
        `rail=[${registered.join(", ")}] room=[${described.join(", ")}]`,
    ).toEqual(described);

    // ...and the room must actually be able to SERVE each id it registers. The
    // chooser maps id → descriptor; an id absent from that map falls through to
    // the default, which would show the trader Market reality when they pressed
    // the passport — a silent substitution with nothing on screen to catch it.
    if (room.descriptors.length > 1) {
      const chooserAt = src.indexOf(`const ${room.content}`);
      /**
       * BOUNDED BY THE CHOOSER'S OWN END, NOT BY A MAGIC 400.
       *
       * The window used to be a fixed character count, which is a rule that
       * decays with every tenant a room adopts: the deck's ninth entry pushed
       * `session-watch` past 400 characters and this went red on a chooser that
       * mapped it correctly — a false accusation, which is worse than a missed
       * one because the fix it invites is deleting the entry.
       *
       * The chooser ends where it dispatches, `}[`, and that terminator is the
       * only honest edge. If it is ever gone the slice collapses to nothing and
       * every id fails loudly, which is the right way for this to break.
       */
      const chooserEnd = src.indexOf("}[", chooserAt);
      const chooserSrc = src.slice(chooserAt, chooserEnd > chooserAt ? chooserEnd : chooserAt);
      for (const id of registered) {
        expect(
          chooserSrc,
          `${rel} → "${id}" is on the rail but the chooser never maps it; pressing it would silently serve the default`,
        ).toContain(`"${id}"`);
      }
    }
  });

  /*
    THE SCROLL / URL / ROUTE RULES MOVED UP, THEY DID NOT GO AWAY.

    "ENTER measures the ROOM's scroll", "the offset is restored on RETURN" and
    "the journey never becomes a route" used to be asserted here, against the
    deck's inline wiring. That wiring now has exactly one implementation, so
    asserting it once in the hook block above proves it for EVERY room — and
    the "no room re-implements the journey wiring" gate in
    equipmentIsNotADestination.sentinel.test.ts is what stops a room from
    growing a private copy that these rules would no longer be looking at.
  */

  /**
   * EVERY TENANT'S DEPTH, NOT THE FIRST ONE IN THE FILE.
   *
   * RE-PINNED, AND THE RE-PIN FOUND A REAL HOLE. This rule read
   * `deck.indexOf("renderDepth:")` — the FIRST occurrence in the room's source
   * — and asserted `<MarketCanvasPanel ... unabridged={unabridged}` inside the
   * 400 characters after it. In both rooms the first descriptor happens to be
   * `market-reality`, so the PASSPORT's depth was never read by this rule at
   * all. On /command-deck that gap is covered by
   * `documentWallIsNotADrawer.enforcement.test.ts`, which names
   * `MarketObjectPassportPanel` and its `unabridged` forward explicitly. On
   * /charts nothing covered it: `chartPassportEquipment` could drop
   * `unabridged={unabridged}` and every test in this directory would stay
   * green while ENTER became a resize and the passport's evidence lineage
   * stayed folded behind the panel's own `<details>` on a whole screen.
   *
   * That is the directive's failure clause word for word — "if the
   * intelligence exists but requires hunting through implementation
   * containers: FAIL" — and it is the SAME defect the chart room was cured of
   * three commits ago, able to come back through the one door nothing was
   * watching.
   *
   * It also carried the older, quieter version of the same blindness: the rule
   * hardcoded `<MarketCanvasPanel`, so it was a rule about ONE invention
   * wearing a generic name. A third tenant would either fail it for rendering
   * its own panel, or force it to be softened into a bare `unabridged` search
   * that passes on a hardcoded `true`. Each descriptor now declares the
   * component its full experience owes, and the window is the MEMO'S OWN body
   * rather than a fixed 400 characters from a file-wide first match.
   */
  it("EVERY equipment's full experience is uncapped by the ROOM, not just the first", () => {
    for (const d of room.descriptors) {
      const at = deck.indexOf(`const ${d.memo}`);
      expect(at, `${DECK} → the room no longer builds ${d.memo}`).toBeGreaterThan(-1);
      // Bounded by the memo's OWN dependency array — the same landmark the
      // second-brain scan above uses. A fixed character window would either
      // run past this descriptor into the next one (and pass on ITS depth) or
      // stop short of a longer descriptor and fail for the wrong reason.
      const body = deck.slice(at, deck.indexOf(d.deps, at) + d.deps.length);
      const depth = body.indexOf("renderDepth:");
      expect(depth, `${DECK} → ${d.memo} describes equipment with no full experience`).toBeGreaterThan(
        -1,
      );
      const rendered = body.slice(depth);
      expect(
        rendered,
        `${DECK} → ${d.memo}'s depth must render ${d.depth}`,
      ).toContain(`<${d.depth}`);
      // The load-bearing half. `unabridged` hardcoded, or omitted, restores the
      // capped lists and the folded lineage on a full screen — ENTER becomes a
      // bigger box and the trader is back to hunting.
      expect(
        rendered,
        `${DECK} → ENTER must uncap ${d.memo}, or it is only a resize`,
      ).toMatch(/unabridged=\{unabridged\}/);
    }
  });

  /**
   * §10 THESIS_GEOMETRY IS ONE ADMISSION, AND THE DOOR MUST CARRY BOTH HALVES.
   *
   * The room states this in the gate's own comment: sections 2 and 3 "are ONE
   * admission … admitting one without the other would put a conclusion on
   * screen with its own workings withheld, which is the SHOW FIRST, EXPLAIN
   * SECOND order run backwards." The auction lens is the four-dimension
   * summary; the chain is the nine nodes underneath it.
   *
   * THE CHAIN'S DOOR SHIPPED WITH ONLY ONE HALF. It reproduced the GATE
   * faithfully — `<SceneAdmits element="THESIS_GEOMETRY">` is right there in
   * `renderDepth` — and dropped the PAIRING, so pressing the rail opened the
   * nine nodes alone. Every existing rule stayed green throughout, because
   * every existing rule is about the gate.
   *
   * That is the shape worth pinning: a door built from one half of a rule,
   * where the half it kept is the half everything else was watching. This
   * asserts the other half, and it asserts it on the SAME memo body the rules
   * above slice, so it cannot be satisfied by a DLAR mount somewhere else in
   * the room — the in-room one at section 2 has always existed and is not what
   * this is about.
   *
   * SCOPED TO ROOMS THAT ACTUALLY ADOPT THE CHAIN, off the room's own
   * descriptor list rather than off a hardcoded path. `/charts` has no
   * decision-chain equipment and must not fail for not having it — and if a
   * third room adopts the chain tomorrow, this rule arrives with it instead of
   * having to be remembered.
   */
  const chainDescriptor = room.descriptors.find((d) => d.id === "decision-chain");
  it.runIf(chainDescriptor)(
    "§10: the chain's door opens the auction lens WITH the chain, never the chain alone",
    () => {
    // SLICED OFF THE ROOM'S OWN DESCRIPTOR, not off the deck's identifiers.
    // This rule already declared itself scoped to "rooms that actually adopt
    // the chain … instead of having to be remembered" — and then sliced
    // `const decisionChainEquipment` and `[chainVm, sceneCompilation]`, both of
    // which are the DECK's names. So the moment /charts adopted the chain, a
    // rule written to travel with the equipment failed on the second room for
    // spelling. The descriptor already carries `memo` and `deps`; using them is
    // what makes the scope real rather than stated.
    const memo = chainDescriptor!.memo;
    const at = deck.indexOf(`const ${memo}`);
    expect(at, `${DECK} → the room no longer builds ${memo}`).toBeGreaterThan(-1);
    const body = deck.slice(at, deck.indexOf(chainDescriptor!.deps, at));
    const rendered = body.slice(body.indexOf("renderDepth:"));
    expect(
      rendered,
      `${DECK} → the chain's ENTER renders DecisionChainPanel without DLARStrip. ` +
        `The room's own §10 comment calls sections 2–3 ONE admission: this door ` +
        `now shows the nine nodes with the four-dimension summary they resolve ` +
        `to nowhere in sight, which is SHOW FIRST / EXPLAIN SECOND run backwards.`,
    ).toContain("<DLARStrip");
    // And the lens must NOT be docked away. It is the SHALLOWER read — what the
    // chain compacts to — so hiding it until ENTER leaves the preview showing
    // the workings without the conclusion: the same inversion, other way round.
    const lensAt = rendered.indexOf("<DLARStrip");
    const lensTag = rendered.slice(lensAt, rendered.indexOf("/>", lensAt));
    expect(
      lensTag,
      `${DECK} → the auction lens is gated on \`unabridged\` inside the chain's ` +
        `depth. The lens is the summary, not the deep read — docking it away ` +
        `means the preview carries the nine nodes and not the four they answer.`,
    ).not.toMatch(/unabridged/);
    },
  );

  /**
   * §9: ENTER MAY NEVER DISCLOSE LESS THAN THE DOCK.
   *
   * The room renders `StructureContextNote` immediately beneath the chain and
   * deliberately OUTSIDE the THESIS_GEOMETRY gate, with its reason written down:
   * "this is not a thesis; it is the note that says the thesis and the tape
   * disagree. §9 names material invalidation as one of the only two things
   * allowed to take the room."
   *
   * The chain's door carried the gate and the pairing and still dropped this.
   * The effect was an ENTER that was STRICTLY WORSE THAN THE DOCK: a trader
   * reading the chain in the room saw the contradiction underneath it; a trader
   * who pressed ENTER for the complete experience saw the contradiction vanish.
   *
   * THIS IS THE THIRD SHAPE OF THE SAME DEFECT and the reason it earns its own
   * rule rather than a line in the one above. The first was a missing pairing
   * INSIDE the gate. This is a missing adjacency OUTSIDE it — so a rule that
   * only ever looked within the gate could not have seen it.
   *
   * The placement assertion is load-bearing, not cosmetic. Inside the gate, the
   * note would be silenced exactly when the thesis is withheld, which is the one
   * case the trader most needs to be told the tape disagrees.
   */
  it.runIf(chainDescriptor)(
    "§9: the chain's door carries the contradiction note, outside the gate",
    () => {
      // Off the room's own descriptor — see the note in the rule above.
      const memo = chainDescriptor!.memo;
      const at = deck.indexOf(`const ${memo}`);
      const body = deck.slice(at, deck.indexOf(chainDescriptor!.deps, at));
      const rendered = body.slice(body.indexOf("renderDepth:"));
      expect(
        rendered,
        `${DECK} → the chain's ENTER drops <StructureContextNote>. The room ` +
          `renders it right under the chain, so ENTER now discloses LESS than ` +
          `the dock it claims to deepen: the trader who asked for the complete ` +
          `experience is the one who stops being told the thesis and the tape ` +
          `disagree.`,
      ).toContain("<StructureContextNote");
      // OUTSIDE the gate, matching the room. `</SceneAdmits>` must close BEFORE
      // the note, or the note inherits a gate that was never meant to hold it.
      //
      // ── THE ORDERING RULE APPLIES ONLY WHERE THERE IS A GATE TO BE OUTSIDE ──
      // `SceneAdmits` is fed by a SCENE COMPILATION, and a room that does not
      // compile one has nothing to put the note outside of. /charts is such a
      // room: it has no `compileScene` call, and importing the deck's gate would
      // mean compiling a SECOND scene off this room's signals — two scene
      // verdicts for one trader, which is the disagreement `SceneAdmits` was
      // invented to prevent. Demanding the tag here would therefore force the
      // exact second brain the rest of this file bans, to satisfy a scan.
      //
      // What is NOT relaxed is the rule above: the note must be PRESENT in
      // every adopting room's depth. Absence is the defect this was written
      // for; only the ordering assertion depends on a gate existing.
      const gateClose = rendered.indexOf("</SceneAdmits>");
      const noteAt = rendered.indexOf("<StructureContextNote");
      expect(
        noteAt,
        `${DECK} → <StructureContextNote> is missing from the chain's depth.`,
      ).toBeGreaterThan(-1);
      expect(
        gateClose === -1 || noteAt > gateClose,
        `${DECK} → <StructureContextNote> sits INSIDE the THESIS_GEOMETRY gate ` +
          `in the chain's depth. The room puts it outside on purpose: a ` +
          `contradiction warning gated on the thesis goes silent in exactly the ` +
          `case where the thesis is withheld — the one case it exists for.`,
      ).toBe(true);
    },
  );
});

describe("SENTINEL — the equipment layer is depth, not another app", () => {
  const layer = read(LAYER);

  it("renders NOTHING until it is picked up — no permanent card", () => {
    expect(layer, `${LAYER} → a resting stub is a card farm of one`).toMatch(
      /stage === "closed"[\s\S]{0,80}return null/,
    );
  });

  it("uses no <details> — the banned form of product depth", () => {
    // "<details> IS NOT A SURFACE" has been a comment in this codebase longer
    // than it has been true. The stages ARE the depth; a drawer inside the
    // drawer is the burial this grammar replaces.
    expect(layer, `${LAYER} → nested disclosure is the shape being replaced`).not.toMatch(
      /<details/,
    );
  });

  it("compiles nothing — it is handed one vm and renders it three ways", () => {
    // Any compiler/selector import here is a second semantic brain: the full
    // experience could then disagree with the widget it grew out of.
    expect(layer, `${LAYER} → a second compilation is a second brain`).not.toMatch(
      /import\s*\{[^}]*\b(compose|select)[A-Z]\w*/,
    );
    expect(layer, `${LAYER} → useState for market data would be a second brain`).not.toMatch(
      /useSyncExternalStore|useSWR|fetch\(/,
    );
    // Symbol resolution is the same offence in a smaller coat. The layer names
    // a market at every stage now; the moment it can DERIVE that name it can
    // derive a different one than the room it is sitting inside.
    expect(layer, `${LAYER} → the equipment must be TOLD its market, never resolve one`).not.toMatch(
      /useActiveSymbol|resolveMarketSymbolSeed|useSearchParams/,
    );
  });

  it("keeps the market visible at every stage but the full one", () => {
    // A preview or drawer pinned to `inset: 0` would cover the chart it is
    // supposed to sit beside — "another app loaded", by CSS.
    // Anchored to the two ends of the STYLE declaration itself. The first
    // draft closed the window at `return (` — which first occurs inside the
    // Control helper far ABOVE `const shell`, producing an empty slice that
    // matched nothing and failed for the wrong reason. A window has to be
    // bounded by landmarks that are actually in that order.
    const shellStart = layer.indexOf("const shell");
    const dock = layer.slice(shellStart, layer.indexOf("<aside", shellStart));
    expect(dock.length, `${LAYER} → the shell style block is gone; re-pin this`).toBeGreaterThan(0);
    expect(dock, `${LAYER} → only the full experience may take the screen`).toMatch(
      /stage === "full"\s*\?\s*\{\s*position: "fixed",\s*inset: 0/,
    );
    expect(dock, `${LAYER} → the drawer must not become full-height`).toMatch(/maxHeight/);
  });

  it("ENTER buys DEPTH, not just size — the full stage renders the content unabridged", () => {
    // RE-PINNED TO THE MEANING. This used to read `<MarketCanvasPanel ...
    // unabridged={stage === "full"} />` off the layer. That assertion was true
    // and also the reason the grammar could only ever have one tenant: the
    // chrome imported its first invention's panel. The gate that matters is
    // not WHICH component renders at depth — it is that the full stage, and
    // only the full stage, tells the content the screen is no longer the
    // constraint. A bare search for `unabridged` would pass on a hardcoded
    // `true`, which would uncap the DRAWER too and leave ENTER meaning nothing
    // but a larger box, so the gate still has to name the stage.
    expect(layer, `${LAYER} → ENTER must uncap the content, or it is only a resize`).toMatch(
      /renderDepth\(stage === "full"\)/,
    );
  });

  it("names no invention — the grammar is not the market canvas's private chrome", () => {
    // The directive's closing clause is "reuse that proven interaction grammar
    // across the remaining legitimate WM Pro inventions." A layer that imports
    // one invention's panel, or compares `equipmentId` to one invention's
    // literal name, cannot be reused — the second equipment would have to fork
    // it, and a forked grammar is two grammars.
    expect(layer, `${LAYER} → the chrome must not import one invention's panel`).not.toMatch(
      /import[\s\S]{0,80}from "\.\/MarketCanvasPanel"/,
    );
    expect(layer, `${LAYER} → the chrome must not hardcode which equipment it is`).not.toMatch(
      /"market-reality"/,
    );
    // It still REFUSES a mismatch — the rail asking for equipment B while the
    // room hands equipment A's reading is the disagreement this layer exists
    // to prevent. It just compares against what it was handed.
    expect(layer, `${LAYER} → a mismatched request must still render nothing`).toMatch(
      /equipmentId !== content\.equipmentId/,
    );
  });

  it("publishes the stage and the decision so identity is checkable from outside", () => {
    expect(layer, `${LAYER} → the stage must be observable in the DOM`).toMatch(
      /data-equipment-stage=\{stage\}/,
    );
    expect(layer, `${LAYER} → the same DECISION_ID must ride every stage`).toMatch(
      /data-decision-id=\{decisionId/,
    );
  });

  it("RETURN exists, and only in the full experience", () => {
    const full = layer.indexOf('stage === "full" ? (');
    expect(full, `${LAYER} → the full experience branch is gone; re-pin this`).toBeGreaterThan(-1);
    const returnControl = layer.indexOf('testId="equipment-return"');
    expect(returnControl, `${LAYER} → nothing returns the trader to their room`).toBeGreaterThan(
      full,
    );
    expect(
      returnControl,
      `${LAYER} → RETURN must sit inside the full branch, not beside the preview controls`,
    ).toBeLessThan(layer.indexOf('testId="equipment-enter"'));
  });
});

/**
 * SENTINEL — EQUIPMENT CAN BE PUT DOWN WITHOUT LEAVING THE ROOM.
 *
 * The canon's §3 component law names this as a property of both equipment
 * buttons: "Escape / tap-chart-background closes the overlay. URL unchanged."
 *
 * It is not a keyboard nicety. Equipment opens OVER a live chart. An overlay
 * whose only exit is the same small control that opened it is a MODE, and a
 * mode the trader cannot leave while price is moving is precisely the "mall"
 * behaviour this whole shift exists to delete.
 *
 * Every assertion below encodes a specific wrong-but-plausible implementation:
 * dismissing by navigating, dismissing in the wrong mode, dropping the trader's
 * focus on the floor, and leaving a global listener attached forever.
 */
describe("SENTINEL — Escape puts the equipment down, and the address does not move", () => {
  const rail = read(RAIL);
  const at = rail.indexOf('e.key !== "Escape"');
  // ±900 chars is the effect. Widening this to the whole file would let an
  // Escape handler that lives somewhere unrelated satisfy every rule below.
  const effect = rail.slice(Math.max(0, at - 700), at + 700);

  it("the frame listens for Escape at all", () => {
    expect(at, `${RAIL} → nothing dismisses the equipment overlay by key`).toBeGreaterThan(-1);
    expect(effect, `${RAIL} → the listener is never attached`).toMatch(
      /addEventListener\("keydown"/,
    );
  });

  it("Escape PUTS THE EQUIPMENT DOWN — it does not navigate", () => {
    // `router.back()` is the usual reflex and is wrong here: picking equipment
    // up never pushed a history entry, so back() leaves the room entirely and
    // lands the trader on whatever page preceded their arrival.
    expect(effect, `${RAIL} → Escape must clear the held equipment`).toMatch(
      /setEquipment\(null\)/,
    );
    expect(
      effect,
      `${RAIL} → Escape navigates; equipment is not a destination, so there is nothing to go back to`,
    ).not.toMatch(/router\.(back|push|replace)|history\.(back|go)|location\s*=/);
  });

  it("it only fires while equipment is actually held, in equipment mode", () => {
    // Without this guard the frame swallows Escape from every dialog, sheet and
    // combobox in the room — and quietly changes what the key means in RAIL
    // mode, where the panel is a map of destinations with its own behaviour.
    expect(effect, `${RAIL} → the handler runs outside equipment mode`).toMatch(
      /!equipmentMode/,
    );
    expect(effect, `${RAIL} → the handler runs with nothing in hand`).toMatch(
      /equipment === null/,
    );
  });

  it("the trader's focus comes back to the button they pressed", () => {
    // Clearing state alone leaves focus on a node that just unmounted, which
    // browsers reset to <body> — a keyboard trader is then at the top of the
    // document, further from the chart than before they pressed a key.
    expect(effect, `${RAIL} → focus is dropped on the floor when the overlay closes`).toMatch(
      /equipmentTriggers\.current\[[^\]]+\]\?\.focus\(\)/,
    );
    expect(
      rail,
      `${RAIL} → the equipment buttons never register themselves, so the focus restore above can only ever find null`,
    ).toMatch(/equipmentTriggers\.current\[kind\]\s*=/);
  });

  it("the listener is removed — a global key hook is not a permanent tenant", () => {
    expect(effect, `${RAIL} → the keydown listener is never detached`).toMatch(
      /removeEventListener\("keydown"/,
    );
  });

  it("touching the market also puts the equipment down — the thumb's way out", () => {
    // Escape is the keyboard's exit. On a phone it does not exist, and the
    // canon names both halves in one sentence for that reason. Shipping only
    // the key half leaves every touch trader inside the mode.
    const room = rail.indexOf('data-testid="os-room"');
    expect(room, `${RAIL} → the room element is gone; re-pin this`).toBeGreaterThan(-1);
    const main = rail.slice(room, room + 1400);
    expect(main, `${RAIL} → pressing the market does not dismiss the equipment`).toMatch(
      /onPointerDown=\{[\s\S]*?setEquipment\(null\)/,
    );
    expect(
      main,
      `${RAIL} → the dismiss must be inert in rail mode, or one gesture has two meanings`,
    ).toMatch(/equipmentMode && equipment !== null/);
  });

  it("the market press is OBSERVED, not consumed — no first-tap-eaten defect", () => {
    // Swallowing the press would mean a trader with equipment open has to
    // press every chart control twice. The room's own click must still land.
    const room = rail.indexOf('data-testid="os-room"');
    const main = rail.slice(room, room + 1400);
    expect(main, `${RAIL} → the room press is being consumed`).not.toMatch(
      /preventDefault\(\)|stopPropagation\(\)/,
    );
  });
});

/**
 * SENTINEL — EQUIPMENT IS PICKED UP *OVER* THE MARKET, NEVER BESIDE IT.
 *
 * The canon's §3 geometry: the equipment wall is an OVERLAY at D≈0 and "the
 * chart stays". The distinction is not cosmetic. As a flex COLUMN the panel
 * takes its width out of the room, so reaching for a tool RESIZES the market
 * — the chart canvas reflows and redraws, and the exact camera the trader was
 * reading moves under their hand. A tool you pick up must not rearrange the
 * room you are standing in.
 *
 * ROOMS mode is a column on purpose and must stay one: a map of destinations
 * IS furniture. So every rule below is scoped to equipment mode.
 */
describe("SENTINEL — equipment overlays the room; the market does not move to make space", () => {
  const rail = read(RAIL);
  const nav = rail.slice(rail.indexOf('data-testid="os-rail"'), rail.indexOf("overscrollBehavior"));

  it("the panel leaves the flex flow in equipment mode", () => {
    expect(nav, `${RAIL} → the rail no longer branches its geometry on the mode`).toMatch(
      /\.\.\.\(equipmentMode/,
    );
    expect(nav, `${RAIL} → equipment still takes width from the room, so the chart reflows`).toMatch(
      /position:\s*"absolute"/,
    );
  });

  it("ROOMS is still the sticky column it has always been", () => {
    // The fix must not be "make everything an overlay". The destination map
    // is furniture; turning it into a floating sheet is a second redesign
    // smuggled in beside a fix.
    expect(nav, `${RAIL} → rooms mode lost its sticky column`).toMatch(/position:\s*"sticky"/);
    expect(nav, `${RAIL} → rooms mode lost its fixed basis`).toMatch(/OS_RAIL_WIDTH_PX\}px`/);
  });

  it("the overlay is OPAQUE — a translucent panel over a live chart is two prices in one pixel", () => {
    const at = nav.indexOf("...(equipmentMode");
    const branch = nav.slice(at, at + 600);
    expect(branch, `${RAIL} → the equipment overlay has no background to sit on`).toMatch(
      /background:\s*FIELD/,
    );
    expect(
      branch,
      `${RAIL} → the equipment overlay is see-through; the market reads through it`,
    ).not.toMatch(/rgba\(|opacity:|transparent/);
  });

  it("it is pinned to the ROOM, not to the viewport", () => {
    // `position: fixed` would let equipment ride over the masthead and the
    // provenance footer — the two places the frame's standing truths live,
    // and the ones that must never be coverable by a panel.
    const at = nav.indexOf("...(equipmentMode");
    const branch = nav.slice(at, at + 600);
    expect(branch, `${RAIL} → equipment is pinned to the viewport and can cover the masthead`)
      .not.toMatch(/position:\s*"fixed"/);
    const bodyAt = rail.indexOf('className="wm-os-body"');
    expect(bodyAt, `${RAIL} → the room region is gone; re-pin this`).toBeGreaterThan(-1);
    const body = rail.slice(bodyAt, rail.indexOf('data-testid="os-rail"'));
    expect(
      body,
      `${RAIL} → the room region is not a containing block, so the absolute overlay escapes it`,
    ).toMatch(/position:\s*"relative"/);
  });
});

/**
 * SENTINEL — ONE ESCAPE, ONE STEP OUT.
 *
 * THE DEFECT THIS ENDS, which shipped green and was found by reading rather
 * than by a test: the room owns a journey — threshold → drawer → full — and
 * `RoomEquipmentLayer` closes it on Escape, one level per press. The frame
 * then grew its own Escape for the equipment wall. Both listened, neither
 * knew about the other, so ONE press did TWO things: the drawer stepped back
 * AND the wall behind it vanished. A trader backing out one level lost two,
 * and the level they lost was the one they would have to re-open to continue.
 *
 * That is the same class as the sentinel above it — one control meaning two
 * things depending on invisible state — and it is worth its own rules because
 * the two owners are in different files and neither reads the other.
 */
describe("SENTINEL — Escape is a staircase, not a trapdoor", () => {
  const rail = read(RAIL);
  const layer = read(LAYER);

  it("the ROOM still owns Escape inside the journey", () => {
    // If this stops being true the frame's deference below becomes deference
    // to nobody, and Escape silently stops working at depth.
    expect(layer, `${LAYER} → nothing steps the journey back on Escape`).toMatch(
      /e(vent)?\.key !== "Escape"/,
    );
  });

  it("the FRAME defers while the trader is inside something they picked up", () => {
    const at = rail.indexOf('e.key !== "Escape"');
    const effect = rail.slice(Math.max(0, at - 900), at + 500);
    expect(
      effect,
      `${RAIL} → the frame closes the wall on the same press the room uses to step back`,
    ).toMatch(/journeyOpen\)\s*return/);
  });

  it("the frame LEARNS the stage from the room — it never infers one", () => {
    // A frame that guessed could hold the wall shut after the room had
    // already closed, leaving Escape dead with nothing on screen to explain
    // why. The room is the only writer of its own stage.
    expect(rail, `${RAIL} → the frame does not hear the room's stage at all`).toMatch(
      /subscribeEquipmentStage\(\(\{ stage \}\) => setJourneyOpen\(stage !== "closed"\)\)/,
    );
  });

  it("the deference is re-evaluated — a stale closure would freeze the wall open", () => {
    const at = rail.indexOf('e.key !== "Escape"');
    const deps = rail.slice(at, at + 500);
    expect(
      deps,
      `${RAIL} → journeyOpen is missing from the effect's dependencies, so the handler keeps the first value it ever saw`,
    ).toMatch(/\[equipmentMode, equipment, journeyOpen\]/);
  });

  it("the market press defers too — one gesture, one meaning", () => {
    const room = rail.indexOf('data-testid="os-room"');
    const main = rail.slice(room, room + 1400);
    expect(
      main,
      `${RAIL} → pressing inside an open drawer closes the wall behind it`,
    ).toMatch(/!journeyOpen/);
  });
});

/**
 * SENTINEL — IN EQUIPMENT MODE THE FRAME OFFERS NO WAY TO LEAVE THE ROOM.
 *
 * This is the Founder's Shot 1 gate, stated as code: the default URL must be
 * a debt-honest HOME where the MARKET dominates and the frame offers exactly
 * two pieces of equipment — Workspace and Tools — and NO destination rail.
 *
 * The governing sentence of the whole shift is "kill the competing house",
 * and a house comes back one honest list at a time: Rooms was cut from the
 * masthead, and the destination mall reappeared one click lower under the
 * heading "Tools". Each of those moves looked like a small, reasonable
 * addition on its own.
 *
 * So this does not check a count of buttons — a count is satisfied by hiding.
 * It checks that every list of DESTINATIONS the frame owns is rendered on the
 * false side of the mode branch, which is the only shape that cannot be
 * restored by flipping a default.
 */
describe("SENTINEL — Shot 1: equipment mode renders no destinations at all", () => {
  const rail = read(RAIL);
  const LISTS = ["OS_ROOMS.map", "OS_WORKBENCH.map", "OS_COMMUNITY.map"] as const;

  /**
   * The `{` that opens the JSX expression the list is rendered inside.
   *
   * WHY BRACE-MATCHING AND NOT `lastIndexOf("equipmentMode ?")`. That was the
   * first draft, and it was GREEN against a deliberately reverted frame: the
   * nearest preceding mention of the mode belonged to a DIFFERENT, correctly
   * guarded block higher up, so the rule proved something true about a
   * neighbour and nothing at all about the list in front of it. A sentinel
   * that reads the wrong expression is worse than none, because its green is
   * mistaken for cover.
   *
   * Called TWICE per list, and that is deliberate. `{OS_ROOMS.map(…)}` opens
   * its own JSX expression, so one hop lands on the brace immediately to the
   * left of the list and reads an empty string — a rule that can only ever be
   * red. The guard we care about is the expression ONE level out, the
   * `{equipmentMode ? … }` that decides whether the list exists at all.
   */
  const openerOf = (at: number): number => {
    let depth = 0;
    for (let i = at; i >= 0; i -= 1) {
      const c = rail[i];
      if (c === "}") depth += 1;
      else if (c === "{") {
        if (depth === 0) return i;
        depth -= 1;
      }
    }
    return -1;
  };

  for (const list of LISTS) {
    it(`${list} is rendered only when the frame is NOT in equipment mode`, () => {
      const at = rail.indexOf(list);
      expect(at, `${RAIL} → ${list} is gone from the rail; re-pin this`).toBeGreaterThan(-1);
      const own = openerOf(at);
      expect(own, `${RAIL} → ${list} is not inside a JSX expression at all`).toBeGreaterThan(-1);
      const open = openerOf(own - 1);
      expect(
        open,
        `${RAIL} → ${list} sits at the top of the rail with nothing wrapping it — there is no guard left to read`,
      ).toBeGreaterThan(-1);
      const head = rail.slice(open + 1, at).trimStart();
      expect(
        head.startsWith("equipmentMode ?"),
        `${RAIL} → ${list} is rendered unconditionally — the destination mall is back over a live market`,
      ).toBe(true);
      // If the list sat on the TRUE side there would be no separator here,
      // because the true arm has not been closed yet.
      expect(
        /null : \(|\) : \(/.test(head),
        `${RAIL} → ${list} sits on the EQUIPMENT side of the branch; picking up a tool would hand the trader a list of places that are not here`,
      ).toBe(true);
    });
  }

  it("equipment mode offers exactly the canon's two hands, by name", () => {
    // Named, not counted: "Workspace" and "Tools" are the canon's two hands.
    // A third equipment button is a new hand and must be a Founder decision,
    // not a merge.
    const kinds = rail.match(/equipment === "(workspace|tools)"/g) ?? [];
    expect(kinds.length, `${RAIL} → the two-hand split is gone`).toBeGreaterThan(0);
    const named = new Set(kinds.map((k) => k.replace(/.*"(\w+)".*/, "$1")));
    expect([...named].sort(), `${RAIL} → equipment mode grew a third hand`).toEqual([
      "tools",
      "workspace",
    ]);
  });
});

describe("SENTINEL — the market canvas may not offer a door that closes the camera", () => {
  const layer = read(LAYER);
  const chart = read("src/components/chart/ChartsDashboard.tsx");

  /**
   * FULL is `position: fixed; inset: 0` over the field. On a room whose whole
   * purpose is to be a live camera on a market, that is not a deeper stage —
   * it is an exit, and the trader lands on a screen with no chart on it.
   *
   * The Last Mile canon (2026-09-18) §2 lists `stage=full` under AUTOMATIC
   * REJECT CHROME for the default authenticated route, and §3's component law
   * for Workspace and Tools reads "overlay equipment wall, D≈0, chart stays".
   * /charts IS the default authenticated route (see founderLanding.ts).
   *
   * WHY THE RULE IS ABOUT A MISSING PROP AND NOT A HIDDEN BUTTON. A
   * `mayEnterFull={false}` flag would move the decision into the generic
   * chrome, where every room added later inherits whichever default we picked
   * that day. Absence has no default.
   */
  it("ChartsDashboard hands the equipment layer no onEnter at all", () => {
    const at = chart.indexOf("<RoomEquipmentLayer");
    expect(at, "ChartsDashboard no longer mounts RoomEquipmentLayer; re-pin this").toBeGreaterThan(
      -1,
    );
    const el = chart.slice(at, chart.indexOf("/>", at));
    expect(
      el,
      "ChartsDashboard.tsx → the market canvas offers ENTER again. stage=full is fixed/inset-0, so the chart the trader is standing in disappears — automatic-reject chrome on the default route",
    ).not.toMatch(/onEnter/);
    // The sibling props must still be there, or the assertion above is passing
    // because the element was renamed out from under it.
    expect(el).toMatch(/onExpand=/);
    expect(el).toMatch(/onReturn=/);
    expect(el).toMatch(/onClose=/);
  });

  it("the layer treats onEnter as optional, so a room can decline it", () => {
    expect(
      layer,
      `${LAYER} → onEnter is required again; a room with no full stage would be forced to invent one`,
    ).toMatch(/readonly onEnter\?: \(\) => void;/);
  });

  it("the layer renders no ENTER control when no handler was handed down", () => {
    const at = layer.indexOf('testId="equipment-enter"');
    expect(at, `${LAYER} → the ENTER control is gone entirely; re-pin this`).toBeGreaterThan(-1);
    const around = layer.slice(Math.max(0, at - 220), at);
    expect(
      around,
      `${LAYER} → ENTER renders unconditionally, so declining the prop would crash on click instead of hiding the door`,
    ).toMatch(/onEnter &&/);
    // Not `disabled`: a dead control still advertises a depth this room does
    // not have, and the trader spends a click finding that out.
    expect(around).not.toMatch(/disabled/);
  });

  it("the deck still keeps its full stage — this is a room rule, not a retreat", () => {
    const deck = read(DECK);
    expect(
      deck,
      `${DECK} → the deck stopped passing onEnter too. A document loses nothing by filling the screen; removing it there is not what the canon asked for`,
    ).toMatch(/onEnter=/);
  });
});

/**
 * SENTINEL — the Workspace rail must be able to report a DIRECT instrument.
 *
 * MEASURED 2026-09-19 on live production https://wealthymindsetspro.com/charts:
 * the drawing tools were open — 19 `.wm-draw-btn` controls in a 319x385 panel,
 * the chart still ticking at 1490x401, the URL still exactly `/charts` — and
 * the Workspace rail entry that opened them still reported
 * `aria-pressed="false"` with no `data-equipment-open`.
 *
 * ROOT CAUSE, and the reason a weaker test would not have caught it:
 * `announceEquipmentStage` had exactly ONE caller, `useEquipmentJourney`. The
 * journey deliberately filters Draw and Replay out (`isJourneyEquipment`),
 * because a direct instrument must not open a threshold, write `?equip=`, or
 * unmount the chart. So the only two pieces of equipment `/charts` has were
 * precisely the two the rail could never hear about. Every existing test
 * passed: the reducer was correct, the channel was correct, the rail was
 * correct about journey equipment. The gap was that nobody spoke.
 *
 * A wrong `aria-pressed` is worse than a missing one — it tells a screen
 * reader the tool is down while it is in the trader's hand.
 *
 * NEVER DELETE THIS SENTINEL — re-pin it to the meaning.
 */
describe("SENTINEL — the rail can report equipment the JOURNEY does not carry", () => {
  const rail = read(RAIL);
  const chart = read("src/components/chart/ChartsDashboard.tsx");

  it("the room announces a stage for BOTH of its direct instruments", () => {
    for (const id of ["draw-tools", "bar-replay"]) {
      expect(
        chart,
        `ChartsDashboard.tsx → nothing announces a stage for "${id}", so the Workspace rail cannot show it as held. This is the 2026-09-19 live defect exactly`,
      ).toMatch(new RegExp(`announceEquipmentStage\\("${id}"`));
    }
  });

  it("the announce is driven by the state the screen renders from, not a new copy", () => {
    // A second boolean tracking "did the trader press Draw" would drift from
    // the drawer the moment anything else closed it.
    expect(
      chart,
      "ChartsDashboard.tsx → draw-tools announce is no longer derived from drawSheetOpen; a parallel flag is a second brain and will disagree with the panel",
    ).toMatch(/announceEquipmentStage\("draw-tools", drawSheetOpen \?/);
    expect(
      chart,
      "ChartsDashboard.tsx → bar-replay announce is no longer derived from replayActive",
    ).toMatch(/announceEquipmentStage\("bar-replay", replayActive \?/);
  });

  it("neither direct instrument is ever announced at the stage that kills the camera", () => {
    // This room IS the chart. `full` is fixed/inset-0 over the field.
    const announces = chart.match(/announceEquipmentStage\([^)]*\)/g) ?? [];
    expect(announces.length, "ChartsDashboard.tsx → the announces vanished; re-pin this").toBeGreaterThanOrEqual(2);
    for (const call of announces) {
      expect(
        call,
        `ChartsDashboard.tsx → ${call} announces "full" from the market canvas, which would mark the camera as surrendered`,
      ).not.toMatch(/"full"/);
    }
  });

  it("the rail holds a SET, because direct instruments are not mutually exclusive", () => {
    // Draw and Replay are both legitimately in hand at once. A single
    // `openId` slot cannot represent that, so it would have had to lie about
    // one of them even once the announce existed.
    expect(
      rail,
      `${RAIL} → the rail went back to a single open slot; with both Draw and Replay in hand it can only report one, so the other silently reads as "not held"`,
    ).toMatch(/openIds/);
    expect(rail).not.toMatch(/const \[openId, setOpenId\]/);
  });

  it("the rail still clears EVERYTHING on the journey's honest empty announce", () => {
    // `CLOSE` returns EQUIPMENT_CLOSED, whose equipmentId is null. If the set
    // only ever removed the named id, a null announce would leave the previous
    // equipment marked open forever — the exact bug the single slot avoided.
    // Anchor on the RAIL's subscriber specifically. A bare
    // "subscribeEquipmentStage" search hits the import line first, and the last
    // hit is a DIFFERENT subscriber (the journeyOpen one, which reads stage
    // only). Only the destructure that takes `equipmentId` is the rail's.
    const at = rail.indexOf("subscribeEquipmentStage(({ equipmentId, stage })");
    expect(at, `${RAIL} → the rail stopped subscribing to stage announces`).toBeGreaterThan(-1);
    expect(
      rail.slice(at, at + 700),
      `${RAIL} → a null equipmentId no longer clears the set; the journey's CLOSE would leave its equipment marked held`,
    ).toMatch(/equipmentId === null/);
  });

  // ── THE SECOND DEFECT THE FIRST FIX MADE VISIBLE ──────────────────────────
  // MEASURED 2026-09-19 on live /charts, one deploy after the announce above
  // started working. Press Replay → `aria-pressed="true"`. Press again →
  // still `"true"`, disclosure panel still up. Three presses, one outcome.
  //
  // `aria-pressed` is a CONTRACT, not a lamp — the whole meaning of the role
  // is that pressing again reverses it. So the honest badge shipped in the
  // block above had turned this control into a liar, and the cheap repair
  // (drop `aria-pressed`) would have paid for it by restoring exactly the
  // silence that made the first defect invisible. The rail keeps the claim and
  // earns it instead.

  it("a rail entry that reports itself pressed can actually be un-pressed", () => {
    expect(
      rail,
      `${RAIL} → the rail's onClick no longer branches on \`open\`, so it can only ever re-request. ` +
        `A control rendering \`aria-pressed={open}\` promises a reversal; re-requesting is not one. ` +
        `Either send "put-down" when it is open, or stop claiming aria-pressed`,
    ).toMatch(/requestEquipment\(\s*item\.id\s*,\s*open \? "put-down" : "pick-up"\s*\)/);
  });

  it("the room answers a put-down with the SAME closes its own controls use", () => {
    // A second close path would be a second implementation. `stopReplay` and
    // `setDrawSheetOpen(false)` are the exact handles the in-chart controls
    // call, so the rail adds a door rather than a copy.
    const at = chart.indexOf("subscribeEquipment((req)");
    expect(at, "ChartsDashboard.tsx → the room stopped subscribing to equipment requests").toBeGreaterThan(-1);
    const handler = chart.slice(at, at + 900);
    expect(
      handler,
      "ChartsDashboard.tsx → the request handler ignores intent, so the rail's put-down would re-open the instrument it was closing",
    ).toMatch(/req\.intent === "put-down"/);
    expect(handler, "ChartsDashboard.tsx → put-down no longer stops the replay engine").toMatch(/stopReplay\(\)/);
    expect(handler, "ChartsDashboard.tsx → put-down no longer closes the drawing drawer").toMatch(/setDrawSheetOpen\(false\)/);
  });

  it("the journey only puts down the equipment it is actually holding", () => {
    // The rail sends put-down for what it BELIEVES is open; the journey is the
    // authority on what IS open. Without the guard, a put-down for B would
    // close whatever A the journey happened to be holding.
    const hook = read(HOOK);
    const at = hook.indexOf('req.intent === "put-down"');
    expect(at, `${HOOK} → the journey ignores put-down; its equipment could be picked up but never set down from the rail`).toBeGreaterThan(-1);
    expect(
      hook.slice(at, at + 300),
      `${HOOK} → put-down dispatches CLOSE unconditionally; a request for one piece of equipment would put down a different one`,
    ).toMatch(/heldRef\.current === req\.equipmentId/);
  });
});
