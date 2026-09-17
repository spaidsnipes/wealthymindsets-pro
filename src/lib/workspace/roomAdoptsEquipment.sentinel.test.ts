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
    expect(hook, `${HOOK} → a room would accept equipment it does not have`).toMatch(
      /isRoomEquipment\(roomHref/,
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
    const choice = deck.slice(chooser, chooser + 400);
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
    const registered = roomEquipment(room.href).map((e) => e.id).sort();
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
      const chooserSrc = src.slice(chooserAt, chooserAt + 400);
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
    const at = deck.indexOf("const decisionChainEquipment");
    expect(at, `${DECK} → the room no longer builds decisionChainEquipment`).toBeGreaterThan(-1);
    const body = deck.slice(at, deck.indexOf("[chainVm, sceneCompilation]", at));
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
      const at = deck.indexOf("const decisionChainEquipment");
      const body = deck.slice(at, deck.indexOf("[chainVm, sceneCompilation]", at));
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
      const gateClose = rendered.indexOf("</SceneAdmits>");
      const noteAt = rendered.indexOf("<StructureContextNote");
      expect(
        gateClose,
        `${DECK} → the chain's depth no longer closes a <SceneAdmits> gate.`,
      ).toBeGreaterThan(-1);
      expect(
        noteAt > gateClose,
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
