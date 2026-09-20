/**
 * RoomEquipmentLayer — the three depths, rendered.
 *
 * The Sentinel beside this file (`roomAdoptsEquipment.sentinel.test.ts`) asks
 * WHERE the grammar is wired. This file asks WHAT the trader actually sees at
 * each stage, which is a different question and neither one covers the other.
 *
 * THE DEFECT THIS FILE WAS BORN FROM
 * ----------------------------------
 * Measured live on /command-deck: the FULL stage took the whole screen — and
 * therefore took the chart away — while reading "MARKET REALITY · WAIT" over a
 * canvas naming eight unresolved dimensions, with NOTHING on that screen
 * saying it was about NQ1! on a 15m. The subject was legible at every depth
 * except the one where the trader could no longer see it for themselves.
 */

import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MarketCanvasPanel } from "./MarketCanvasPanel";
import { RoomEquipmentLayer } from "./RoomEquipmentLayer";
import type { EquipmentContent } from "./RoomEquipmentLayer";
import type { EquipmentJourney } from "@/lib/workspace/equipmentJourney";
import type { MarketCanvasVM } from "@/lib/marketData/viewModels/selectMarketCanvas";

const vm: MarketCanvasVM = {
  version: "wm.market-canvas.v1",
  verdict: "WAIT",
  clear: false,
  headline: "Right-of-way is withheld — the market has not earned entry.",
  missing: ["Direction is unresolved."],
  resolved: [],
  measured: [],
  blockers: ["Regime", "Direction"],
  blockerCount: 11,
  clearances: [],
  invalidators: [],
  hasSnapshot: true,
};

const journey = (stage: EquipmentJourney["stage"]): EquipmentJourney => ({
  stage,
  equipmentId: stage === "closed" ? null : "market-reality",
  decisionId: null,
  // Only FULL carries a place to come back to — invariant 3 of the grammar.
  returnTo: stage === "full" ? { stage: "drawer", scrollY: 1048 } : null,
});

const noop = () => {};

/**
 * The ROOM's descriptor, rebuilt here exactly as /command-deck builds it. The
 * layer no longer knows what a MarketCanvasVM is; these tests therefore assert
 * the grammar END TO END — chrome plus the content a real room hands it —
 * rather than asserting that the chrome still contains one invention's panel.
 */
const content: EquipmentContent = {
  equipmentId: "market-reality",
  title: "Market reality",
  verdict: vm.verdict,
  headline: vm.headline,
  counts: [
    { testId: "equipment-count-resolved", label: `${vm.resolved.length} resolved` },
    { testId: "equipment-count-missing", label: `${vm.missing.length} missing` },
    { testId: "equipment-count-blockers", label: `${vm.blockerCount} blocking` },
  ],
  renderDepth: (unabridged: boolean) => <MarketCanvasPanel vm={vm} unabridged={unabridged} />,
};

const render = (stage: EquipmentJourney["stage"]) =>
  renderToStaticMarkup(
    <RoomEquipmentLayer
      journey={journey(stage)}
      content={content}
      subject={{ symbol: "NQ1!", timeframe: "15m" }}
      onExpand={noop}
      onEnter={noop}
      onReturn={noop}
      onClose={noop}
    />,
  );

const renderMarketDock = (stage: "preview" | "drawer") =>
  renderToStaticMarkup(
    <RoomEquipmentLayer
      journey={journey(stage)}
      content={content}
      subject={{ symbol: "NQ1!", timeframe: "15m" }}
      placement="market-dock"
      onExpand={noop}
      onReturn={noop}
      onClose={noop}
    />,
  );

describe("RoomEquipmentLayer — the subject survives the depth", () => {
  it("names WHICH market at every stage that renders at all", () => {
    for (const stage of ["preview", "drawer", "full"] as const) {
      const html = render(stage);
      expect(html, `${stage} lost the symbol`).toContain("NQ1!");
      expect(html, `${stage} lost the timeframe`).toContain("15m");
      expect(html, `${stage} did not publish the subject`).toContain(
        'data-testid="equipment-subject"',
      );
    }
  });

  it("names it hardest at FULL — the only stage that takes the chart away", () => {
    // Regression guard with a name: the preview and the drawer sit BESIDE the
    // chart, so a trader who forgets the symbol can glance left. FULL cannot
    // be glanced past. If this assertion is ever the only one left passing,
    // the subject line is still doing the job it was added for.
    expect(render("full")).toContain("NQ1!");
  });

  it("renders nothing at all when closed", () => {
    expect(render("closed")).toBe("");
  });
});

describe("RoomEquipmentLayer — the grammar carries any equipment, but only the one it was handed", () => {
  const withContent = (c: EquipmentContent, stage: EquipmentJourney["stage"] = "drawer") =>
    renderToStaticMarkup(
      <RoomEquipmentLayer
        journey={journey(stage)}
        content={c}
        subject={{ symbol: "NQ1!", timeframe: "15m" }}
        onExpand={noop}
        onEnter={noop}
        onReturn={noop}
        onClose={noop}
      />,
    );

  it("wears a second equipment's name and depth — no market canvas required", () => {
    // The point of the atom. If this test needs MarketCanvasPanel to pass,
    // the layer is still one invention's private chrome and the directive's
    // "reuse that grammar" clause is unreachable.
    const html = withContent({
      equipmentId: "market-reality",
      title: "Object passport",
      verdict: "UNAVAILABLE",
      headline: "This object has no verified birth.",
      counts: [{ testId: "equipment-count-touches", label: "0 touches" }],
      renderDepth: (unabridged: boolean) => (
        <p data-testid="passport-depth">{unabridged ? "whole screen" : "docked"}</p>
      ),
    });
    expect(html, "the chrome would not say the second equipment's name").toContain(
      "Object passport",
    );
    expect(html, "the chrome would not say the second equipment's state").toContain("UNAVAILABLE");
    expect(html, "the second equipment's own depth did not render").toContain(
      'data-testid="passport-depth"',
    );
    expect(html, "the drawer must not be told it has the whole screen").toContain("docked");
  });

  it("renders nothing when the room hands a reading the rail did not ask for", () => {
    // The rail requesting equipment B while the room hands equipment A's
    // compilation would put one invention's name over another's numbers —
    // the exact disagreement the single-compilation rule exists to prevent.
    // Silence is the only honest output.
    expect(withContent({ ...content, equipmentId: "market-object-passport" })).toBe("");
  });
});

describe("RoomEquipmentLayer — depth is depth, not size", () => {
  it("only FULL uncaps the canvas, and only FULL offers RETURN", () => {
    const full = render("full");
    expect(full).toContain('data-testid="equipment-return"');
    for (const shallow of ["preview", "drawer"] as const) {
      expect(render(shallow), `${shallow} must not offer RETURN`).not.toContain(
        'data-testid="equipment-return"',
      );
    }
  });

  it("the blocker shortfall is disclosed wherever the canvas renders", () => {
    // blockerCount 11 against a 2-entry sample. This is a DATA gap, so it must
    // survive the extra room FULL has — it is not a display choice.
    for (const stage of ["drawer", "full"] as const) {
      expect(render(stage), `${stage} absorbed the blocker shortfall`).toContain(
        "+9 more blocking, not named here",
      );
    }
  });
});

describe("RoomEquipmentLayer — market equipment stays on the live camera", () => {
  it("docks shallow chart equipment on the left instead of floating over the rail", () => {
    for (const stage of ["preview", "drawer"] as const) {
      const html = renderMarketDock(stage);
      expect(html).toContain('data-equipment-placement="market-dock"');
      expect(html).toContain('class="wm-room-equipment--market-dock"');
      expect(html).toContain("left:18px");
      expect(html).toContain("top:92px");
      expect(html).toContain("bottom:18px");
      expect(html).toContain("width:clamp(280px, 22vw, 340px)");
      expect(html).not.toContain("right:18px;bottom:18px");
    }
  });

  it("keeps the narrow-screen projection as a bottom sheet", () => {
    const html = renderMarketDock("drawer");
    expect(html).toContain("@media (max-width: 1023px)");
    expect(html).toContain("top: auto !important");
    expect(html).toContain("width: auto !important");
    expect(html).toContain("max-height: min(58vh, 560px) !important");
  });

  it("does not move the default room equipment out of its established corner", () => {
    const html = render("drawer");
    expect(html).toContain('data-equipment-placement="corner"');
    expect(html).toContain("right:18px");
    expect(html).not.toContain('class="wm-room-equipment--market-dock"');
  });
});

describe("RoomEquipmentLayer — the chrome and the content agree where the page is", () => {
  /**
   * Measured live on wealthymindsetspro.com at FULL: the header ran edge to
   * edge while the canvas beneath it sat centred in a 1280 column starting a
   * third of the way in. Two elements, two different answers to "where does
   * this page begin" — a toolbar bolted onto a document, at exactly the depth
   * whose job is to feel like one thing.
   */
  const measure = (html: string, testId: string) => {
    const at = html.indexOf(`data-testid="${testId}"`);
    if (at < 0) return null;
    // The element's OWN style window, not the file's. Asking "does 1280 appear
    // somewhere in this markup" would pass on a header that never got it.
    const style = /style="([^"]*)"/.exec(html.slice(at, html.indexOf(">", at)));
    if (!style) return null;
    const s = style[1];
    return {
      maxWidth: /max-width:\s*([^;"]+)/.exec(s)?.[1]?.trim() ?? null,
      margin: /(?:^|;)\s*margin:\s*([^;"]+)/.exec(s)?.[1]?.trim() ?? null,
    };
  };

  it("header and body carry the SAME measure at full", () => {
    const html = render("full");
    const header = measure(html, "room-equipment-header");
    const body = measure(html, "room-equipment-body");
    expect(header, "the full header has no measure of its own").not.toBeNull();
    expect(body, "the full body has no measure of its own").not.toBeNull();
    expect(header!.maxWidth, "header is not bounded to the measure").toBe("1280px");
    expect(
      header,
      "the chrome and the content disagree about where the page begins",
    ).toEqual(body);
  });

  it("does NOT impose that measure on the docked stages", () => {
    // The preview and the drawer are 420px objects pinned to the corner of the
    // room. A 1280 max-width there is inert at best; centring them would be an
    // outright lie about where they sit.
    for (const stage of ["preview", "drawer"] as const) {
      const header = measure(render(stage), "room-equipment-header");
      expect(header?.maxWidth ?? null, `${stage} header took the full measure`).toBeNull();
      expect(header?.margin ?? null, `${stage} header centred itself`).toBeNull();
    }
  });
});

/**
 * M2 — THE ROOM IS NEVER DISPLACED BY ITS OWN EQUIPMENT.
 *
 * ── WHAT THE RE-MEASUREMENT FOUND ──────────────────────────────────────────
 *
 * The inherited M2 claim read: the layer "can take the chart away, goes fixed
 * `inset:0`, and equipment state is reflected through the URL." All three are
 * literally true and NONE of them is the defect the claim assumed.
 *
 *   TAKES THE CHART AWAY — only at FULL, deliberately, and it is the single
 *   stage that carries RETURN. `useEquipmentJourney` restores the ROOM's exact
 *   scrollTop on the way out, and the hook's own comments record that reading
 *   `window.scrollY` instead was tried, shipped, and measured wrong.
 *
 *   FIXED `inset:0` — that is not the bug, that is the FIX. A fixed overlay is
 *   precisely what keeps the chart MOUNTED underneath: no unmount, no refetch,
 *   no blank frame, so symbol / timeframe / MarketObjects / chart state survive
 *   by construction rather than by careful restoration.
 *
 *   URL REFLECTION — a reflection, not a source of truth. `full` is explicitly
 *   NOT cold-openable, so a shared link cannot drop a stranger into a
 *   full-screen reading with no chart behind it.
 *
 * ── SO WHAT IS ACTUALLY UNGUARDED ──────────────────────────────────────────
 *
 * The property everything above depends on: that every open depth is an
 * OVERLAY. Thirty-plus assertions next door check where the grammar is wired,
 * what it names, and what it refuses. Not one of them checks that the shell
 * stays out of the room's layout flow.
 *
 * Which means a future "simplification" of FULL into an in-flow `<section>`
 * would REFLOW the chart out of the room — the exact capability amputation M2
 * names — and the entire suite would stay green. The order's sentence is
 * "open → deepen → inspect → close must preserve symbol, timeframe,
 * MarketObjects, DECISION_ID, chart state", and layout flow is the mechanism
 * that last clause rests on.
 *
 * A property that everything depends on and nothing asserts is not a safe
 * property. It is a lucky one.
 */
describe("M2 · equipment is an overlay on the room, never a replacement for it", () => {
  /** The shell's OWN style window — not the file's, which would pass on any stage. */
  const shellStyle = (html: string): string | null => {
    const at = html.indexOf('data-testid="room-equipment"');
    if (at < 0) return null;
    return /style="([^"]*)"/.exec(html.slice(at, html.indexOf(">", at)))?.[1] ?? null;
  };

  it("takes itself OUT of the room's layout flow at every depth that renders", () => {
    for (const stage of ["preview", "drawer", "full"] as const) {
      const style = shellStyle(render(stage));
      // FALSE_RIPENESS: a renamed testid would make every assertion below
      // vacuous and this rule would report clean while reading nothing.
      expect(style, `${stage} → no room-equipment shell was found to inspect`).not.toBeNull();
      expect(
        style,
        `${stage} → the equipment sits IN the room's flow. Fixed positioning is ` +
          `not decoration here: it is the mechanism that keeps the chart mounted ` +
          `underneath instead of reflowed away. An in-flow equipment layer ` +
          `displaces the market it was opened to explain.`,
      ).toMatch(/position:\s*fixed/);
    }
  });

  it("covers the room at FULL rather than pushing it — and only at FULL", () => {
    // The distinction the grammar lives on. FULL claims the viewport; the
    // docked depths claim a corner of it. Both are fixed; only one is `inset:0`.
    expect(shellStyle(render("full")), "FULL does not claim the screen").toMatch(/inset:\s*0/);
    for (const stage of ["preview", "drawer"] as const) {
      expect(
        shellStyle(render(stage)),
        `${stage} → a docked depth claimed the whole viewport. The market above ` +
          `it has to stay visible or this stops being the same room.`,
      ).not.toMatch(/inset:\s*0/);
    }
  });

  it("carries ONE decision identity, unchanged, down and back up the depths", () => {
    // Invariant 2 of the grammar, asserted at the DOM rather than in the
    // reducer: the reducer test proves the value is carried, this proves it is
    // PUBLISHED, which is what makes the identity checkable from outside.
    const withDecision = (stage: EquipmentJourney["stage"]) =>
      renderToStaticMarkup(
        <RoomEquipmentLayer
          journey={{ ...journey(stage), decisionId: "dec_2026_09_18_nq" }}
          content={content}
          subject={{ symbol: "NQ1!", timeframe: "15m" }}
          onExpand={noop}
          onEnter={noop}
          onReturn={noop}
          onClose={noop}
        />,
      );
    for (const stage of ["preview", "drawer", "full"] as const) {
      expect(
        withDecision(stage),
        `${stage} → the depth changed and the decision identity did not survive it. ` +
          `A trader who deepens into a reading and comes back out must be looking ` +
          `at the same decision they left, or the journey was a new page wearing ` +
          `an overlay's clothes.`,
      ).toContain('data-decision-id="dec_2026_09_18_nq"');
    }
  });
});
