/**
 * SENTINEL — THE COMMAND DECK ON /charts IS ONE ORGANISM WITH THE CHART.
 * 2026-09-26, Garden 16 §10 (ONE MARKET HOME) + §11 (A REAL CONTROL SURFACE).
 *
 * The render tests prove what the drawer SHOWS. These rules prove what it may
 * never BECOME — each one is a specific wrong-but-green implementation that
 * would otherwise pass every render test:
 *
 *   · a drawer that compiles its own market (a second chain that could say
 *     PERMITTED beside a rail that says WAIT);
 *   · a drawer that opens its own wire or mounts the deck's private chart (a
 *     second price one glance from the first);
 *   · a phase control that writes drawer-local state (a lamp, not a control:
 *     the rail would never hear it, and closing the drawer would reset it);
 *   · a masthead control that is a link (the route advertisement 09-19 cut).
 *
 * NEVER DELETE THIS SENTINEL — re-pin it to the meaning, with stronger
 * assertions than it had.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs
    .readFileSync(path.join(process.cwd(), rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const SURFACE = "src/components/command-deck/CommandDeckSurface.tsx";
const HOOK = "src/components/command-deck/useChartCommandDeck.ts";
const ROOM = "src/components/chart/ChartsDashboard.tsx";
const FRAME = "src/components/os/WMOperatingSystem.tsx";
const JOURNEY = "src/lib/workspace/useEquipmentJourney.ts";

const count = (src: string, re: RegExp) => [...src.matchAll(re)].length;

describe("SENTINEL — the drawer reads the room; it compiles no market and opens no wire", () => {
  for (const rel of [SURFACE, HOOK]) {
    const src = read(rel);

    it(`${rel} is not vacuous`, () => {
      expect(src.length).toBeGreaterThan(2000);
    });

    it(`${rel} compiles no second market`, () => {
      for (const call of [
        /\buseMarketCanvasVM\(/,
        /\bcomposeMarketCanvasVM\(/,
        /\bselectDecisionChain\(/,
        /\bselectOneStory\(/,
        /\bselectPermission\(/,
        /\buseCanonicalMarketState(History)?\(/,
        /\busePublishChartMarketState\(/,
      ]) {
        expect(src, `${rel} → ${call.source}`).not.toMatch(call);
      }
    });

    it(`${rel} opens no wire and fetches nothing`, () => {
      expect(src).not.toMatch(/\buseWebSocket\(/);
      expect(src).not.toMatch(/\bfetch\(/);
      expect(src).not.toMatch(/useSWR|EventSource\(|new WebSocket\(/);
    });

    // Five-hour order (2026-09-27): the deck BINDS the broker — through ONE
    // reader module that opens no market wire, never a fetch in the surface.
    it(`${rel} reads the broker only through useWebullBook`, () => {
      if (!/CommandDeckSurface/.test(rel)) return;
      expect(src).toContain('import { useWebullBook } from "./useWebullBook";');
      const hook = fs.readFileSync(`${process.cwd()}/src/components/command-deck/useWebullBook.ts`, "utf8");
      expect(hook).not.toMatch(/\buseWebSocket\(|EventSource\(|new WebSocket\(|\/api\/(market-data|yahoo|finnhub)/);
      expect(hook).toContain('read("/api/broker/webull/status")');
      expect(hook).toContain('read("/api/broker/webull/positions")');
    });

    it(`${rel} mounts no second chart, no second price, no superseded chrome`, () => {
      for (const banned of [
        "DeckMarketChart",
        "HeroTruth",
        "GateRailColumn",
        "SemanticZoom",
        "RealmGateway",
        "AvailableRChip",
        "DecisionWhyPanel",
        "ProviderWireStrip",
      ]) {
        expect(src, `${rel} → ${banned}`).not.toContain(banned);
      }
    });

    it(`${rel} carries no navigation`, () => {
      expect(src).not.toMatch(/from "next\/link"|from "next\/navigation"/);
      expect(src).not.toMatch(/href=/);
      expect(src).not.toMatch(/router\.(push|replace)|location\.(assign|href\s*=)/);
    });
  }
});

describe("SENTINEL — the phase is ROOM state, and the room's ONE compile hears it", () => {
  const room = read(ROOM);

  it("the room compiles the market exactly once, WITH the phase", () => {
    expect(count(room, /\buseMarketCanvasVM\(/g), "a second useMarketCanvasVM on /charts").toBe(1);
    expect(room).not.toMatch(/\bcomposeMarketCanvasVM\(/);
    const call = room.slice(room.indexOf("useMarketCanvasVM("), room.indexOf("});", room.indexOf("useMarketCanvasVM(")));
    expect(call, "the one compile no longer hears the phase — the drawer's control is a lamp").toMatch(
      /phase:\s*tradePhase/,
    );
  });

  // RE-PINNED 2026-09-27 (Garden 16 §15/§32): the phase is held by the ONE
  // lifecycle owner (the DecisionContextBus stage), which the Workspace mode
  // row writes too. Still not drawer-local; now also not room-local.
  it("the phase is a read of the ONE lifecycle owner, and the drawer writes that owner through the room's setter", () => {
    expect(room).toMatch(/const tradePhase: TradePhase = lifecyclePhaseFor\(lifecycleContext, symbol\);/);
    expect(room).toMatch(/useDecisionContext\(\)/);
    expect(room).toMatch(/setLifecycleStage\(stageForPhase\(phase\), symbol\)/);
    expect(room).not.toMatch(/useState<TradePhase>/);
    expect(room).toMatch(/onPhase=\{setTradePhase\}/);
    expect(room).toMatch(/phase=\{tradePhase\}/);
  });

  it("the deck's readings are compiled once, by the room, from the room's own bindings", () => {
    expect(count(room, /\buseChartCommandDeck\(/g)).toBe(1);
    const call = room.slice(room.indexOf("useChartCommandDeck("), room.indexOf("});", room.indexOf("useChartCommandDeck(")));
    for (const binding of [
      /phase:\s*tradePhase/,
      /state:\s*chartCanvasState/,
      /history:\s*continuationHistory/,
      /chain:\s*chartCanvasVM\.chain/,
      /permission:\s*chartCanvasVM\.permission/,
      /oneStory:\s*chartCanvasVM\.oneStory/,
      /sessionDecisions:\s*chartSessionDecisions/,
    ]) {
      expect(call, binding.source).toMatch(binding);
    }
  });

  it("the wire the drawer shows is the chip's own report — one grader", () => {
    expect(count(room, /\bselectPerCapabilityFidelity\(/g)).toBe(1);
    expect(room).toMatch(/capabilityReport=\{chartCapabilityReport\}/);
    expect(room).toMatch(/const capabilityReport = chartCapabilityReport;/);
  });
});

describe("SENTINEL — the plate reads the room's ONE lifecycle, ONE verdict and ONE identity (deck canon, 2026-09-27)", () => {
  const room = read(ROOM);
  const memo = room.slice(
    room.indexOf("const chartCommandDeckEquipment = React.useMemo("),
    room.indexOf("const chartEquipmentContent"),
  );

  it("the memo is found and not vacuous", () => {
    expect(memo.length).toBeGreaterThan(600);
  });

  it("the rail's stage is the lifecycle owner's, for this symbol — never drawer-local", () => {
    expect(room).toMatch(/const lifecycleStage = lifecycleStageFor\(lifecycleContext, symbol\);/);
    expect(memo).toMatch(/stage=\{lifecycleStage\}/);
    expect(read(SURFACE)).not.toMatch(/useState<LifecycleStage/);
  });

  it("the header carries NO verdict — the headline plate is the deck's one verdict statement (verifier MEDIUM, round 4)", () => {
    // Three WAITs were on screen: header + headline plate + the right rail's
    // plaque. The header now hands `null`, and the layer draws no word for it.
    expect(memo).toMatch(/verdict: null,/);
    expect(memo).not.toMatch(/verdict: chartCommandDeck/);
    expect(memo).not.toMatch(/key === "permission"/);
    const surface = read(SURFACE);
    // Exactly one right-of-way render in the drawer: the headline plate's.
    expect(surface.match(/oneStory\.decision\b/g)?.length).toBe(1);
  });

  it("DECISION_ID and risk are the room's own bindings — the plate mints and computes neither", () => {
    expect(memo).toMatch(/decisionId=\{currentSceneDecision\?\.decisionId \?\? null\}/);
    expect(memo).toMatch(/decisionIdAbsence=\{sceneDecisionAbsence\}/);
    expect(memo).toMatch(/risk=\{riskPlan\}/);
    const surface = read(SURFACE);
    expect(surface).not.toMatch(/randomUUID|mintDecision|nanoid|selectRiskOnPrice\(/);
  });
});

describe("SENTINEL — the masthead control is a button that asks the room, never a route", () => {
  const frame = read(FRAME);
  const start = frame.indexOf("function CommandDeckPlate");
  // Sliced to the component's own closing `  );\n}` — NOT the first `\n}`,
  // which is the multi-line signature's destructure and would leave a
  // 61-character "body" that every negative rule below passes over (the trap
  // RoomWorkspaceRail's one-line signature note describes; caught here by the
  // vacuity floor on first run).
  const body = frame.slice(start, frame.indexOf("\n  );\n}\n", start));

  it("the control exists and is not vacuous", () => {
    expect(start).toBeGreaterThan(-1);
    expect(body.length).toBeGreaterThan(1500);
  });

  it("it is a <button> with no href, and it asks the room over the equipment channel", () => {
    expect(body).toMatch(/<button/);
    expect(body).not.toMatch(/href=|<Link|router\./);
    expect(body).toMatch(/requestEquipment\(COMMAND_DECK_EQUIPMENT_ID, held \? "put-down" : "pick-up"\)/);
    // The frame's own hand goes down FIRST — one thing open over price.
    expect(body).toMatch(/onPress\(\);\s*requestEquipment\(/);
  });

  it("its state is TOLD — the channel's memory first, then every announce", () => {
    expect(body).toMatch(/heldEquipmentIds\(\)\.has\(COMMAND_DECK_EQUIPMENT_ID\)/);
    expect(body).toMatch(/subscribeEquipmentStage\(/);
    expect(body).not.toMatch(/readJourneyFromUrl|useSearchParams/);
  });

  it("aria-expanded is the held state and aria-controls exists only while held", () => {
    expect(body).toMatch(/aria-expanded=\{held\}/);
    expect(body).toMatch(/aria-controls=\{held \? COMMAND_DECK_REGION_ID : undefined\}/);
    expect(body).toMatch(/aria-label="Command Deck"/);
  });

  it("focus comes home when the deck is put down from inside it", () => {
    expect(body).toMatch(/if \(was && !next/);
    expect(body).toMatch(/buttonRef\.current\?\.focus\(\)/);
    expect(body).toMatch(/addEventListener\("focusin"/);
    expect(body).toMatch(/removeEventListener\("focusin"/);
  });

  it("it is drawn only for a room that declares exactly one deck, never in a doors room, never on the phone", () => {
    expect(frame).toMatch(/deckEntries\.length === 1 \? deckEntries\[0\] : null/);
    expect(frame).toMatch(/!doorsOnly && commandDeckEntry !== null \?/);
    const raw = fs.readFileSync(path.join(process.cwd(), FRAME), "utf8");
    const phone = raw.slice(raw.indexOf("@media (max-width: ${OS_RAIL_BREAKPOINT_PX}px)"), raw.indexOf("@media (min-width:"));
    expect(phone).toMatch(/\.wm-os-command-deck,\s*\.wm-os-command-deck-rule \{ display: none !important; \}/);
  });
});

describe("SENTINEL — a control surface opens at its drawer, by the journey's one owner", () => {
  const journey = read(JOURNEY);

  it("a press lands at the drawer through the registry's rule, not a room-written stage", () => {
    expect(journey).toMatch(
      /dispatch\(\{ type: "OPEN", equipmentId: req\.equipmentId, decisionId \}\);\s*if \(journeyOpensAtDrawer\(roomHref, req\.equipmentId\)\) dispatch\(\{ type: "EXPAND" \}\);/,
    );
  });

  it("a link lands where a press would", () => {
    expect(journey).toMatch(/fromUrl\.stage === "drawer" \|\| journeyOpensAtDrawer\(roomHref, fromUrl\.equipmentId\)/);
  });

  it("the room never writes the deck's stage itself", () => {
    const room = read(ROOM);
    expect(room).not.toMatch(/announceEquipmentStage\(\s*"command-deck"/);
    expect(room).not.toMatch(/onChartEquipmentExpand\(\)/);
  });
});
