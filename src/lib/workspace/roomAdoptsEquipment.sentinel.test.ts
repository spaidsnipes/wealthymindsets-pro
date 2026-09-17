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
    expect(props, `${DECK} → the equipment must read the room's own canvas`).toMatch(
      /vm=\{marketCanvas\}/,
    );
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

  it("ENTER buys DEPTH, not just size — the full stage renders the canvas unabridged", () => {
    // Anchored to the panel's own props, not the file: a bare search for
    // `unabridged` would pass on a hardcoded `unabridged` or `unabridged={true}`
    // — which would uncap the DRAWER too and leave ENTER meaning nothing but a
    // larger box. The gate has to name the stage.
    const mount = layer.indexOf("<MarketCanvasPanel");
    expect(mount, `${LAYER} → the canvas is no longer rendered at depth`).toBeGreaterThan(-1);
    const props = layer.slice(mount, layer.indexOf("/>", mount));
    expect(props, `${LAYER} → ENTER must uncap the canvas, or it is only a resize`).toMatch(
      /unabridged=\{stage === "full"\}/,
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
