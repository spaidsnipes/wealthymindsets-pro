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

/** COMMENT-STRIPPED: every claim below is also discussed in prose in-file. */
const read = (rel: string) =>
  fs
    .readFileSync(path.join(process.cwd(), rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const RAIL = "src/components/os/WMOperatingSystem.tsx";
const DECK = "src/app/command-deck/page.tsx";
const LAYER = "src/components/experience/RoomEquipmentLayer.tsx";

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

describe("SENTINEL — the market room ADOPTS the journey", () => {
  const deck = read(DECK);

  it("the room mounts the equipment layer and answers the rail", () => {
    expect(deck, `${DECK} → the layer is imported but never rendered`).toMatch(
      /<RoomEquipmentLayer[\s/>]/,
    );
    expect(deck, `${DECK} → nothing listens for the rail's request`).toMatch(
      /subscribeEquipment\(/,
    );
    // And answers BACK. The rail can only show what is in the trader's hand if
    // the room says what it is holding; a room that only listens leaves the
    // Workspace entry looking identical open and closed.
    expect(deck, `${DECK} → the room never tells the rail what it is holding`).toMatch(
      /announceEquipmentStage\(/,
    );
  });

  it("the URL and the rail are two readings of ONE fact", () => {
    // Computed in separate effects, they drift: the address bar says `drawer`
    // while the Workspace entry says nothing is open, and the trader is looking
    // at both. Pinned to adjacency in the SAME effect body.
    const reflect = deck.indexOf("reflectJourneyInUrl(equipment");
    const announce = deck.indexOf("announceEquipmentStage(equipment");
    expect(reflect, `${DECK} → the URL reflection is gone; re-pin this`).toBeGreaterThan(-1);
    expect(announce, `${DECK} → the rail announcement is gone; re-pin this`).toBeGreaterThan(-1);
    expect(
      announce - reflect,
      `${DECK} → the URL and the rail are computed apart; they will disagree`,
    ).toBeLessThan(200);
    expect(announce).toBeGreaterThan(reflect);
  });

  it("every stage of the journey is actually reachable from the room", () => {
    // A layer wired for OPEN only would render a widget that can never be
    // expanded, entered, or returned from — the grammar written down and then
    // half-built, which is the shape this file exists to catch.
    for (const action of ["OPEN", "EXPAND", "ENTER", "RETURN", "CLOSE"]) {
      expect(deck, `${DECK} → no dispatch reaches the ${action} stage`).toMatch(
        new RegExp(`type:\\s*"${action}"`),
      );
    }
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
    // RE-PINNED, one indirection deeper. The layer is now handed a descriptor
    // rather than the vm, so the rule has to follow: the descriptor is the
    // thing that must be built from the room's existing binding. Both halves
    // are asserted, because `content={somethingElse}` and a descriptor that
    // composed its own vm are two different ways to grow the second brain.
    expect(props, `${DECK} → the equipment must be handed a descriptor`).toMatch(
      /content=\{marketRealityEquipment\}/,
    );
    const descriptor = deck.indexOf("const marketRealityEquipment");
    expect(descriptor, `${DECK} → the room no longer builds its equipment`).toBeGreaterThan(-1);
    const built = deck.slice(descriptor, deck.indexOf("[marketCanvas]", descriptor) + 20);
    expect(built, `${DECK} → the equipment must read the room's own canvas`).toMatch(
      /verdict:\s*marketCanvas\.verdict/,
    );
    expect(built, `${DECK} → a descriptor that compiled its own reading is a second brain`)
      .not.toMatch(/\b(compose|select)[A-Z]\w*\(/);
    // The SUBJECT rides the same rule as the vm. The full experience takes the
    // chart away, so its symbol line is the only thing left naming the market;
    // if the equipment resolved a symbol of its own it could name a DIFFERENT
    // one than the chart the trader entered from, and there would be nothing
    // on screen to catch it. `symbol` and `timeframe` are the room's bindings.
    expect(props, `${DECK} → the subject must be the ROOM's own symbol`).toMatch(
      /subject=\{\{\s*symbol,\s*timeframe\s*\}\}/,
    );
  });

  it("ENTER measures the ROOM's scroll, not the window's", () => {
    // The room scrolls in this OS; the document does not. `window.scrollY` is
    // permanently 0 here, so a RETURN built on it would pass every unit test
    // and always drop the trader at the top — losing their place while
    // reporting success.
    const enter = deck.slice(deck.indexOf('type: "ENTER"'), deck.indexOf('type: "ENTER"') + 220);
    expect(enter, `${DECK} → window.scrollY is always 0 in this frame`).not.toMatch(
      /window\.scrollY/,
    );
    expect(enter, `${DECK} → ENTER must record the room's own offset`).toMatch(/scrollTop/);
  });

  it("the room restores that offset when the full experience is left", () => {
    expect(deck, `${DECK} → RETURN promises a place and nothing keeps it`).toMatch(
      /pendingScrollRestore\(/,
    );
  });

  it("the journey never becomes a route", () => {
    // reflectJourneyInUrl uses replaceState on the SAME pathname. A router
    // push, or an /equipment/... route, is the banned shape.
    expect(deck, `${DECK} → the journey must stay in this room`).toMatch(/reflectJourneyInUrl\(/);
    expect(deck, `${DECK} → a push would make Back walk the stages`).not.toMatch(
      /router\.push\([^)]*equip/,
    );
  });

  it("the ROOM is what decides the canvas gets uncapped at depth", () => {
    // The other half of the layer's re-pinning. When the chrome stopped
    // importing MarketCanvasPanel, the "ENTER buys depth" promise moved here —
    // and a promise that moves without a gate moving with it is how a proven
    // behaviour quietly becomes unproven. `unabridged={unabridged}` forwards
    // the layer's boolean; `unabridged` hardcoded, or omitted, would restore
    // the six-capped lists on a full screen and make ENTER a resize again.
    const descriptor = deck.indexOf("renderDepth:");
    expect(descriptor, `${DECK} → the room no longer describes its equipment`).toBeGreaterThan(-1);
    const body = deck.slice(descriptor, descriptor + 400);
    expect(body, `${DECK} → the equipment's depth must render the canvas`).toMatch(
      /<MarketCanvasPanel/,
    );
    expect(body, `${DECK} → ENTER must uncap the canvas, or it is only a resize`).toMatch(
      /unabridged=\{unabridged\}/,
    );
  });
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
